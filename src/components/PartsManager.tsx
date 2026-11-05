import React, { useState } from 'react';
import { Part, Entry } from '../types';
import { COMMON_PART_NAMES } from '../constants';
import { partInfo, pIcon, today, uid, fmtD } from '../utils/calc';

interface PartsManagerProps {
  vehicleId: string;
  parts: Part[];
  curOdo: number;
  entries?: Entry[];
  onSavePart: (part: Part) => void;
  onDeletePart: (partId: string) => void;
  onReplacePart: (partId: string) => void;
}

export const PartsManager: React.FC<PartsManagerProps> = ({
  vehicleId,
  parts,
  curOdo,
  entries = [],
  onSavePart,
  onDeletePart,
  onReplacePart,
}) => {
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [editPartId, setEditPartId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [km, setKm] = useState<number | ''>('');
  const [mo, setMo] = useState<number | ''>('');
  const [odo, setOdo] = useState<number | ''>('');
  const [date, setDate] = useState(today());
  const [pct, setPct] = useState<number>(100);

  const vehicleParts = parts.filter((p) => p.v === vehicleId);

  // 1. Calculate historical average weekly and daily distance (km)
  const relevantEntries = entries
    .filter((e) => e.v === vehicleId && e.odo > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  let dailyKm = 32; // Default realistic baseline: 32 km/day (~224 km/week)
  if (relevantEntries.length >= 2) {
    const first = relevantEntries[0];
    const last = relevantEntries[relevantEntries.length - 1];
    const t1 = new Date(first.date).getTime();
    const t2 = new Date(last.date).getTime();
    const daysDiff = Math.max(1, (t2 - t1) / 86400000);
    const odoDiff = Math.max(1, last.odo - first.odo);
    if (daysDiff >= 3) {
      dailyKm = Math.max(5, odoDiff / daysDiff);
    }
  }
  const weeklyKm = Math.round(dailyKm * 7);

  // 2. Forecasting engine: calculate predicted date based on weekly km vs time (whichever condition arrives first)
  const calculatePartForecast = (p: Part) => {
    const info = partInfo(p, curOdo);
    const remK = info.remK; // remaining km until due
    const dueDate = info.dueDate; // calendar due date by months

    let kmDaysLeft: number | null = null;
    let kmPredictedDate: Date | null = null;
    if (p.km > 0 && remK != null) {
      kmDaysLeft = Math.round(remK / dailyKm);
      kmPredictedDate = new Date(Date.now() + kmDaysLeft * 86400000);
    }

    let timeDaysLeft: number | null = null;
    if (p.mo > 0 && dueDate) {
      timeDaysLeft = Math.round((dueDate.getTime() - Date.now()) / 86400000);
    }

    // Determine which condition comes first:
    let whichCondition: 'km' | 'time' = 'km';
    let targetDate: Date | null = null;
    let daysRemaining: number | null = null;

    if (kmDaysLeft != null && timeDaysLeft != null) {
      if (kmDaysLeft <= timeDaysLeft) {
        whichCondition = 'km';
        targetDate = kmPredictedDate;
        daysRemaining = kmDaysLeft;
      } else {
        whichCondition = 'time';
        targetDate = dueDate;
        daysRemaining = timeDaysLeft;
      }
    } else if (kmDaysLeft != null) {
      whichCondition = 'km';
      targetDate = kmPredictedDate;
      daysRemaining = kmDaysLeft;
    } else if (timeDaysLeft != null) {
      whichCondition = 'time';
      targetDate = dueDate;
      daysRemaining = timeDaysLeft;
    }

    const weeksRemaining = daysRemaining != null ? Math.round(daysRemaining / 7) : null;
    const isOverdue = daysRemaining != null && daysRemaining <= 0;
    const isUrgent = daysRemaining != null && daysRemaining > 0 && daysRemaining <= 14;

    return {
      whichCondition,
      targetDate,
      daysRemaining,
      weeksRemaining,
      isOverdue,
      isUrgent,
      remK,
    };
  };

  // Find the single most urgent upcoming part
  const partsWithForecast = vehicleParts.map((p) => ({
    part: p,
    forecast: calculatePartForecast(p),
  }));

  const sortedByUrgency = [...partsWithForecast]
    .filter((x) => x.forecast.daysRemaining != null)
    .sort((a, b) => (a.forecast.daysRemaining || 0) - (b.forecast.daysRemaining || 0));

  const mostUrgent = sortedByUrgency[0];

  const handleOpenAdd = () => {
    setEditPartId(null);
    setName('');
    setKm('');
    setMo('');
    setOdo(curOdo);
    setDate(today());
    setPct(100);
    setIsOpenForm(true);
  };

  const handleOpenEdit = (p: Part) => {
    setEditPartId(p.id);
    setName(p.name);
    setKm(p.km || '');
    setMo(p.mo || '');
    setOdo(p.odo != null ? p.odo : '');
    setDate(p.date || today());
    setPct(p.pct != null ? p.pct : 100);
    setIsOpenForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const kmNum = typeof km === 'number' ? km : 0;
    const moNum = typeof mo === 'number' ? mo : 0;
    if (!trimmedName || (!kmNum && !moNum)) return;

    const newPart: Part = {
      id: editPartId || uid(),
      v: vehicleId,
      name: trimmedName,
      km: kmNum,
      mo: moNum,
      odo: typeof odo === 'number' ? odo : curOdo,
      date: date || today(),
      pct: Math.max(0, Math.min(100, pct)),
      u: Date.now(),
    };

    onSavePart(newPart);
    setIsOpenForm(false);
    setEditPartId(null);
  };

  return (
    <div id="parts" style={{ borderTop: '1px solid var(--line)', marginTop: '14px', paddingTop: '12px' }}>
      <h2>🔩 Linh kiện & Dự báo bảo dưỡng thông minh</h2>

      {/* SMART FORECASTING DASHBOARD HEADER CARD */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.7) 100%)',
          border: '1.5px solid rgba(56, 189, 248, 0.25)',
          marginBottom: '14px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🔮</span>
            <div>
              <b style={{ color: '#f8fafc', fontSize: '13px' }}>Dự báo thời điểm thay linh kiện tiếp theo</b>
              <div style={{ fontSize: '11px', color: 'var(--mut)' }}>
                Dựa trên dữ liệu lịch sử xe chạy trung bình: <b style={{ color: '#00f0ff' }}>~{weeklyKm} km/tuần</b> (~{Math.round(dailyKm)} km/ngày)
              </div>
            </div>
          </div>

          <span
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#34d399',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            Đến trước ưu tiên trước
          </span>
        </div>

        {mostUrgent ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '8px',
              background: mostUrgent.forecast.isOverdue
                ? 'rgba(244, 63, 94, 0.18)'
                : mostUrgent.forecast.isUrgent
                ? 'rgba(245, 158, 11, 0.18)'
                : 'rgba(2, 132, 199, 0.15)',
              border: `1px solid ${
                mostUrgent.forecast.isOverdue
                  ? '#f43f5e'
                  : mostUrgent.forecast.isUrgent
                  ? '#f59e0b'
                  : '#0284c7'
              }`,
              fontSize: '12px',
            }}
          >
            <div>
              <span style={{ color: 'var(--mut)' }}>Linh kiện cần thay sớm nhất: </span>
              <b style={{ color: '#f8fafc' }}>
                {pIcon(mostUrgent.part.name)} {mostUrgent.part.name}
              </b>
              {mostUrgent.forecast.targetDate && (
                <div style={{ fontSize: '11px', marginTop: '2px', color: '#e2e8f0' }}>
                  📅 Dự kiến cần thay vào: <b>{mostUrgent.forecast.targetDate.toLocaleDateString('vi-VN')}</b>
                  {' · '}
                  <span style={{ color: mostUrgent.forecast.whichCondition === 'km' ? '#00f0ff' : '#fbbf24' }}>
                    {mostUrgent.forecast.whichCondition === 'km'
                      ? `Chạm mốc km trước (còn ~${mostUrgent.forecast.remK?.toLocaleString('vi-VN')} km)`
                      : `Hết hạn tháng trước`}
                  </span>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <b
                style={{
                  color: mostUrgent.forecast.isOverdue
                    ? '#f43f5e'
                    : mostUrgent.forecast.isUrgent
                    ? '#fbbf24'
                    : '#38bdf8',
                  fontSize: '13px',
                }}
              >
                {mostUrgent.forecast.isOverdue
                  ? '⚠️ ĐÃ QUÁ HẠN'
                  : mostUrgent.forecast.daysRemaining != null
                  ? `Còn ~${mostUrgent.forecast.daysRemaining} ngày (~${mostUrgent.forecast.weeksRemaining} tuần)`
                  : 'Đang theo dõi'}
              </b>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '11.5px', color: 'var(--mut)', textAlign: 'center', padding: '6px' }}>
            Chưa có đủ thông tin linh kiện để dự báo. Hãy thêm chu kỳ km hoặc tháng phía dưới!
          </div>
        )}
      </div>

      {/* LIST OF PARTS WITH INDIVIDUAL FORECAST BADGES */}
      {vehicleParts.length === 0 ? (
        <p className="empty" style={{ margin: '0 0 8px' }}>
          Chưa có linh kiện nào. Thêm nhớt, bugi, lọc gió… để theo dõi % còn lại và mốc km cần thay.
        </p>
      ) : (
        vehicleParts.map((p) => {
          const info = partInfo(p, curOdo);
          const fc = calculatePartForecast(p);
          const pc = info.pct == null ? null : Math.max(0, Math.min(100, info.pct));
          const c = pc == null ? '--line' : pc <= 15 ? '--out' : pc <= 30 ? '--fuel' : '--in';
          const when = [
            info.dueOdo != null
              ? info.remK! > 0
                ? `mốc ~${info.dueOdo.toLocaleString('vi-VN')} km (còn ~${info.remK!.toLocaleString('vi-VN')} km)`
                : `đã quá hạn ${(-info.remK!).toLocaleString('vi-VN')} km`
              : '',
            info.dueDate ? `hạn ${info.dueDate.toLocaleDateString('vi-VN')}` : '',
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <div
              key={p.id}
              className="item"
              style={{
                alignItems: 'flex-start',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px 10px',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="t">
                  <b>
                    {pIcon(p.name)} {p.name}
                  </b>
                  <small>{when || 'Chưa đặt chu kỳ'}</small>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <b style={{ minWidth: '44px', textAlign: 'right', fontSize: '14px', color: pc != null && pc <= 25 ? '#f43f5e' : '#f8fafc' }}>
                    {pc == null ? '–' : Math.round(pc) + '%'}
                  </b>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="lnk"
                      data-prep={p.id}
                      onClick={() => onReplacePart(p.id)}
                      title="Ghi nhận vừa thay mới 100%"
                    >
                      ✅ Đã thay
                    </button>
                    <button
                      type="button"
                      className="lnk"
                      data-pedit={p.id}
                      onClick={() => handleOpenEdit(p)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="lnk"
                      data-pdel={p.id}
                      onClick={() => onDeletePart(p.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {pc != null && (
                <div className="bar" style={{ height: '8px', width: '100%', margin: 0 }}>
                  <span style={{ width: `${pc}%`, background: `var(${c})` }} />
                </div>
              )}

              {/* DỰ BÁO CHI TIẾT THEO QUÃNG ĐƯỜNG TRUNG BÌNH HOẶC THỜI GIAN (ĐIỀU KIỆN NÀO ĐẾN TRƯỚC) */}
              <div
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(2, 6, 23, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '11px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔮 <b>Dự kiến thay tiếp theo:</b></span>
                  {fc.targetDate ? (
                    <span style={{ color: '#f8fafc', fontWeight: 700 }}>
                      {fc.targetDate.toLocaleDateString('vi-VN')}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--mut)' }}>Chưa đủ điều kiện</span>
                  )}
                  {fc.daysRemaining != null && (
                    <span
                      style={{
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: fc.isOverdue
                          ? 'rgba(244, 63, 94, 0.25)'
                          : fc.isUrgent
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(16, 185, 129, 0.15)',
                        color: fc.isOverdue ? '#f43f5e' : fc.isUrgent ? '#fbbf24' : '#34d399',
                        fontWeight: 700,
                      }}
                    >
                      {fc.isOverdue
                        ? 'ĐÃ ĐẾN HẠN'
                        : `Còn ~${fc.weeksRemaining} tuần (~${fc.daysRemaining} ngày)`}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '10.5px', color: 'var(--mut)' }}>
                  📌 Tiêu chí đến trước:{' '}
                  <b style={{ color: fc.whichCondition === 'km' ? '#00f0ff' : '#fbbf24' }}>
                    {fc.whichCondition === 'km'
                      ? `Quãng đường (~${weeklyKm} km/tuần)`
                      : `Thời gian hạn định (${p.mo} tháng)`}
                  </b>
                </div>
              </div>
            </div>
          );
        })
      )}

      {isOpenForm ? (
        <form id="pf" onSubmit={handleSubmit} style={{ marginTop: '10px' }}>
          <label className="full">
            Tên linh kiện
            <input
              id="p_name"
              list="pnames"
              required
              placeholder="Nhớt, bugi, lọc gió…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <datalist id="pnames">
            {COMMON_PART_NAMES.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <label>
            📏 Chu kỳ thay (km)
            <input
              id="p_km"
              type="number"
              min="0"
              placeholder="Ví dụ 2000"
              value={km}
              onChange={(e) => setKm(e.target.value === '' ? '' : +e.target.value)}
            />
          </label>
          <label>
            📅 Chu kỳ thay (tháng, nếu có)
            <input
              id="p_mo"
              type="number"
              min="0"
              placeholder="Ví dụ 6"
              value={mo}
              onChange={(e) => setMo(e.target.value === '' ? '' : +e.target.value)}
            />
          </label>
          <label>
            🛣️ Tại km
            <input
              id="p_odo"
              type="number"
              min="0"
              placeholder="Bỏ trống = km hiện tại"
              value={odo}
              onChange={(e) => setOdo(e.target.value === '' ? '' : +e.target.value)}
            />
          </label>
          <label>
            📅 Vào ngày
            <input
              id="p_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="full">
            % còn lại tại thời điểm trên (100 = mới thay, nhập số bạn kiểm tra thực tế)
            <input
              id="p_pct"
              type="number"
              min="0"
              max="100"
              value={pct}
              onChange={(e) => setPct(+e.target.value)}
            />
          </label>
          <div className="full row">
            <button className="pri" type="submit">
              Lưu linh kiện
            </button>
            <button
              type="button"
              id="pcancel"
              onClick={() => {
                setIsOpenForm(false);
                setEditPartId(null);
              }}
            >
              Hủy
            </button>
          </div>
        </form>
      ) : (
        <button type="button" id="padd" onClick={handleOpenAdd} style={{ marginTop: '8px' }}>
          ➕ Thêm linh kiện
        </button>
      )}
    </div>
  );
};
