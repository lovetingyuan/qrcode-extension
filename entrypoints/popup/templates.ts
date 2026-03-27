import { getLocaleOptions, t } from '@/utils/i18n'
import type { SupportedLocale } from '@/utils/settings'

type MainTab = 'generate' | 'scan'

function renderLanguageOptions(selectedLocale: SupportedLocale) {
  return getLocaleOptions()
    .map(
      ({ value, label }) =>
        `<option value="${value}" ${value === selectedLocale ? 'selected' : ''}>${label}</option>`,
    )
    .join('')
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

export function renderMainTemplate(locale: SupportedLocale, selectedTab: MainTab) {
  return `
    <div class="p-4">
      <div class="mb-3">
        <div class="flex items-center gap-2 text-base font-bold text-base-content">
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700"
              aria-hidden="true"
            >
              <svg viewBox="0 0 20 20" class="h-3.5 w-3.5 fill-current">
                <path d="M2 2h6v6H2zM4 4v2h2V4zM12 2h6v6h-6zM14 4v2h2V4zM2 12h6v6H2zM4 14v2h2v-2zM10 10h2v2h-2zM12 12h2v2h-2zM14 10h4v2h-2v2h2v4h-2v-2h-2v2h-2v-4h2v-2h-2z" />
              </svg>
            </span>
            <h1 class="truncate text-left text-base">${t(locale, 'popupTitle')}</h1>
          </div>
          <label class="ml-auto" aria-label="${t(locale, 'languageLabel')}">
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
          <textarea
            id="gen-input"
            class="textarea textarea-bordered w-full"
            placeholder="${t(locale, 'generatePlaceholder')}"
            rows="4"
          ></textarea>
          <div class="grid grid-cols-2 gap-2">
            <button id="gen-btn" class="btn btn-primary w-full" disabled>${t(locale, 'generateButton')}</button>
            <button id="gen-current-url-btn" class="btn btn-outline btn-secondary w-full">${t(locale, 'generateCurrentUrlButton')}</button>
          </div>
          <div role="alert" id="gen-status" class="alert alert-error text-sm hidden"></div>
          <div id="gen-output" class="hidden flex flex-col items-center gap-2">
            <div
              id="qr-canvas-stage"
              class="relative inline-flex rounded-2xl bg-[radial-gradient(circle_at_top,_rgb(16_185_129_/_0.16),_transparent_60%),_rgb(255_255_255_/_0.88)] p-2 shadow-[0_12px_24px_rgb(15_23_42_/_0.08),inset_0_0_0_1px_rgb(255_255_255_/_0.45)]"
            >
              <canvas id="qr-canvas" class="block cursor-context-menu rounded-xl"></canvas>
              <ul
                id="qr-context-menu"
                class="menu menu-sm hidden absolute z-20 w-40 rounded-[0.9rem] border border-gray-300/90 bg-[rgb(255_255_255_/_0.98)] p-1 shadow-[0_18px_35px_rgb(15_23_42_/_0.16)] backdrop-blur-[10px]"
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
          <div role="alert" id="camera-hint" class="alert alert-info text-xs">${t(locale, 'cameraHint')}</div>
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
