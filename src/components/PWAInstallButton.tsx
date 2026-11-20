import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  const isInIframe = window.self !== window.top;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (!res) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="pri"
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          borderRadius: '8px',
          background: isInstalled
            ? 'rgba(0, 255, 136, 0.2)'
            : 'linear-gradient(135deg, #00f0ff 0%, #7000ff 100%)',
          color: '#fff',
          fontWeight: 700,
          border: isInstalled ? '1px solid rgba(0, 255, 136, 0.4)' : '1px solid #00f0ff',
          boxShadow: '0 0 12px rgba(0, 240, 255, 0.4)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
        title="Cài đặt Veo App lên điện thoại hoặc máy tính để dùng mượt mà toàn màn hình"
      >
        {isInstalled ? '✅ App đã cài đặt' : '📲 Cài đặt App'}
      </button>

      {showGuideModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            padding: '16px',
          }}
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '460px',
              width: '100%',
              background: '#09152e',
              border: '1px solid #00f0ff',
              boxShadow: '0 0 35px rgba(0, 240, 255, 0.35)',
              padding: '20px',
              borderRadius: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>📲</span>
                <h3 style={{ margin: 0, color: '#00f0ff', fontSize: '17px' }}>
                  Cài đặt Veo App trên thiết bị
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--mut)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✖
              </button>
            </div>

            {isInIframe && (
              <div
                style={{
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '14px',
                  fontSize: '12.5px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ color: '#00f0ff', fontWeight: 700, marginBottom: '4px' }}>
                  💡 Khuyên dùng cho Chrome / Cốc Cốc / Safari:
                </div>
                <div>
                  Trình duyệt chặn nút cài đặt trực tiếp khi đang mở trong khung xem trước. Hãy bấm nút dưới đây để mở sang tab trình duyệt độc lập, sau đó cài đặt chỉ bằng 1 chạm!
                </div>
                <button
                  type="button"
                  className="pri"
                  onClick={handleOpenNewTab}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  🚀 Mở ra tab riêng để Cài đặt ngay
                </button>
              </div>
            )}

            <div style={{ fontSize: '13px', color: '#cce6ff', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(6, 16, 36, 0.8)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <b style={{ color: '#00f0ff' }}>📱 Trên Android (Chrome / Cốc Cốc):</b>
                <p style={{ margin: '4px 0 0' }}>
                  1. Chạm vào biểu tượng <b>Menu 3 chấm (⋮)</b> ở góc trên bên phải màn hình.<br />
                  2. Chọn mục <b>"Cài đặt ứng dụng"</b> hoặc <b>"Thêm vào Màn hình chính"</b>.<br />
                  3. Bấm xác nhận, biểu tượng app sẽ xuất hiện ngay trên màn hình chính như ứng dụng CH Play!
                </p>
              </div>

              <div
                style={{
                  background: 'rgba(6, 16, 36, 0.8)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <b style={{ color: '#00f0ff' }}>💻 Trên Máy tính (Chrome / Edge PC / Mac):</b>
                <p style={{ margin: '4px 0 0' }}>
                  1. Nhìn lên thanh địa chỉ web (URL) ở góc trên bên phải.<br />
                  2. Bấm vào biểu tượng <b>Cài đặt [+]</b> hoặc bấm Menu (⋮) ➔ <b>Lưu và chia sẻ</b> ➔ <b>Cài đặt Veo App</b>.<br />
                  3. App sẽ mở ra cửa sổ riêng mượt mà, không dính thanh địa chỉ trình duyệt!
                </p>
              </div>

              <div
                style={{
                  background: 'rgba(6, 16, 36, 0.8)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <b style={{ color: '#00f0ff' }}>🍎 Trên iPhone / iPad (Safari):</b>
                <p style={{ margin: '4px 0 0' }}>
                  1. Mở trang bằng trình duyệt <b>Safari</b>.<br />
                  2. Bấm nút <b>Chia sẻ (Share ⎙)</b> ở thanh công cụ dưới cùng.<br />
                  3. Cuộn xuống và chọn <b>"Thêm vào MH chính" (Add to Home Screen)</b>.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="pri"
                style={{ flex: 1 }}
                onClick={() => setShowGuideModal(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
