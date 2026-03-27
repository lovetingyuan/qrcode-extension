export type BrowserApi = typeof browser;
export type AppRuntimeKind = 'extension' | 'web';

type RuntimeCapableBrowserApi = BrowserApi & {
  runtime?: BrowserApi['runtime'];
};

function getBrowserGlobal() {
  const extensionGlobal = globalThis as typeof globalThis & {
    browser?: RuntimeCapableBrowserApi;
    chrome?: RuntimeCapableBrowserApi;
  };

  return extensionGlobal.browser ?? extensionGlobal.chrome;
}

export function getBrowserApi(): BrowserApi | undefined {
  return getBrowserGlobal();
}

export function isExtensionEnvironment(): boolean {
  const browserApi = getBrowserApi();
  return !!browserApi?.runtime?.id;
}

export function getAppRuntimeKind(): AppRuntimeKind {
  return isExtensionEnvironment() ? 'extension' : 'web';
}

export async function openUrl(url: string): Promise<void> {
  const browserApi = getBrowserApi();

  if (isExtensionEnvironment() && browserApi?.tabs?.create) {
    await browserApi.tabs.create({ url });
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function getActiveTabUrl(): Promise<string | null> {
  const browserApi = getBrowserApi();

  if (!isExtensionEnvironment() || !browserApi?.tabs?.query) {
    return null;
  }

  const [activeTab] = await browserApi.tabs.query({ active: true, currentWindow: true });
  return activeTab?.url?.trim() ?? null;
}
