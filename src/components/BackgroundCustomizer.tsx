import React, { useRef, useState, useEffect } from 'react';
import { BackgroundConfig } from '../types';
import { PRESET_BACKGROUNDS, COCKPIT_THEMES } from '../constants';

interface BackgroundCustomizerProps {
  bgConfig: BackgroundConfig;
  onChangeBg: (config: BackgroundConfig) => void;
}

export const BackgroundCustomizer: React.FC<BackgroundCustomizerProps> = ({
  bgConfig,
  onChangeBg,
}) => {
  const [msg, setMsg] = useState('Nền và màu đèn taplo được lưu trên thiết bị của bạn.');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current real-time hour check
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const isNightTime = currentHour < 6 || currentHour >= 18;
  const isAutoEnabled = bgConfig.autoDayNight !== false; // default true

  const svgUrl = (svgStr: string) =>
    'data:image/svg+xml,' + encodeURIComponent(svgStr);

  const handleToggleAutoDayNight = (enabled: boolean) => {
    onChangeBg({
      ...bgConfig,
      autoDayNight: enabled,
    });
    setMsg(
      enabled
        ? `Đã bật chế độ Ngày/Đêm tự động! Hệ thống đang kích hoạt chế độ ${isNightTime ? 'Ban đêm (Ánh sáng ấm chống mỏi mắt)' : 'Ban ngày (Sáng rõ)'}.`
        : 'Đã tắt chế độ Ngày/Đêm tự động. Bạn có thể chọn theme thủ công.'
    );
  };

  const handleSelectPreset = (id: string) => {
    const p = PRESET_BACKGROUNDS.find((x) => x.id === id);
    onChangeBg({
      mode: 'preset',
      id,
      data: '',
      op: bgConfig.op,
      theme: p?.theme || bgConfig.theme || 'amber',
      autoDayNight: false, // user manually picked a preset
    });
    setMsg(`Đã đổi nền taplo: ${p?.name || id} (Màu đèn tự động đồng bộ)`);
  };

  const handleSelectTheme = (themeKey: string) => {
    onChangeBg({
      ...bgConfig,
      theme: themeKey,
      autoDayNight: false, // user manually picked a theme
    });
    setMsg(`Đã chuyển màu đèn taplo: ${COCKPIT_THEMES[themeKey]?.name}`);
  };

  const handleRemoveBg = () => {
    onChangeBg({
      mode: 'none',
      id: '',
      data: '',
      op: bgConfig.op,
      theme: bgConfig.theme || 'amber',
      autoDayNight: false,
    });
    setMsg('Đã chuyển về nền tối giản nguyên bản.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = new Image();
    const url = URL.createObjectURL(f);

    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        try {
          const dataUrl = c.toDataURL('image/jpeg', 0.75);
          onChangeBg({
            mode: 'img',
            id: '',
            data: dataUrl,
            op: bgConfig.op,
            theme: bgConfig.theme || 'amber',
            autoDayNight: false,
          });
          setMsg('Đã cập nhật ảnh nền thực tế từ thiết bị của bạn!');
        } catch {
          setMsg('Không lưu được ảnh (bộ nhớ trình duyệt đầy). Hãy chọn ảnh nhỏ hơn.');
        }
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      setMsg('Không đọc được định dạng ảnh này.');
    };

    img.src = url;
    e.target.value = '';
  };

  const handleOpacityChange = (val: number) => {
    onChangeBg({
      ...bgConfig,
      op: val,
    });
  };

  const currentThemeKey =
    bgConfig.theme ||
    PRESET_BACKGROUNDS.find((p) => p.id === bgConfig.id)?.theme ||
    'amber';

  return (
    <details className="card fold" open>
      <summary>
        <h2>🎨 Giao diện nền taplo & Màu đèn nội thất (Chống mỏi mắt)</h2>
      </summary>

      {/* Auto Real-Time Day / Night Theme Banner */}
      <div
        style={{
          padding: '12px',
          borderRadius: '12px',
          background: isNightTime
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(18, 14, 10, 0.85) 100%)'
            : 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(11, 19, 36, 0.85) 100%)',
          border: `1.5px solid ${isNightTime ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.35)'}`,
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>{isNightTime ? '🌙' : '☀️'}</span>
              <strong style={{ fontSize: '13.5px', color: '#f8fafc' }}>
                Tự động đổi Theme theo thời gian thực (Ngày / Đêm)
              </strong>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--mut)', marginTop: '3px' }}>
              Thời gian hiện tại: <b>{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</b> ·{' '}
              {isNightTime ? (
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>Ban đêm (18h-6h): Tự động chuyển Hổ phách BMW chống mỏi mắt</span>
              ) : (
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>Ban ngày (6h-18h): Tự động chuyển Thép Titan sáng rõ</span>
              )}
            </div>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '12.5px',
              fontWeight: 700,
              color: isAutoEnabled ? (isNightTime ? '#fbbf24' : '#38bdf8') : 'var(--mut)',
            }}
          >
            <input
              type="checkbox"
              checked={isAutoEnabled}
              onChange={(e) => handleToggleAutoDayNight(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: isNightTime ? '#f59e0b' : '#38bdf8' }}
            />
            <span>{isAutoEnabled ? '✓ Đang kích hoạt tự động' : 'Tự động Ngày/Đêm'}</span>
          </label>
        </div>
      </div>

      {/* Preset Wallpaper Selector */}
      <div style={{ marginBottom: '14px' }}>
        <small style={{ color: 'var(--mut)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
          Chọn hình nền khoang lái & hành trình (Bấm để xem và áp dụng trực tiếp)
        </small>
        <div id="bgs" className="mgrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {PRESET_BACKGROUNDS.map((p) => {
            const isSelected = bgConfig.mode === 'preset' && bgConfig.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`bgt${isSelected ? ' on' : ''}`}
                data-bg={p.id}
                style={{
                  background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url('${svgUrl(p.svg)}') center/cover`,
                  minHeight: '76px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  border: isSelected ? '2.5px solid var(--acc)' : '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: isSelected ? '0 0 14px var(--acc-glow)' : 'none',
                  cursor: 'pointer',
                  borderRadius: '10px',
                  padding: '8px',
                }}
                aria-label={p.name}
                onClick={() => handleSelectPreset(p.id)}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>{p.name}</span>
                {isSelected && (
                  <span style={{ fontSize: '9.5px', color: 'var(--acc)', fontWeight: 800 }}>✓ Đang áp dụng</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ambient Cockpit Lighting Colors (Anti-Eye Strain) */}
      <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '12px', background: 'rgba(5, 10, 20, 0.6)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <small style={{ color: 'var(--mut)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
            💡 Đèn viền nội thất (Ambient Light) · Chống mỏi mắt
          </small>
          <span style={{ fontSize: '10.5px', color: '#10b981' }}>● Triệt tiêu ánh sáng xanh ban đêm</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          {Object.entries(COCKPIT_THEMES).map(([k, th]) => {
            const isSelected = currentThemeKey === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => handleSelectTheme(k)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.7)',
                  border: isSelected ? `2px solid ${th.acc}` : '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: th.acc,
                    display: 'inline-block',
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${th.glow}`,
                  }}
                />
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? th.acc : '#e2e8f0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {th.name.split(' (')[0]}
                  </div>
                  <small style={{ fontSize: '9px', color: 'var(--mut)', display: 'block' }}>
                    {k === 'amber' ? 'Chống mỏi mắt' : k === 'titanium' ? 'Êm dịu tinh tế' : 'Dịu mát tự nhiên'}
                  </small>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Image Upload & Opacity Controls */}
      <div className="row" style={{ margin: '8px 0', alignItems: 'center' }}>
        <button type="button" id="bgup" onClick={() => fileInputRef.current?.click()} style={{ fontSize: '12.5px' }}>
          🖼️ Tải ảnh xe của bạn
        </button>
        <button type="button" id="bgoff" onClick={handleRemoveBg} style={{ fontSize: '12.5px' }}>
          Tối giản (Bỏ nền)
        </button>
        <input
          ref={fileInputRef}
          id="bgfile"
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileUpload}
        />
      </div>

      <div style={{ marginTop: '10px' }}>
        <label
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            fontSize: '12.5px',
            color: 'var(--mut)',
          }}
        >
          <span>Độ rõ của hình nền ({bgConfig.op}%)</span>
          <input
            id="bgop"
            type="range"
            min="10"
            max="90"
            step="5"
            value={bgConfig.op}
            style={{ flex: 1 }}
            onChange={(e) => handleOpacityChange(+e.target.value)}
          />
        </label>
      </div>

      <p id="bgmsg" className="empty" role="status" style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--mut)' }}>
        {msg}
      </p>
    </details>
  );
};
