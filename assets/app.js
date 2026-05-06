const METRICS = ['mean', 'median', 'p90', 'p99', 'stdDev', 'min', 'max'];
const METRIC_LABELS = { mean: 'Mean', median: 'Median', p90: 'P90', p99: 'P99', stdDev: 'Std Dev', min: 'Min', max: 'Max' };

const OS_STYLE = {
  ubuntu:  { dark: '#3fb950', light: '#1a7f37' },
  macos:   { dark: '#58a6ff', light: '#0969da' },
  windows: { dark: '#f78166', light: '#cf222e' }
};

const state = { suites: [], activeSuite: null, activeMetric: {}, data: {}, charts: [] };

function theme() { return localStorage.getItem('bench-theme') || 'dark'; }
function osColor(os) { return (OS_STYLE[os] || {})[theme()] || '#8b949e'; }

function toggleTheme() {
  const t = theme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem('bench-theme', t);
  document.documentElement.setAttribute('data-theme', t);
  render();
}

function formatMs(v) {
  if (v == null) return '—';
  return v >= 1000 ? (v / 1000).toFixed(1) + 's' : Math.round(v) + 'ms';
}

async function fetchJSON(url) {
  try {
    const r = await fetch(url + '?t=' + Date.now());
    return r.ok ? r.json() : null;
  } catch { return null; }
}

function commits(suite) {
  for (const os of suite.os) {
    const p = state.data[suite.id + '/' + os];
    if (p?.length) return p.map(d => d.commit?.substring(0, 7) || '');
  }
  return [];
}

function entryKeys(suite) {
  const s = new Set();
  suite.os.forEach(os => {
    const p = state.data[suite.id + '/' + os];
    if (p?.length) Object.keys(p[0].entries || {}).forEach(k => s.add(k));
  });
  return [...s].sort();
}

function latestValue(suite, key, metric) {
  for (const os of suite.os) {
    const p = state.data[suite.id + '/' + os];
    if (p?.length) {
      const v = p[p.length - 1].entries[key]?.[metric];
      if (v != null) return v;
    }
  }
  return null;
}

function makeChart(el, key, suite, metric) {
  const chart = echarts.init(el);
  const labels = commits(suite);
  const t = theme();
  const mutedFg = t === 'dark' ? '#6e7681' : '#656d76';
  const grid = t === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tipBg = t === 'dark' ? 'hsl(222,47%,8%)' : '#fff';
  const tipBorder = t === 'dark' ? 'hsl(217,20%,16%)' : 'hsl(214,32%,91%)';
  const tipText = t === 'dark' ? '#c9d1d9' : '#424a53';
  const tipTitle = t === 'dark' ? '#f0f6fc' : '#1f2328';

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: tipBg,
      borderColor: tipBorder,
      textStyle: { color: tipText, fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: mutedFg, opacity: 0.2 } },
      formatter: params => {
        const idx = params[0]?.dataIndex;
        const anyOS = suite.os.find(os => state.data[suite.id + '/' + os]?.[idx]);
        const pt = anyOS ? state.data[suite.id + '/' + anyOS][idx] : null;
        let h = pt
          ? `<div style="margin-bottom:4px;font-weight:600;font-size:11px;color:${tipTitle}">${pt.commit?.substring(0, 7) || ''} · ${new Date(pt.date).toLocaleDateString()}</div>`
          : '';
        params.filter(p => p.value != null && !p.seriesName.includes(' min') && !p.seriesName.includes(' range')).forEach(p => {
          h += `<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin:1px 0"><span style="width:6px;height:6px;border-radius:50%;background:${p.color};display:inline-block"></span>${p.seriesName} <b style="margin-left:auto">${formatMs(p.value)}</b></div>`;
        });
        return h;
      }
    },
    legend: {
      show: true, top: 4, right: 0,
      textStyle: { color: mutedFg, fontSize: 11 },
      icon: 'circle', itemWidth: 6, itemHeight: 6, itemGap: 14,
      data: suite.os
    },
    grid: { top: 32, right: 12, bottom: 24, left: 48 },
    xAxis: {
      type: 'category', data: labels,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: mutedFg, fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: grid } },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: mutedFg, fontSize: 10, formatter: v => formatMs(v) }
    },
    series: suite.os.flatMap(os => {
      const pts = state.data[suite.id + '/' + os] || [];
      const c = osColor(os);
      const mainData = pts.map(d => d.entries[key]?.[metric] ?? null);
      const minData = pts.map(d => d.entries[key]?.min ?? null);
      const maxData = pts.map(d => {
        const entry = d.entries[key];
        if (!entry) return null;
        return (entry.max ?? null) !== null && (entry.min ?? null) !== null
          ? entry.max - entry.min
          : null;
      });

      return [
        // Min baseline (invisible, serves as the base for the band)
        {
          name: os + ' min',
          type: 'line', smooth: 0.4,
          symbol: 'none',
          lineStyle: { width: 0 },
          stack: os + '-band',
          silent: true,
          data: minData
        },
        // Max - min range (stacked on min, creates the band)
        {
          name: os + ' range',
          type: 'line', smooth: 0.4,
          symbol: 'none',
          lineStyle: { width: 0 },
          stack: os + '-band',
          areaStyle: { color: c + '12' },
          silent: true,
          data: maxData
        },
        // Main metric line
        {
          name: os, type: 'line', smooth: 0.4,
          symbol: 'circle', symbolSize: 4,
          lineStyle: { width: 2 },
          itemStyle: { color: c },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: c + '20' },
              { offset: 1, color: c + '02' }
            ])
          },
          emphasis: { focus: 'series' },
          data: mainData
        }
      ];
    })
  });

  state.charts.push(chart);
}

function render() {
  state.charts.forEach(c => c.dispose());
  state.charts = [];

  const app = document.getElementById('app');
  app.innerHTML = '';

  const suite = state.suites.find(s => s.id === state.activeSuite);
  if (!suite) {
    app.innerHTML = '<div class="empty-state"><p>No data available.</p></div>';
    return;
  }

  const metric = state.activeMetric[suite.id] || 'mean';
  const keys = entryKeys(suite);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  const left = document.createElement('div');
  left.className = 'toolbar-left';
  left.innerHTML = `<div class="toolbar-title">${suite.name}</div><div class="toolbar-subtitle">${suite.os.join(' · ')} · ${keys.length} benchmarks</div>`;
  toolbar.appendChild(left);

  const right = document.createElement('div');
  right.className = 'toolbar-right';

  const pills = document.createElement('div');
  pills.className = 'metric-pills';
  METRICS.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'metric-pill' + (m === metric ? ' active' : '');
    btn.textContent = METRIC_LABELS[m];
    btn.onclick = () => { state.activeMetric[suite.id] = m; render(); };
    pills.appendChild(btn);
  });
  right.appendChild(pills);
  toolbar.appendChild(right);
  app.appendChild(toolbar);

  // Charts
  const chartsGrid = document.createElement('div');
  chartsGrid.className = 'charts';

  if (keys.length === 0) {
    chartsGrid.innerHTML = '<div class="empty-state"><p>No benchmark data yet. Run benchmarks in CI to see results.</p></div>';
    app.appendChild(chartsGrid);
    return;
  }

  keys.forEach(key => {
    const card = document.createElement('div');
    card.className = 'chart-card';

    const top = document.createElement('div');
    top.className = 'chart-top';

    const name = document.createElement('span');
    name.className = 'chart-name';
    name.textContent = key;
    top.appendChild(name);

    const val = latestValue(suite, key, metric);
    if (val != null) {
      const v = document.createElement('span');
      v.className = 'chart-value';
      v.textContent = formatMs(val);
      top.appendChild(v);
    }

    card.appendChild(top);

    const container = document.createElement('div');
    container.className = 'chart-container';
    card.appendChild(container);
    chartsGrid.appendChild(card);

    requestAnimationFrame(() => makeChart(container, key, suite, metric));
  });

  app.appendChild(chartsGrid);
  window.onresize = () => state.charts.forEach(c => c.resize());
}

function populateSuiteSelect() {
  const sel = document.getElementById('suite-select');
  sel.innerHTML = '';
  state.suites.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    opt.selected = s.id === state.activeSuite;
    sel.appendChild(opt);
  });
  sel.onchange = () => { state.activeSuite = sel.value; render(); };
}

async function init() {
  document.documentElement.setAttribute('data-theme', theme());

  const manifest = await fetchJSON('data/manifest.json');
  if (!manifest?.suites?.length) {
    document.getElementById('app').innerHTML = '<div class="empty-state"><p>No benchmark suites configured.</p></div>';
    return;
  }

  state.suites = manifest.suites;
  state.activeSuite = manifest.suites[0].id;

  for (const suite of manifest.suites) {
    state.activeMetric[suite.id] = 'mean';
    for (const os of suite.os) {
      state.data[suite.id + '/' + os] = await fetchJSON('data/' + suite.id + '/' + os + '.json') || [];
    }
  }

  populateSuiteSelect();
  render();
  document.getElementById('footer-updated').textContent = 'Updated ' + new Date().toLocaleString();
}

init();
