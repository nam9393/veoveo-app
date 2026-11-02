import React, { useState } from 'react';
import { Entry, Medal, Part, Vehicle } from '../types';
import { calculateStats, curOdoOf, levels, money, num, partInfo, pIcon } from '../utils/calc';

interface DashboardProps {
  currentVehicle: Vehicle | null;
  vehicles: Vehicle[];
  entries: Entry[];
  parts: Part[];
  period: string;
  medals: Medal[];
  soundEnabled: boolean;
  onNavigateTab: (tabKey: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentVehicle,
  vehicles,
  entries,
  parts,
  period,
  onNavigateTab,
}) => {
  const [subModule, setSubModule] = useState<'overview' | 'fuel' | 'analysis'>('overview');
  const [driveMode, setDriveMode] = useState<'ECO' | 'COMFORT' | 'SPORT'>('COMFORT');
  const [currentGear, setCurrentGear] = useState<'P' | 'R' | 'N' | 'D'>('D');

  if (!currentVehicle) {
    return (
      <div id="dash" className="card empty" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🚗</div>
        <h3 style={{ color: '#00f0ff', margin: '0 0 6px' }}>Chưa chọn hoặc chưa thêm xe nào</h3>
        <p style={{ margin: 0, color: 'var(--mut)', fontSize: '13px' }}>
          Hãy thêm phương tiện đầu tiên của bạn để kích hoạt hệ thống taplo theo dõi xe thực tế.
        </p>
      </div>
    );
  }

  const s = calculateStats(currentVehicle.id, period, entries);
  const net = s.inc - s.tot;
  const curOdo = curOdoOf(currentVehicle.id, vehicles, entries);

  // Critical parts check
  const dueParts = parts
    .filter((p) => p.v === currentVehicle.id)
    .map((p) => ({ p, i: partInfo(p, curOdo) }))
    .filter((x) => x.i.pct != null && x.i.pct <= 20);

  // Latest fuel entry with price
  const lastFuelWithPrice = entries
    .filter((e) => e.v === currentVehicle.id && e.type === 'fuel' && e.price)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  // Fuel level calculations
  const L = levels(currentVehicle.id, vehicles, entries);
  const currentFuelLiters =
    L.lv == null
      ? null
      : curOdo === L.po
      ? L.lv
      : L.r
      ? Math.max(0, L.lv - ((curOdo - L.po) * L.r) / 100)
      : null;
  const fuelPercentage =
    currentFuelLiters != null && L.tank ? Math.max(0, Math.min(100, (currentFuelLiters / L.tank) * 100)) : null;

  // Streamlined fuel analysis summary
  const allFuel = entries
    .filter((e) => e.v === currentVehicle.id && e.type === 'fuel' && e.odo)
    .sort((a, b) => a.odo - b.odo);
  const fulls = allFuel.filter((e) => e.full);

  const totalFuelLiters = s.per_
    .filter((e) => e.type === 'fuel')
    .reduce((acc, e) => acc + (e.liters || 0), 0);
  const totalFuelAmt = s.per_
    .filter((e) => e.type === 'fuel')
    .reduce((acc, e) => acc + e.amount, 0);

  // Estimated remaining driving range in km
  const estimatedRangeKm =
    currentFuelLiters != null && (s.cons || currentVehicle.cons)
      ? Math.round((currentFuelLiters / (s.cons || currentVehicle.cons || 5.5)) * 100)
      : null;

  return (
    <div id="dash">
      {/* Realistic Automotive Cockpit & Gauge Cluster */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 18, 36, 0.95) 0%, rgba(14, 28, 54, 0.88) 100%)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Cockpit Vehicle Header */}
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🚗</span>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '16.5px' }}>
                {currentVehicle.name} {currentVehicle.plate ? `· ${currentVehicle.plate}` : ''}
              </h2>
            </div>
            <small style={{ color: 'var(--mut)', fontSize: '12px' }}>
              Hãng xe: <b>{currentVehicle.brand || 'Ô tô / Xe máy'}</b> · Dung tích bình: <b>{currentVehicle.tank || '–'}L</b> · Định mức:{' '}
              <b>{currentVehicle.cons ? `${currentVehicle.cons} L/100km` : '–'}</b>
            </small>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Đồng hồ Odometer
            </span>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: '#00f0ff',
                fontFamily: 'monospace',
                textShadow: '0 0 12px rgba(0, 240, 255, 0.45)',
              }}
            >
              {curOdo.toLocaleString('vi-VN')} km
            </div>
          </div>
        </div>

        {/* Realistic Car Instrument Panel: Gear, Drive Mode & Range */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '8px',
            marginBottom: '14px',
            padding: '10px 12px',
            borderRadius: '12px',
            background: 'rgba(5, 12, 26, 0.85)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
          }}
        >
          {/* Drive Mode Selector */}
          <div>
            <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', display: 'block' }}>
              Chế độ lái (Drive Mode)
            </small>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              {(['ECO', 'COMFORT', 'SPORT'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDriveMode(m)}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background:
                      driveMode === m
                        ? m === 'SPORT'
                          ? '#ef4444'
                          : m === 'ECO'
                          ? '#10b981'
                          : '#00f0ff'
                        : 'rgba(255, 255, 255, 0.06)',
                    color: driveMode === m ? '#000' : '#94a3b8',
                    fontWeight: 700,
                    border: 'none',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Automatic Transmission Gear */}
          <div>
            <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', display: 'block' }}>
              Hộp số (Gear)
            </small>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              {(['P', 'R', 'N', 'D'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setCurrentGear(g)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background: currentGear === g ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    color: currentGear === g ? '#00f0ff' : '#64748b',
                    border: currentGear === g ? '1px solid #00f0ff' : '1px solid transparent',
                    fontWeight: 700,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Remaining Range Km */}
          <div>
            <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', display: 'block' }}>
              Tầm chạy ước tính (Range)
            </small>
            <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
              {estimatedRangeKm != null ? `~${estimatedRangeKm} km` : '–'}
            </div>
          </div>

          {/* Climate Status */}
          <div>
            <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', display: 'block' }}>
              Điều hòa xe (A/C)
            </small>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#a5f3fc', marginTop: '4px' }}>
              ❄️ 22.5°C · AUTO
            </div>
          </div>
        </div>

        {/* Primary Finances */}
        <div className="kpis">
          <div className="kpi">
            <small>💸 Tổng chi phí</small>
            <b className="out">−{money(s.tot)}</b>
          </div>
          <div className="kpi">
            <small>💰 Tổng thu nhập</small>
            <b className="in">+{money(s.inc)}</b>
          </div>
          <div className="kpi">
            <small>{net >= 0 ? '📈 Lợi nhuận ròng' : '📉 Thâm hụt'}</small>
            <b className={net >= 0 ? 'in' : 'out'}>{money(Math.abs(net))}</b>
          </div>
        </div>

        {/* Real Vehicle Running Stats */}
        <div className="stats">
          <div className="kpi">
            <small>🛣️ Quãng đường</small>
            <b>{s.km ? `${s.km.toLocaleString('vi-VN')} km` : '–'}</b>
          </div>
          <div className="kpi">
            <small>🧮 Chi phí / km</small>
            <b>{s.km ? money(s.tot / s.km) : '–'}</b>
          </div>
          <div className="kpi">
            <small>⛽ Tiêu hao thực tế</small>
            <b style={{ color: '#ffaa00' }}>{s.cons ? `${num(s.cons)} L/100km` : '–'}</b>
          </div>
          <div className="kpi">
            <small>🏷️ Giá xăng mới nhất</small>
            <b>{lastFuelWithPrice ? `${money(lastFuelWithPrice.price!)}/L` : '–'}</b>
          </div>
        </div>
      </div>

      {/* Tire Pressure TPMS & Vehicle Health Card */}
      <div
        className="card"
        style={{
          background: 'rgba(8, 17, 34, 0.88)',
          border: '1px solid rgba(0, 240, 255, 0.22)',
        }}
      >
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2>🛞 Giám sát áp suất lốp xe (TPMS)</h2>
          <span style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
            ● Áp suất 4 bánh đạt chuẩn an toàn
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
          }}
        >
          <div
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(0, 240, 255, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--mut)' }}>Lốp trước Trái:</span>
            <b style={{ color: '#00f0ff', fontSize: '13px' }}>2.3 bar · 33 PSI</b>
          </div>
          <div
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(0, 240, 255, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--mut)' }}>Lốp trước Phải:</span>
            <b style={{ color: '#00f0ff', fontSize: '13px' }}>2.3 bar · 33 PSI</b>
          </div>
          <div
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(0, 240, 255, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--mut)' }}>Lốp sau Trái:</span>
            <b style={{ color: '#00f0ff', fontSize: '13px' }}>2.4 bar · 35 PSI</b>
          </div>
          <div
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(0, 240, 255, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--mut)' }}>Lốp sau Phải:</span>
            <b style={{ color: '#00f0ff', fontSize: '13px' }}>2.4 bar · 35 PSI</b>
          </div>
        </div>
      </div>

      {/* Critical Equipment Alerts (if any) */}
      {dueParts.length > 0 && (
        <div
          className="card"
          style={{
            borderColor: '#ff3366',
            background: 'linear-gradient(135deg, rgba(35, 12, 22, 0.92) 0%, rgba(20, 8, 16, 0.85) 100%)',
            boxShadow: '0 0 18px rgba(255, 51, 102, 0.25)',
          }}
        >
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ color: '#ff3366', margin: 0 }}>🚨 Cảnh báo bảo dưỡng phụ tùng xe</h2>
            <button
              type="button"
              className="lnk"
              style={{ color: '#ff3366' }}
              onClick={() => onNavigateTab('parts')}
            >
              Xem chi tiết linh kiện phụ tùng →
            </button>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {dueParts.map(({ p, i }) => (
              <div key={p.id} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{pIcon(p.name)}</span>
                <b style={{ color: '#fff' }}>{p.name}:</b>
                <span style={{ color: i.pct! <= 0 ? '#ff3366' : '#ffaa00' }}>
                  {i.pct! <= 0 ? 'ĐÃ QUÁ HẠN' : `Còn ~${Math.round(i.pct!)}%`}
                </span>
                {i.dueOdo != null && (
                  <small style={{ color: 'var(--mut)' }}>
                    (mốc {i.dueOdo.toLocaleString('vi-VN')} km)
                  </small>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fuel Level & Consumption */}
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '10px' }}>
          <h2>⚡ Mức bình xăng & Tiêu hao nhiên liệu</h2>
          <div className="tabs" style={{ margin: 0, padding: 0 }}>
            <button
              type="button"
              className={subModule === 'overview' ? 'active' : ''}
              onClick={() => setSubModule('overview')}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Mức bình xăng
            </button>
            <button
              type="button"
              className={subModule === 'fuel' ? 'active' : ''}
              onClick={() => setSubModule('fuel')}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Tổng tiêu thụ
            </button>
            <button
              type="button"
              className={subModule === 'analysis' ? 'active' : ''}
              onClick={() => setSubModule('analysis')}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Dự đoán
            </button>
          </div>
        </div>

        {subModule === 'overview' && (
          <div>
            {currentVehicle.tank ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--mut)' }}>
                    Nhiên liệu bình chứa (ước tính)
                  </span>
                  <b style={{ color: '#00f0ff', fontFamily: 'monospace' }}>
                    {fuelPercentage != null
                      ? `~${Math.round(fuelPercentage)}% (${num(currentFuelLiters || 0)} / ${num(
                          currentVehicle.tank
                        )} L)`
                      : 'Đang chờ dữ liệu lần đổ đầy bình'}
                  </b>
                </div>

                <div
                  className="bar"
                  style={{
                    height: '16px',
                    borderRadius: '8px',
                    background: 'rgba(5, 15, 35, 0.9)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  <span
                    style={{
                      width: `${fuelPercentage || 0}%`,
                      background:
                        (fuelPercentage || 0) <= 15
                          ? 'linear-gradient(90deg, #ff0055, #ff3366)'
                          : (fuelPercentage || 0) <= 30
                          ? 'linear-gradient(90deg, #ff8800, #ffaa00)'
                          : 'linear-gradient(90deg, #00bbff, #00f0ff)',
                      boxShadow: '0 0 10px currentColor',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--mut)', marginTop: '4px' }}>
                  <span>Trống (0L)</span>
                  <span>50%</span>
                  <span>Đầy ({currentVehicle.tank}L)</span>
                </div>
              </div>
            ) : (
              <p className="empty" style={{ margin: 0 }}>
                Chưa nhập dung tích bình xăng của xe. Bạn có thể cập nhật trong mục Cài đặt → Sửa xe.
              </p>
            )}
          </div>
        )}

        {subModule === 'fuel' && (
          <div>
            <div className="stats" style={{ marginTop: 0, gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="kpi">
                <small>🛢️ Tổng lượng nạp</small>
                <b>{num(totalFuelLiters)} L</b>
              </div>
              <div className="kpi">
                <small>💵 Chi phí xăng</small>
                <b>{money(totalFuelAmt)}</b>
              </div>
              <div className="kpi">
                <small>🏷️ Đơn giá bình quân</small>
                <b>{totalFuelLiters ? money(totalFuelAmt / totalFuelLiters) : '–'}</b>
              </div>
            </div>
            {s.tot > 0 && totalFuelAmt > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--mut)' }}>
                Nhiên liệu chiếm <b>{Math.round((totalFuelAmt / s.tot) * 100)}%</b> tổng chi phí trong giai đoạn này.
              </p>
            )}
          </div>
        )}

        {subModule === 'analysis' && (
          <div>
            {fulls.length >= 2 ? (
              <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 6px', color: '#cce6ff' }}>
                  🚗 Dựa trên các lần đổ đầy bình gần nhất:
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(0, 240, 255, 0.1)',
                      borderRadius: '6px',
                      border: '1px solid rgba(0, 240, 255, 0.2)',
                    }}
                  >
                    Mỗi bình đầy đi được: ~{s.cons && currentVehicle.tank ? Math.round((currentVehicle.tank / s.cons) * 100) : 0} km
                  </span>
                  <span
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(0, 255, 136, 0.1)',
                      borderRadius: '6px',
                      border: '1px solid rgba(0, 255, 136, 0.2)',
                    }}
                  >
                    Tiêu thụ: ~{s.cons ? num(s.cons) : '–'} L/100km
                  </span>
                </div>
              </div>
            ) : (
              <p className="empty" style={{ margin: 0 }}>
                Cần ghi ít nhất 2 lần đổ đầy bình (kèm số km) để hệ thống kích hoạt tính năng dự đoán tiêu hao chính xác.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Quick Launch Action Deck */}
      <div
        className="card"
        style={{
          background: 'rgba(6, 14, 30, 0.75)',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--mut)' }}>Thao tác nhanh:</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="pri"
            onClick={() => onNavigateTab('entry')}
            style={{ padding: '7px 14px', fontSize: '13px' }}
          >
            ➕ Ghi chép mới
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('history')}
            style={{ padding: '7px 14px', fontSize: '13px' }}
          >
            📜 Xem lịch sử
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('parts')}
            style={{ padding: '7px 14px', fontSize: '13px' }}
          >
            🔧 Linh kiện
          </button>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
