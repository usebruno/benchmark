import { html, useState, useEffect, useRef, useMemo } from '../lib/preact.js';
import { getEntryKeys } from '../lib/data.js';
import { sortKeys } from '../lib/sorting.js';
import { Toolbar } from './Toolbar.js';
import { SummaryRow } from './SummaryRow.js';
import { Chart } from './Chart.js';

export function Dashboard({ suites, data, sourceRepo }) {
  const [activeSuite, setActiveSuite] = useState(suites[0]?.id);
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

  useEffect(() => { chartsRef.current = []; }, [activeSuite, metric, sortBy]);

  useEffect(() => {
    const handler = () => chartsRef.current.forEach(c => c.chart.resize());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    const sel = document.getElementById('suite-select');
    if (!sel) return;
    sel.innerHTML = '';
    suites.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      opt.selected = s.id === activeSuite;
      sel.appendChild(opt);
    });
    sel.onchange = () => setActiveSuite(sel.value);
  }, [suites, activeSuite]);

  if (!suite) {
    return html`<div class="empty-state"><p>No data available.</p></div>`;
  }

  const handleMetricChange = (m) => setMetrics(prev => ({ ...prev, [activeSuite]: m }));
  const connectGroupId = 'bench-' + activeSuite + '-' + metric;
  const handleChartReady = (chart, key) => {
    chartsRef.current.push({ chart, key });
    // Connect all charts once all are ready
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
        ? html`<div class="empty-state"><p>No benchmark data yet. Run benchmarks in CI to see results.</p></div>`
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
