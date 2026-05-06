export function getCommitLabels(data, suite) {
  for (const os of suite.os) {
    const pts = data[suite.id + '/' + os];
    if (pts?.length) return pts.map(d => d.commit?.substring(0, 7) || '');
  }
  return [];
}

export function getCommitData(data, suite) {
  for (const os of suite.os) {
    const pts = data[suite.id + '/' + os];
    if (pts?.length) return pts;
  }
  return [];
}

export function getEntryKeys(data, suite) {
  const s = new Set();
  suite.os.forEach(os => {
    const pts = data[suite.id + '/' + os];
    if (pts?.length) Object.keys(pts[0].entries || {}).forEach(k => s.add(k));
  });
  return [...s].sort();
}

export function getLatestValue(data, suite, key, metric) {
  for (const os of suite.os) {
    const pts = data[suite.id + '/' + os];
    if (pts?.length) {
      const v = pts[pts.length - 1].entries[key]?.[metric];
      if (v != null) return v;
    }
  }
  return null;
}

export function getPrevValue(data, suite, key, metric) {
  for (const os of suite.os) {
    const pts = data[suite.id + '/' + os];
    if (pts?.length >= 2) {
      const v = pts[pts.length - 2].entries[key]?.[metric];
      if (v != null) return v;
    }
  }
  return null;
}

export function buildSummary(data, suite, keys, metric) {
  const allPts = getCommitData(data, suite);
  const dir = suite.direction || 'smaller';
  let fastestOS = null, fastestVal = dir === 'smaller' ? Infinity : -Infinity;
  let stableOS = null, stableVal = Infinity;

  suite.os.forEach(os => {
    const pts = data[suite.id + '/' + os] || [];
    if (!pts.length) return;
    const last = pts[pts.length - 1];
    let totalMetric = 0, totalStd = 0, count = 0;

    keys.forEach(key => {
      const e = last.entries[key];
      if (e) { totalMetric += e[metric] || 0; totalStd += e.stdDev || 0; count++; }
    });

    if (count > 0) {
      const avg = totalMetric / count;
      const avgStd = totalStd / count;
      const isBetter = dir === 'smaller' ? avg < fastestVal : avg > fastestVal;
      if (isBetter || !fastestOS) { fastestOS = os; fastestVal = avg; }
      if (avgStd < stableVal) { stableOS = os; stableVal = avgStd; }
    }
  });

  return { dataPoints: allPts.length, benchmarks: keys.length, fastestOS, fastestVal, stableOS, stableVal };
}
