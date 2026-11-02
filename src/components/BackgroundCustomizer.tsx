import React, { useRef, useState } from 'react';
import { BackgroundConfig } from '../types';
import { PRESET_BACKGROUNDS } from '../constants';

interface BackgroundCustomizerProps {
  bgConfig: BackgroundConfig;
  onChangeBg: (config: BackgroundConfig) => void;
}

export const BackgroundCustomizer: React.FC<BackgroundCustomizerProps> = ({
  bgConfig,
  onChangeBg,
}) => {
  const [msg, setMsg] = useState('Nền chỉ lưu trên thiết bị này.');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const svgUrl = (svgStr: string) =>
    'data:image/svg+xml,' + encodeURIComponent(svgStr);

  const handleSelectPreset = (id: string) => {
    onChangeBg({
      mode: 'preset',
      id,
      data: '',
      op: bgConfig.op,
    });
    setMsg('Nền chỉ lưu trên thiết bị này.');
  };

  const handleRemoveBg = () => {
    onChangeBg({
      mode: 'none',
      id: '',
      data: '',
      op: bgConfig.op,
    });
    setMsg('Nền chỉ lưu trên thiết bị này.');
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
          const dataUrl = c.toDataURL('image/jpeg', 0.72);
          onChangeBg({
            mode: 'img',
            id: '',
            data: dataUrl,
            op: bgConfig.op,
          });
          setMsg('Nền chỉ lưu trên thiết bị này.');
        } catch {
          setMsg('Không lưu được ảnh (bộ nhớ trình duyệt đầy). Hãy chọn ảnh nhỏ hơn.');
        }
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      setMsg('Không đọc được ảnh này.');
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

  return (
    <details className="card fold" open>
      <summary>
        <h2>🎨 Giao diện nền taplo & xe thực tế</h2>
      </summary>

      <div id="bgs" className="mgrid">
        {PRESET_BACKGROUNDS.map((p) => {
          const isSelected = bgConfig.mode === 'preset' && bgConfig.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`bgt${isSelected ? ' on' : ''}`}
              data-bg={p.id}
              style={{ background: `url('${svgUrl(p.svg)}') center/cover` }}
              aria-label={p.name}
              onClick={() => handleSelectPreset(p.id)}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="row" style={{ margin: '8px 0' }}>
        <button type="button" id="bgup" onClick={() => fileInputRef.current?.click()}>
          🖼️ Chọn ảnh của bạn
        </button>
        <button type="button" id="bgoff" onClick={handleRemoveBg}>
          Bỏ nền
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

      <label
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          fontSize: '13px',
          color: 'var(--mut)',
        }}
      >
        Độ mờ lớp phủ
        <input
          id="bgop"
          type="range"
          min="0"
          max="90"
          value={bgConfig.op}
          style={{ flex: 1 }}
          onChange={(e) => handleOpacityChange(+e.target.value)}
        />
      </label>

      <p id="bgmsg" className="empty" role="status" style={{ margin: '6px 0 0' }}>
        {msg}
      </p>
    </details>
  );
};
