export type SupportedLocale = 'zh-CN' | 'en';
export type SupportedTheme = 'emerald' | 'dracula';

export interface AppSettings {
  locale: SupportedLocale;
  theme: SupportedTheme;
  onboardingCompleted: boolean;
}

const APP_SETTINGS_KEY = 'app-settings';
const LEGACY_SETTINGS_KEY = 'extension-settings';

function parseStoredSettings(raw: string | null): Partial<AppSettings> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Partial<AppSettings>) : {};
  } catch {
    return {};
  }
}

function readStoredSettings(): Partial<AppSettings> {
  const currentSettings = parseStoredSettings(window.localStorage.getItem(APP_SETTINGS_KEY));
  if (Object.keys(currentSettings).length > 0) {
    return currentSettings;
  }

  return parseStoredSettings(window.localStorage.getItem(LEGACY_SETTINGS_KEY));
}

function writeStoredSettings(settings: AppSettings) {
  try {
    window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
    window.localStorage.removeItem(LEGACY_SETTINGS_KEY);
  } catch {
    // Ignore localStorage failures.
  }
}

function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === 'zh-CN' || value === 'en';
}

function isSupportedTheme(value: unknown): value is SupportedTheme {
  return value === 'emerald' || value === 'dracula';
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

export async function getAppSettings(): Promise<Partial<AppSettings>> {
  const settings = readStoredSettings();

  return {
    locale: isSupportedLocale(settings.locale) ? settings.locale : undefined,
    theme: isSupportedTheme(settings.theme) ? settings.theme : undefined,
    onboardingCompleted:
      typeof settings.onboardingCompleted === 'boolean'
        ? settings.onboardingCompleted
        : undefined,
  };
}

export async function getResolvedSettings(): Promise<AppSettings> {
  const stored = await getAppSettings();

  return {
    locale: stored.locale ?? getInitialLocale(),
    theme: stored.theme ?? 'emerald',
    onboardingCompleted: stored.onboardingCompleted ?? false,
  };
}

export async function saveAppSettings(
  partial: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getResolvedSettings();
  const next: AppSettings = {
    locale: isSupportedLocale(partial.locale) ? partial.locale : current.locale,
    theme: isSupportedTheme(partial.theme) ? partial.theme : current.theme,
    onboardingCompleted:
      typeof partial.onboardingCompleted === 'boolean'
        ? partial.onboardingCompleted
        : current.onboardingCompleted,
  };

  writeStoredSettings(next);
  return next;
}
