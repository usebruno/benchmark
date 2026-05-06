import { OS_COLORS } from './constants.js';

export function getTheme() {
  return localStorage.getItem('bench-theme') || 'dark';
}

export function osColor(os) {
  return (OS_COLORS[os] || {})[getTheme()] || '#8b949e';
}

const UNIT_FORMATTERS = {
  ms: (v) => v >= 1000 ? (v / 1000).toFixed(1) + 's' : Math.round(v) + 'ms',
  's': (v) => v >= 60 ? (v / 60).toFixed(1) + 'm' : v.toFixed(2) + 's',
  'ops/s': (v) => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(1) + 'K' : Math.round(v),
  bytes: (v) => v >= 1073741824 ? (v / 1073741824).toFixed(1) + ' GB' : v >= 1048576 ? (v / 1048576).toFixed(1) + ' MB' : v >= 1024 ? (v / 1024).toFixed(1) + ' KB' : Math.round(v) + ' B',
  '%': (v) => v.toFixed(1) + '%',
  count: (v) => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(1) + 'K' : Math.round(v)
};

export function formatValue(v, unit) {
  if (v == null) return '-';
  const formatter = UNIT_FORMATTERS[unit || 'ms'];
  return formatter ? formatter(v) : String(Math.round(v));
}

// Keep for backwards compatibility
export function formatMs(v) {
  return formatValue(v, 'ms');
}

export async function fetchJSON(url) {
  try {
    const r = await fetch(url + '?t=' + Date.now());
    return r.ok ? r.json() : null;
  } catch { return null; }
}

export function commitUrl(sourceRepo, commit) {
  if (!sourceRepo || !commit) return null;
  return `https://github.com/${sourceRepo}/commit/${commit}`;
}

export function directionLabel(suite) {
  return (suite.direction || 'smaller') === 'smaller' ? 'lower is better' : 'higher is better';
}
