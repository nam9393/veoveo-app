import React, { useRef, useState } from 'react';
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

  const svgUrl = (svgStr: string) =>
    'data:image/svg+xml,' + encodeURIComponent(svgStr);

  const handleSelectPreset = (id: string) => {
    const p = PRESET_BACKGROUNDS.find((x) => x.id === id);
    onChangeBg({
      mode: 'preset',
      id,
      data: '',
      op: bgConfig.op,
      theme: p?.theme || bgConfig.theme || 'amber',
    });
    setMsg(`Đã đổi nền taplo: ${p?.name || id} (Màu đèn tự động đồng bộ)`);
  };

  const handleSelectTheme = (themeKey: string) => {
    onChangeBg({
      ...bgConfig,
      theme: themeKey,
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

      {/* Preset Wallpaper Selector */}
      <div style={{ marginBottom: '14px' }}>
        <small style={{ color: 'var(--mut)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
          Chọn hình nền khoang lái & hành trình
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
                  minHeight: '74px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  borderWidth: isSelected ? '2px' : '1px',
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
          <span style={{ fontSize: '10.5px', color: '#10b981' }}>● Không còn ánh neon gắt</span>
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
