import { html } from '../lib/preact.js';
import { METRICS, METRIC_LABELS } from '../lib/constants.js';

export function MetricPills({ metric, onChange }) {
  return html`
    <div class="metric-pills">
      ${METRICS.map(m => html`
        <button
          class="metric-pill ${m === metric ? 'active' : ''}"
          onClick=${() => onChange(m)}
        >${METRIC_LABELS[m]}</button>
      `)}
    </div>
  `;
}
