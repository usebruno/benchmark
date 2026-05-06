import { getLatestValue, getPrevValue } from './data.js';

export const SORT_OPTIONS = [
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'by-size', label: 'By Size' },
  { id: 'slowest-first', label: 'Slowest First' },
  { id: 'fastest-first', label: 'Fastest First' },
  { id: 'biggest-regression', label: 'Biggest Regression' }
];

function extractNumber(key) {
  const match = key.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function extractPrefix(key) {
  return key.replace(/[\d-]+$/, '').replace(/-$/, '');
}

export function sortKeys(keys, sortId, data, suite, metric) {
  const sorted = [...keys];

  switch (sortId) {
    case 'alphabetical':
      sorted.sort((a, b) => a.localeCompare(b));
      break;

    case 'by-size':
      sorted.sort((a, b) => {
        const numA = extractNumber(a);
        const numB = extractNumber(b);
        if (numA !== numB) return numA - numB;
        return extractPrefix(a).localeCompare(extractPrefix(b));
      });
      break;

    case 'slowest-first':
      sorted.sort((a, b) => {
        const va = getLatestValue(data, suite, a, metric) ?? 0;
        const vb = getLatestValue(data, suite, b, metric) ?? 0;
        return vb - va;
      });
      break;

    case 'fastest-first':
      sorted.sort((a, b) => {
        const va = getLatestValue(data, suite, a, metric) ?? Infinity;
        const vb = getLatestValue(data, suite, b, metric) ?? Infinity;
        return va - vb;
      });
      break;

    case 'biggest-regression':
      sorted.sort((a, b) => {
        const changeA = regressionPercent(data, suite, a, metric);
        const changeB = regressionPercent(data, suite, b, metric);
        return changeB - changeA;
      });
      break;

    default:
      sorted.sort((a, b) => a.localeCompare(b));
  }

  return sorted;
}

function regressionPercent(data, suite, key, metric) {
  const curr = getLatestValue(data, suite, key, metric);
  const prev = getPrevValue(data, suite, key, metric);
  if (curr == null || prev == null || prev === 0) return 0;
  const dir = suite.direction || 'smaller';
  const change = (curr - prev) / prev * 100;
  return dir === 'smaller' ? change : -change;
}
