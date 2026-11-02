import React, { useState } from 'react';

export const ZipDownloadModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          padding: '6px 11px',
          fontSize: '12px',
          fontWeight: 600,
          borderRadius: '8px',
          background: 'rgba(0, 240, 255, 0.12)',
          borderColor: 'rgba(0, 240, 255, 0.35)',
          color: '#38bdf8',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
        }}
        title="Tải gói nén mã nguồn hoặc web tĩnh để up lên GitHub không cần đợi sync"
      >
        📦 Tải gói ZIP
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            padding: '16px',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              background: '#0a1428',
              border: '1px solid #00f0ff',
              boxShadow: '0 0 35px rgba(0, 240, 255, 0.35)',
              padding: '20px',
              borderRadius: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>📦</span>
                <h3 style={{ margin: 0, color: '#00f0ff', fontSize: '16px' }}>
                  Đóng gói file nén (.ZIP) để đưa lên GitHub
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--mut)',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✖
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#cce6ff', lineHeight: 1.5, margin: '0 0 14px' }}>
              Bạn có thể tải trực tiếp file nén về máy tính hoặc điện thoại để đẩy lên GitHub hoặc lưu trữ độc lập mà không cần chờ GitHub Actions đồng bộ:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {/* Option 1: Full Source Code ZIP */}
              <div
                style={{
                  background: 'rgba(6, 16, 36, 0.85)',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <b style={{ color: '#00f0ff', fontSize: '13.5px' }}>
                    1. Gói Mã Nguồn Đầy Đủ (Source Code)
                  </b>
                  <div style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '2px' }}>
                    Bao gồm toàn bộ code React, TypeScript, cấu hình GitHub Actions đã sửa lỗi và thư mục docs/.
                  </div>
                </div>
                <a
                  href="/veoveo-app-source.zip"
                  download="veoveo-app-source.zip"
                  className="pri"
                  style={{
                    padding: '7px 12px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    marginLeft: '10px',
                  }}
                >
                  ⬇️ Tải Code ZIP
                </a>
              </div>

              {/* Option 2: Pre-compiled Web Dist ZIP */}
              <div
                style={{
                  background: 'rgba(6, 16, 36, 0.85)',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(0, 255, 136, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <b style={{ color: '#00ff88', fontSize: '13.5px' }}>
                    2. Gói Web Tĩnh Đã Build (Production Dist)
                  </b>
                  <div style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '2px' }}>
                    Đã biên dịch sẵn HTML, JS, CSS. Giải nén vào repo GitHub Pages (nhánh gh-pages hoặc thư mục docs) là chạy ngay!
                  </div>
                </div>
                <a
                  href="/veoveo-app-web-dist.zip"
                  download="veoveo-app-web-dist.zip"
                  className="pri"
                  style={{
                    padding: '7px 12px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    marginLeft: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderColor: '#10b981',
                  }}
                >
                  ⬇️ Tải Web ZIP
                </a>
              </div>
            </div>

            {/* Instruction block */}
            <div
              style={{
                background: 'rgba(5, 12, 28, 0.8)',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#94a3b8',
                lineHeight: 1.5,
              }}
            >
              <b style={{ color: '#e2f1ff' }}>💡 Hướng dẫn sửa lỗi GitHub Pages dấu X đỏ:</b>
              <ol style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                <li>Workflow <code>deploy.yml</code> và file <code>package-lock.json</code> đã được tạo & sửa lỗi triệt để.</li>
                <li>Vào GitHub Repo ➔ <b>Settings</b> ➔ <b>Pages</b>: Tại mục <b>Source</b>, chọn <b>"Deploy from a branch"</b> rồi chọn branch <b>main</b> và thư mục <b>/docs</b>, sau đó bấm <b>Save</b>.</li>
                <li>Hoặc giải nén gói <b>Web Tĩnh</b> trực tiếp vào repo là trang web tải được ngay lập tức!</li>
              </ol>
            </div>

            <div style={{ marginTop: '14px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default ZipDownloadModal;
