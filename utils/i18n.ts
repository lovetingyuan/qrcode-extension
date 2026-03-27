import type { SupportedLocale } from '@/utils/settings'

const localeLabels: Record<SupportedLocale, string> = {
  'zh-CN': '简体中文',
  en: 'English',
}

const messages = {
  'zh-CN': {
    popupTitle: '二维码工具',
    githubLinkLabel: '打开 Github 仓库主页',
    languageLabel: '语言',
    onboardingEyebrow: '首次使用',
    onboardingTitle: '欢迎使用',
    onboardingDescription:
      '此扩展可用于扫描和生成二维码，所有处理均在本地完成，不发起任何网络请求。',
    useCasesTitle: '主要用途',
    useCaseScanTitle: '扫码识别',
    useCaseScanDescription: '使用本机摄像头扫描二维码，并快速复制结果或打开链接。',
    useCaseGenerateTitle: '生成二维码',
    useCaseGenerateDescription: '将文本或当前网页地址转换成二维码，并支持复制图片或下载保存。',
    securityTitle: '安全性说明',
    securityDescription: '所有二维码生成与扫描处理均在本地完成，扩展不会发起任何网络请求。',
    confirmButton: '确定',
    generateTab: '生成',
    scanTab: '扫描',
    generatePlaceholder: '输入文本或链接',
    generateButton: '生成二维码',
    generateCurrentUrlButton: '当前网址二维码',
    generateFailed: '二维码生成失败，请稍后重试。',
    currentUrlMissing: '未获取到当前标签页网址，请切换到普通网页后重试。',
    currentUrlUnsupported: '当前页面网址不可用，请在 http 或 https 页面中使用。',
    currentUrlFailed: '获取当前网址失败，请稍后重试。',
    qrMenuLabel: '二维码操作菜单',
    copyImage: '复制图片',
    downloadImage: '下载图片',
    scanTip: '使用本机摄像头扫描二维码，使用时请将二维码靠近摄像头。扫描需要一些时间。',
    scanStart: '开始扫描',
    scanStop: '停止扫描',
    cameraHint: '首次使用时浏览器可能会请求摄像头权限，请按照提示操作。',
    scannerLoading: '摄像头画面加载中...',
    copyText: '复制',
    copiedText: '已复制',
    openLink: '打开链接',
    permissionDenied: '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问。',
    permissionRequired: '需要摄像头权限，请在新打开的标签页中授权，然后重新点击扫描。',
    cameraStartFailed: '摄像头启动失败：{detail}',
    qrExportFailed: '二维码图片导出失败，请重试。',
    copyImageUnsupported: '当前浏览器暂不支持复制二维码图片。',
    copyImageFailed: '复制二维码图片失败，请稍后重试。',
    downloadImageFailed: '下载二维码图片失败，请稍后重试。',
    copyFailed: '复制失败，请稍后重试。',
    permissionPageTitle: '摄像头授权',
    permissionPageHeading: '需要摄像头权限',
    permissionPageMessage: '扫描二维码需要使用摄像头，点击下方按钮后浏览器会弹出权限请求。',
    permissionPageEmphasis: '请务必选择“访问该网站时允许”这一项',
    permissionGrantButton: '授权摄像头',
    permissionGrantedTitle: '授权成功',
    permissionGrantedMessage: '摄像头权限已授权，请再次打开二维码扩展进行扫描。此页面将自动关闭...',
    permissionFailedTitle: '授权失败',
    permissionFailedFallback: '无法访问摄像头，请检查浏览器设置。',
    closeCountdown: '关闭 ({seconds}s)',
  },
  en: {
    popupTitle: 'QR Code Tool',
    githubLinkLabel: 'Open the GitHub repository homepage',
    languageLabel: 'Language',
    onboardingEyebrow: 'First launch',
    onboardingTitle: 'Welcome',
    onboardingDescription:
      'This extension scans and generates QR codes, and all processing stays local with no network requests.',
    useCasesTitle: 'Main features',
    useCaseScanTitle: 'Scan QR codes',
    useCaseScanDescription:
      'Use your device camera to scan QR codes, then copy the result or open detected links. Scanning will take some time.',
    useCaseGenerateTitle: 'Generate QR codes',
    useCaseGenerateDescription:
      'Turn text or the current page URL into a QR code, then copy the image or download it.',
    securityTitle: 'Security note',
    securityDescription:
      'All QR generation and scanning stay local on your device. This extension makes no network requests.',
    confirmButton: 'Confirm',
    generateTab: 'Generate',
    scanTab: 'Scan',
    generatePlaceholder: 'Enter text or a link',
    generateButton: 'Generate QR Code',
    generateCurrentUrlButton: 'QR for Current URL',
    generateFailed: 'Failed to generate the QR code. Please try again.',
    currentUrlMissing:
      'Unable to read the current tab URL. Switch to a normal webpage and try again.',
    currentUrlUnsupported:
      'This page URL is unavailable. Use the extension on an http or https page.',
    currentUrlFailed: 'Failed to get the current URL. Please try again.',
    qrMenuLabel: 'QR code actions',
    copyImage: 'Copy Image',
    downloadImage: 'Download Image',
    scanTip: 'Use your local camera to scan a QR code. Hold the code close to the camera.',
    scanStart: 'Start Scan',
    scanStop: 'Stop Scan',
    cameraHint: 'The browser may ask for camera permission the first time you use scanning.',
    scannerLoading: 'Loading camera preview...',
    copyText: 'Copy',
    copiedText: 'Copied',
    openLink: 'Open Link',
    permissionDenied: 'Camera permission was denied. Allow camera access in your browser settings.',
    permissionRequired:
      'Camera permission is required. Authorize it in the newly opened tab, then try scanning again.',
    cameraStartFailed: 'Failed to start the camera: {detail}',
    qrExportFailed: 'Failed to export the QR image. Please try again.',
    copyImageUnsupported: 'This browser does not support copying QR images.',
    copyImageFailed: 'Failed to copy the QR image. Please try again.',
    downloadImageFailed: 'Failed to download the QR image. Please try again.',
    copyFailed: 'Copy failed. Please try again.',
    permissionPageTitle: 'Camera Permission',
    permissionPageHeading: 'Camera access required',
    permissionPageMessage:
      'Scanning QR codes needs camera access. Click the button below and allow the browser permission request.',
    permissionPageEmphasis: 'Please choose “Allow while visiting the site”',
    permissionGrantButton: 'Grant Camera Access',
    permissionGrantedTitle: 'Permission granted',
    permissionGrantedMessage:
      'Camera access is now enabled. Open the QR extension again to start scanning. This page will close automatically...',
    permissionFailedTitle: 'Permission failed',
    permissionFailedFallback: 'Unable to access the camera. Check your browser settings.',
    closeCountdown: 'Close ({seconds}s)',
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
