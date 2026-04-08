import "./style.css";
import { t, type TranslationKey } from "@/utils/i18n";
import { openUrl } from "@/utils/runtime";
import { registerSW } from "virtual:pwa-register";
import {
  getInitialLocale,
  getResolvedSettings,
  normalizeLocale,
  saveAppSettings,
  type SupportedLocale,
  type SupportedTheme,
} from "@/utils/settings";
import { renderMainTemplate, renderOnboardingTemplate } from "./templates";

const app = document.querySelector<HTMLDivElement>("#app")!;
const DEFAULT_SCANNER_ASPECT_RATIO = 16 / 9;
const THEME_META_COLORS: Record<SupportedTheme, string> = {
  emerald: "#0b5d4c",
  dracula: "#282a36",
};

type GenerateStatusType = "success" | "info" | "error";
type InstallMode = "hidden" | "ios" | "native";
type MainTab = "generate" | "scan";
type QRScannerError =
  | { code: "permission-denied" }
  | { code: "camera-start-failed"; detail: string };
type GeneratorModule = typeof import("@/components/generator");
type ScannerModule = typeof import("@/components/scanner");
type QRScannerController = InstanceType<ScannerModule["QRScanner"]>;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface AppState {
  locale: SupportedLocale;
  theme: SupportedTheme;
  onboardingCompleted: boolean;
  installHintDismissed: boolean;
  installMode: InstallMode;
  isInstallDialogOpen: boolean;
  isInstalled: boolean;
  selectedTab: MainTab;
  genInputText: string;
  generatedText: string | null;
  isQrDialogOpen: boolean;
  scanResultText: string | null;
}

interface MainElements {
  languageSelect: HTMLSelectElement;
  installAppBtn: HTMLButtonElement;
  installBanner: HTMLDivElement;
  installBannerText: HTMLSpanElement;
  installBannerActionBtn: HTMLButtonElement;
  installBannerCloseBtn: HTMLButtonElement;
  installDialog: HTMLDialogElement;
  themeToggleBtn: HTMLButtonElement;
  scanBtn: HTMLButtonElement;
  scanLocalImageBtn: HTMLButtonElement;
  scanClipboardBtn: HTMLButtonElement;
  scanImageInput: HTMLInputElement;
  scannerContainer: HTMLDivElement;
  scannerPreview: HTMLDivElement;
  scannerLoading: HTMLDivElement;
  qrReader: HTMLDivElement;
  scanStatus: HTMLDivElement;
  scanStatusText: HTMLSpanElement;
  scanStatusCloseBtn: HTMLButtonElement;
  scanResult: HTMLDivElement;
  scanResultCloseBtn: HTMLButtonElement;
  resultText: HTMLDivElement;
  copyBtn: HTMLButtonElement;
  openBtn: HTMLButtonElement;
  genInput: HTMLTextAreaElement;
  genClearBtn: HTMLButtonElement;
  genBtn: HTMLButtonElement;
  genStatus: HTMLDivElement;
  qrDialog: HTMLDialogElement;
  qrDialogBox: HTMLDivElement;
  qrFullscreenBtn: HTMLButtonElement;
  qrCanvasStage: HTMLDivElement;
  qrCanvas: HTMLCanvasElement;
  qrContextMenu: HTMLUListElement;
  copyImageBtn: HTMLButtonElement;
  downloadImageBtn: HTMLButtonElement;
  cameraHint: HTMLDivElement;
  tabs: HTMLInputElement[];
}

const state: AppState = {
  locale: getInitialLocale(),
  theme: "emerald",
  onboardingCompleted: false,
  installHintDismissed: false,
  installMode: "hidden",
  isInstallDialogOpen: false,
  isInstalled: false,
  selectedTab: "generate",
  genInputText: "",
  generatedText: null,
  isQrDialogOpen: false,
  scanResultText: null,
};

let mainElements: MainElements | null = null;
let scanning = false;
let disposeVideoReadyWatcher: (() => void) | null = null;
let hideGenerateStatusTimer: number | null = null;
let resetCopyButtonTimer: number | null = null;
let globalListenersBound = false;
let installEventsBound = false;
let scanRequestToken = 0;
let generatorModulePromise: Promise<GeneratorModule> | null = null;
let scannerModulePromise: Promise<ScannerModule> | null = null;
let scannerInstance: QRScannerController | null = null;
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

function loadGeneratorModule() {
  generatorModulePromise ??= import("@/components/generator");
  return generatorModulePromise;
}

function loadScannerModule() {
  scannerModulePromise ??= import("@/components/scanner");
  return scannerModulePromise;
}

async function getScanner() {
  if (scannerInstance) {
    return scannerInstance;
  }

  const { QRScanner } = await loadScannerModule();
  scannerInstance = new QRScanner("qr-reader");
  return scannerInstance;
}

async function checkCameraPermission(): Promise<PermissionState> {
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

function translate(key: TranslationKey, params?: Record<string, string | number>) {
  return t(state.locale, key, params);
}

function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function updateDocumentMetadata(title: string) {
  document.documentElement.lang = state.locale;
  document.documentElement.dataset.theme = state.theme;
  document.title = title;

  const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColorMeta?.setAttribute("content", THEME_META_COLORS[state.theme]);

  const appleTitleMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-title"]',
  );
  appleTitleMeta?.setAttribute("content", title);
}

function isIosDevice() {
  const userAgent = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent);
}

function isMobileLikeDevice() {
  return isIosDevice() || isAndroidDevice() || /Mobi|Mobile/i.test(navigator.userAgent);
}

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

function resolveInstallMode(): InstallMode {
  if (state.isInstalled || isStandaloneApp() || !isMobileLikeDevice()) {
    return "hidden";
  }

  if (isIosDevice()) {
    return "ios";
  }

  if (deferredInstallPrompt) {
    return "native";
  }

  return "hidden";
}

function getInstallBannerCopy() {
  return translate(state.installMode === "ios" ? "installBannerIos" : "installBannerNative");
}

function clearTimers() {
  if (hideGenerateStatusTimer !== null) {
    window.clearTimeout(hideGenerateStatusTimer);
    hideGenerateStatusTimer = null;
  }

  if (resetCopyButtonTimer !== null) {
    window.clearTimeout(resetCopyButtonTimer);
    resetCopyButtonTimer = null;
  }
}

function showStatus(message: string, type: "info" | "warning" | "error") {
  if (!mainElements) {
    return;
  }

  mainElements.scanStatus.className = `alert alert-${type} relative text-sm pr-10`;
  mainElements.scanStatusText.textContent = message;
  mainElements.scanStatus.classList.remove("hidden");
}

function hideStatus() {
  if (!mainElements) {
    return;
  }

  mainElements.scanStatus.classList.add("hidden");
  mainElements.scanStatusText.textContent = "";
}

function showGenerateStatus(message: string, type: GenerateStatusType = "error") {
  if (!mainElements) {
    return;
  }

  if (hideGenerateStatusTimer !== null) {
    window.clearTimeout(hideGenerateStatusTimer);
  }

  mainElements.genStatus.className = `alert alert-${type} text-sm`;
  mainElements.genStatus.textContent = message;
  mainElements.genStatus.classList.remove("hidden");
  hideGenerateStatusTimer = null;
}

function resolveGenerateErrorMessage(
  error: unknown,
  fallbackKey: TranslationKey,
  options?: { preserveErrorMessage?: boolean },
) {
  if (
    error instanceof Error &&
    error.name === "QRCodeGenerationError" &&
    "code" in error &&
    error.code === "data-too-large"
  ) {
    return translate("generateTooLarge");
  }

  if (options?.preserveErrorMessage && error instanceof Error && error.message) {
    return error.message;
  }

  return translate(fallbackKey);
}

function hideGenerateStatus() {
  if (hideGenerateStatusTimer !== null) {
    window.clearTimeout(hideGenerateStatusTimer);
    hideGenerateStatusTimer = null;
  }

  if (mainElements) {
    mainElements.genStatus.classList.add("hidden");
    mainElements.genStatus.textContent = "";
  }
}

function updateGenerateButtonState() {
  if (!mainElements) {
    return;
  }

  const hasAnyInput = mainElements.genInput.value.length > 0;
  const hasGeneratableInput = mainElements.genInput.value.trim().length > 0;
  mainElements.genBtn.disabled = !hasGeneratableInput;
  mainElements.genClearBtn.classList.toggle("hidden", !hasAnyInput);
}

function closeQrContextMenu() {
  mainElements?.qrContextMenu.classList.add("hidden");
}

function openQrDialog() {
  if (!mainElements) {
    return;
  }

  state.isQrDialogOpen = true;

  if (!mainElements.qrDialog.open) {
    mainElements.qrDialog.showModal();
  }
}

function closeQrDialog() {
  if (!mainElements) {
    state.isQrDialogOpen = false;
    return;
  }

  closeQrContextMenu();
  state.isQrDialogOpen = false;

  if (mainElements.qrDialog.open) {
    mainElements.qrDialog.close();
  }

  if (isQrDialogFullscreen()) {
    void document.exitFullscreen();
  }
}

function isQrDialogFullscreen() {
  return !!mainElements && document.fullscreenElement === mainElements.qrDialogBox;
}

function syncQrFullscreenButton() {
  if (!mainElements) {
    return;
  }

  const isFullscreen = isQrDialogFullscreen();
  const label = translate(isFullscreen ? "exitFullscreen" : "enterFullscreen");
  mainElements.qrFullscreenBtn.setAttribute("aria-label", label);
  mainElements.qrFullscreenBtn.setAttribute("title", label);
  mainElements.qrFullscreenBtn.classList.toggle("btn-active", isFullscreen);
}

async function toggleQrFullscreen() {
  if (!mainElements) {
    return;
  }

  try {
    if (isQrDialogFullscreen()) {
      await document.exitFullscreen();
    } else if (typeof mainElements.qrDialogBox.requestFullscreen === "function") {
      await mainElements.qrDialogBox.requestFullscreen();
    } else {
      throw new Error(translate("fullscreenFailed"));
    }
  } catch (error) {
    showGenerateStatus(
      error instanceof Error && error.message ? error.message : translate("fullscreenFailed"),
    );
  } finally {
    syncQrFullscreenButton();
  }
}

function clearGeneratedCode() {
  if (!mainElements) {
    state.generatedText = null;
    state.isQrDialogOpen = false;
    return;
  }

  closeQrDialog();
  state.generatedText = null;

  const context = mainElements.qrCanvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, mainElements.qrCanvas.width, mainElements.qrCanvas.height);
  }

  mainElements.qrCanvas.width = 0;
  mainElements.qrCanvas.height = 0;
}

function hasGeneratedQrCode() {
  return !!mainElements && mainElements.qrCanvas.width > 0 && mainElements.qrCanvas.height > 0;
}

function openQrContextMenu(event: MouseEvent) {
  if (!mainElements || !hasGeneratedQrCode()) {
    return;
  }

  event.preventDefault();
  mainElements.qrContextMenu.classList.remove("hidden");

  const stageRect = mainElements.qrCanvasStage.getBoundingClientRect();
  const menuRect = mainElements.qrContextMenu.getBoundingClientRect();
  const padding = 8;
  const rawLeft = event.clientX - stageRect.left;
  const rawTop = event.clientY - stageRect.top;
  const maxLeft = Math.max(padding, stageRect.width - menuRect.width - padding);
  const maxTop = Math.max(padding, stageRect.height - menuRect.height - padding);
  const left = Math.min(Math.max(rawLeft, padding), maxLeft);
  const top = Math.min(Math.max(rawTop, padding), maxTop);

  mainElements.qrContextMenu.style.left = `${left}px`;
  mainElements.qrContextMenu.style.top = `${top}px`;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(translate("qrExportFailed")));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function buildQrFilename() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `qrcode-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
}

async function copyQrImageToClipboard() {
  if (!mainElements) {
    return;
  }

  const blob = await canvasToPngBlob(mainElements.qrCanvas);

  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return;
  }

  throw new Error(translate("copyImageUnsupported"));
}

async function downloadQrImage() {
  if (!mainElements) {
    return;
  }

  const blob = await canvasToPngBlob(mainElements.qrCanvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = buildQrFilename();
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function setScanButtonState(isScanning: boolean) {
  if (!mainElements) {
    return;
  }

  mainElements.scanBtn.textContent = isScanning ? translate("scanStop") : translate("scanStart");
  mainElements.scanBtn.classList.remove("btn-primary", "btn-secondary");
  mainElements.scanBtn.classList.add(isScanning ? "btn-secondary" : "btn-primary");
}

function clearScanResult() {
  if (!mainElements) {
    return;
  }

  state.scanResultText = null;
  if (resetCopyButtonTimer !== null) {
    window.clearTimeout(resetCopyButtonTimer);
    resetCopyButtonTimer = null;
  }
  mainElements.resultText.textContent = "";
  mainElements.scanResult.classList.add("hidden");
  mainElements.copyBtn.textContent = translate("copyText");
  mainElements.openBtn.classList.add("hidden");
}

function showScanResult(decodedText: string) {
  if (!mainElements) {
    return;
  }

  state.scanResultText = decodedText;
  mainElements.resultText.textContent = decodedText;
  mainElements.scanResult.classList.remove("hidden");
  mainElements.openBtn.classList.toggle("hidden", !isValidUrl(decodedText));
}

function setScannerLoading(isLoading: boolean) {
  mainElements?.scannerLoading.classList.toggle("hidden", !isLoading);
}

function resetScannerPreviewAspectRatio() {
  mainElements?.scannerPreview.style.setProperty(
    "--scanner-aspect-ratio",
    String(DEFAULT_SCANNER_ASPECT_RATIO),
  );
}

function syncScannerPreviewAspectRatio(video: HTMLVideoElement | null) {
  if (!mainElements || !video || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return;
  }

  mainElements.scannerPreview.style.setProperty(
    "--scanner-aspect-ratio",
    String(video.videoWidth / video.videoHeight),
  );
}

function watchScannerVideoReady() {
  if (!mainElements) {
    return;
  }

  disposeVideoReadyWatcher?.();
  resetScannerPreviewAspectRatio();
  setScannerLoading(true);

  let cleanedUp = false;
  let observer: MutationObserver | null = null;
  let timeoutId: number | null = null;
  let currentVideo: HTMLVideoElement | null = null;

  const handleReady = () => {
    syncScannerPreviewAspectRatio(currentVideo);
    setScannerLoading(false);
    cleanup();
  };

  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    observer?.disconnect();

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }

    if (currentVideo) {
      currentVideo.removeEventListener("loadeddata", handleReady);
      currentVideo.removeEventListener("canplay", handleReady);
      currentVideo.removeEventListener("playing", handleReady);
    }

    if (disposeVideoReadyWatcher === cleanup) {
      disposeVideoReadyWatcher = null;
    }
  };

  const bindVideo = (video: HTMLVideoElement | null) => {
    if (!video || currentVideo === video) {
      return;
    }

    if (currentVideo) {
      currentVideo.removeEventListener("loadeddata", handleReady);
      currentVideo.removeEventListener("canplay", handleReady);
      currentVideo.removeEventListener("playing", handleReady);
    }

    currentVideo = video;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      handleReady();
      return;
    }

    video.addEventListener("loadeddata", handleReady, { once: true });
    video.addEventListener("canplay", handleReady, { once: true });
    video.addEventListener("playing", handleReady, { once: true });
  };

  bindVideo(mainElements.qrReader.querySelector("video"));

  observer = new MutationObserver(() => {
    bindVideo(mainElements?.qrReader.querySelector("video") ?? null);
  });
  observer.observe(mainElements.qrReader, { childList: true, subtree: true });

  timeoutId = window.setTimeout(() => {
    setScannerLoading(false);
    cleanup();
  }, 10000);

  disposeVideoReadyWatcher = cleanup;
}

async function stopScanner() {
  scanRequestToken += 1;
  disposeVideoReadyWatcher?.();
  disposeVideoReadyWatcher = null;
  setScannerLoading(false);
  resetScannerPreviewAspectRatio();

  if (scanning && scannerInstance) {
    await scannerInstance.stop();
  }

  scanning = false;
  setScanButtonState(false);
  mainElements?.scannerContainer.classList.add("hidden");
}

function handleScannerError(error: QRScannerError) {
  void stopScanner();

  const message =
    error.code === "permission-denied"
      ? translate("permissionDenied")
      : translate("cameraStartFailed", { detail: error.detail });

  showStatus(message, "error");
}

async function decodeImageBlob(blob: Blob, loadingMessage: string) {
  hideStatus();
  clearScanResult();
  showStatus(loadingMessage, "info");

  try {
    const scanner = await getScanner();
    const decodedText = await scanner.scanImageBlob(blob);

    if (!decodedText) {
      showStatus(translate("scanImageNotFound"), "warning");
      return;
    }

    hideStatus();
    showScanResult(decodedText);
  } catch (error) {
    console.error("Image QR scan failed:", error);
    showStatus(translate("scanImageReadFailed"), "error");
  }
}

async function getClipboardImageBlob(): Promise<Blob> {
  if (!navigator.clipboard?.read) {
    throw new Error(translate("scanClipboardUnsupported"));
  }

  let clipboardItems: ClipboardItem[];
  try {
    clipboardItems = await navigator.clipboard.read();
  } catch {
    throw new Error(translate("scanClipboardFailed"));
  }

  for (const item of clipboardItems) {
    const imageType = item.types.find((type) => type.startsWith("image/"));
    if (imageType) {
      return item.getType(imageType);
    }
  }

  throw new Error(translate("scanClipboardEmpty"));
}

async function renderGeneratedCode(
  text: string,
  options?: { syncInput?: boolean; openDialog?: boolean },
) {
  if (!mainElements) {
    return;
  }

  closeQrContextMenu();
  state.generatedText = text;

  if (options?.syncInput) {
    state.genInputText = text;
    mainElements.genInput.value = text;
  }

  updateGenerateButtonState();
  hideGenerateStatus();
  const { generateQRCode } = await loadGeneratorModule();
  await generateQRCode(mainElements.qrCanvas, text);

  if (options?.openDialog ?? true) {
    openQrDialog();
  }
}

async function syncCameraPermissionHint() {
  if (!mainElements) {
    return;
  }

  const cameraHint = mainElements.cameraHint;
  const permissionState = await checkCameraPermission();

  if (mainElements?.cameraHint !== cameraHint) {
    return;
  }

  cameraHint.classList.toggle("hidden", permissionState === "granted");
}

function syncInstallUi() {
  if (!mainElements) {
    return;
  }

  state.installMode = resolveInstallMode();
  const shouldShowInstallButton = state.installMode !== "hidden";
  const shouldShowInstallBanner = shouldShowInstallButton && !state.installHintDismissed;

  mainElements.installAppBtn.classList.toggle("hidden", !shouldShowInstallButton);
  mainElements.installBanner.classList.toggle("hidden", !shouldShowInstallBanner);
  mainElements.installBannerText.textContent = shouldShowInstallButton
    ? getInstallBannerCopy()
    : "";

  if (!shouldShowInstallButton && mainElements.installDialog.open) {
    mainElements.installDialog.close();
  } else if (
    state.installMode === "ios" &&
    state.isInstallDialogOpen &&
    !mainElements.installDialog.open
  ) {
    mainElements.installDialog.showModal();
  }
}

function registerPwa() {
  registerSW({ immediate: true });
}

function bindInstallEvents() {
  if (installEventsBound) {
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    syncInstallUi();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    state.isInstalled = true;
    state.isInstallDialogOpen = false;
    syncInstallUi();
  });

  const standaloneMediaQuery = window.matchMedia("(display-mode: standalone)");
  const handleStandaloneChange = () => {
    state.isInstalled = isStandaloneApp();
    if (state.isInstalled) {
      state.isInstallDialogOpen = false;
    }
    syncInstallUi();
  };

  if (typeof standaloneMediaQuery.addEventListener === "function") {
    standaloneMediaQuery.addEventListener("change", handleStandaloneChange);
  } else if (typeof standaloneMediaQuery.addListener === "function") {
    standaloneMediaQuery.addListener(handleStandaloneChange);
  }

  installEventsBound = true;
}

function getMainElements(): MainElements {
  return {
    languageSelect: document.querySelector<HTMLSelectElement>("#main-language-select")!,
    installAppBtn: document.querySelector<HTMLButtonElement>("#install-app-btn")!,
    installBanner: document.querySelector<HTMLDivElement>("#install-banner")!,
    installBannerText: document.querySelector<HTMLSpanElement>("#install-banner-text")!,
    installBannerActionBtn: document.querySelector<HTMLButtonElement>(
      "#install-banner-action-btn",
    )!,
    installBannerCloseBtn: document.querySelector<HTMLButtonElement>("#install-banner-close-btn")!,
    installDialog: document.querySelector<HTMLDialogElement>("#install-dialog")!,
    themeToggleBtn: document.querySelector<HTMLButtonElement>("#theme-toggle-btn")!,
    scanBtn: document.querySelector<HTMLButtonElement>("#scan-btn")!,
    scanLocalImageBtn: document.querySelector<HTMLButtonElement>("#scan-local-image-btn")!,
    scanClipboardBtn: document.querySelector<HTMLButtonElement>("#scan-clipboard-btn")!,
    scanImageInput: document.querySelector<HTMLInputElement>("#scan-image-input")!,
    scannerContainer: document.querySelector<HTMLDivElement>("#scanner-container")!,
    scannerPreview: document.querySelector<HTMLDivElement>("#scanner-preview")!,
    scannerLoading: document.querySelector<HTMLDivElement>("#scanner-loading")!,
    qrReader: document.querySelector<HTMLDivElement>("#qr-reader")!,
    scanStatus: document.querySelector<HTMLDivElement>("#scan-status")!,
    scanStatusText: document.querySelector<HTMLSpanElement>("#scan-status-text")!,
    scanStatusCloseBtn: document.querySelector<HTMLButtonElement>("#scan-status-close-btn")!,
    scanResult: document.querySelector<HTMLDivElement>("#scan-result")!,
    scanResultCloseBtn: document.querySelector<HTMLButtonElement>("#scan-result-close-btn")!,
    resultText: document.querySelector<HTMLDivElement>("#result-text")!,
    copyBtn: document.querySelector<HTMLButtonElement>("#copy-btn")!,
    openBtn: document.querySelector<HTMLButtonElement>("#open-btn")!,
    genInput: document.querySelector<HTMLTextAreaElement>("#gen-input")!,
    genClearBtn: document.querySelector<HTMLButtonElement>("#gen-clear-btn")!,
    genBtn: document.querySelector<HTMLButtonElement>("#gen-btn")!,
    genStatus: document.querySelector<HTMLDivElement>("#gen-status")!,
    qrDialog: document.querySelector<HTMLDialogElement>("#qr-dialog")!,
    qrDialogBox: document.querySelector<HTMLDivElement>("#qr-dialog-box")!,
    qrFullscreenBtn: document.querySelector<HTMLButtonElement>("#qr-fullscreen-btn")!,
    qrCanvasStage: document.querySelector<HTMLDivElement>("#qr-canvas-stage")!,
    qrCanvas: document.querySelector<HTMLCanvasElement>("#qr-canvas")!,
    qrContextMenu: document.querySelector<HTMLUListElement>("#qr-context-menu")!,
    copyImageBtn: document.querySelector<HTMLButtonElement>("#copy-image-btn")!,
    downloadImageBtn: document.querySelector<HTMLButtonElement>("#download-image-btn")!,
    cameraHint: document.querySelector<HTMLDivElement>("#camera-hint")!,
    tabs: Array.from(document.querySelectorAll<HTMLInputElement>('input[name="qr_tabs"]')),
  };
}

function syncMainViewFromState() {
  if (!mainElements) {
    return;
  }

  syncInstallUi();
  mainElements.genInput.value = state.genInputText;
  updateGenerateButtonState();
  setScanButtonState(scanning);
  syncQrFullscreenButton();

  if (state.scanResultText) {
    showScanResult(state.scanResultText);
  } else {
    clearScanResult();
  }
}

function bindGlobalListeners() {
  if (globalListenersBound) {
    return;
  }

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      closeQrContextMenu();
      return;
    }

    if (mainElements?.qrContextMenu.contains(target)) {
      return;
    }

    closeQrContextMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeQrContextMenu();
    }
  });

  document.addEventListener("fullscreenchange", () => {
    syncQrFullscreenButton();
  });

  globalListenersBound = true;
}

async function bindMainViewEvents() {
  if (!mainElements) {
    return;
  }

  const elements = mainElements;

  const openInstallFlow = async () => {
    if (state.installMode === "ios") {
      state.isInstallDialogOpen = true;
      if (!elements.installDialog.open) {
        elements.installDialog.showModal();
      }
      return;
    }

    if (state.installMode !== "native" || !deferredInstallPrompt) {
      return;
    }

    const installPromptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;

    try {
      await installPromptEvent.prompt();
      await installPromptEvent.userChoice;
    } finally {
      syncInstallUi();
    }
  };

  elements.installAppBtn.addEventListener("click", () => {
    void openInstallFlow();
  });

  elements.installBannerActionBtn.addEventListener("click", () => {
    void openInstallFlow();
  });

  elements.installBannerCloseBtn.addEventListener("click", async () => {
    state.installHintDismissed = true;
    await saveAppSettings({ installHintDismissed: true });
    syncInstallUi();
  });

  elements.installDialog.addEventListener("close", () => {
    state.isInstallDialogOpen = false;
  });

  elements.themeToggleBtn.addEventListener("click", async () => {
    state.theme = state.theme === "dracula" ? "emerald" : "dracula";
    await saveAppSettings({ theme: state.theme });
    await renderMainView();
  });

  elements.languageSelect.addEventListener("change", async () => {
    state.locale = normalizeLocale(elements.languageSelect.value);
    await saveAppSettings({ locale: state.locale });
    await renderMainView();
  });

  elements.scanBtn.addEventListener("click", async () => {
    if (!mainElements) {
      return;
    }

    if (scanning) {
      await stopScanner();
      hideStatus();
      return;
    }

    clearScanResult();
    hideStatus();
    const requestToken = ++scanRequestToken;
    elements.scannerContainer.classList.remove("hidden");
    watchScannerVideoReady();
    scanning = true;
    setScanButtonState(true);

    try {
      const scanner = await getScanner();
      if (!mainElements || !scanning || requestToken !== scanRequestToken) {
        return;
      }

      await scanner.start((decodedText) => {
        if (!mainElements) {
          return;
        }

        state.scanResultText = decodedText;
        disposeVideoReadyWatcher?.();
        disposeVideoReadyWatcher = null;
        setScannerLoading(false);
        resetScannerPreviewAspectRatio();
        scanning = false;
        setScanButtonState(false);
        elements.scannerContainer.classList.add("hidden");
        hideStatus();
        showScanResult(decodedText);
      }, handleScannerError);

      await syncCameraPermissionHint();
    } catch (error) {
      await stopScanner();
      showStatus(
        translate("cameraStartFailed", {
          detail: error instanceof Error ? error.message : String(error),
        }),
        "error",
      );
    }
  });

  elements.scanLocalImageBtn.addEventListener("click", async () => {
    if (!mainElements) {
      return;
    }

    await stopScanner();
    hideStatus();
    elements.scanImageInput.value = "";
    elements.scanImageInput.click();
  });

  elements.scanImageInput.addEventListener("change", async () => {
    const file = elements.scanImageInput.files?.[0];
    if (!file) {
      return;
    }

    await stopScanner();

    try {
      await decodeImageBlob(file, translate("scanImageLoading"));
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : translate("scanImageReadFailed"),
        "error",
      );
    } finally {
      elements.scanImageInput.value = "";
    }
  });

  elements.scanClipboardBtn.addEventListener("click", async () => {
    await stopScanner();
    clearScanResult();
    hideStatus();
    showStatus(translate("scanClipboardLoading"), "info");

    try {
      const blob = await getClipboardImageBlob();
      await decodeImageBlob(blob, translate("scanImageLoading"));
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : translate("scanClipboardFailed"),
        "error",
      );
    }
  });

  elements.copyBtn.addEventListener("click", async () => {
    if (!mainElements || !state.scanResultText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.scanResultText);
      elements.copyBtn.textContent = translate("copiedText");

      if (resetCopyButtonTimer !== null) {
        window.clearTimeout(resetCopyButtonTimer);
      }

      resetCopyButtonTimer = window.setTimeout(() => {
        elements.copyBtn.textContent = translate("copyText");
      }, 1500);
    } catch (error) {
      showStatus(translate("copyFailed"), "error");
      console.error("Text copy failed:", error);
    }
  });

  elements.scanStatusCloseBtn.addEventListener("click", () => {
    hideStatus();
  });

  elements.scanResultCloseBtn.addEventListener("click", () => {
    clearScanResult();
  });

  elements.openBtn.addEventListener("click", () => {
    if (state.scanResultText && isValidUrl(state.scanResultText)) {
      void openUrl(state.scanResultText);
    }
  });

  elements.genInput.addEventListener("input", () => {
    state.genInputText = elements.genInput.value;
    if (!elements.genInput.value.trim()) {
      clearGeneratedCode();
      hideGenerateStatus();
    }
    updateGenerateButtonState();
  });

  elements.genClearBtn.addEventListener("click", () => {
    elements.genInput.value = "";
    state.genInputText = "";
    clearGeneratedCode();
    updateGenerateButtonState();
    hideGenerateStatus();
    elements.genInput.focus();
  });

  elements.genBtn.addEventListener("click", async () => {
    const text = elements.genInput.value.trim();
    state.genInputText = elements.genInput.value;

    if (!text) {
      return;
    }

    try {
      await renderGeneratedCode(text);
    } catch (error) {
      clearGeneratedCode();
      showGenerateStatus(resolveGenerateErrorMessage(error, "generateFailed"));
      console.error("QR generation failed:", error);
    }
  });

  elements.qrCanvas.addEventListener("contextmenu", openQrContextMenu);
  elements.qrFullscreenBtn.addEventListener("click", async () => {
    await toggleQrFullscreen();
  });
  elements.qrDialog.addEventListener("close", () => {
    closeQrContextMenu();
    state.isQrDialogOpen = false;

    if (isQrDialogFullscreen()) {
      void document.exitFullscreen();
    }
  });

  elements.copyImageBtn.addEventListener("click", async () => {
    closeQrContextMenu();

    try {
      await copyQrImageToClipboard();
    } catch (error) {
      showGenerateStatus(error instanceof Error ? error.message : translate("copyImageFailed"));
      console.error("QR image copy failed:", error);
    }
  });

  elements.downloadImageBtn.addEventListener("click", async () => {
    closeQrContextMenu();

    try {
      await downloadQrImage();
    } catch (error) {
      showGenerateStatus(translate("downloadImageFailed"));
      console.error("QR image download failed:", error);
    }
  });

  elements.tabs.forEach((tab) => {
    tab.addEventListener("change", async () => {
      closeQrContextMenu();
      state.selectedTab = tab.dataset.tab === "scan" ? "scan" : "generate";

      if (state.selectedTab !== "scan") {
        await stopScanner();
        hideStatus();
      }
    });
  });

  syncMainViewFromState();
  await syncCameraPermissionHint();

  if (state.generatedText) {
    try {
      await renderGeneratedCode(state.generatedText, {
        openDialog: state.isQrDialogOpen,
      });
    } catch (error) {
      state.generatedText = null;
      state.isQrDialogOpen = false;
      showGenerateStatus(resolveGenerateErrorMessage(error, "generateFailed"));
      console.error("Stored QR generation failed:", error);
    }
  }
}

async function renderMainView() {
  await stopScanner();
  clearTimers();
  updateDocumentMetadata(translate("appTitle"));
  app.innerHTML = renderMainTemplate(state.locale, state.theme, state.selectedTab);
  mainElements = getMainElements();
  resetScannerPreviewAspectRatio();
  await bindMainViewEvents();
}

function renderOnboardingView() {
  mainElements = null;
  clearTimers();
  updateDocumentMetadata(translate("appTitle"));
  app.innerHTML = renderOnboardingTemplate(state.locale);

  const languageSelect = document.querySelector<HTMLSelectElement>("#onboarding-language-select")!;
  const confirmButton = document.querySelector<HTMLButtonElement>("#onboarding-confirm-btn")!;

  languageSelect.value = state.locale;

  languageSelect.addEventListener("change", () => {
    state.locale = normalizeLocale(languageSelect.value);
    renderOnboardingView();
  });

  confirmButton.addEventListener("click", async () => {
    state.onboardingCompleted = true;
    await saveAppSettings({
      locale: state.locale,
      onboardingCompleted: true,
    });
    await renderMainView();
  });
}

async function init() {
  bindGlobalListeners();
  bindInstallEvents();
  registerPwa();

  const settings = await getResolvedSettings();
  state.locale = settings.locale;
  state.theme = settings.theme;
  state.onboardingCompleted = settings.onboardingCompleted;
  state.installHintDismissed = settings.installHintDismissed;
  state.isInstalled = isStandaloneApp();
  state.installMode = resolveInstallMode();

  if (state.onboardingCompleted) {
    await renderMainView();
    return;
  }

  renderOnboardingView();
}

void init();
