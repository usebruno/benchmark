import { getCommitLabels } from './data.js';
import { getTheme, osColor, formatValue, commitUrl } from './helpers.js';

export function buildChartOptions(data, suite, key, metric, sourceRepo) {
  const labels = getCommitLabels(data, suite);
  const unit = suite.unit || 'ms';
  const fmt = (v) => formatValue(v, unit);
  const t = getTheme();
  const mutedFg = t === 'dark' ? '#6e7681' : '#656d76';
  const gridColor = t === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tipBg = t === 'dark' ? 'hsl(222,47%,8%)' : '#fff';
  const tipBorder = t === 'dark' ? 'hsl(217,20%,16%)' : 'hsl(214,32%,91%)';
  const tipText = t === 'dark' ? '#c9d1d9' : '#424a53';
  const tipTitle = t === 'dark' ? '#f0f6fc' : '#1f2328';
  const tipLink = t === 'dark' ? '#58a6ff' : '#0969da';

  return {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      backgroundColor: tipBg, borderColor: tipBorder,
      textStyle: { color: tipText, fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: mutedFg, opacity: 0.2 } },
      formatter: params => {
        const idx = params[0]?.dataIndex;
        const anyOS = suite.os.find(os => data[suite.id + '/' + os]?.[idx]);
        const pt = anyOS ? data[suite.id + '/' + anyOS][idx] : null;
        let out = '';
        if (pt) {
          const sha = pt.commit?.substring(0, 7) || '';
          const url = commitUrl(sourceRepo, pt.commit);
          const link = url ? `<a href="${url}" target="_blank" style="color:${tipLink};text-decoration:none">${sha}</a>` : sha;
          out = `<div style="margin-bottom:4px;font-weight:600;font-size:11px;color:${tipTitle}">${link} · ${new Date(pt.date).toLocaleDateString()}</div>`;
        }
        params.filter(p => p.value != null && !p.seriesName.includes(' min') && !p.seriesName.includes(' range')).forEach(p => {
          out += `<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin:1px 0"><span style="width:6px;height:6px;border-radius:50%;background:${p.color};display:inline-block"></span>${p.seriesName} <b style="margin-left:auto">${fmt(p.value)}</b></div>`;
        });
        return out;
      }
    },
    legend: {
      show: true, top: 4, right: 0,
      textStyle: { color: mutedFg, fontSize: 11 },
      icon: 'circle', itemWidth: 6, itemHeight: 6, itemGap: 14,
      data: suite.os
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      {
        type: 'slider', xAxisIndex: 0, height: 16, bottom: 2,
        borderColor: 'transparent', backgroundColor: gridColor,
        fillerColor: t === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        handleSize: '100%', handleStyle: { color: mutedFg, borderColor: mutedFg },
        textStyle: { color: mutedFg, fontSize: 9 }, showDetail: false,
        show: labels.length > 10
      }
    ],
    grid: { top: 32, right: 12, bottom: labels.length > 10 ? 36 : 24, left: 48 },
    xAxis: {
      type: 'category', data: labels,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: mutedFg, fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: gridColor } },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: mutedFg, fontSize: 10, formatter: v => fmt(v) }
    },
    series: suite.os.flatMap(os => {
      const pts = data[suite.id + '/' + os] || [];
      const c = osColor(os);
      const mainData = pts.map(d => d.entries[key]?.[metric] ?? null);
      const minData = pts.map(d => d.entries[key]?.min ?? null);
      const maxData = pts.map(d => {
        const e = d.entries[key];
        return e && e.max != null && e.min != null ? e.max - e.min : null;
      });

      return [
        { name: os + ' min', type: 'line', smooth: 0.4, symbol: 'none', lineStyle: { width: 0 }, stack: os + '-band', silent: true, data: minData },
        { name: os + ' range', type: 'line', smooth: 0.4, symbol: 'none', lineStyle: { width: 0 }, stack: os + '-band', areaStyle: { color: c + '12' }, silent: true, data: maxData },
        {
          name: os, type: 'line', smooth: 0.4, symbol: 'circle', symbolSize: 4,
          lineStyle: { width: 2 }, itemStyle: { color: c },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: c + '20' }, { offset: 1, color: c + '02' }]) },
          emphasis: { focus: 'series' }, data: mainData
        }
      ];
    })
  };
}
