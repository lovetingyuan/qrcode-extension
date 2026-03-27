import './style.css';
import { generateQRCode } from '@/components/generator';
import { QRScanner, type QRScannerError } from '@/components/scanner';
import { t, type TranslationKey } from '@/utils/i18n';
import {
  getInitialLocale,
  getResolvedSettings,
  normalizeLocale,
  saveExtensionSettings,
  type SupportedLocale,
} from '@/utils/settings';
import { renderMainTemplate, renderOnboardingTemplate } from './templates';

const app = document.querySelector<HTMLDivElement>('#app')!;
const scanner = new QRScanner('qr-reader');
const DEFAULT_SCANNER_ASPECT_RATIO = 16 / 9;

type GenerateStatusType = 'success' | 'info' | 'error';
type MainTab = 'generate' | 'scan';
type BrowserClipboardApi = typeof browser & {
  clipboard?: {
    setImageData?: (imageData: ArrayBuffer, imageType: 'png' | 'jpeg') => Promise<void>;
  };
};

interface PopupState {
  locale: SupportedLocale;
  onboardingCompleted: boolean;
  selectedTab: MainTab;
  genInputText: string;
  generatedText: string | null;
  scanResultText: string | null;
}

interface MainElements {
  languageSelect: HTMLSelectElement;
  scanBtn: HTMLButtonElement;
  scannerContainer: HTMLDivElement;
  scannerPreview: HTMLDivElement;
  scannerLoading: HTMLDivElement;
  qrReader: HTMLDivElement;
  scanStatus: HTMLDivElement;
  scanResult: HTMLDivElement;
  resultText: HTMLDivElement;
  copyBtn: HTMLButtonElement;
  openBtn: HTMLButtonElement;
  genInput: HTMLTextAreaElement;
  genBtn: HTMLButtonElement;
  genCurrentUrlBtn: HTMLButtonElement;
  genStatus: HTMLDivElement;
  genOutput: HTMLDivElement;
  qrCanvasStage: HTMLDivElement;
  qrCanvas: HTMLCanvasElement;
  qrContextMenu: HTMLUListElement;
  copyImageBtn: HTMLButtonElement;
  downloadImageBtn: HTMLButtonElement;
  cameraHint: HTMLDivElement;
  tabs: HTMLInputElement[];
}

const state: PopupState = {
  locale: getInitialLocale(),
  onboardingCompleted: false,
  selectedTab: 'generate',
  genInputText: '',
  generatedText: null,
  scanResultText: null,
};

let mainElements: MainElements | null = null;
let scanning = false;
let disposeVideoReadyWatcher: (() => void) | null = null;
let hideGenerateStatusTimer: number | null = null;
let resetCopyButtonTimer: number | null = null;
let globalListenersBound = false;

function translate(key: TranslationKey, params?: Record<string, string | number>) {
  return t(state.locale, key, params);
}

function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSupportedTabUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

function updateDocumentMetadata(title: string) {
  document.documentElement.lang = state.locale;
  document.title = title;
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

function showStatus(message: string, type: 'info' | 'warning' | 'error') {
  if (!mainElements) {
    return;
  }

  mainElements.scanStatus.className = `alert alert-${type} text-sm`;
  mainElements.scanStatus.textContent = message;
  mainElements.scanStatus.classList.remove('hidden');
}

function hideStatus() {
  mainElements?.scanStatus.classList.add('hidden');
}

function showGenerateStatus(message: string, type: GenerateStatusType = 'error') {
  if (!mainElements) {
    return;
  }

  if (hideGenerateStatusTimer !== null) {
    window.clearTimeout(hideGenerateStatusTimer);
  }

  mainElements.genStatus.className = `alert alert-${type} text-sm`;
  mainElements.genStatus.textContent = message;
  mainElements.genStatus.classList.remove('hidden');
  hideGenerateStatusTimer = null;
}

function hideGenerateStatus() {
  if (hideGenerateStatusTimer !== null) {
    window.clearTimeout(hideGenerateStatusTimer);
    hideGenerateStatusTimer = null;
  }

  mainElements?.genStatus.classList.add('hidden');
}

function updateGenerateButtonState() {
  if (!mainElements) {
    return;
  }

  mainElements.genBtn.disabled = mainElements.genInput.value.trim().length === 0;
}

function closeQrContextMenu() {
  mainElements?.qrContextMenu.classList.add('hidden');
}

function hasGeneratedQrCode() {
  return (
    !!mainElements &&
    !mainElements.genOutput.classList.contains('hidden') &&
    mainElements.qrCanvas.width > 0 &&
    mainElements.qrCanvas.height > 0
  );
}

function openQrContextMenu(event: MouseEvent) {
  if (!mainElements || !hasGeneratedQrCode()) {
    return;
  }

  event.preventDefault();
  mainElements.qrContextMenu.classList.remove('hidden');

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
        reject(new Error(translate('qrExportFailed')));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

function buildQrFilename() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');

  return `qrcode-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
}

async function copyQrImageToClipboard() {
  if (!mainElements) {
    return;
  }

  const blob = await canvasToPngBlob(mainElements.qrCanvas);

  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return;
  }

  const clipboardApi = (browser as BrowserClipboardApi).clipboard;
  if (clipboardApi?.setImageData) {
    const buffer = await blob.arrayBuffer();
    await clipboardApi.setImageData(buffer, 'png');
    return;
  }

  throw new Error(translate('copyImageUnsupported'));
}

async function downloadQrImage() {
  if (!mainElements) {
    return;
  }

  const blob = await canvasToPngBlob(mainElements.qrCanvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

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

  mainElements.scanBtn.textContent = isScanning ? translate('scanStop') : translate('scanStart');
  mainElements.scanBtn.classList.remove('btn-primary', 'btn-secondary');
  mainElements.scanBtn.classList.add(isScanning ? 'btn-secondary' : 'btn-primary');
}

function setScannerLoading(isLoading: boolean) {
  mainElements?.scannerLoading.classList.toggle('hidden', !isLoading);
}

function resetScannerPreviewAspectRatio() {
  mainElements?.scannerPreview.style.setProperty(
    '--scanner-aspect-ratio',
    String(DEFAULT_SCANNER_ASPECT_RATIO),
  );
}

function syncScannerPreviewAspectRatio(video: HTMLVideoElement | null) {
  if (!mainElements || !video || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return;
  }

  mainElements.scannerPreview.style.setProperty(
    '--scanner-aspect-ratio',
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
      currentVideo.removeEventListener('loadeddata', handleReady);
      currentVideo.removeEventListener('canplay', handleReady);
      currentVideo.removeEventListener('playing', handleReady);
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
      currentVideo.removeEventListener('loadeddata', handleReady);
      currentVideo.removeEventListener('canplay', handleReady);
      currentVideo.removeEventListener('playing', handleReady);
    }

    currentVideo = video;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      handleReady();
      return;
    }

    video.addEventListener('loadeddata', handleReady, { once: true });
    video.addEventListener('canplay', handleReady, { once: true });
    video.addEventListener('playing', handleReady, { once: true });
  };

  bindVideo(mainElements.qrReader.querySelector('video'));

  observer = new MutationObserver(() => {
    bindVideo(mainElements?.qrReader.querySelector('video') ?? null);
  });
  observer.observe(mainElements.qrReader, { childList: true, subtree: true });

  timeoutId = window.setTimeout(() => {
    setScannerLoading(false);
    cleanup();
  }, 10000);

  disposeVideoReadyWatcher = cleanup;
}

async function stopScanner() {
  disposeVideoReadyWatcher?.();
  disposeVideoReadyWatcher = null;
  setScannerLoading(false);
  resetScannerPreviewAspectRatio();

  if (scanning) {
    await scanner.stop();
  }

  scanning = false;
  setScanButtonState(false);
  mainElements?.scannerContainer.classList.add('hidden');
}

function handleScannerError(error: QRScannerError) {
  void stopScanner();

  const message =
    error.code === 'permission-denied'
      ? translate('permissionDenied')
      : error.code === 'permission-required'
        ? translate('permissionRequired')
        : translate('cameraStartFailed', { detail: error.detail });

  showStatus(message, 'error');
}

async function renderGeneratedCode(text: string, options?: { syncInput?: boolean }) {
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
  await generateQRCode(mainElements.qrCanvas, text);
  mainElements.genOutput.classList.remove('hidden');
}

async function syncCameraPermissionHint() {
  if (!mainElements) {
    return;
  }

  const cameraHint = mainElements.cameraHint;
  const permissionState = await scanner.checkCameraPermission();

  if (mainElements?.cameraHint !== cameraHint) {
    return;
  }

  cameraHint.classList.toggle('hidden', permissionState === 'granted');
}

function getMainElements(): MainElements {
  return {
    languageSelect: document.querySelector<HTMLSelectElement>('#main-language-select')!,
    scanBtn: document.querySelector<HTMLButtonElement>('#scan-btn')!,
    scannerContainer: document.querySelector<HTMLDivElement>('#scanner-container')!,
    scannerPreview: document.querySelector<HTMLDivElement>('#scanner-preview')!,
    scannerLoading: document.querySelector<HTMLDivElement>('#scanner-loading')!,
    qrReader: document.querySelector<HTMLDivElement>('#qr-reader')!,
    scanStatus: document.querySelector<HTMLDivElement>('#scan-status')!,
    scanResult: document.querySelector<HTMLDivElement>('#scan-result')!,
    resultText: document.querySelector<HTMLDivElement>('#result-text')!,
    copyBtn: document.querySelector<HTMLButtonElement>('#copy-btn')!,
    openBtn: document.querySelector<HTMLButtonElement>('#open-btn')!,
    genInput: document.querySelector<HTMLTextAreaElement>('#gen-input')!,
    genBtn: document.querySelector<HTMLButtonElement>('#gen-btn')!,
    genCurrentUrlBtn: document.querySelector<HTMLButtonElement>('#gen-current-url-btn')!,
    genStatus: document.querySelector<HTMLDivElement>('#gen-status')!,
    genOutput: document.querySelector<HTMLDivElement>('#gen-output')!,
    qrCanvasStage: document.querySelector<HTMLDivElement>('#qr-canvas-stage')!,
    qrCanvas: document.querySelector<HTMLCanvasElement>('#qr-canvas')!,
    qrContextMenu: document.querySelector<HTMLUListElement>('#qr-context-menu')!,
    copyImageBtn: document.querySelector<HTMLButtonElement>('#copy-image-btn')!,
    downloadImageBtn: document.querySelector<HTMLButtonElement>('#download-image-btn')!,
    cameraHint: document.querySelector<HTMLDivElement>('#camera-hint')!,
    tabs: Array.from(document.querySelectorAll<HTMLInputElement>('input[name="qr_tabs"]')),
  };
}

function syncMainViewFromState() {
  if (!mainElements) {
    return;
  }

  mainElements.genInput.value = state.genInputText;
  updateGenerateButtonState();
  setScanButtonState(scanning);

  if (state.scanResultText) {
    mainElements.resultText.textContent = state.scanResultText;
    mainElements.scanResult.classList.remove('hidden');
    mainElements.openBtn.classList.toggle('hidden', !isValidUrl(state.scanResultText));
  } else {
    mainElements.resultText.textContent = '';
    mainElements.scanResult.classList.add('hidden');
    mainElements.openBtn.classList.add('hidden');
  }
}

function bindGlobalListeners() {
  if (globalListenersBound) {
    return;
  }

  document.addEventListener('pointerdown', (event) => {
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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeQrContextMenu();
    }
  });

  globalListenersBound = true;
}

async function bindMainViewEvents() {
  if (!mainElements) {
    return;
  }

  mainElements.languageSelect.addEventListener('change', async () => {
    state.locale = normalizeLocale(mainElements?.languageSelect.value);
    await saveExtensionSettings({ locale: state.locale });
    await renderMainView();
  });

  mainElements.scanBtn.addEventListener('click', async () => {
    if (!mainElements) {
      return;
    }

    if (scanning) {
      await stopScanner();
      hideStatus();
      return;
    }

    state.scanResultText = null;
    mainElements.scanResult.classList.add('hidden');
    hideStatus();
    mainElements.scannerContainer.classList.remove('hidden');
    watchScannerVideoReady();
    scanning = true;
    setScanButtonState(true);

    await scanner.start(
      (decodedText) => {
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
        mainElements.scannerContainer.classList.add('hidden');
        hideStatus();

        mainElements.resultText.textContent = decodedText;
        mainElements.scanResult.classList.remove('hidden');
        mainElements.openBtn.classList.toggle('hidden', !isValidUrl(decodedText));
      },
      handleScannerError,
    );
  });

  mainElements.copyBtn.addEventListener('click', async () => {
    if (!mainElements || !state.scanResultText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.scanResultText);
      mainElements.copyBtn.textContent = translate('copiedText');

      if (resetCopyButtonTimer !== null) {
        window.clearTimeout(resetCopyButtonTimer);
      }

      resetCopyButtonTimer = window.setTimeout(() => {
        if (mainElements) {
          mainElements.copyBtn.textContent = translate('copyText');
        }
      }, 1500);
    } catch (error) {
      showStatus(translate('copyFailed'), 'error');
      console.error('Text copy failed:', error);
    }
  });

  mainElements.openBtn.addEventListener('click', () => {
    if (state.scanResultText && isValidUrl(state.scanResultText)) {
      browser.tabs.create({ url: state.scanResultText });
    }
  });

  mainElements.genInput.addEventListener('input', () => {
    if (!mainElements) {
      return;
    }

    state.genInputText = mainElements.genInput.value;
    updateGenerateButtonState();
  });

  mainElements.genBtn.addEventListener('click', async () => {
    if (!mainElements) {
      return;
    }

    const text = mainElements.genInput.value.trim();
    state.genInputText = mainElements.genInput.value;

    if (!text) {
      return;
    }

    try {
      await renderGeneratedCode(text);
    } catch (error) {
      closeQrContextMenu();
      mainElements.genOutput.classList.add('hidden');
      state.generatedText = null;
      showGenerateStatus(translate('generateFailed'));
      console.error('QR generation failed:', error);
    }
  });

  mainElements.genCurrentUrlBtn.addEventListener('click', async () => {
    if (!mainElements) {
      return;
    }

    try {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      const currentUrl = activeTab?.url?.trim();

      if (!activeTab || !currentUrl) {
        throw new Error(translate('currentUrlMissing'));
      }

      if (!isSupportedTabUrl(currentUrl)) {
        throw new Error(translate('currentUrlUnsupported'));
      }

      await renderGeneratedCode(currentUrl, { syncInput: true });
    } catch (error) {
      closeQrContextMenu();
      mainElements.genOutput.classList.add('hidden');
      state.generatedText = null;
      showGenerateStatus(
        error instanceof Error ? error.message : translate('currentUrlFailed'),
      );
      console.error('Current URL QR generation failed:', error);
    }
  });

  mainElements.qrCanvas.addEventListener('contextmenu', openQrContextMenu);

  mainElements.copyImageBtn.addEventListener('click', async () => {
    closeQrContextMenu();

    try {
      await copyQrImageToClipboard();
    } catch (error) {
      showGenerateStatus(
        error instanceof Error ? error.message : translate('copyImageFailed'),
      );
      console.error('QR image copy failed:', error);
    }
  });

  mainElements.downloadImageBtn.addEventListener('click', async () => {
    closeQrContextMenu();

    try {
      await downloadQrImage();
    } catch (error) {
      showGenerateStatus(translate('downloadImageFailed'));
      console.error('QR image download failed:', error);
    }
  });

  mainElements.tabs.forEach((tab) => {
    tab.addEventListener('change', async () => {
      closeQrContextMenu();
      state.selectedTab = tab.dataset.tab === 'scan' ? 'scan' : 'generate';

      if (state.selectedTab !== 'scan') {
        await stopScanner();
        hideStatus();
      }
    });
  });

  syncMainViewFromState();
  await syncCameraPermissionHint();

  if (state.generatedText) {
    try {
      await renderGeneratedCode(state.generatedText);
    } catch (error) {
      state.generatedText = null;
      showGenerateStatus(translate('generateFailed'));
      console.error('Stored QR generation failed:', error);
    }
  }
}

async function renderMainView() {
  await stopScanner();
  clearTimers();
  updateDocumentMetadata(translate('popupTitle'));
  app.innerHTML = renderMainTemplate(state.locale, state.selectedTab);
  mainElements = getMainElements();
  resetScannerPreviewAspectRatio();
  await bindMainViewEvents();
}

function renderOnboardingView() {
  mainElements = null;
  clearTimers();
  updateDocumentMetadata(translate('popupTitle'));
  app.innerHTML = renderOnboardingTemplate(state.locale);

  const languageSelect = document.querySelector<HTMLSelectElement>('#onboarding-language-select')!;
  const confirmButton = document.querySelector<HTMLButtonElement>('#onboarding-confirm-btn')!;

  languageSelect.value = state.locale;

  languageSelect.addEventListener('change', () => {
    state.locale = normalizeLocale(languageSelect.value);
    renderOnboardingView();
  });

  confirmButton.addEventListener('click', async () => {
    state.onboardingCompleted = true;
    await saveExtensionSettings({
      locale: state.locale,
      onboardingCompleted: true,
    });
    await renderMainView();
  });
}

async function init() {
  bindGlobalListeners();

  const settings = await getResolvedSettings();
  state.locale = settings.locale;
  state.onboardingCompleted = settings.onboardingCompleted;

  if (state.onboardingCompleted) {
    await renderMainView();
    return;
  }

  renderOnboardingView();
}

void init();
