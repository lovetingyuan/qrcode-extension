export type BrowserApi = typeof browser;
export type AppRuntimeKind = 'extension' | 'web';

function getBrowserGlobal() {
  if (!('browser' in globalThis)) {
    return undefined;
  }

  return (globalThis as typeof globalThis & { browser?: BrowserApi }).browser;
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
