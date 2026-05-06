import { html } from '../lib/preact.js';
import { SORT_OPTIONS } from '../lib/sorting.js';

export function SortSelect({ value, onChange }) {
  return html`
    <select class="sort-select" value=${value} onChange=${(e) => onChange(e.target.value)}>
      ${SORT_OPTIONS.map(opt => html`
        <option value=${opt.id}>${opt.label}</option>
      `)}
    </select>
  `;
}
