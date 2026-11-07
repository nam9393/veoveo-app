import React, { useState } from 'react';
import { Entry, Medal, Part, Vehicle } from '../types';
import { calculateStats, curOdoOf, levels, money, num, partInfo, pIcon } from '../utils/calc';
import { LiquidFuelGauge } from './LiquidFuelGauge';
import { FuelEfficiencyTrendChart } from './FuelEfficiencyTrendChart';

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
  
  const [driveMode, setDriveModeState] = useState<'ECO' | 'COMFORT' | 'SPORT'>(() => {
    try {
      const saved = localStorage.getItem('soxe_drive_mode');
      if (saved === 'ECO' || saved === 'COMFORT' || saved === 'SPORT') return saved;
    } catch {}
    return 'COMFORT';
  });

  const [acMode, setAcModeState] = useState<'OFF' | 'ECO' | 'MAX'>(() => {
    try {
      const saved = localStorage.getItem('soxe_ac_mode');
      if (saved === 'OFF' || saved === 'ECO' || saved === 'MAX') return saved;
    } catch {}
    return 'ECO';
  });

  const setDriveMode = (m: 'ECO' | 'COMFORT' | 'SPORT') => {
    setDriveModeState(m);
    try {
      localStorage.setItem('soxe_drive_mode', m);
    } catch {}
  };

  const setAcMode = (m: 'OFF' | 'ECO' | 'MAX') => {
    setAcModeState(m);
    try {
      localStorage.setItem('soxe_ac_mode', m);
    } catch {}
  };

  const [currentGear, setCurrentGear] = useState<'P' | 'R' | 'N' | 'D'>('D');
  if (!currentVehicle) {
    return (
      <div id="dash" className="card empty" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🚗</div>
        <h3 style={{ color: 'var(--acc)', margin: '0 0 6px' }}>Chưa chọn hoặc chưa thêm xe nào</h3>
        <p style={{ margin: 0, color: 'var(--mut)', fontSize: '13px' }}>
          Hãy thêm phương tiện đầu tiên của bạn để kích hoạt hệ thống taplo theo dõi xe thực tế.
        </p>
      </div>
    );
  }

  // Lifetime all statistics (tất cả các dữ liệu đã nhập)
  const s = calculateStats(currentVehicle.id, 'all', entries);
  const totalEntriesCount = entries.filter((e) => e.v === currentVehicle.id).length;
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

  // Dynamic range calculation based on Drive Mode & A/C Mode
  // ECO: +3.0% fuel saving / range extension
  // COMFORT: 0% baseline
  // SPORT: -3.5% higher throttle / fuel consumption
  // A/C OFF: +3.0% range extension (lốc lạnh ngắt)
  // A/C ECO: 0% baseline
  // A/C MAX: -3.5% range reduction (lốc lạnh chạy hết công suất)
  const driveModeDelta = driveMode === 'ECO' ? 0.03 : driveMode === 'SPORT' ? -0.035 : 0;
  const acModeDelta = acMode === 'OFF' ? 0.03 : acMode === 'MAX' ? -0.035 : 0;
  const totalFactor = driveModeDelta + acModeDelta;

  const baseRangeKm =
    currentFuelLiters != null && (s.cons || currentVehicle.cons)
      ? Math.round((currentFuelLiters / (s.cons || currentVehicle.cons || 5.5)) * 100)
      : currentVehicle.tank && (s.cons || currentVehicle.cons)
      ? Math.round(((currentVehicle.tank * 0.75) / (s.cons || currentVehicle.cons || 5.5)) * 100)
      : 360;

  const dynamicRangeKm = Math.round(baseRangeKm * (1 + totalFactor));
  const deltaKm = dynamicRangeKm - baseRangeKm;
  const deltaPercent = Math.round(totalFactor * 1000) / 10;





  return (
    <div id="dash">
      {/* Automotive Cockpit & Instrument Cluster */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 16, 32, 0.94) 0%, rgba(14, 24, 46, 0.88) 100%)',
          border: '1px solid var(--line)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Cockpit Vehicle Header */}
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>{currentVehicle.category === 'motorcycle' ? '🏍️' : '🚗'}</span>
              <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '16.5px' }}>
                {currentVehicle.name} {currentVehicle.plate ? `· ${currentVehicle.plate}` : ''}
              </h2>
            </div>
            <small style={{ color: 'var(--mut)', fontSize: '12px' }}>
              Hãng: <b>{currentVehicle.brand || 'Ô tô / Xe máy'}</b> · Dung tích bình:{' '}
              <b>{currentVehicle.tank || '–'}L</b> · Định mức:{' '}
              <b>{currentVehicle.cons ? `${currentVehicle.cons} L/100km` : '–'}</b>
            </small>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Đồng hồ Odometer
            </span>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--acc)',
                fontFamily: 'monospace',
              }}
            >
              {curOdo.toLocaleString('vi-VN')} km
            </div>
          </div>
        </div>

        {/* Dynamic Drive Mode, A/C & Range Calculator */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
            gap: '10px',
            marginBottom: '14px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'rgba(6, 12, 24, 0.85)',
            border: '1px solid var(--line)',
          }}
        >
          {/* Drive Mode Selector */}
          <div>
            <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
              Chế độ lái (Drive Mode)
            </small>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              {[
                { id: 'ECO', label: 'ECO', tip: '+3% km' },
                { id: 'COMFORT', label: 'COMFORT', tip: 'Chuẩn' },
                { id: 'SPORT', label: 'SPORT', tip: '−3.5%' },
              ].map((m) => {
                const isAct = driveMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDriveMode(m.id as any)}
                    style={{
                      padding: '4px 7px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      background: isAct
                        ? m.id === 'SPORT'
                          ? '#ef4444'
                          : m.id === 'ECO'
                          ? '#10b981'
                          : 'var(--acc)'
                        : 'rgba(255, 255, 255, 0.06)',
                      color: isAct ? (m.id === 'SPORT' ? '#fff' : '#0f172a') : 'var(--mut)',
                      fontWeight: 700,
                      border: 'none',
                    }}
                    title={`Chế độ ${m.label} (${m.tip})`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Air Conditioning (A/C) Selector */}
          <div>
            <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
              Điều hòa xe (A/C)
            </small>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              {[
                { id: 'OFF', label: 'Tắt A/C', tip: '+3% km' },
                { id: 'ECO', label: 'A/C Eco', tip: '25°C Chuẩn' },
                { id: 'MAX', label: 'Lạnh sâu', tip: '−3.5%' },
              ].map((a) => {
                const isAct = acMode === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAcMode(a.id as any)}
                    style={{
                      padding: '4px 7px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      background: isAct
                        ? a.id === 'OFF'
                          ? '#10b981'
                          : a.id === 'MAX'
                          ? '#38bdf8'
                          : 'rgba(255, 255, 255, 0.16)'
                        : 'rgba(255, 255, 255, 0.06)',
                      color: isAct ? (a.id === 'OFF' ? '#064e3b' : a.id === 'MAX' ? '#0f172a' : '#fff') : 'var(--mut)',
                      fontWeight: 700,
                      border: 'none',
                    }}
                    title={`Điều hòa ${a.label} (${a.tip})`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Automatic Transmission Gear */}
          <div>
            <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
              Cần số (Gear)
            </small>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              {(['P', 'R', 'N', 'D'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setCurrentGear(g)}
                  style={{
                    padding: '3px 7px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background: currentGear === g ? 'var(--acc)' : 'rgba(255, 255, 255, 0.05)',
                    color: currentGear === g ? 'var(--accT)' : '#64748b',
                    border: currentGear === g ? '1px solid var(--acc)' : '1px solid transparent',
                    fontWeight: 700,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Estimated Range Readout */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small style={{ color: 'var(--mut)', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                Tầm chạy ước tính
              </small>
              <span style={{ fontSize: '10.5px', color: totalFactor > 0 ? '#10b981' : totalFactor < 0 ? '#f43f5e' : 'var(--mut)', fontWeight: 700 }}>
                {totalFactor > 0 ? `+${deltaPercent}%` : totalFactor < 0 ? `${deltaPercent}%` : '0%'}
              </span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', marginTop: '4px', fontFamily: 'monospace' }}>
              ~{dynamicRangeKm} km
            </div>
            <div style={{ fontSize: '10px', marginTop: '3px', color: totalFactor > 0 ? '#34d399' : totalFactor < 0 ? '#fb7185' : 'var(--mut)' }}>
              {totalFactor > 0 ? (
                <>🟢 +{deltaKm} km ({driveMode === 'ECO' ? 'Lái ECO' : ''}{driveMode === 'ECO' && acMode === 'OFF' ? ' · ' : ''}{acMode === 'OFF' ? 'Tắt A/C' : ''})</>
              ) : totalFactor < 0 ? (
                <>🔴 {deltaKm} km ({driveMode === 'SPORT' ? 'Sport chân ga bốc' : ''}{driveMode === 'SPORT' && acMode === 'MAX' ? ' · ' : ''}{acMode === 'MAX' ? 'Lạnh sâu' : ''})</>
              ) : (
                <>⚪ Tiêu chuẩn nhà sản xuất</>
              )}
            </div>
          </div>
        </div>

        {/* Primary Finances */}
        <div className="kpis">
          <div className="kpi">
            <small>💸 Tổng chi phí (Tất cả)</small>
            <b className="out">−{money(s.tot)}</b>
            <span style={{ fontSize: '10px', color: 'var(--mut)', marginTop: '2px', display: 'block' }}>
              Toàn bộ {totalEntriesCount} bản ghi đã nhập
            </span>
          </div>
          <div className="kpi">
            <small>💰 Tổng thu nhập (Tất cả)</small>
            <b className="in">+{money(s.inc)}</b>
            <span style={{ fontSize: '10px', color: 'var(--mut)', marginTop: '2px', display: 'block' }}>
              Toàn bộ {totalEntriesCount} bản ghi đã nhập
            </span>
          </div>
          <div className="kpi">
            <small>{net >= 0 ? '📈 Lợi nhuận ròng (Tất cả)' : '📉 Thâm hụt (Tất cả)'}</small>
            <b className={net >= 0 ? 'in' : 'out'}>{money(Math.abs(net))}</b>
            <span style={{ fontSize: '10px', color: net >= 0 ? '#34d399' : '#f87171', marginTop: '2px', display: 'block' }}>
              {net >= 0 ? 'Thu lớn hơn chi' : 'Chi lớn hơn thu'}
            </span>
          </div>
        </div>

        {/* Real Vehicle Running Stats */}
        <div className="stats">
          <div className="kpi">
            <small>🛣️ Tổng quãng đường</small>
            <b>{s.km ? `${s.km.toLocaleString('vi-VN')} km` : '–'}</b>
          </div>
          <div className="kpi">
            <small>🧮 Chi phí / km</small>
            <b>{s.km ? money(s.tot / s.km) : '–'}</b>
          </div>
          <div className="kpi">
            <small>⛽ Tiêu hao thực tế</small>
            <b style={{ color: 'var(--acc)' }}>{s.cons ? `${num(s.cons)} L/100km` : '–'}</b>
          </div>
          <div className="kpi">
            <small>🏷️ Giá xăng mới nhất</small>
            <b>{lastFuelWithPrice ? `${money(lastFuelWithPrice.price!)}/L` : '–'}</b>
          </div>
        </div>
      </div>

      {/* Fuel Efficiency Trend Component (Last 5 Entries) */}
      <FuelEfficiencyTrendChart currentVehicle={currentVehicle} entries={entries} />

      {/* Critical Equipment Alerts (if any) */}
      {dueParts.length > 0 && (
        <div
          className="card"
          style={{
            borderColor: 'rgba(244, 63, 94, 0.4)',
            background: 'linear-gradient(135deg, rgba(35, 12, 22, 0.92) 0%, rgba(20, 8, 16, 0.85) 100%)',
          }}
        >
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ color: '#f43f5e', margin: 0 }}>🚨 Cảnh báo bảo dưỡng phụ tùng xe</h2>
            <button
              type="button"
              className="lnk"
              style={{ color: '#f43f5e' }}
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
                <span style={{ color: i.pct! <= 0 ? '#f43f5e' : '#f59e0b' }}>
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
              <LiquidFuelGauge
                vehicleId={currentVehicle.id}
                vehicleName={currentVehicle.name}
                tankCapacity={currentVehicle.tank}
                ratedCons={s.cons || currentVehicle.cons || 5.5}
                lastFuelDateFromEntry={
                  entries
                    .filter((e) => e.v === currentVehicle.id && e.type === 'fuel')
                    .sort((a, b) => b.date.localeCompare(a.date))[0]?.date
                }
                lastFuelPercentFromEntry={fuelPercentage}
              />
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
                <p style={{ margin: '0 0 6px', color: '#f1f5f9' }}>
                  🚗 Dựa trên các lần đổ đầy bình gần nhất:
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                    }}
                  >
                    Mỗi bình đầy đi được: ~{s.cons && currentVehicle.tank ? Math.round((currentVehicle.tank / s.cons) * 100) : 0} km
                  </span>
                  <span
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
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

function getBadgeStyle(status: 'ok' | 'low' | 'high') {
  if (status === 'ok') {
    return {
      background: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.4)',
      color: '#34d399',
    };
  }
  if (status === 'low') {
    return {
      background: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      color: '#fbbf24',
    };
  }
  return {
    background: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    color: '#f87171',
  };
}

export default Dashboard;
