import { html, render } from './lib/preact.js';
import { getTheme, fetchJSON } from './lib/helpers.js';
import { Dashboard } from './components/Dashboard.js';

async function init() {
  document.documentElement.setAttribute('data-theme', getTheme());

  const manifest = await fetchJSON('data/manifest.json');
  if (!manifest?.suites?.length) {
    document.getElementById('app').innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <div class="empty-title">No benchmarks yet</div>
        <p>Run benchmarks in CI and trigger the ingestion workflow to see data here.</p>
      </div>`;
    return;
  }

  const data = {};
  for (const suite of manifest.suites) {
    for (const os of suite.os) {
      data[suite.id + '/' + os] = await fetchJSON('data/' + suite.id + '/' + os + '.json') || [];
    }
  }

  const app = document.getElementById('app');

  function renderApp() {
    render(html`<${Dashboard} suites=${manifest.suites} data=${data} sourceRepo=${manifest.sourceRepo} />`, app);
  }

  renderApp();

  window.toggleTheme = () => {
    const t = getTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('bench-theme', t);
    document.documentElement.setAttribute('data-theme', t);
    renderApp();
  };
}

init();
