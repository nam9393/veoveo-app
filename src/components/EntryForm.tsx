import React, { useState, useEffect, useRef } from 'react';
import { Entry, EntryType, Part, Place, Vehicle } from '../types';
import { ENTRY_TYPES, FUEL_TYPES } from '../constants';
import { curOdoOf, levels, num, today, uid } from '../utils/calc';
import { triggerSkidEffect } from '../utils/sound';
import { MapModal } from './MapModal';
import { PartsManager } from './PartsManager';

import { ParsedCommand } from '../utils/voiceParser';

interface EntryFormProps {
  currentVehicle: Vehicle | null;
  vehicles: Vehicle[];
  entries: Entry[];
  parts: Part[];
  editingEntry: Entry | null;
  appliedCommand?: ParsedCommand | null;
  soundEnabled: boolean;
  onSaveEntry: (entry: Entry, isEdit: boolean) => void;
  onCancelEdit: () => void;
  onSavePart: (part: Part) => void;
  onDeletePart: (partId: string) => void;
  onReplacePart: (partId: string) => void;
}

export const EntryForm: React.FC<EntryFormProps> = ({
  currentVehicle,
  vehicles,
  entries,
  parts,
  editingEntry,
  appliedCommand,
  soundEnabled,
  onSaveEntry,
  onCancelEdit,
  onSavePart,
  onDeletePart,
  onReplacePart,
}) => {
  const [tab, setTab] = useState<EntryType>('fuel');
  const [date, setDate] = useState(today());
  const [odo, setOdo] = useState<number | ''>('');
  const [amountStr, setAmountStr] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [liters, setLiters] = useState<number | ''>('');
  const [full, setFull] = useState(true);
  const [fuelType, setFuelType] = useState<string>('');
  const [note, setNote] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [aiFilledBanner, setAiFilledBanner] = useState<string | null>(null);

  const [mapOpen, setMapOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'fuel' | 'dealer'>('fuel');

  const tabsRef = useRef<HTMLDivElement>(null);

  // Determine latest odo
  const curOdo = currentVehicle ? curOdoOf(currentVehicle.id, vehicles, entries) : 0;

  // Determine default fuel type from last fuel entry
  const lastFuelType = () => {
    const a = entries.filter((e) => e.type === 'fuel' && e.ft).sort((x, y) => x.date.localeCompare(y.date));
    return a.length ? a[a.length - 1].ft || '' : today() >= '2026-06-01' ? 'e10' : '';
  };

  useEffect(() => {
    if (editingEntry) {
      setTab(editingEntry.type);
      setDate(editingEntry.date);
      setOdo(editingEntry.odo != null ? editingEntry.odo : '');
      setAmountStr(editingEntry.amount ? Math.round(editingEntry.amount).toLocaleString('vi-VN') : '');
      setPriceStr(editingEntry.price ? Math.round(editingEntry.price).toLocaleString('vi-VN') : '');
      setLiters(editingEntry.liters != null ? editingEntry.liters : '');
      setFull(editingEntry.full != null ? editingEntry.full : true);
      setFuelType(editingEntry.ft || '');
      setNote(editingEntry.note || '');
      setSelectedPartId(editingEntry.part || '');
      setSelectedPlace(editingEntry.place || null);
      setAiFilledBanner(null);
    } else {
      setDate(today());
      setOdo(curOdo || '');
      setAmountStr('');
      setPriceStr('');
      setLiters('');
      setFull(true);
      setFuelType(lastFuelType());
      setNote('');
      setSelectedPartId('');
      setSelectedPlace(null);
      setAiFilledBanner(null);
    }
  }, [editingEntry, currentVehicle]);

  // Handle external voice/AI command auto-fill
  useEffect(() => {
    if (!appliedCommand) return;
    setTab(appliedCommand.type);
    if (appliedCommand.amount > 0) {
      setAmountStr(appliedCommand.amount.toLocaleString('vi-VN'));
    }
    if (appliedCommand.odo != null) {
      setOdo(appliedCommand.odo);
    }
    if (appliedCommand.note) {
      setNote(appliedCommand.note);
    }
    if (appliedCommand.price != null) {
      setPriceStr(appliedCommand.price.toLocaleString('vi-VN'));
    }
    if (appliedCommand.liters != null) {
      setLiters(appliedCommand.liters);
    }
    if (appliedCommand.full != null) {
      setFull(appliedCommand.full);
    }
    if (appliedCommand.ft) {
      setFuelType(appliedCommand.ft);
    }

    if (appliedCommand.partName && currentVehicle) {
      const match = parts.find(
        (p) =>
          p.v === currentVehicle.id &&
          p.name.toLowerCase().includes(appliedCommand.partName!.toLowerCase())
      );
      if (match) setSelectedPartId(match.id);
    }

    setAiFilledBanner(
      `✨ Astro Copilot (${appliedCommand.source === 'fast-keyword' ? 'Radar từ khóa' : 'Gemini AI'}): Đã tự động điền form!`
    );
  }, [appliedCommand]);

  const parseMoney = (s: string) => +(s.replace(/\D/g, '')) || 0;

  const handleAmountChange = (val: string) => {
    const raw = parseMoney(val);
    setAmountStr(raw ? raw.toLocaleString('vi-VN') : '');
    const pr = parseMoney(priceStr);
    if (tab === 'fuel' && pr && raw) {
      setLiters(Math.round((raw / pr) * 100) / 100);
    }
  };

  const handlePriceChange = (val: string) => {
    const pr = parseMoney(val);
    setPriceStr(pr ? pr.toLocaleString('vi-VN') : '');
    const amt = parseMoney(amountStr);
    if (pr && amt) {
      setLiters(Math.round((amt / pr) * 100) / 100);
    }
  };

  const handleLitersChange = (val: string) => {
    const lit = val === '' ? '' : +val;
    setLiters(lit);
    const pr = parseMoney(priceStr);
    if (typeof lit === 'number' && pr) {
      const computedAmount = Math.round(lit * pr);
      setAmountStr(computedAmount ? computedAmount.toLocaleString('vi-VN') : '');
    }
  };

  const handleTabClick = (t: EntryType, e: React.MouseEvent<HTMLButtonElement>) => {
    if (editingEntry) return;
    setTab(t);
    triggerSkidEffect(e.currentTarget, soundEnabled);
  };

  const handleOpenMap = (m: 'fuel' | 'dealer') => {
    setMapMode(m);
    setMapOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVehicle) return;
    const amount = parseMoney(amountStr);
    if (amount <= 0) return;

    const odoNum = typeof odo === 'number' ? odo : 0;
    const entryData: Entry = {
      id: editingEntry ? editingEntry.id : uid(),
      v: currentVehicle.id,
      type: tab,
      date,
      odo: odoNum,
      note: note.trim() || undefined,
      amount,
      u: Date.now(),
    };

    if (tab === 'fuel') {
      entryData.liters = typeof liters === 'number' ? liters : undefined;
      entryData.price = parseMoney(priceStr) || undefined;
      entryData.full = full;
      entryData.ft = fuelType || undefined;
      if (selectedPlace) entryData.place = selectedPlace;
    }

    if (tab === 'service') {
      entryData.part = selectedPartId || undefined;
      if (selectedPlace) entryData.place = selectedPlace;
    }

    onSaveEntry(entryData, !!editingEntry);
  };

  if (!currentVehicle) return null;

  // Gauge calculations
  const renderGauge = () => {
    if (tab !== 'fuel') return null;
    const tank = +(currentVehicle.tank || 0);
    if (!tank) {
      return (
        <div id="gauge">
          <p className="empty" style={{ margin: '0 0 8px' }}>
            Nhập dung tích bình xăng ở “Sửa xe này” để xem % xăng còn lại.
          </p>
        </div>
      );
    }

    const L = levels(currentVehicle.id, vehicles, entries);
    const now =
      L.lv == null
        ? null
        : curOdo === L.po
        ? L.lv
        : L.r
        ? Math.max(0, L.lv - ((curOdo - L.po) * L.r) / 100)
        : null;

    const odoVal = typeof odo === 'number' ? odo : 0;
    const litVal = typeof liters === 'number' ? liters : 0;
    let afterFill: number | null = null;

    if (odoVal > 0 && (litVal > 0 || full)) {
      const candEntry: Entry = {
        id: 'cand',
        v: currentVehicle.id,
        type: 'fuel',
        date: date || today(),
        odo: odoVal,
        liters: litVal,
        full,
        amount: parseMoney(amountStr),
        u: Date.now(),
      };
      const candLevels = levels(
        currentVehicle.id,
        vehicles,
        entries,
        candEntry,
        editingEntry?.id
      );
      afterFill = candLevels.m?.cand?.after ?? null;
    }

    const renderProgressBar = (l: number, totalTank: number, label: string) => {
      const p = Math.max(0, Math.min(100, (l / totalTank) * 100));
      const c = p <= 15 ? '--out' : p <= 30 ? '--fuel' : '--in';
      return (
        <div style={{ margin: '0 0 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', gap: '8px' }}>
            <span>{label}</span>
            <b>
              ~{Math.round(p)}% ({num(l)}/{num(totalTank)} L)
            </b>
          </div>
          <div className="bar" style={{ height: '14px', margin: '4px 0 0' }}>
            <span style={{ width: `${p}%`, background: `var(${c})` }} />
          </div>
        </div>
      );
    };

    return (
      <div id="gauge">
        {now == null ? (
          <p className="empty" style={{ margin: '0 0 8px' }}>
            Chưa đủ dữ liệu để ước tính xăng còn lại. Hãy ghi một lần đổ đầy bình (kèm số km).
          </p>
        ) : (
          renderProgressBar(now, L.tank, '🛢️ Xăng còn lại hiện tại (ước tính)')
        )}
        {afterFill != null && renderProgressBar(afterFill, L.tank, '⛽ Sau khi đổ lần này')}
      </div>
    );
  };

  const vehicleParts = parts.filter((p) => p.v === currentVehicle.id);

  return (
    <div className="card" id="entry">
      <h2 id="eh">{editingEntry ? '✏️ Sửa khoản' : '➕ Thêm khoản mới'}</h2>

      <div className="tabs" id="tabs" ref={tabsRef}>
        {(Object.keys(ENTRY_TYPES) as EntryType[]).map((k) => (
          <button
            key={k}
            type="button"
            data-tab={k}
            aria-pressed={k === tab}
            className={k === tab ? 'active' : ''}
            disabled={!!editingEntry}
            onClick={(e) => handleTabClick(k, e)}
          >
            {ENTRY_TYPES[k].icon} {ENTRY_TYPES[k].label}
          </button>
        ))}
      </div>

      {renderGauge()}

      {aiFilledBanner && (
        <div
          style={{
            margin: '0 0 12px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(112, 0, 255, 0.15) 100%)',
            border: '1px solid #00f0ff',
            color: '#00f0ff',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 12px rgba(0, 240, 255, 0.25)',
          }}
        >
          <span>{aiFilledBanner}</span>
          <button
            type="button"
            className="lnk"
            style={{ color: '#fff', fontSize: '12px' }}
            onClick={() => setAiFilledBanner(null)}
          >
            ✕
          </button>
        </div>
      )}

      <form id="ef" onSubmit={handleSubmit}>
        <label>
          📅 Ngày
          <input
            id="f_date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label>
          🛣️ Số km trên đồng hồ
          <input
            id="f_odo"
            type="number"
            min="0"
            required={tab === 'fuel'}
            placeholder={String(curOdo || 0)}
            value={odo}
            onChange={(e) => setOdo(e.target.value === '' ? '' : +e.target.value)}
          />
        </label>

        {tab === 'fuel' && (
          <>
            <label>
              🏷️ Giá mỗi lít (VNĐ)
              <input
                id="f_p"
                className="mny"
                inputMode="numeric"
                autoComplete="off"
                placeholder="21.500"
                value={priceStr}
                onChange={(e) => handlePriceChange(e.target.value)}
              />
            </label>
            <label>
              💵 Tổng tiền đã trả (VNĐ)
              <input
                id="f_amt"
                className="mny"
                inputMode="numeric"
                autoComplete="off"
                required
                placeholder="50.000"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </label>
            <label>
              🛢️ Số lít (tự tính)
              <input
                id="f_l"
                type="number"
                step="0.01"
                min="0"
                required
                value={liters}
                onChange={(e) => handleLitersChange(e.target.value)}
              />
            </label>
            <label className="chk">
              <input
                id="f_full"
                type="checkbox"
                checked={full}
                onChange={(e) => setFull(e.target.checked)}
              />
              ⛽ Đổ đầy bình
            </label>
            <label className="full">
              ⛽ Loại xăng (tùy chọn, ảnh hưởng nhẹ đến mức tiêu hao)
              <select
                id="f_ft"
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
              >
                <option value="">Không ghi</option>
                {Object.keys(FUEL_TYPES).map((k) => (
                  <option key={k} value={k}>
                    {FUEL_TYPES[k][0]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {tab === 'service' && (
          <>
            <label className="full">
              Nội dung
              <input
                id="f_note"
                required
                placeholder="Thay nhớt, lốp, má phanh…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            {vehicleParts.length > 0 && (
              <label className="full">
                🔩 Linh kiện đã thay (tùy chọn, tự đặt lại hạn thay)
                <select
                  id="f_part"
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                >
                  <option value="">Không chọn</option>
                  {vehicleParts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="full">
              💵 Chi phí (VNĐ)
              <input
                id="f_amt"
                className="mny"
                inputMode="numeric"
                autoComplete="off"
                required
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </label>
          </>
        )}

        {tab === 'other' && (
          <>
            <label className="full">
              Nội dung
              <input
                id="f_note"
                required
                placeholder="Gửi xe, phí cầu đường, bảo hiểm, rửa xe…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <label className="full">
              💵 Số tiền (VNĐ)
              <input
                id="f_amt"
                className="mny"
                inputMode="numeric"
                autoComplete="off"
                required
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </label>
          </>
        )}

        {tab === 'income' && (
          <>
            <label className="full">
              Nội dung
              <input
                id="f_note"
                required
                placeholder="Chạy xe công nghệ, chở hàng, cho thuê…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <label className="full">
              💵 Số tiền (VNĐ)
              <input
                id="f_amt"
                className="mny"
                inputMode="numeric"
                autoComplete="off"
                required
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </label>
          </>
        )}

        {(tab === 'fuel' || tab === 'service') && (
          <div className="full" id="placebox">
            {selectedPlace ? (
              <div className="row" style={{ justifyContent: 'space-between', gap: '8px' }}>
                <span>
                  {tab === 'service' ? '🏬' : '📍'} <b>{selectedPlace.name}</b>
                  <br />
                  <small className="empty">{selectedPlace.addr || ''}</small>
                </span>
                <span>
                  <button
                    type="button"
                    id="mapopen"
                    onClick={() => handleOpenMap(tab === 'service' ? 'dealer' : 'fuel')}
                  >
                    Đổi
                  </button>{' '}
                  <button type="button" id="plclear" onClick={() => setSelectedPlace(null)}>
                    Bỏ
                  </button>
                </span>
              </div>
            ) : (
              <button
                type="button"
                id="mapopen"
                onClick={() => handleOpenMap(tab === 'service' ? 'dealer' : 'fuel')}
              >
                {tab === 'service'
                  ? '🏬 Tìm showroom / xưởng trên Google Maps'
                  : '🗺️ Chọn cây xăng trên Google Maps'}
              </button>
            )}
          </div>
        )}

        <div className="full row">
          <button className="pri" type="submit">
            {editingEntry ? 'Cập nhật' : 'Lưu ' + ENTRY_TYPES[tab].label.toLowerCase()}
          </button>
          {editingEntry && (
            <button type="button" id="ecancel" onClick={onCancelEdit}>
              Hủy sửa
            </button>
          )}
        </div>
      </form>

      <MapModal
        isOpen={mapOpen}
        mode={mapMode}
        defaultBrand={currentVehicle.brand || ''}
        lastSelectedPlace={selectedPlace}
        onClose={() => setMapOpen(false)}
        onSelectPlace={(pl) => {
          setSelectedPlace(pl);
          setMapOpen(false);
        }}
      />

      {tab === 'service' && (
        <PartsManager
          vehicleId={currentVehicle.id}
          parts={parts}
          curOdo={curOdo}
          entries={entries}
          onSavePart={onSavePart}
          onDeletePart={onDeletePart}
          onReplacePart={onReplacePart}
        />
      )}
    </div>
  );
};
