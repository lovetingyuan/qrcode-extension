export type QRScannerError =
  | { code: "permission-denied" }
  | { code: "camera-start-failed"; detail: string };

type ZxingQrDecoderModule = typeof import("@/components/scanner-zxing");

interface ScanRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BarcodeDetectionResult {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<BarcodeDetectionResult[]>;
}

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  focusMode?: string[];
  exposureMode?: string[];
}

type AdvancedTrackConstraints = MediaTrackConstraints & {
  advanced?: Array<Record<string, unknown>>;
};

const SCAN_INTERVAL_MS = 90;
const MAX_DECODE_DIMENSION = 1440;
const MAX_UPSCALE_FACTOR = 2.5;

let zxingQrDecoderModulePromise: Promise<ZxingQrDecoderModule> | null = null;

function loadZxingQrDecoderModule() {
  zxingQrDecoderModulePromise ??= import("@/components/scanner-zxing");
  return zxingQrDecoderModulePromise;
}

export class QRScanner {
  private elementId: string;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private scanCanvas: HTMLCanvasElement | null = null;
  private scanContext: CanvasRenderingContext2D | null = null;
  private scanFrameId: number | null = null;
  private scanInFlight = false;
  private isRunning = false;
  private invertNextZxingDecode = false;
  private lastScanAt = 0;
  private scanPassIndex = 0;
  private sessionId = 0;
  private barcodeDetector: BarcodeDetectorLike | null = this.createBarcodeDetector();

  constructor(elementId: string) {
    this.elementId = elementId;
  }

  async checkCameraPermission(): Promise<PermissionState> {
    try {
      const result = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      return result.state;
    } catch {
      // Firefox doesn't support querying camera permission
      return "prompt";
    }
  }

  async start(
    onSuccess: (decodedText: string) => void,
    onError: (error: QRScannerError) => void,
  ): Promise<void> {
    const permState = await this.checkCameraPermission();

    if (permState === "denied") {
      onError({ code: "permission-denied" });
      return;
    }

    await this.stop();
    const sessionId = this.sessionId;

    try {
      const preferredCameraId = await this.getPreferredCameraId();
      const stream = await this.startCameraStream(preferredCameraId);
      const video = this.mountVideo(stream);

      if (sessionId !== this.sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        video.remove();
        return;
      }

      this.stream = stream;
      this.video = video;

      await this.waitForVideoReady(video);
      await this.optimizeActiveTrack();

      this.isRunning = true;
      this.lastScanAt = 0;
      this.scanPassIndex = 0;
      this.scheduleScan(sessionId, onSuccess);
    } catch (err) {
      await this.stop();
      onError({
        code: "camera-start-failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async stop(): Promise<void> {
    this.sessionId += 1;
    this.isRunning = false;
    this.scanInFlight = false;
    this.invertNextZxingDecode = false;
    this.lastScanAt = 0;
    this.scanPassIndex = 0;

    if (this.scanFrameId !== null) {
      window.cancelAnimationFrame(this.scanFrameId);
      this.scanFrameId = null;
    }

    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video.remove();
      this.video = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    const host = document.getElementById(this.elementId);
    if (host) {
      host.innerHTML = "";
    }
  }

  async scanImageBlob(blob: Blob): Promise<string | null> {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(blob);

      try {
        return await this.scanImageSource(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    }

    const image = await this.loadImageElement(blob);
    return this.scanImageSource(image, image.naturalWidth, image.naturalHeight);
  }

  private createBarcodeDetector(): BarcodeDetectorLike | null {
    if (!("BarcodeDetector" in globalThis)) {
      return null;
    }

    try {
      const NativeBarcodeDetector = (
        globalThis as typeof globalThis & {
          BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
        }
      ).BarcodeDetector;

      if (!NativeBarcodeDetector) {
        return null;
      }

      return new NativeBarcodeDetector({ formats: ["qr_code"] });
    } catch {
      return null;
    }
  }

  private async getPreferredCameraId(): Promise<string | null> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");

      if (cameras.length === 0) {
        return null;
      }

      const preferredCamera = cameras.find((camera) =>
        /rear|back|environment|world/i.test(camera.label),
      );

      return preferredCamera?.deviceId ?? cameras[0]?.deviceId ?? null;
    } catch {
      return null;
    }
  }

  private async startCameraStream(cameraId: string | null): Promise<MediaStream> {
    const preferredConstraints = this.createVideoConstraints(cameraId);

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: preferredConstraints,
        audio: false,
      });
    } catch (preferredError) {
      const fallbackConstraints = cameraId
        ? this.createVideoConstraints(null)
        : { width: { ideal: 1280 }, height: { ideal: 720 } };

      try {
        return await navigator.mediaDevices.getUserMedia({
          video: fallbackConstraints,
          audio: false,
        });
      } catch {
        throw preferredError;
      }
    }
  }

  private createVideoConstraints(cameraId: string | null): MediaTrackConstraints {
    return {
      ...(cameraId ? { deviceId: { exact: cameraId } } : { facingMode: "environment" as const }),
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 30 },
    };
  }

  private mountVideo(stream: MediaStream): HTMLVideoElement {
    const host = document.getElementById(this.elementId);
    if (!host) {
      throw new Error(`Scanner host #${this.elementId} not found.`);
    }

    host.innerHTML = "";

    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    host.append(video);

    return video;
  }

  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
      await video.play();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let timeoutId: number | null = null;

      const cleanup = () => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }

        video.removeEventListener("loadeddata", handleReady);
        video.removeEventListener("canplay", handleReady);
        video.removeEventListener("playing", handleReady);
      };

      const finish = (callback: () => void) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        callback();
      };

      const handleReady = () => {
        finish(() => resolve());
      };

      timeoutId = window.setTimeout(() => {
        finish(() => reject(new Error("Timed out while waiting for the camera preview.")));
      }, 10000);

      video.addEventListener("loadeddata", handleReady, { once: true });
      video.addEventListener("canplay", handleReady, { once: true });
      video.addEventListener("playing", handleReady, { once: true });
      void video.play().catch(() => {});
    });

    await video.play();
  }

  private async optimizeActiveTrack(): Promise<void> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) {
      return;
    }

    const settings = track.getSettings();
    const constraints: AdvancedTrackConstraints = {};
    const capabilities =
      typeof track.getCapabilities === "function"
        ? (track.getCapabilities() as ExtendedMediaTrackCapabilities)
        : null;

    if ((settings.width ?? 0) < 1280) {
      constraints.width = { ideal: 1920 };
      constraints.height = { ideal: 1080 };
      constraints.frameRate = { ideal: 30, max: 30 };
    }

    const advanced: Array<Record<string, unknown>> = [];
    if (capabilities?.focusMode?.includes("continuous")) {
      advanced.push({ focusMode: "continuous" });
    } else if (capabilities?.focusMode?.includes("single-shot")) {
      advanced.push({ focusMode: "single-shot" });
    }

    if (capabilities?.exposureMode?.includes("continuous")) {
      advanced.push({ exposureMode: "continuous" });
    }

    if (advanced.length > 0) {
      constraints.advanced = advanced;
    }

    if (Object.keys(constraints).length === 0) {
      return;
    }

    try {
      await track.applyConstraints(constraints);
    } catch {
      // Best effort only. Browsers often reject unsupported runtime constraints.
    }
  }

  private scheduleScan(sessionId: number, onSuccess: (decodedText: string) => void) {
    const tick = (timestamp: number) => {
      if (!this.isRunning || this.sessionId !== sessionId) {
        return;
      }

      if (
        !this.scanInFlight &&
        this.video &&
        this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        timestamp - this.lastScanAt >= SCAN_INTERVAL_MS
      ) {
        this.lastScanAt = timestamp;
        this.scanInFlight = true;

        void this.scanCurrentFrame()
          .then((decodedText) => {
            if (!decodedText || !this.isRunning || this.sessionId !== sessionId) {
              return;
            }

            onSuccess(decodedText);
            void this.stop();
          })
          .finally(() => {
            this.scanInFlight = false;
          });
      }

      this.scanFrameId = window.requestAnimationFrame(tick);
    };

    this.scanFrameId = window.requestAnimationFrame(tick);
  }

  private async scanCurrentFrame(): Promise<string | null> {
    const video = this.video;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    if (this.barcodeDetector && this.scanPassIndex % 2 === 0) {
      const nativeResult = await this.tryDecodeWithBarcodeDetector(video);
      if (nativeResult) {
        this.scanPassIndex++;
        return nativeResult;
      }
    }

    const regions = this.buildScanRegions(video.videoWidth, video.videoHeight, this.scanPassIndex);
    this.scanPassIndex++;

    for (const region of regions) {
      if (!this.isRunning) {
        return null;
      }

      const canvas = this.drawRegionToCanvas(video, region);
      const decodedText = await this.tryDecodeWithZxing(canvas);
      if (decodedText) {
        return decodedText;
      }
    }

    return null;
  }

  private async scanImageSource(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
  ): Promise<string | null> {
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return null;
    }

    const nativeResult = await this.tryDecodeWithBarcodeDetector(source);
    if (nativeResult) {
      return nativeResult;
    }

    for (let passIndex = 0; passIndex < 4; passIndex += 1) {
      const regions = this.buildScanRegions(sourceWidth, sourceHeight, passIndex);
      for (const region of regions) {
        const canvas = this.drawRegionToCanvas(source, region);
        const decodedText = await this.tryDecodeWithZxing(canvas);
        if (decodedText) {
          return decodedText;
        }
      }
    }

    return null;
  }

  private async tryDecodeWithBarcodeDetector(source: CanvasImageSource): Promise<string | null> {
    if (!this.barcodeDetector) {
      return null;
    }

    try {
      const results = await this.barcodeDetector.detect(source);
      return results[0]?.rawValue ?? null;
    } catch {
      return null;
    }
  }

  private buildScanRegions(
    frameWidth: number,
    frameHeight: number,
    passIndex: number,
  ): ScanRegion[] {
    const quadrantRegions = [
      this.createCornerRegion(frameWidth, frameHeight, 0, 0),
      this.createCornerRegion(frameWidth, frameHeight, 1, 0),
      this.createCornerRegion(frameWidth, frameHeight, 0, 1),
      this.createCornerRegion(frameWidth, frameHeight, 1, 1),
    ];

    const regions = [
      { x: 0, y: 0, width: frameWidth, height: frameHeight },
      this.createCenteredRegion(frameWidth, frameHeight, 0.82),
      quadrantRegions[passIndex % quadrantRegions.length],
    ];

    if (passIndex % 2 === 0) {
      regions.push(this.createCenteredRegion(frameWidth, frameHeight, 0.62));
    }

    return this.deduplicateRegions(regions);
  }

  private createCenteredRegion(frameWidth: number, frameHeight: number, scale: number): ScanRegion {
    const width = Math.max(1, Math.floor(frameWidth * scale));
    const height = Math.max(1, Math.floor(frameHeight * scale));

    return {
      x: Math.floor((frameWidth - width) / 2),
      y: Math.floor((frameHeight - height) / 2),
      width,
      height,
    };
  }

  private createCornerRegion(
    frameWidth: number,
    frameHeight: number,
    horizontalAnchor: 0 | 1,
    verticalAnchor: 0 | 1,
  ): ScanRegion {
    const width = Math.max(1, Math.floor(frameWidth * 0.72));
    const height = Math.max(1, Math.floor(frameHeight * 0.72));

    return {
      x: horizontalAnchor === 0 ? 0 : frameWidth - width,
      y: verticalAnchor === 0 ? 0 : frameHeight - height,
      width,
      height,
    };
  }

  private deduplicateRegions(regions: ScanRegion[]): ScanRegion[] {
    const seen = new Set<string>();

    return regions.filter((region) => {
      const key = `${region.x}:${region.y}:${region.width}:${region.height}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private drawRegionToCanvas(source: CanvasImageSource, region: ScanRegion): HTMLCanvasElement {
    const canvas = this.ensureScanCanvas(region.width, region.height);
    const context = this.scanContext;

    if (!context) {
      throw new Error("Failed to initialize the scan canvas context.");
    }

    const maxRegionSide = Math.max(region.width, region.height);
    const scale = Math.min(MAX_DECODE_DIMENSION / maxRegionSide, MAX_UPSCALE_FACTOR);
    const targetScale = Math.max(1, scale);
    const targetWidth = Math.max(1, Math.floor(region.width * targetScale));
    const targetHeight = Math.max(1, Math.floor(region.height * targetScale));

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.imageSmoothingEnabled = false;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      source,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return canvas;
  }

  private loadImageElement(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const imageUrl = URL.createObjectURL(blob);
      const image = new Image();

      const cleanup = () => {
        URL.revokeObjectURL(imageUrl);
      };

      image.onload = () => {
        cleanup();
        resolve(image);
      };

      image.onerror = () => {
        cleanup();
        reject(new Error("Failed to load the selected image."));
      };

      image.src = imageUrl;
    });
  }

  private ensureScanCanvas(frameWidth: number, frameHeight: number): HTMLCanvasElement {
    if (!this.scanCanvas) {
      this.scanCanvas = document.createElement("canvas");
      this.scanCanvas.width = frameWidth;
      this.scanCanvas.height = frameHeight;
      this.scanContext = this.scanCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (!this.scanContext) {
        throw new Error("Failed to create a 2D scan context.");
      }

      this.scanContext.imageSmoothingEnabled = false;
    }

    return this.scanCanvas;
  }

  private async tryDecodeWithZxing(canvas: HTMLCanvasElement): Promise<string | null> {
    try {
      const { decodeQrCanvasWithZxing } = await loadZxingQrDecoderModule();
      return decodeQrCanvasWithZxing(canvas, this.invertNextZxingDecode);
    } finally {
      this.invertNextZxingDecode = !this.invertNextZxingDecode;
    }
  }
}
