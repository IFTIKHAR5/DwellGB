// components/admin/Charts.jsx — small, dependency-free SVG charts for the admin panel.
// Single-series charts: one validated mark colour (--color-chart), no legend (the
// title names the series), hairline grid, 4px rounded data-ends, hover tooltips,
// and a table view for accessibility.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Table2, BarChart3 } from '@/components/icons';

function niceMax(v) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}

// Width of the chart box, kept up to date on resize / phone rotation.
// A callback ref (setNode) re-attaches the observer when the chart is shown again.
function useWidth() {
  const [node, setNode] = useState(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!node) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.floor(e.contentRect.width))));
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return [setNode, w];
}

/** Column chart for a daily series: data = [{ date: 'YYYY-MM-DD', count }] */
export function ColumnChart({ title, subtitle, data, valueLabel = 'count', formatDate, height = 190, tableLabels = { date: 'Date', value: 'Value' } }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const pad = { top: 12, right: 8, bottom: 26, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.count))), [data]);
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.min(24, Math.max(3, slot - 2)); // 2px surface gap between neighbours
  const y = (v) => pad.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  const total = data.reduce((s, d) => s + d.count, 0);
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(innerW / 64)));

  return (
    <figure className="card p-5">
      <figcaption className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-bold">{title}</p>
          {subtitle && <p className="text-sm text-ink-2"><span className="font-semibold text-ink ltr-nums">{total}</span> {subtitle}</p>}
        </div>
        <button type="button" onClick={() => setAsTable((v) => !v)} className="btn btn-ghost btn-sm" aria-pressed={asTable} aria-label={asTable ? 'Show chart' : 'Show table'}>
          {asTable ? <BarChart3 className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
        </button>
      </figcaption>

      {asTable ? (
        <div className="max-h-[200px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead><tr className="text-start text-muted"><th className="text-start font-medium py-1">{tableLabels.date}</th><th className="text-end font-medium py-1">{tableLabels.value}</th></tr></thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t border-line"><td className="py-1.5">{formatDate(d.date)}</td><td className="py-1.5 text-end font-semibold ltr-nums">{d.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative" dir="ltr" onMouseLeave={() => setHover(null)}>
          <svg width={width} height={height} role="img" aria-label={`${title}: ${total} total`}>
            {ticks.map((tv) => (
              <g key={tv}>
                <line x1={pad.left} x2={width - pad.right} y1={y(tv)} y2={y(tv)} stroke="var(--color-line)" strokeWidth="1" />
                <text x={pad.left - 6} y={y(tv) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">{Math.round(tv).toLocaleString()}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = pad.left + slot * i + slot / 2;
              const x = cx - barW / 2;
              const top = y(d.count);
              const h = pad.top + innerH - top;
              const r = Math.min(4, h, barW / 2);
              const path = h > 0
                ? `M${x},${pad.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${pad.top + innerH} Z`
                : '';
              return (
                <g key={d.date}>
                  {path && <path d={path} fill="var(--color-chart)" opacity={hover === null || hover === i ? 1 : 0.45} />}
                  {i % labelEvery === 0 && (
                    <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{formatDate(d.date)}</text>
                  )}
                  {/* hit target: the whole column slot, larger than the mark */}
                  <rect x={pad.left + slot * i} y={pad.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${formatDate(d.date)}: ${d.count}`} />
                </g>
              );
            })}
          </svg>
          {hover !== null && data[hover] && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink text-white text-xs px-3 py-2 shadow-lift whitespace-nowrap"
              style={{ left: Math.min(Math.max(pad.left + slot * hover + slot / 2, 60), width - 60), top: y(data[hover].count) - 8 }}
            >
              <p className="text-white/70">{formatDate(data[hover].date, true)}</p>
              <p className="font-bold ltr-nums">{data[hover].count} {valueLabel}</p>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

/** Horizontal bar list — label, bar, value at the tip. items = [{ label, value, sub }] */
export function BarList({ title, items, empty = 'No data yet', formatValue = (v) => v }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const [hover, setHover] = useState(null);
  return (
    <figure className="card p-5">
      <figcaption className="font-bold mb-4">{title}</figcaption>
      {items.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it, i) => (
            <li key={it.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} title={it.sub ? `${it.label}: ${formatValue(it.value)} · ${it.sub}` : undefined}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-ink truncate">{it.label}</span>
                <span className="text-ink-2 ltr-nums shrink-0 ms-3">
                  <span className="font-semibold text-ink">{formatValue(it.value)}</span>
                  {/* Hover shows the extra figure on desktop; touch screens have no hover, so phones always show it. */}
                  {it.sub && <span className={`text-muted ${hover === i ? '' : 'md:hidden'}`}> · {it.sub}</span>}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-sunken overflow-hidden" dir="ltr">
                <div className="h-full rounded-e-[4px] bg-[var(--color-chart)] transition-[width] duration-500" style={{ width: `${(it.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

/** Single headline number. tone only tints the icon chip. */
export function StatTile({ icon: Icon, label, value, sub, tone = 'pine', to }) {
  const tones = { pine: 'bg-pine-50 text-pine', brand: 'bg-brand-50 text-brand', warning: 'bg-warning-50 text-warning', danger: 'bg-danger-50 text-danger', success: 'bg-success-50 text-success' };
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-2 font-medium">{label}</p>
        {Icon && <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="w-[18px] h-[18px]" /></span>}
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold ltr-nums">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </>
  );
  return to ? <Link to={to} className="card p-5 block hover:shadow-lift transition-shadow">{body}</Link> : <div className="card p-5">{body}</div>;
}
