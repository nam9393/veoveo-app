import React, { useState, useEffect, useMemo } from 'react';
import { pauseBgMusic } from '../utils/bgMusic';

const DEFAULT_YOUTUBE_URL = 'https://www.youtube.com/watch?v=1w1rqnZjQdE&list=RD1w1rqnZjQdE&start_radio=1';

interface YouTubeMusicPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onTogglePlay: (playing: boolean) => void;
}

export const YouTubeMusicPlayer: React.FC<YouTubeMusicPlayerProps> = ({
  isOpen,
  onClose,
  isPlaying,
  onTogglePlay,
}) => {
  useEffect(() => {
    if (isPlaying) {
      pauseBgMusic();
    }
  }, [isPlaying]);
  const [youtubeUrl, setYoutubeUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('veo_yt_music_url') || DEFAULT_YOUTUBE_URL;
    } catch {
      return DEFAULT_YOUTUBE_URL;
    }
  });

  const [inputUrl, setInputUrl] = useState<string>(youtubeUrl);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Extract YouTube Video ID and Playlist ID
  const { videoId, listId } = useMemo(() => {
    let vid = '1w1rqnZjQdE';
    let lid = 'RD1w1rqnZjQdE';

    try {
      const url = new URL(youtubeUrl);
      const v = url.searchParams.get('v');
      const list = url.searchParams.get('list');
      if (v) vid = v;
      if (list) lid = list;

      // Handle youtu.be shortlinks
      if (url.hostname === 'youtu.be') {
        const pathVid = url.pathname.slice(1);
        if (pathVid) vid = pathVid;
      }
    } catch {
      // Fallback
    }

    return { videoId: vid, listId: lid };
  }, [youtubeUrl]);

  const embedSrc = useMemo(() => {
    let base = `https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? '1' : '0'}&enablejsapi=1`;
    if (listId) {
      base += `&list=${listId}`;
    }
    return base;
  }, [videoId, listId, isPlaying]);

  const handleApplyUrl = (newUrl: string) => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    setYoutubeUrl(trimmed);
    setInputUrl(trimmed);
    onTogglePlay(true);
    try {
      localStorage.setItem('veo_yt_music_url', trimmed);
    } catch {}
  };

  const handleResetDefault = () => {
    handleApplyUrl(DEFAULT_YOUTUBE_URL);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9998,
        width: isMinimized ? '280px' : '360px',
        maxWidth: 'calc(100vw - 32px)',
        background: 'rgba(15, 23, 42, 0.96)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        border: '1.5px solid rgba(239, 68, 68, 0.4)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(239, 68, 68, 0.2)',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🔴</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
              Nhạc Lái Xe YouTube
            </div>
            <div style={{ fontSize: '10px', color: '#fca5a5' }}>
              {isPlaying ? '● Đang phát nhạc radio' : '○ Tạm dừng'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => onTogglePlay(!isPlaying)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              background: isPlaying ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
              border: `1px solid ${isPlaying ? '#ef4444' : '#10b981'}`,
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title={isPlaying ? 'Tạm dừng nhạc' : 'Tiếp tục phát'}
          >
            {isPlaying ? '⏸️ Tắt' : '▶️ Bật'}
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized((m) => !m)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--mut)',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
            title={isMinimized ? 'Mở rộng trình phát' : 'Thu nhỏ'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--mut)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
            title="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Embedded YouTube Iframe Video Player */}
      {!isMinimized && (
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
          <iframe
            src={embedSrc}
            title="Veo Cockpit YouTube Music"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Control Footer */}
      {!isMinimized && (
        <div style={{ padding: '10px 12px', background: 'rgba(5, 10, 20, 0.7)' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Dán link YouTube (video hoặc playlist)..."
              style={{
                flex: 1,
                fontSize: '11px',
                padding: '5px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
              }}
            />
            <button
              type="button"
              onClick={() => handleApplyUrl(inputUrl)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                background: '#ef4444',
                border: 'none',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Phát
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleResetDefault}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fca5a5',
                fontSize: '10.5px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              🔄 Quay lại Playlist Chill Mặc Định
            </button>
            <span style={{ fontSize: '10px', color: 'var(--mut)' }}>
              Tự động lưu link yêu thích
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
export default YouTubeMusicPlayer;
