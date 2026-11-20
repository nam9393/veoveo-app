import React, { useRef, useState } from 'react';
import { AppState, Vehicle } from '../types';
import { ENTRY_TYPES } from '../constants';
import { today } from '../utils/calc';
import { getStoredClientId, saveClientId } from '../utils/sync';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  getAIPersona,
  setAIPersona,
  AIPersona,
} from '../services/geminiService';
import { gpsTrackingService } from '../services/gpsTrackingService';

interface DataManagerProps {
  state: AppState;
  currentVehicle: Vehicle | null;
  onAddVehicle: () => void;
  onEditVehicle: () => void;
  onDeleteVehicle: () => void;
  onMergeState: (imported: any) => void;
  onConnectDrive: () => void;
}

export const DataManager: React.FC<DataManagerProps> = ({
  state,
  currentVehicle,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onMergeState,
  onConnectDrive,
}) => {
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [msg, setMsg] = useState(
    'Dữ liệu được lưu trong trình duyệt trên thiết bị này. Hãy tải file sao lưu định kỳ để chuyển sang máy khác hoặc phòng khi mất dữ liệu.'
  );
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState('');
  const [clientId, setClientId] = useState(getStoredClientId());
  const [showCidBox, setShowCidBox] = useState(false);
  const [apiKey, setApiKeyState] = useState(getGeminiApiKey());
  const [persona, setPersonaState] = useState<AIPersona>(getAIPersona());
  const [keySavedMsg, setKeySavedMsg] = useState('');

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKey);
    setKeySavedMsg('✅ Đã lưu Google Gemini API Key thành công!');
    setTimeout(() => setKeySavedMsg(''), 3500);
  };

  const handleSelectPersona = (p: AIPersona) => {
    setPersonaState(p);
    setAIPersona(p);
  };

  const handleLoadDemoGps = () => {
    if (!currentVehicle) {
      alert('Vui lòng thêm hoặc chọn xe trước khi nạp dữ liệu mẫu!');
      return;
    }
    gpsTrackingService.populateDemoRoutes(currentVehicle.id);
    alert(`Đã nạp 4 chuyến đi mẫu cho xe ${currentVehicle.name}! Vui lòng sang tab Tổng Quan để xem.`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteClick = () => {
    if (!currentVehicle) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setDeleteArmed(false);
    onDeleteVehicle();
  };

  const handleDownloadFile = (filename: string, content: string, type: string) => {
    try {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setMsg(`Đã tải file ${filename}.`);
    } catch {
      setMsg('Không tải được file.');
    }
  };

  const handleExportJson = () => {
    const data = JSON.stringify(
      {
        app: 'so-xe',
        version: 1,
        exported: today(),
        vehicles: state.vehicles,
        entries: state.entries,
        parts: state.parts,
      },
      null,
      1
    );
    handleDownloadFile(`veo-app-sao-luu-${today()}.json`, data, 'application/json');
  };

  const handleExportCsv = () => {
    const q = (v: any) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const rows: (string | number)[][] = [
      ['Xe', 'Biển số', 'Ngày', 'Loại', 'Số km', 'Số lít', 'Giá/lít', 'Số tiền', 'Đầy bình', 'Cây xăng', 'Ghi chú'],
    ];

    state.entries
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((e) => {
        const v = state.vehicles.find((x) => x.id === e.v) || ({} as Vehicle);
        rows.push([
          v.name || '',
          v.plate || '',
          e.date,
          ENTRY_TYPES[e.type].label,
          e.odo || '',
          e.liters || '',
          e.price || '',
          e.amount,
          e.type === 'fuel' ? (e.full ? 'Có' : 'Không') : '',
          e.place?.name || '',
          e.note || '',
        ]);
      });

    const csvContent =
      '\ufeff' + rows.map((r) => r.map(q).join(';')).join('\r\n');
    handleDownloadFile(`veo-app-${today()}.csv`, csvContent, 'text/csv;charset=utf-8');
  };

  const handleCopyBackup = async () => {
    const txt = JSON.stringify({
      app: 'so-xe',
      version: 1,
      exported: today(),
      vehicles: state.vehicles,
      entries: state.entries,
      parts: state.parts,
    });
    try {
      await navigator.clipboard.writeText(txt);
      setMsg(
        'Đã sao chép bản sao lưu. Hãy dán vào một file .json trên Google Drive, hoặc lưu lại nơi an toàn.'
      );
    } catch {
      setManualOpen(true);
      setManualText(txt);
      setMsg(
        'Trình duyệt không cho sao chép tự động. Hãy chọn toàn bộ nội dung trong ô bên dưới và sao chép.'
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        onMergeState(parsed);
      } catch {
        setMsg('File không hợp lệ. Hãy chọn đúng file .json do Veo App tạo ra.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleShowManualData = () => {
    setManualText(
      JSON.stringify({
        app: 'so-xe',
        version: 1,
        vehicles: state.vehicles,
        entries: state.entries,
        parts: state.parts,
      })
    );
  };

  const handleRestoreFromManual = () => {
    try {
      const parsed = JSON.parse(manualText);
      onMergeState(parsed);
      setManualText('');
    } catch {
      setMsg('Dữ liệu không hợp lệ. Hãy dán lại toàn bộ nội dung đã sao chép.');
    }
  };

  const handleSaveClientId = () => {
    const val = clientId.trim();
    if (!val.endsWith('.apps.googleusercontent.com')) {
      setMsg('Client ID phải kết thúc bằng .apps.googleusercontent.com');
      return;
    }
    saveClientId(val);
    window.location.reload();
  };

  return (
    <details className="card fold">
      <summary>
        <h2>☁️ Quản lý dữ liệu</h2>
      </summary>

      <div className="row" style={{ marginBottom: '8px' }}>
        <button type="button" id="addv" onClick={onAddVehicle}>
          🚗 Thêm xe khác
        </button>
        {currentVehicle && (
          <>
            <button type="button" id="editv" onClick={onEditVehicle}>
              ✏️ Sửa xe này
            </button>
            <button
              type="button"
              id="delv"
              onClick={handleDeleteClick}
              style={deleteArmed ? { background: 'var(--out)', color: '#fff' } : {}}
            >
              {deleteArmed ? 'Bấm lần nữa để xóa xe và toàn bộ dữ liệu' : '🗑️ Xóa xe này'}
            </button>
          </>
        )}
        <button type="button" id="exp" onClick={handleExportJson}>
          💾 Tải file sao lưu (.json)
        </button>
        <button type="button" id="cp" onClick={handleCopyBackup}>
          📋 Sao chép bản sao lưu
        </button>
        <button type="button" id="gsign" className="pri" onClick={onConnectDrive}>
          ☁️ Kết nối Google Drive
        </button>
        <button type="button" id="csv" onClick={handleExportCsv}>
          📊 Xuất Excel (.csv)
        </button>
        <a
          href="./veoveo-app-source.zip"
          download="veoveo-app-source.zip"
          className="pri"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          📦 Tải Toàn Bộ Mã Nguồn (.ZIP)
        </a>
        <a
          href="./veoveo-app-web-dist.zip"
          download="veoveo-app-web-dist.zip"
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(245, 158, 11, 0.15)',
            borderColor: 'var(--acc)',
            color: 'var(--acc)',
          }}
        >
          🚀 Tải Bản Web Tĩnh Build Sẵn (.ZIP)
        </a>
        <button type="button" id="imp" onClick={() => fileInputRef.current?.click()}>
          📂 Mở file sao lưu…
        </button>
        <button
          type="button"
          onClick={() => setShowCidBox((prev) => !prev)}
          style={{ fontSize: '12px' }}
        >
          ⚙️ Cài đặt Google Client ID
        </button>
        <input
          ref={fileInputRef}
          id="file"
          type="file"
          accept=".json,application/json"
          hidden
          onChange={handleFileChange}
        />
      </div>

      <p id="msg" className="empty" role="status" style={{ margin: '6px 0 0' }}>
        {msg}
      </p>

      {showCidBox && (
        <div id="cidbox" className="row" style={{ marginTop: '8px', marginBottom: '8px' }}>
          <input
            id="cid"
            placeholder="Dán Google Client ID (…apps.googleusercontent.com)"
            style={{ flex: 1 }}
            aria-label="Google Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <button type="button" id="cidsave" className="pri" onClick={handleSaveClientId}>
            Lưu
          </button>
        </div>
      )}

      <details id="manual" open={manualOpen} style={{ marginTop: '8px' }}>
        <summary className="empty">Cách thủ công: sao chép và dán dữ liệu</summary>
        <textarea
          id="bk"
          placeholder="Dữ liệu hiện ra ở đây. Dán dữ liệu sao lưu cũ vào để khôi phục."
          aria-label="Dữ liệu sao lưu"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
        />
        <div className="row" style={{ marginTop: '6px' }}>
          <button type="button" id="exp2" onClick={handleShowManualData}>
            Hiện dữ liệu
          </button>
          <button type="button" id="imp2" onClick={handleRestoreFromManual}>
            Khôi phục từ ô
          </button>
        </div>
      </details>

      {/* Gemini AI & Offline Assistant Configuration */}
      <div
        style={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
          border: '1.5px solid rgba(56, 189, 248, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🤖</span> Cấu hình Trí tuệ Nhân tạo Gemini AI
          </h3>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: apiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: apiKey ? '#34d399' : '#fbbf24',
              border: `1px solid ${apiKey ? '#10b981' : '#f59e0b'}`,
            }}
          >
            {apiKey ? '● Đang dùng Gemini 1.5 Flash' : '○ Đang dùng Trợ lý Offline'}
          </span>
        </div>

        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.5 }}>
          Để trợ lý AI trò chuyện thông minh không giới hạn trên GitHub Pages, hãy lấy API Key miễn phí từ{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'underline' }}
          >
            Google AI Studio
          </a>{' '}
          và dán vào đây (chỉ lưu trên máy của bạn, không gửi đi đâu khác):
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input
            type="password"
            placeholder="Dán Gemini API Key (AIzaSy...)"
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '8px 12px',
              fontSize: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: '#fff',
            }}
          />
          <button
            type="button"
            onClick={handleSaveApiKey}
            className="pri"
            style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '8px', whiteSpace: 'nowrap' }}
          >
            💾 Lưu API Key
          </button>
          {apiKey && (
            <button
              type="button"
              onClick={() => {
                setApiKeyState('');
                setGeminiApiKey('');
                setKeySavedMsg('Đã xóa API Key!');
                setTimeout(() => setKeySavedMsg(''), 2500);
              }}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid #ef4444',
              }}
            >
              Xóa Key
            </button>
          )}
        </div>

        {keySavedMsg && (
          <div style={{ fontSize: '12px', color: '#10b981', marginBottom: '10px', fontWeight: 600 }}>
            {keySavedMsg}
          </div>
        )}

        {/* Persona Selector */}
        <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
            Phong cách xưng hô của Trợ lý AI:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSelectPersona('vy')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
                cursor: 'pointer',
                background: persona === 'vy' ? 'rgba(244, 114, 182, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${persona === 'vy' ? '#f472b6' : 'rgba(255, 255, 255, 0.15)'}`,
                color: persona === 'vy' ? '#f472b6' : '#cbd5e1',
                fontWeight: persona === 'vy' ? 700 : 500,
              }}
            >
              🌸 Em Vy (Ngọt ngào, chu đáo)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPersona('expert')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
                cursor: 'pointer',
                background: persona === 'expert' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${persona === 'expert' ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}`,
                color: persona === 'expert' ? '#38bdf8' : '#cbd5e1',
                fontWeight: persona === 'expert' ? 700 : 500,
              }}
            >
              🔧 Kỹ sư ô tô (Chuẩn kỹ thuật, ngắn gọn)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPersona('friendly')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
                cursor: 'pointer',
                background: persona === 'friendly' ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${persona === 'friendly' ? '#34d399' : 'rgba(255, 255, 255, 0.15)'}`,
                color: persona === 'friendly' ? '#34d399' : '#cbd5e1',
                fontWeight: persona === 'friendly' ? 700 : 500,
              }}
            >
              🤝 Bạn đồng hành (Lịch thiệp, thân thiện)
            </button>
          </div>
        </div>

        {/* Demo GPS Data Loader */}
        <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <b style={{ fontSize: '12px', color: '#f8fafc' }}>📍 Dữ liệu chạy GPS mẫu</b>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Nạp 4 chuyến đi mẫu (Quận 1, Landmark 81, Tân Sơn Nhất, Sala) để kiểm tra bản đồ và biểu đồ.
              </div>
            </div>
            <button
              type="button"
              onClick={handleLoadDemoGps}
              style={{
                padding: '6px 12px',
                fontSize: '11.5px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              + Nạp chuyến đi mẫu
            </button>
          </div>
        </div>
      </div>
    </details>
  );
};
