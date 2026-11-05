import React, { useState } from 'react';
import { Entry } from '../types';
import { money, shortMoney, today } from '../utils/calc';
import { triggerSkidEffect } from '../utils/sound';

interface ChartSectionProps {
  entries: Entry[];
  vehicleId: string;
  soundEnabled: boolean;
}

// Exact colors specified by user:
// Thu: Màu xanh lá cây (#10b981)
// Xăng: Màu vàng (#f59e0b / #eab308)
// Bảo dưỡng: Màu xanh nước biển (#0284c7 / #0ea5e9)
// Chi phí khác: Màu tím (#a855f7)
export const CATEGORY_COLORS = {
  income: {
    label: 'Thu nhập',
    short: 'Thu',
    icon: '💰',
    color: '#10b981',
    light: '#34d399',
    bg: 'rgba(16, 185, 129, 0.18)',
    border: '#10b981',
  },
  fuel: {
    label: 'Tiền xăng',
    short: 'Xăng',
    icon: '⛽',
    color: '#f59e0b',
    light: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.18)',
    border: '#f59e0b',
  },
  service: {
    label: 'Bảo dưỡng',
    short: 'Bảo dưỡng',
    icon: '🔧',
    color: '#0284c7',
    light: '#38bdf8',
    bg: 'rgba(2, 132, 199, 0.18)',
    border: '#0284c7',
  },
  other: {
    label: 'Chi phí khác',
    short: 'Khác',
    icon: '🧾',
    color: '#a855f7',
    light: '#c084fc',
    bg: 'rgba(168, 85, 247, 0.18)',
    border: '#a855f7',
  },
};

export const ChartSection: React.FC<ChartSectionProps> = ({
  entries,
  vehicleId,
  soundEnabled,
}) => {
  const [cmode, setCmode] = useState<'6m' | 'month' | 'year'>('6m');
  const [cmonth, setCmonth] = useState(today().slice(0, 7));
  const [cyear, setCyear] = useState(today().slice(0, 4));
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>({
    income: true,
    fuel: true,
    service: true,
    other: true,
  });

  const now = new Date();
  const buckets: { k: string; l: string }[] = [];
  let keyLength = 7;

  if (cmode === 'year') {
    for (let m = 1; m <= 12; m++) {
      buckets.push({ k: `${cyear}-${String(m).padStart(2, '0')}`, l: `T${m}` });
    }
  } else if (cmode === 'month') {
    keyLength = 10;
    const [y, m] = cmonth.split('-').map(Number);
    const numDays = new Date(y, m, 0).getDate();
    for (let d = 1; d <= numDays; d++) {
      buckets.push({ k: `${cmonth}-${String(d).padStart(2, '0')}`, l: String(d) });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        k: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        l: `T${d.getMonth() + 1}`,
      });
    }
  }

  const keysSet = new Set(buckets.map((x) => x.k));
  const vehicleEntries = entries.filter(
    (e) => (!vehicleId || e.v === vehicleId) && keysSet.has(e.date.slice(0, keyLength))
  );

  const data = buckets.map((x) => {
    const f = vehicleEntries.filter((e) => e.date.slice(0, keyLength) === x.k);
    return {
      l: x.l,
      k: x.k,
      income: f.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      fuel: f.filter((e) => e.type === 'fuel').reduce((s, e) => s + e.amount, 0),
      service: f.filter((e) => e.type === 'service').reduce((s, e) => s + e.amount, 0),
      other: f.filter((e) => e.type === 'other').reduce((s, e) => s + e.amount, 0),
    };
  });

  const totals = {
    income: vehicleEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0),
    fuel: vehicleEntries.filter((e) => e.type === 'fuel').reduce((s, e) => s + e.amount, 0),
    service: vehicleEntries.filter((e) => e.type === 'service').reduce((s, e) => s + e.amount, 0),
    other: vehicleEntries.filter((e) => e.type === 'other').reduce((s, e) => s + e.amount, 0),
  };

  const totalExpense = totals.fuel + totals.service + totals.other;
  const netProfit = totals.income - totalExpense;

  const years = Array.from(
    new Set(
      entries
        .map((e) => e.date.slice(0, 4))
        .concat([today().slice(0, 4), cyear])
    )
  )
    .sort()
    .reverse();

  const ttl =
    cmode === '6m'
      ? '6 tháng gần nhất'
      : cmode === 'year'
      ? `năm ${cyear}`
      : `tháng ${cmonth.split('-').reverse().join('/')}`;

  const toggleSeries = (key: string) => {
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChartTypeChange = (ct: 'bar' | 'line' | 'pie', e: React.MouseEvent<HTMLButtonElement>) => {
    setChartType(ct);
    triggerSkidEffect(e.currentTarget, soundEnabled);
  };

  // SVG dimensions
  const W = 380;
  const H = 180;
  const chartBottom = H - 28;
  const chartHeight = 125;

  // Max value calculation across enabled series
  const allMaxValues = data.flatMap((d) => [
    activeSeries.income ? d.income : 0,
    activeSeries.fuel ? d.fuel : 0,
    activeSeries.service ? d.service : 0,
    activeSeries.other ? d.other : 0,
  ]);
  const maxValue = Math.max(1, ...allMaxValues);
  const slotWidth = W / data.length;

  // Count how many series are active for bar distribution
  const activeCount = Object.keys(activeSeries).filter((k) => activeSeries[k]).length || 1;
  const totalBarGroupWidth = Math.min(slotWidth * 0.85, 36);
  const individualBarWidth = Math.max(2, Math.floor(totalBarGroupWidth / activeCount));

  // Render Donut Chart
  const renderDonut = (slices: { v: number; color: string; label: string }[], centerLabel: string, centerSub: string) => {
    const tot = slices.reduce((t, x) => t + x.v, 0);
    const R = 42;
    const C = 2 * Math.PI * R;
    let offset = 0;
    const circles: React.ReactNode[] = [];

    if (!tot) {
      circles.push(
        <circle
          key="empty"
          cx="65"
          cy="65"
          r={R}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="18"
        />
      );
    } else {
      slices.forEach((s, idx) => {
        if (!s.v) return;
        const len = (s.v / tot) * C;
        circles.push(
          <circle
            key={idx}
            cx="65"
            cy="65"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 65 65)"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        );
        offset += len;
      });
    }

    return (
      <svg viewBox="0 0 130 130" style={{ maxWidth: '160px', margin: '0 auto', display: 'block' }}>
        {circles}
        <text
          x="65"
          y="62"
          textAnchor="middle"
          style={{ fontSize: '12px', fontWeight: 800, fill: '#f8fafc' }}
        >
          {centerLabel}
        </text>
        <text
          x="65"
          y="76"
          textAnchor="middle"
          style={{ fontSize: '9px', fontWeight: 600, fill: 'var(--mut)' }}
        >
          {centerSub}
        </text>
      </svg>
    );
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h2>📊 Báo cáo phân bổ tài chính độc lập</h2>
        <span style={{ fontSize: '11px', color: 'var(--mut)' }}>{ttl}</span>
      </div>

      {/* Date Filter Controls */}
      <div className="row" style={{ marginBottom: '10px' }}>
        <select
          id="cmode"
          aria-label="Khoảng thời gian"
          value={cmode}
          onChange={(e) => setCmode(e.target.value as any)}
        >
          <option value="6m">6 tháng gần nhất</option>
          <option value="month">Theo từng ngày trong tháng</option>
          <option value="year">Theo 12 tháng trong năm</option>
        </select>

        {cmode === 'month' && (
          <input
            id="cmo"
            type="month"
            value={cmonth}
            aria-label="Chọn tháng"
            onChange={(e) => setCmonth(e.target.value)}
          />
        )}

        {cmode === 'year' && (
          <select
            id="cyr"
            aria-label="Chọn năm"
            value={cyear}
            onChange={(e) => setCyear(e.target.value)}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Chart Type Tabs */}
      <div className="tabs" style={{ marginBottom: '12px' }}>
        {[
          ['bar', '📊 Cột phân tách'],
          ['line', '📈 Đường độc lập'],
          ['pie', '🥧 Tròn cơ cấu'],
        ].map(([typeVal, label]) => (
          <button
            key={typeVal}
            type="button"
            data-ct={typeVal}
            aria-pressed={chartType === typeVal}
            className={chartType === typeVal ? 'active' : ''}
            onClick={(e) => handleChartTypeChange(typeVal as any, e)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Interactive Legend with Explicit Category Colors */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          marginBottom: '14px',
        }}
      >
        {(['income', 'fuel', 'service', 'other'] as const).map((key) => {
          const cfg = CATEGORY_COLORS[key];
          const isEnabled = activeSeries[key];
          const val = totals[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleSeries(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '10px',
                background: isEnabled ? cfg.bg : 'rgba(255, 255, 255, 0.03)',
                border: `1.5px solid ${isEnabled ? cfg.color : 'rgba(255, 255, 255, 0.1)'}`,
                color: isEnabled ? '#f8fafc' : 'rgba(148, 163, 184, 0.6)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
              title={`Nhấp để ẩn/hiện cột ${cfg.label}`}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  background: isEnabled ? cfg.color : 'transparent',
                  border: `2px solid ${cfg.color}`,
                  display: 'inline-block',
                  flexShrink: 0,
                  boxShadow: isEnabled ? `0 0 6px ${cfg.color}88` : undefined,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: isEnabled ? cfg.light : 'inherit' }}>
                  {cfg.icon} {cfg.short}
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {money(val)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CHART RENDERING */}
      {chartType === 'pie' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            padding: '12px 6px',
          }}
        >
          {/* Donut 1: Expense Breakdown (Fuel, Service, Other) */}
          <div style={{ textAlign: 'center' }}>
            {renderDonut(
              [
                { v: totals.fuel, color: CATEGORY_COLORS.fuel.color, label: 'Xăng' },
                { v: totals.service, color: CATEGORY_COLORS.service.color, label: 'Bảo dưỡng' },
                { v: totals.other, color: CATEGORY_COLORS.other.color, label: 'Khác' },
              ],
              shortMoney(totalExpense),
              'Tổng chi phí'
            )}
            <div style={{ marginTop: '10px', fontSize: '12px' }}>
              <b style={{ color: '#f8fafc' }}>Cơ cấu chi phí xe</b>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', fontSize: '11.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: CATEGORY_COLORS.fuel.light }}>
                <span>⛽ Xăng (Màu vàng):</span>
                <b>{money(totals.fuel)} ({totalExpense ? Math.round((totals.fuel / totalExpense) * 100) : 0}%)</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: CATEGORY_COLORS.service.light }}>
                <span>🔧 Bảo dưỡng (Xanh biển):</span>
                <b>{money(totals.service)} ({totalExpense ? Math.round((totals.service / totalExpense) * 100) : 0}%)</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: CATEGORY_COLORS.other.light }}>
                <span>🧾 Chi phí khác (Màu tím):</span>
                <b>{money(totals.other)} ({totalExpense ? Math.round((totals.other / totalExpense) * 100) : 0}%)</b>
              </div>
            </div>
          </div>

          {/* Donut 2: Income vs Total Expenses */}
          <div style={{ textAlign: 'center' }}>
            {renderDonut(
              [
                { v: totals.income, color: CATEGORY_COLORS.income.color, label: 'Thu nhập' },
                { v: totalExpense, color: '#f43f5e', label: 'Chi phí' },
              ],
              (netProfit >= 0 ? '+' : '−') + shortMoney(Math.abs(netProfit)),
              netProfit >= 0 ? 'Thặng dư' : 'Thâm hụt'
            )}
            <div style={{ marginTop: '10px', fontSize: '12px' }}>
              <b style={{ color: '#f8fafc' }}>Cân đối Thu nhập & Chi phí</b>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', fontSize: '11.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: CATEGORY_COLORS.income.light }}>
                <span>💰 Tổng thu nhập:</span>
                <b>{money(totals.income)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fb7185' }}>
                <span>💸 Tổng chi phí:</span>
                <b>{money(totalExpense)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '4px' }}>
                <span>{netProfit >= 0 ? '📈 Lợi nhuận ròng:' : '📉 Chênh lệch âm:'}</span>
                <b style={{ color: netProfit >= 0 ? CATEGORY_COLORS.income.color : '#f43f5e' }}>
                  {netProfit >= 0 ? '+' : ''}{money(netProfit)}
                </b>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* SVG Chart for Bar or Line with Independent Columns/Lines */}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Biểu đồ phân bổ độc lập ${ttl}`}
            style={{ width: '100%', height: 'auto', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(255, 255, 255, 0.08)" />
                <stop offset="1" stopColor="rgba(255, 255, 255, 0.02)" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const y = chartBottom - f * chartHeight;
              return (
                <g key={f}>
                  <line
                    x1="0"
                    x2={W}
                    y1={y}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="0.5"
                    strokeDasharray={f === 0 ? undefined : '3 3'}
                  />
                  {f > 0 && (
                    <text
                      x="4"
                      y={y - 3}
                      fill="rgba(148, 163, 184, 0.55)"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {shortMoney(maxValue * f)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* LINE CHART: 4 Distinct Series */}
            {chartType === 'line' && (
              <>
                {(['income', 'fuel', 'service', 'other'] as const).map((key) => {
                  if (!activeSeries[key]) return null;
                  const cfg = CATEGORY_COLORS[key];
                  const points = data
                    .map((d, j) => {
                      const x = (j + 0.5) * slotWidth;
                      const y = chartBottom - (d[key] / maxValue) * chartHeight;
                      return `${x},${y}`;
                    })
                    .join(' ');

                  return (
                    <g key={key}>
                      <polyline
                        points={points}
                        fill="none"
                        stroke={cfg.color}
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        filter={`drop-shadow(0 0 3px ${cfg.color}88)`}
                      />
                      {data.length <= 15 &&
                        data.map((d, j) => {
                          const cx = (j + 0.5) * slotWidth;
                          const cy = chartBottom - (d[key] / maxValue) * chartHeight;
                          return (
                            <circle
                              key={j}
                              cx={cx}
                              cy={cy}
                              r="3"
                              fill={cfg.color}
                              stroke="#0f172a"
                              strokeWidth="1.5"
                            />
                          );
                        })}
                    </g>
                  );
                })}
              </>
            )}

            {/* BAR CHART: 4 Independent Separated Columns per bucket */}
            {chartType === 'bar' && (
              <>
                {data.map((d, j) => {
                  const centerX = (j + 0.5) * slotWidth;
                  const keysToRender = (['income', 'fuel', 'service', 'other'] as const).filter(
                    (k) => activeSeries[k]
                  );
                  const startX = centerX - (keysToRender.length * individualBarWidth) / 2;

                  return (
                    <g key={j}>
                      {keysToRender.map((k, colIdx) => {
                        const val = d[k];
                        const barH = (val / maxValue) * chartHeight;
                        const bx = startX + colIdx * individualBarWidth;
                        const by = chartBottom - barH;
                        const cfg = CATEGORY_COLORS[k];

                        return (
                          <rect
                            key={k}
                            x={bx}
                            y={by}
                            width={Math.max(1.5, individualBarWidth - 1)}
                            height={Math.max(0, barH)}
                            rx="1.5"
                            fill={cfg.color}
                            opacity={val > 0 ? 0.95 : 0.2}
                            style={{ transition: 'all 0.3s ease' }}
                          />
                        );
                      })}
                    </g>
                  );
                })}
              </>
            )}

            {/* X-Axis Labels */}
            {data.map((d, j) => {
              const shouldShow =
                cmode !== 'month' || j % 5 === 0 || j === data.length - 1;
              if (!shouldShow) return null;
              return (
                <text
                  key={j}
                  x={(j + 0.5) * slotWidth}
                  y={H - 8}
                  textAnchor="middle"
                  fill="rgba(148, 163, 184, 0.75)"
                  fontSize="9.5"
                  fontWeight="600"
                >
                  {d.l}
                </text>
              );
            })}
          </svg>

          {/* Bottom Summary Bar */}
          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(3, 7, 18, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '11.5px',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span>
                💰 Thu: <b style={{ color: CATEGORY_COLORS.income.color }}>{money(totals.income)}</b>
              </span>
              <span>
                ⛽ Xăng: <b style={{ color: CATEGORY_COLORS.fuel.color }}>{money(totals.fuel)}</b>
              </span>
              <span>
                🔧 Bảo dưỡng: <b style={{ color: CATEGORY_COLORS.service.color }}>{money(totals.service)}</b>
              </span>
              <span>
                🧾 Khác: <b style={{ color: CATEGORY_COLORS.other.color }}>{money(totals.other)}</b>
              </span>
            </div>
            <div>
              Chênh lệch:{' '}
              <b style={{ color: netProfit >= 0 ? CATEGORY_COLORS.income.color : '#f43f5e', fontSize: '13px' }}>
                {netProfit >= 0 ? '+' : ''}{money(netProfit)}
              </b>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
