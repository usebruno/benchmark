import { html } from '../lib/preact.js';

export function ChangeArrow({ current, previous, direction }) {
  if (previous == null || current == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return null;

  const smallerBetter = (direction || 'smaller') === 'smaller';
  const improved = smallerBetter ? diff < 0 : diff > 0;
  const color = improved ? 'var(--green, #3fb950)' : 'var(--red, #f78166)';
  const arrow = improved ? '\u2193' : '\u2191';
  const pct = Math.abs(diff / previous * 100).toFixed(1);

  return html`<span style="font-size:11px;color:${color};margin-left:6px;font-weight:500">${arrow} ${pct}%</span>`;
}
