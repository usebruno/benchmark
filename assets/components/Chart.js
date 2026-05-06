import { html, useEffect, useRef } from '../lib/preact.js';
import { formatValue } from '../lib/helpers.js';
import { getLatestValue, getPrevValue } from '../lib/data.js';
import { buildChartOptions } from '../lib/chart-options.js';
import { ChangeArrow } from './ChangeArrow.js';

export function Chart({ data, suite, entryKey, metric, sourceRepo, expanded, onToggle, onChartReady }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (chartRef.current) chartRef.current.dispose();

    const chart = echarts.init(containerRef.current);
    chart.setOption(buildChartOptions(data, suite, entryKey, metric, sourceRepo));
    chartRef.current = chart;
    onChartReady(chart);

    return () => chart.dispose();
  }, [data, suite, entryKey, metric, sourceRepo, expanded]);

  useEffect(() => {
    if (chartRef.current) {
      setTimeout(() => chartRef.current.resize(), 250);
    }
  }, [expanded]);

  const latest = getLatestValue(data, suite, entryKey, metric);
  const prev = getPrevValue(data, suite, entryKey, metric);

  return html`
    <div class="chart-card ${expanded ? 'expanded' : ''}">
      <div class="chart-top" onClick=${onToggle}>
        <span class="chart-name">${entryKey}</span>
        <span>
          ${latest != null && html`<span class="chart-value">${formatValue(latest, suite.unit)}</span>`}
          <${ChangeArrow} current=${latest} previous=${prev} direction=${suite.direction} />
        </span>
      </div>
      <div class="chart-container" ref=${containerRef} />
    </div>
  `;
}
