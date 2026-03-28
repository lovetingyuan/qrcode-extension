import { getLocaleOptions, t } from '@/utils/i18n'
import type { SupportedLocale, SupportedTheme } from '@/utils/settings'

type MainTab = 'generate' | 'scan'
interface MainTemplateOptions {
  showCurrentUrlButton: boolean
  generateInputRows: number
}

function renderLanguageOptions(selectedLocale: SupportedLocale) {
  return getLocaleOptions()
    .map(
      ({ value, label }) =>
        `<option value="${value}" ${value === selectedLocale ? 'selected' : ''}>${label}</option>`,
    )
    .join('')
}

function renderThemeToggleButton(locale: SupportedLocale, theme: SupportedTheme) {
  const nextTheme = theme === 'dracula' ? 'emerald' : 'dracula'
  const label =
    nextTheme === 'dracula'
      ? t(locale, 'switchToDarkTheme')
      : t(locale, 'switchToDefaultTheme')

  return `
    <button
      id="theme-toggle-btn"
      type="button"
      data-next-theme="${nextTheme}"
      class="btn btn-ghost btn-xs h-7 min-h-7 w-7 rounded-full border border-base-300/70 p-0 text-base-content/75 transition hover:border-base-content/20 hover:bg-base-200 hover:text-base-content"
      aria-label="${label}"
      title="${label}"
    >
      ${
        nextTheme === 'dracula'
          ? `
            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M21.75 15.5a.75.75 0 0 0-.99-.83 8.5 8.5 0 0 1-11.43-10.4.75.75 0 0 0-.98-.92A10 10 0 1 0 22 16.49a.75.75 0 0 0-.25-.99Z" />
            </svg>
          `
          : `
            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M12 3.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V4.5a.75.75 0 0 1 .75-.75Zm0 13.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V18a.75.75 0 0 1 .75-.75Zm8.25-6a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5h1.5Zm-15 0a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5h1.5Zm10.364-4.864a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.061l-1.06-1.06a.75.75 0 0 1 0-1.06Zm-9.353 9.353a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.061l-1.06-1.06a.75.75 0 0 1 0-1.06Zm10.413 2.12a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 1 1 1.061 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0Zm-9.353-9.353a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 1 1 1.061 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0ZM12 8.25a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Z" />
            </svg>
          `
      }
    </button>
  `
}

export function renderOnboardingTemplate(locale: SupportedLocale) {
  return `
    <div class="flex min-h-[200px] flex-col justify-between p-4">
      <div class="space-y-4">
        <div class="space-y-2">
          <h1 class="text-lg font-bold text-base-content">${t(locale, 'onboardingTitle')}</h1>
          <p class="text-sm leading-6 text-base-content/75">${t(locale, 'onboardingDescription')}</p>
        </div>

        <label class="flex items-center gap-3 rounded-2xl border border-base-300/80 bg-base-100/90 p-3 shadow-sm">
          <span class="text-sm font-medium text-base-content/80">语言 / Language</span>
          <select
            id="onboarding-language-select"
            class="select select-sm select-bordered ml-auto w-40"
          >
            ${renderLanguageOptions(locale)}
          </select>
        </label>
      </div>

      <button id="onboarding-confirm-btn" class="btn btn-primary mt-4 w-full">${t(locale, 'confirmButton')}</button>
    </div>
  `
}

export function renderMainTemplate(
  locale: SupportedLocale,
  theme: SupportedTheme,
  selectedTab: MainTab,
  options: MainTemplateOptions,
) {
  const githubUrl = 'https://github.com/lovetingyuan/qrcode-extension'

  return `
    <div class="p-4">
      <div class="mb-3">
        <div class="flex items-center gap-2 text-base font-bold text-base-content">
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-base-300/70 bg-base-100"
              aria-hidden="true"
            >
              <img src="/favicon.svg" alt="" class="h-6 w-6 shrink-0" />
            </span>
            <h1 class="truncate text-left text-base">${t(locale, 'popupTitle')}</h1>
          </div>
          <div class="ml-auto flex items-center gap-2">
            <a
              href="${githubUrl}"
              target="_blank"
              rel="noreferrer"
              class="btn btn-ghost btn-xs h-7 min-h-7 w-7 rounded-full border border-base-300/70 p-0 text-base-content/75 transition hover:border-base-content/20 hover:bg-base-200 hover:text-base-content"
              aria-label="${t(locale, 'githubLinkLabel')}"
              title="${t(locale, 'githubLinkLabel')}"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M12 .5C5.65.5.5 5.65.5 12A11.5 11.5 0 0 0 8.36 22.93c.58.1.79-.25.79-.56v-2.18c-3.2.7-3.88-1.35-3.88-1.35-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.72-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.27 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a10.97 10.97 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.67.41.35.77 1.05.77 2.12v3.14c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
              </svg>
            </a>
            ${renderThemeToggleButton(locale, theme)}
            <label aria-label="${t(locale, 'languageLabel')}">
              <span class="sr-only">${t(locale, 'languageLabel')}</span>
              <select
                id="main-language-select"
                class="select select-xs select-bordered h-7 min-h-7 w-24 pr-7 text-[11px] font-medium"
              >
                ${renderLanguageOptions(locale)}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div class="tabs tabs-border tabs-medium">
        <input
          type="radio"
          name="qr_tabs"
          class="tab"
          data-tab="generate"
          aria-label="${t(locale, 'generateTab')}"
          ${selectedTab === 'generate' ? 'checked' : ''}
        />
        <div class="tab-content p-1 pt-5">
          <div class="gen-input-shell">
            <textarea
              id="gen-input"
              class="textarea textarea-bordered w-full gen-input-textarea"
              placeholder="${t(locale, 'generatePlaceholder')}"
              rows="${options.generateInputRows}"
            ></textarea>
            <button
              id="gen-clear-btn"
              type="button"
              class="btn btn-ghost btn-xs gen-clear-btn hidden"
              aria-label="${t(locale, 'clearGenerateInput')}"
              title="${t(locale, 'clearGenerateInput')}"
            >
              <svg viewBox="0 0 20 20" class="h-3.5 w-3.5 fill-current" aria-hidden="true">
                <path d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>
          <div class="grid gap-2 ${options.showCurrentUrlButton ? 'grid-cols-2' : 'grid-cols-1'}">
            <button id="gen-btn" class="btn btn-primary w-full" disabled>${t(locale, 'generateButton')}</button>
            ${
              options.showCurrentUrlButton
                ? `<button id="gen-current-url-btn" class="btn btn-outline btn-secondary w-full">${t(locale, 'generateCurrentUrlButton')}</button>`
                : ''
            }
          </div>
          <div role="alert" id="gen-status" class="alert alert-error text-sm hidden"></div>
          <div id="gen-output" class="hidden flex flex-col items-center gap-2">
            <div
              id="qr-canvas-stage"
              class="relative inline-flex rounded-2xl border border-base-300/70 bg-base-100 p-2 shadow-lg"
            >
              <canvas id="qr-canvas" class="block cursor-context-menu rounded-xl"></canvas>
              <ul
                id="qr-context-menu"
                class="menu menu-sm hidden absolute z-20 w-40 rounded-[0.9rem] border border-base-300/90 bg-base-100 p-1 shadow-xl"
                aria-label="${t(locale, 'qrMenuLabel')}"
              >
                <li>
                  <button id="copy-image-btn" type="button" class="flex min-h-9 items-center rounded-[0.7rem]">
                    ${t(locale, 'copyImage')}
                  </button>
                </li>
                <li>
                  <button id="download-image-btn" type="button" class="flex min-h-9 items-center rounded-[0.7rem]">
                    ${t(locale, 'downloadImage')}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <input
          type="radio"
          name="qr_tabs"
          class="tab"
          data-tab="scan"
          aria-label="${t(locale, 'scanTab')}"
          ${selectedTab === 'scan' ? 'checked' : ''}
        />
        <div class="tab-content p-1 pt-5">
          <div class="text-xs leading-4 text-base-content/75">${t(locale, 'scanTip')}</div>
          <button id="scan-btn" class="btn btn-primary btn-block">${t(locale, 'scanStart')}</button>
          <div role="alert" id="camera-hint" class="alert alert-info text-xs hidden">${t(locale, 'cameraHint')}</div>
          <div id="scanner-container" class="hidden w-full">
            <div
              id="scanner-preview"
              class="relative overflow-hidden rounded-lg bg-[radial-gradient(circle_at_top,_rgb(16_185_129_/_0.18),_transparent_55%),_rgb(5_23_17_/_0.96)]"
            >
              <div
                id="scanner-loading"
                class="hidden absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,_rgb(5_23_17_/_0.82),_rgb(5_23_17_/_0.62))] text-emerald-50 backdrop-blur-[4px]"
                aria-live="polite"
              >
                <span class="loading loading-spinner loading-md"></span>
                <span class="text-sm font-medium">${t(locale, 'scannerLoading')}</span>
              </div>
              <div id="qr-reader"></div>
            </div>
          </div>
          <div id="scan-status" class="hidden"></div>
          <div id="scan-result" class="hidden flex flex-col gap-2">
            <div class="bg-base-200 rounded-lg p-3 break-all text-sm" id="result-text"></div>
            <div class="flex gap-2">
              <button id="copy-btn" class="btn btn-sm btn-outline flex-1">${t(locale, 'copyText')}</button>
              <button id="open-btn" class="btn btn-sm btn-primary flex-1 hidden">${t(locale, 'openLink')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
