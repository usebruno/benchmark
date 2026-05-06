import { html } from '../lib/preact.js';
import { directionLabel } from '../lib/helpers.js';
import { MetricPills } from './MetricPills.js';
import { SortSelect } from './SortSelect.js';

export function Toolbar({ suite, keys, metric, onMetricChange, sortBy, onSortChange }) {
  return html`
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="toolbar-title">
          ${suite.name}
          <span class="direction-badge">${directionLabel(suite)}</span>
        </div>
        <div class="toolbar-subtitle">${suite.os.join(' · ')} · ${keys.length} benchmarks</div>
      </div>
      <div class="toolbar-right">
        <${SortSelect} value=${sortBy} onChange=${onSortChange} />
        <${MetricPills} metric=${metric} onChange=${onMetricChange} />
      </div>
    </div>
  `;
}
