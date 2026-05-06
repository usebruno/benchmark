import { html, useState, useEffect, useRef, useMemo } from '../lib/preact.js';
import { getEntryKeys } from '../lib/data.js';
import { sortKeys } from '../lib/sorting.js';
import { Toolbar } from './Toolbar.js';
import { SummaryRow } from './SummaryRow.js';
import { Chart } from './Chart.js';

export function Dashboard({ suites, data, sourceRepo, onSuiteChange }) {
  const [activeSuite, setActiveSuite] = useState(suites[0]?.id);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(() => {
    const m = {};
    suites.forEach(s => { m[s.id] = 'mean'; });
    return m;
  });
  const [sortBy, setSortBy] = useState('by-size');
  const [expandedCard, setExpandedCard] = useState(null);
  const chartsRef = useRef([]);

  const suite = suites.find(s => s.id === activeSuite);
  const metric = metrics[activeSuite] || 'mean';
  const rawKeys = suite ? getEntryKeys(data, suite) : [];
  const keys = useMemo(
    () => sortKeys(rawKeys, sortBy, data, suite, metric),
    [rawKeys, sortBy, data, suite, metric]
  );

  // Fetch data when suite changes
  useEffect(() => {
    if (!suite || !onSuiteChange) return;
    const hasData = suite.os.some(os => data[suite.id + '/' + os]?.length > 0);
    if (hasData) return;

    setLoading(true);
    onSuiteChange(suite).then(() => setLoading(false));
  }, [activeSuite]);

  useEffect(() => { chartsRef.current = []; }, [activeSuite, metric, sortBy]);

  useEffect(() => {
    const handler = () => chartsRef.current.forEach(c => c.chart.resize());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Populate suite select
  useEffect(() => {
    const sel = document.getElementById('suite-select');
    if (!sel) return;
    sel.innerHTML = '';
    if (suites.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No suites available';
      opt.disabled = true;
      sel.appendChild(opt);
      return;
    }
    suites.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      opt.selected = s.id === activeSuite;
      sel.appendChild(opt);
    });
    sel.onchange = (e) => setActiveSuite(e.target.value);
  }, [suites, activeSuite]);

  if (!suite) {
    return html`
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        <div class="empty-title">No suite selected</div>
        <p>Select a benchmark suite from the dropdown above.</p>
      </div>`;
  }

  if (loading) {
    return html`
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading ${suite.name} data...</p>
      </div>`;
  }

  const handleMetricChange = (m) => setMetrics(prev => ({ ...prev, [activeSuite]: m }));
  const connectGroupId = 'bench-' + activeSuite + '-' + metric;
  const handleChartReady = (chart, key) => {
    chartsRef.current.push({ chart, key });
    if (chartsRef.current.length === keys.length && keys.length > 1) {
      chartsRef.current.forEach(c => { c.chart.group = connectGroupId; });
      echarts.connect(connectGroupId);
    }
  };
  const toggleCard = (key) => setExpandedCard(prev => prev === key ? null : key);

  return html`
    <${Toolbar}
      suite=${suite}
      keys=${keys}
      metric=${metric}
      onMetricChange=${handleMetricChange}
      sortBy=${sortBy}
      onSortChange=${setSortBy}
    />

    ${keys.length > 0 && html`
      <${SummaryRow} data=${data} suite=${suite} keys=${keys} metric=${metric} />
    `}

    <div class="charts">
      ${keys.length === 0
        ? html`
            <div class="empty-state">
              <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <div class="empty-title">No data yet</div>
              <p>Run benchmarks in CI and trigger ingestion to see charts here.</p>
            </div>`
        : keys.map(key => html`
            <${Chart}
              key=${key + metric + activeSuite + sortBy}
              data=${data}
              suite=${suite}
              entryKey=${key}
              metric=${metric}
              sourceRepo=${sourceRepo}
              expanded=${expandedCard === key}
              onToggle=${() => toggleCard(key)}
              onChartReady=${handleChartReady}
            />
          `)
      }
    </div>
  `;
}
