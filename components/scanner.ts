import { Html5Qrcode } from 'html5-qrcode';

export type QRScannerError =
  | { code: 'permission-denied' }
  | { code: 'permission-required' }
  | { code: 'camera-start-failed'; detail: string };

export class QRScanner {
  private html5Qrcode: Html5Qrcode | null = null;
  private elementId: string;

  constructor(elementId: string) {
    this.elementId = elementId;
  }

  async checkCameraPermission(): Promise<PermissionState> {
    try {
      const result = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      });
      return result.state;
    } catch {
      // Firefox doesn't support querying camera permission
      return 'prompt';
    }
  }

  async start(
    onSuccess: (decodedText: string) => void,
    onError: (error: QRScannerError) => void,
  ): Promise<void> {
    const permState = await this.checkCameraPermission();

    if (permState === 'denied') {
      onError({ code: 'permission-denied' });
      return;
    }

    if (permState === 'prompt') {
      // Open permission page in new tab
      const url = browser.runtime.getURL('/camera-permission.html');
      await browser.tabs.create({ url });
      onError({ code: 'permission-required' });
      return;
    }

    // Permission granted — start scanning
    this.html5Qrcode = new Html5Qrcode(this.elementId);
    try {
      await this.html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onSuccess(decodedText);
          void this.stop();
        },
        () => {}, // Ignore per-frame "no QR found"
      );
    } catch (err) {
      onError({
        code: 'camera-start-failed',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async stop(): Promise<void> {
    if (this.html5Qrcode?.isScanning) {
      await this.html5Qrcode.stop();
      this.html5Qrcode.clear();
    }
  }
}
