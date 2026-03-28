import './style.css';
import { t } from '@/utils/i18n';
import { getResolvedSettings, type SupportedTheme } from '@/utils/settings';

const app = document.querySelector<HTMLDivElement>('#app')!;
const THEME_META_COLORS: Record<SupportedTheme, string> = {
  emerald: '#0b5d4c',
  dracula: '#282a36',
};

function renderPermissionPage(locale: 'zh-CN' | 'en') {
  document.documentElement.lang = locale;
  document.title = t(locale, 'permissionPageTitle');

  app.innerHTML = `
    <div class="flex min-h-screen items-center justify-center">
      <div class="card mx-6 border border-base-300/80 bg-base-100/95 shadow-xl">
        <div class="card-body items-center text-center">
          <h2 class="card-title" id="title">${t(locale, 'permissionPageHeading')}</h2>
          <p id="message" class="text-base-content/70">${t(locale, 'permissionPageMessage')}</p>
          <p class="alert alert-info mt-2 font-bold text-lg" id="emphasis">${t(locale, 'permissionPageEmphasis')}</p>
          <div class="card-actions mt-4" id="grant-actions">
            <button class="btn btn-primary" id="grant-btn">${t(locale, 'permissionGrantButton')}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function setupPage() {
  const settings = await getResolvedSettings();
  const locale = settings.locale;
  document.documentElement.dataset.theme = settings.theme;
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_META_COLORS[settings.theme]);

  renderPermissionPage(locale);

  const titleEl = document.querySelector<HTMLHeadingElement>('#title')!;
  const messageEl = document.querySelector<HTMLParagraphElement>('#message')!;

  async function requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());

      titleEl.textContent = t(locale, 'permissionGrantedTitle');
      titleEl.classList.remove('text-error');
      titleEl.classList.add('text-success');
      document.querySelector('#emphasis')?.remove();
      document.querySelector('#grant-actions')?.remove();
      messageEl.textContent = t(locale, 'permissionGrantedMessage');

      const btnContainer = document.createElement('div');
      btnContainer.className = 'card-actions mt-4';
      let remaining = 5;
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = t(locale, 'closeCountdown', { seconds: remaining });
      btn.addEventListener('click', () => window.close());
      btnContainer.appendChild(btn);
      messageEl.parentElement!.appendChild(btnContainer);

      const timer = window.setInterval(() => {
        remaining--;
        btn.textContent = t(locale, 'closeCountdown', { seconds: remaining });

        if (remaining <= 0) {
          window.clearInterval(timer);
          window.close();
        }
      }, 1000);
    } catch (error) {
      titleEl.textContent = t(locale, 'permissionFailedTitle');
      titleEl.classList.remove('text-success');
      titleEl.classList.add('text-error');
      messageEl.textContent =
        error instanceof Error ? error.message : t(locale, 'permissionFailedFallback');
    }
  }

  document.querySelector<HTMLButtonElement>('#grant-btn')!.addEventListener('click', requestCamera);
}

void setupPage();
