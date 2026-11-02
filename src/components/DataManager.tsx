import React, { useRef, useState } from 'react';
import { AppState, Vehicle } from '../types';
import { ENTRY_TYPES } from '../constants';
import { today } from '../utils/calc';
import { getStoredClientId, saveClientId } from '../utils/sync';

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

      <div
        style={{
          marginTop: '16px',
          padding: '14px',
          borderRadius: '12px',
          background: 'rgba(245, 158, 11, 0.06)',
          border: '1px solid var(--line)',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: '13.5px', color: 'var(--acc)' }}>
          🛠️ Đồng bộ GitHub & Khắc phục lỗi dấu X đỏ (GitHub Pages)
        </h3>
        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 8px' }}>
            <b>Tại sao trước đó bị dấu X đỏ trên GitHub Actions?</b>
            <br />
            1. <b>Cài đặt Pages:</b> Trên GitHub repo, vào <b>Settings</b> ➔ <b>Pages</b> ➔ Tại mục <b>Source</b>, chọn <b>GitHub Actions</b> (thay vì <i>Deploy from a branch</i>).
            <br />
            2. <b>Quyền Actions:</b> Vào <b>Settings</b> ➔ <b>Actions</b> ➔ <b>General</b> ➔ kéo xuống <b>Workflow permissions</b>, chọn <b>Read and write permissions</b> rồi bấm Save.
            <br />
            3. <b>Nếu dùng Deploy from branch:</b> Bạn có thể chọn nhánh <code>main</code> và thư mục <code>/docs</code> (mã nguồn đã tự động build sẵn bản web hoàn chỉnh vào thư mục <code>docs/</code>).
          </p>
          <p style={{ margin: '0 0 6px' }}>
            <b>⚡ Link trực tiếp chạy mượt mà kèm AI Gemini đầy đủ:</b>
          </p>
          <div
            style={{
              padding: '7px 10px',
              background: 'rgba(10, 15, 25, 0.9)',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontFamily: 'monospace',
              color: 'var(--acc)',
              wordBreak: 'break-all',
              border: '1px solid var(--line)',
              marginBottom: '6px',
            }}
          >
            https://ais-pre-jlczx3v33qd2cngtlwrz75-22176439405.asia-northeast1.run.app
          </div>
        </div>
      </div>
    </details>
  );
};
