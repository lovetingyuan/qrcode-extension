import type { SupportedLocale } from '@/utils/settings'

const localeLabels: Record<SupportedLocale, string> = {
  'zh-CN': '简体中文',
  en: 'English',
}

const messages = {
  'zh-CN': {
    appTitle: '二维码工具',
    githubLinkLabel: '打开 Github 仓库主页',
    switchToDarkTheme: '切换到暗色主题（Dracula）',
    switchToDefaultTheme: '切换到默认主题',
    languageLabel: '语言',
    onboardingTitle: '欢迎使用',
    onboardingDescription: '在浏览器里本地扫描和生成二维码，默认不依赖任何后端服务。',
    confirmButton: '开始使用',
    generateTab: '生成',
    scanTab: '扫描',
    generatePlaceholder: '输入文本或链接',
    clearGenerateInput: '清空输入',
    generateButton: '生成二维码',
    generateFailed: '二维码生成失败，请稍后重试。',
    generateTooLarge: '输入内容过长，无法生成二维码。请缩短文本后重试。',
    qrDialogTitle: '二维码预览',
    enterFullscreen: '全屏显示',
    exitFullscreen: '退出全屏',
    fullscreenFailed: '当前环境不支持全屏预览，请稍后重试。',
    closeDialog: '关闭弹窗',
    dismissStatus: '关闭提示',
    qrMenuLabel: '二维码操作菜单',
    copyImage: '复制图片',
    downloadImage: '下载图片',
    scanTip: '使用本机摄像头扫描二维码，使用时请将二维码靠近摄像头。扫描需要一些时间。',
    scanStart: '使用摄像头扫描',
    scanStop: '停止扫描',
    scanLocalImage: '扫描本地图片',
    scanClipboardImage: '扫描已复制的图片',
    scanImageLoading: '正在识别图片中的二维码...',
    scanClipboardLoading: '正在读取粘贴板图片...',
    scanImageNotFound: '未在图片中识别到二维码，请换一张更清晰的图片重试。',
    scanImageReadFailed: '扫描失败，请确认是清晰的二维码图片。',
    scanClipboardUnsupported: '当前浏览器暂不支持读取粘贴板图片。',
    scanClipboardEmpty: '粘贴板中没有图片，请先复制一张二维码图片。',
    scanClipboardFailed: '读取粘贴板图片失败，请稍后重试。',
    cameraHint: '首次使用时浏览器可能会请求摄像头权限，请您允许。',
    scannerLoading: '摄像头画面加载中...',
    copyText: '复制',
    copiedText: '已复制',
    openLink: '打开链接',
    permissionDenied: '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问。',
    cameraStartFailed: '摄像头启动失败：{detail}',
    qrExportFailed: '二维码图片导出失败，请重试。',
    copyImageUnsupported: '当前浏览器暂不支持复制二维码图片。',
    copyImageFailed: '复制二维码图片失败，请稍后重试。',
    downloadImageFailed: '下载二维码图片失败，请稍后重试。',
    copyFailed: '复制失败，请稍后重试。',
  },
  en: {
    appTitle: 'QR Code Tool',
    githubLinkLabel: 'Open the GitHub repository homepage',
    switchToDarkTheme: 'Switch to dark theme (Dracula)',
    switchToDefaultTheme: 'Switch to default theme',
    languageLabel: 'Language',
    onboardingTitle: 'Welcome',
    onboardingDescription:
      'Scan and generate QR codes locally in your browser without depending on a backend by default.',
    confirmButton: 'Get Started',
    generateTab: 'Generate',
    scanTab: 'Scan',
    generatePlaceholder: 'Enter text or a link',
    clearGenerateInput: 'Clear input',
    generateButton: 'Generate QR Code',
    generateFailed: 'Failed to generate the QR code. Please try again.',
    generateTooLarge:
      'The input is too long to fit in a QR code. Shorten the text and try again.',
    qrDialogTitle: 'QR Preview',
    enterFullscreen: 'Enter fullscreen',
    exitFullscreen: 'Exit fullscreen',
    fullscreenFailed: 'Fullscreen preview is not available in this environment.',
    closeDialog: 'Close dialog',
    dismissStatus: 'Dismiss message',
    qrMenuLabel: 'QR code actions',
    copyImage: 'Copy Image',
    downloadImage: 'Download Image',
    scanTip: 'Use your local camera to scan a QR code. Hold the code close to the camera.',
    scanStart: 'Use Camera to Scan',
    scanStop: 'Stop Scan',
    scanLocalImage: 'Scan Local Image',
    scanClipboardImage: 'Scan Clipboard Image',
    scanImageLoading: 'Scanning the image for a QR code...',
    scanClipboardLoading: 'Reading an image from the clipboard...',
    scanImageNotFound: 'No QR code was found in the image. Try a clearer image.',
    scanImageReadFailed: 'Failed to read the image. Make sure you selected an image file.',
    scanClipboardUnsupported: 'This browser does not support reading clipboard images.',
    scanClipboardEmpty: 'No image was found in the clipboard. Copy a QR code image first.',
    scanClipboardFailed: 'Failed to read the clipboard image. Please try again.',
    cameraHint: 'The browser may ask for camera permission the first time you use scanning.',
    scannerLoading: 'Loading camera preview...',
    copyText: 'Copy',
    copiedText: 'Copied',
    openLink: 'Open Link',
    permissionDenied: 'Camera permission was denied. Allow camera access in your browser settings.',
    cameraStartFailed: 'Failed to start the camera: {detail}',
    qrExportFailed: 'Failed to export the QR image. Please try again.',
    copyImageUnsupported: 'This browser does not support copying QR images.',
    copyImageFailed: 'Failed to copy the QR image. Please try again.',
    downloadImageFailed: 'Failed to download the QR image. Please try again.',
    copyFailed: 'Copy failed. Please try again.',
  },
} as const

export type TranslationKey = keyof (typeof messages)['zh-CN']

export function getLocaleLabel(locale: SupportedLocale): string {
  return localeLabels[locale]
}

export function getLocaleOptions(): Array<{ value: SupportedLocale; label: string }> {
  return (Object.keys(localeLabels) as SupportedLocale[]).map(value => ({
    value,
    label: localeLabels[value],
  }))
}

export function t(
  locale: SupportedLocale,
  key: TranslationKey,
  params: Record<string, string | number> = {},
): string {
  let value: string = messages[locale][key]

  for (const [paramKey, paramValue] of Object.entries(params)) {
    value = value.replaceAll(`{${paramKey}}`, String(paramValue))
  }

  return value
}
