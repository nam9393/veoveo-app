import React, { useState } from 'react';
import { Entry, Vehicle } from '../types';
import { num } from '../utils/calc';

interface FuelEfficiencyTrendChartProps {
  currentVehicle: Vehicle;
  entries: Entry[];
}

interface DataPoint {
  index: number;
  date: string;
  odo: number;
  liters: number;
  amount: number;
  cons: number; // L/100km
  kmDelta: number;
  costPerKm: number;
}

export const FuelEfficiencyTrendChart: React.FC<FuelEfficiencyTrendChartProps> = ({
  currentVehicle,
  entries,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  // Filter fuel entries with ODO for current vehicle and sort chronologically
  const fuelEntries = entries
    .filter((e) => e.v === currentVehicle.id && e.type === 'fuel' && e.odo)
    .sort((a, b) => a.odo - b.odo || a.date.localeCompare(b.date));

  // Compute consumption (L/100km) between consecutive fuel fill-ups
  const points: DataPoint[] = [];
  for (let i = 1; i < fuelEntries.length; i++) {
    const prev = fuelEntries[i - 1];
    const curr = fuelEntries[i];
    const kmDelta = curr.odo - prev.odo;
    const liters = curr.liters || (curr.price ? curr.amount / curr.price : 0);

    if (kmDelta > 0 && liters > 0) {
      const cons = (liters / kmDelta) * 100;
      // Filter realistic consumption ranges (1.0 - 35.0 L/100km)
      if (cons >= 1.0 && cons <= 35.0) {
        points.push({
          index: points.length + 1,
          date: curr.date,
          odo: curr.odo,
          liters,
          amount: curr.amount,
          cons: Math.round(cons * 10) / 10,
          kmDelta,
          costPerKm: Math.round(curr.amount / kmDelta),
        });
      }
    }
  }

  // Take exactly the LAST 5 DATA POINTS as requested
  const last5Points = points.slice(-5);

  // If fewer than 2 calculated points, provide baseline guidance
  const baselineCons = currentVehicle.cons || 5.5;

  // Key metrics from the last 5 fill-ups
  const avgCons =
    last5Points.length > 0
      ? Math.round(
          (last5Points.reduce((acc, p) => acc + p.cons, 0) / last5Points.length) * 10
        ) / 10
      : baselineCons;

  const bestPoint =
    last5Points.length > 0
      ? last5Points.reduce((min, p) => (p.cons < min.cons ? p : min), last5Points[0])
      : null;

  const latestPoint = last5Points.length > 0 ? last5Points[last5Points.length - 1] : null;
  const previousPoint =
    last5Points.length > 1 ? last5Points[last5Points.length - 2] : null;

  const deltaFromPrevious =
    latestPoint && previousPoint
      ? Math.round((latestPoint.cons - previousPoint.cons) * 10) / 10
      : 0;

  // Chart SVG Dimensions
  const width = 640;
  const height = 180;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Min and Max Y for scale
  const minVal = Math.max(
    1,
    Math.floor(
      Math.min(...(last5Points.map((p) => p.cons) || [baselineCons]), baselineCons) - 1.2
    )
  );
  const maxVal = Math.ceil(
    Math.max(...(last5Points.map((p) => p.cons) || [baselineCons]), baselineCons) + 1.2
  );
  const rangeY = Math.max(1.5, maxVal - minVal);

  const getY = (val: number) => padTop + chartH - ((val - minVal) / rangeY) * chartH;
  const getX = (index: number) => {
    if (last5Points.length <= 1) return padLeft + chartW / 2;
    return padLeft + (index / (last5Points.length - 1)) * chartW;
  };

  // Build SVG Path
  const pathD =
    last5Points.length > 1
      ? last5Points
          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)},${getY(p.cons)}`)
          .join(' ')
      : '';

  // Area under line
  const areaD =
    last5Points.length > 1
      ? `${pathD} L ${getX(last5Points.length - 1)},${padTop + chartH} L ${getX(
          0
        )},${padTop + chartH} Z`
      : '';

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(145deg, rgba(8, 16, 34, 0.94) 0%, rgba(14, 26, 52, 0.88) 100%)',
        border: '1px solid rgba(0, 240, 255, 0.25)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '14px',
      }}
    >
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>📈</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', color: '#00f0ff', fontWeight: 700 }}>
              Xu Hướng Hiệu Suất Tiêu Thụ Nhiên Liệu (5 Lần Gần Nhất)
            </h2>
            <small style={{ color: 'var(--mut)', fontSize: '11px' }}>
              Biểu đồ phân tích độ tiêu hao thực tế (Lít/100km) theo từng chu kỳ đổ xăng
            </small>
          </div>
        </div>

        {/* Status Indicator */}
        <div style={{ textAlign: 'right' }}>
          {deltaFromPrevious < 0 ? (
            <span
              style={{
                fontSize: '11.5px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#34d399',
                fontWeight: 700,
              }}
            >
              🟢 Tiết kiệm hơn {Math.abs(deltaFromPrevious)} L/100km
            </span>
          ) : deltaFromPrevious > 0 ? (
            <span
              style={{
                fontSize: '11.5px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid #f43f5e',
                color: '#fb7185',
                fontWeight: 700,
              }}
            >
              🟡 Tăng nhẹ +{deltaFromPrevious} L/100km
            </span>
          ) : (
            <span
              style={{
                fontSize: '11.5px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                color: '#00f0ff',
                fontWeight: 600,
              }}
            >
              Ổn định
            </span>
          )}
        </div>
      </div>

      {/* 4 Summary Metric KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'rgba(5, 12, 26, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', display: 'block' }}>
            TB 5 lần gần nhất
          </small>
          <b style={{ fontSize: '16px', color: '#00f0ff', fontFamily: 'monospace' }}>
            {avgCons} L/100km
          </b>
        </div>

        <div
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'rgba(5, 12, 26, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', display: 'block' }}>
            Lần tiết kiệm nhất
          </small>
          <b style={{ fontSize: '16px', color: '#10b981', fontFamily: 'monospace' }}>
            {bestPoint ? `${bestPoint.cons} L/100km` : `${baselineCons} L`}
          </b>
        </div>

        <div
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'rgba(5, 12, 26, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', display: 'block' }}>
            Lần đổ gần nhất
          </small>
          <b style={{ fontSize: '16px', color: '#f8fafc', fontFamily: 'monospace' }}>
            {latestPoint ? `${latestPoint.cons} L/100km` : `${baselineCons} L`}
          </b>
        </div>

        <div
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'rgba(5, 12, 26, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', display: 'block' }}>
            Chuẩn NSX công bố
          </small>
          <b style={{ fontSize: '16px', color: 'var(--mut)', fontFamily: 'monospace' }}>
            ~{baselineCons} L/100km
          </b>
        </div>
      </div>

      {/* SVG Line Chart View */}
      {last5Points.length >= 2 ? (
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            <defs>
              <linearGradient id="fuelTrendArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="fuelTrendLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[minVal, (minVal + maxVal) / 2, maxVal].map((val, i) => {
              const y = getY(val);
              return (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="var(--mut)"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {Math.round(val * 10) / 10}
                  </text>
                </g>
              );
            })}

            {/* OEM Baseline reference line */}
            {baselineCons >= minVal && baselineCons <= maxVal && (
              <g>
                <line
                  x1={padLeft}
                  y1={getY(baselineCons)}
                  x2={width - padRight}
                  y2={getY(baselineCons)}
                  stroke="rgba(245, 158, 11, 0.4)"
                  strokeDasharray="2 2"
                />
                <text
                  x={width - padRight + 4}
                  y={getY(baselineCons) + 3}
                  fill="#f59e0b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  OEM
                </text>
              </g>
            )}

            {/* Area Fill */}
            <path d={areaD} fill="url(#fuelTrendArea)" />

            {/* Main Trend Line */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#fuelTrendLine)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 6px rgba(0, 240, 255, 0.6))"
            />

            {/* Data Points */}
            {last5Points.map((p, idx) => {
              const cx = getX(idx);
              const cy = getY(p.cons);
              const isHover = hoveredPoint?.index === p.index;

              return (
                <g
                  key={p.index}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onClick={() => setHoveredPoint(p)}
                >
                  {/* Outer halo */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHover ? 8 : 5}
                    fill="#081022"
                    stroke="#00f0ff"
                    strokeWidth="2.5"
                    filter="drop-shadow(0 0 8px #00f0ff)"
                    style={{ transition: 'all 0.2s' }}
                  />

                  {/* Inner dot */}
                  <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />

                  {/* Consumption Label above point */}
                  <text
                    x={cx}
                    y={cy - 10}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {p.cons}
                  </text>

                  {/* Date label under X-axis */}
                  <text
                    x={cx}
                    y={padTop + chartH + 18}
                    textAnchor="middle"
                    fill="var(--mut)"
                    fontSize="10"
                  >
                    {p.date.slice(5)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Hover Card Tooltip */}
          {hoveredPoint && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(6, 12, 26, 0.95)',
                border: '1px solid #00f0ff',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 14px rgba(0, 240, 255, 0.3)',
              }}
            >
              <div>
                📅 Ngày: <b>{hoveredPoint.date}</b> (Mốc {hoveredPoint.odo.toLocaleString('vi-VN')} km)
              </div>
              <div style={{ color: '#00f0ff', fontWeight: 700 }}>
                ⛽ {hoveredPoint.cons} L/100km · Quãng đường: +{hoveredPoint.kmDelta} km
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            background: 'rgba(6, 12, 24, 0.6)',
            borderRadius: '10px',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
          }}
        >
          <span style={{ fontSize: '24px' }}>📊</span>
          <p style={{ margin: '6px 0 2px', color: '#f1f5f9', fontSize: '13px', fontWeight: 600 }}>
            Đang thu thập dữ liệu tiêu hao 5 lần gần nhất
          </p>
          <small style={{ color: 'var(--mut)', fontSize: '11.5px' }}>
            Hãy ghi nhận thêm từ 2 lần đổ xăng kèm số Odometer để biểu đồ xu hướng tự động vẽ chính xác.
            (Định mức tiêu chuẩn hiện tại: ~{baselineCons} L/100km).
          </small>
        </div>
      )}
    </div>
  );
};
export default FuelEfficiencyTrendChart;
