import { APPS } from './config.js';

const THEME_KEY = 'pwa_hub_theme';

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  applyTheme(getPreferredTheme());

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

function createAppCard(app) {
  const link = document.createElement('a');
  link.className = 'app-card glass-panel';
  link.href = app.url;
  link.setAttribute('role', 'listitem');
  link.style.setProperty('--app-color', app.color);
  link.innerHTML = `
    <div class="app-icon" aria-hidden="true">${app.icon}</div>
    <div class="app-info">
      <h3 class="app-name">${app.name}</h3>
      <p class="app-subtitle">${app.subtitle}</p>
      <p class="app-desc">${app.description}</p>
      <div class="app-tags">
        ${app.tags.map((t) => `<span class="app-tag">${t}</span>`).join('')}
      </div>
    </div>
    <span class="app-arrow" aria-hidden="true">›</span>
  `;
  return link;
}

function renderApps() {
  const grid = document.getElementById('app-grid');
  if (!grid) return;
  grid.replaceChildren(...APPS.map(createAppCard));
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

initTheme();
renderApps();
registerServiceWorker();
