import { html, useMemo } from '../lib/preact.js';
import { METRIC_LABELS } from '../lib/constants.js';
import { formatValue } from '../lib/helpers.js';
import { buildSummary } from '../lib/data.js';

export function SummaryRow({ data, suite, keys, metric }) {
  const summary = useMemo(() => buildSummary(data, suite, keys, metric), [data, suite, keys, metric]);
  const dir = suite.direction || 'smaller';

  return html`
    <div class="summary-row">
      <div class="summary-card">
        <div class="summary-label">Data Points</div>
        <div class="summary-value">${summary.dataPoints}</div>
        <div class="summary-detail">across ${summary.benchmarks} benchmarks</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">${dir === 'smaller' ? 'Fastest' : 'Best'} OS</div>
        <div class="summary-value">${summary.fastestOS || '-'}</div>
        <div class="summary-detail">avg ${METRIC_LABELS[metric]}: ${formatValue(summary.fastestVal, suite.unit)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Most Stable</div>
        <div class="summary-value">${summary.stableOS || '-'}</div>
        <div class="summary-detail">lowest avg std dev: ${formatValue(summary.stableVal, suite.unit)}</div>
      </div>
    </div>
  `;
}
