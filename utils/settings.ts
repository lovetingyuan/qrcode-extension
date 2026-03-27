export type SupportedLocale = 'zh-CN' | 'en';

export interface ExtensionSettings {
  locale: SupportedLocale;
  onboardingCompleted: boolean;
}

const SETTINGS_KEY = 'extension-settings';

function readFallbackSettings(): Partial<ExtensionSettings> {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed as Partial<ExtensionSettings>;
  } catch {
    return {};
  }
}

function writeFallbackSettings(settings: ExtensionSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage fallback failures.
  }
}

function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === 'zh-CN' || value === 'en';
}

export function normalizeLocale(value: unknown): SupportedLocale {
  if (isSupportedLocale(value)) {
    return value;
  }

  return getInitialLocale();
}

export function getInitialLocale(): SupportedLocale {
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

export async function getExtensionSettings(): Promise<Partial<ExtensionSettings>> {
  let stored: unknown;

  if (browser.storage?.local) {
    const result = await browser.storage.local.get(SETTINGS_KEY);
    stored = result[SETTINGS_KEY];
  } else {
    stored = readFallbackSettings();
  }

  if (!stored || typeof stored !== 'object') {
    return {};
  }

  const settings = stored as Partial<ExtensionSettings>;

  return {
    locale: isSupportedLocale(settings.locale) ? settings.locale : undefined,
    onboardingCompleted:
      typeof settings.onboardingCompleted === 'boolean'
        ? settings.onboardingCompleted
        : undefined,
  };
}

export async function getResolvedSettings(): Promise<ExtensionSettings> {
  const stored = await getExtensionSettings();

  return {
    locale: stored.locale ?? getInitialLocale(),
    onboardingCompleted: stored.onboardingCompleted ?? false,
  };
}

export async function saveExtensionSettings(
  partial: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const current = await getResolvedSettings();
  const next: ExtensionSettings = {
    locale: isSupportedLocale(partial.locale) ? partial.locale : current.locale,
    onboardingCompleted:
      typeof partial.onboardingCompleted === 'boolean'
        ? partial.onboardingCompleted
        : current.onboardingCompleted,
  };

  if (browser.storage?.local) {
    await browser.storage.local.set({
      [SETTINGS_KEY]: next,
    });
  } else {
    writeFallbackSettings(next);
  }

  return next;
}
