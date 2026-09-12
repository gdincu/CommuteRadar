// Uses vite-plugin-pwa's generated virtual module. registerType is 'prompt'
// in vite.config.ts, so updates never silently swap the app out from under
// an active trip — the user sees a banner and chooses when to reload.
import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      showUpdateBanner(() => updateSW(true));
    },
    onOfflineReady() {
      console.info('CommuteRadar is ready to work offline.');
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    }
  });
}

function showUpdateBanner(onUpdate: () => void): void {
  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  banner.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:80px',
    'transform:translateX(-50%)',
    'z-index:100',
    'background:#121f2e',
    'color:#eaf2f8',
    'border:1px solid #223447',
    'border-radius:12px',
    'padding:10px 14px',
    'display:flex',
    'gap:10px',
    'align-items:center',
    'font-size:0.9rem',
    'box-shadow:0 8px 24px rgba(0,0,0,0.4)'
  ].join(';');

  const text = document.createElement('span');
  text.textContent = 'An update is available.';

  const button = document.createElement('button');
  button.textContent = 'Reload';
  button.style.cssText =
    'background:#22d3ee;color:#04141c;border:none;border-radius:999px;padding:6px 14px;font-weight:700;';
  button.onclick = () => {
    onUpdate();
    banner.remove();
  };

  banner.appendChild(text);
  banner.appendChild(button);
  document.body.appendChild(banner);
}
