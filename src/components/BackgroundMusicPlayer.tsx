import React, { useState, useEffect, useRef } from 'react';
import {
  getBgMusicState,
  playBgMusic,
  pauseBgMusic,
  toggleBgMusic,
  setBgMusicVolume,
  seekBgMusic,
  setBgMusicLoop,
  subscribeBgMusic,
  BgMusicState,
} from '../utils/bgMusic';

interface BackgroundMusicPlayerProps {
  onOpenYouTube?: () => void;
}

export const BackgroundMusicPlayer: React.FC<BackgroundMusicPlayerProps> = ({ onOpenYouTube }) => {
  const [musicState, setMusicState] = useState<BgMusicState>(getBgMusicState());
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeBgMusic((state) => {
      setMusicState(state);
    });
    return () => unsubscribe();
  }, []);

  // Close player popup when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const formatTime = (secs: number): string => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent =
    musicState.duration > 0 ? (musicState.currentTime / musicState.duration) * 100 : 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Cockpit Music Button on Header Bar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 11px',
          borderRadius: '20px',
          background: musicState.isPlaying
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.38) 100%)'
            : 'rgba(255, 255, 255, 0.08)',
          border: `1.5px solid ${musicState.isPlaying ? '#f59e0b' : 'rgba(255, 255, 255, 0.18)'}`,
          color: musicState.isPlaying ? '#fef08a' : 'var(--mut)',
          fontSize: '11.5px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: musicState.isPlaying ? '0 0 14px rgba(245, 158, 11, 0.5)' : undefined,
          transition: 'all 0.2s ease',
        }}
        title="Nhạc nền MP3: Forever Tonight (Peter Cetera & Julie)"
      >
        <span style={{ fontSize: '13px' }}>{musicState.isPlaying ? '🎵' : '🎼'}</span>
        <span>Nhạc MP3 Chill</span>

        {musicState.isPlaying && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              height: '10px',
              marginLeft: '2px',
            }}
          >
            <span
              style={{
                width: '2.5px',
                height: '100%',
                backgroundColor: '#10b981',
                borderRadius: '1px',
                animation: 'waveBounce 0.8s ease-in-out infinite alternate',
              }}
            />
            <span
              style={{
                width: '2.5px',
                height: '70%',
                backgroundColor: '#10b981',
                borderRadius: '1px',
                animation: 'waveBounce 0.6s ease-in-out 0.2s infinite alternate',
              }}
            />
            <span
              style={{
                width: '2.5px',
                height: '90%',
                backgroundColor: '#10b981',
                borderRadius: '1px',
                animation: 'waveBounce 0.7s ease-in-out 0.4s infinite alternate',
              }}
            />
          </span>
        )}
      </button>

      {/* Floating Glassmorphic Music Player Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 9999,
            width: '320px',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 100%)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1.5px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.75), 0 0 24px rgba(245, 158, 11, 0.15)',
            padding: '16px',
            color: '#f8fafc',
            fontFamily: 'inherit',
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📻</span>
              <div>
                <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cockpit Audio System
                </div>
                <div style={{ fontSize: '10px', color: 'var(--mut)' }}>Nhạc nền thư giãn lái xe</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: 'var(--mut)',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              title="Đóng"
            >
              ✕
            </button>
          </div>

          {/* Track Album Card */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(2, 6, 23, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '14px',
            }}
          >
            {/* Spinning Disc / Cover */}
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #f59e0b 0%, #b45309 60%, #1e1b4b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: musicState.isPlaying ? '0 0 16px rgba(245, 158, 11, 0.6)' : 'none',
                animation: musicState.isPlaying ? 'spinDisc 6s linear infinite' : 'none',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#0f172a',
                  border: '2px solid rgba(255,255,255,0.4)',
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#fef08a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {musicState.track.title}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#cbd5e1',
                  marginTop: '1px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {musicState.track.artist}
              </div>
              <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '2px' }}>
                Định dạng: MP3 Audio 320kbps
              </div>
            </div>
          </div>

          {/* Scrub Bar / Timeline */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '3px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                seekBgMusic(ratio * musicState.duration);
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #f59e0b 0%, #10b981 100%)',
                  borderRadius: '3px',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'var(--mut)',
                marginTop: '5px',
              }}
            >
              <span>{formatTime(musicState.currentTime)}</span>
              <span>{formatTime(musicState.duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => setBgMusicLoop(!musicState.loop)}
              style={{
                background: musicState.loop ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${musicState.loop ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)'}`,
                color: musicState.loop ? '#fef08a' : 'var(--mut)',
                borderRadius: '8px',
                padding: '5px 9px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title={musicState.loop ? 'Đang bật lặp lại bài hát liên tục' : 'Bật lặp lại bài hát'}
            >
              🔁 Lặp lại
            </button>

            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={() => toggleBgMusic()}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: musicState.isPlaying
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#fff',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: musicState.isPlaying
                  ? '0 4px 16px rgba(245, 158, 11, 0.6)'
                  : '0 4px 16px rgba(16, 185, 129, 0.5)',
                transition: 'transform 0.1s ease',
              }}
              title={musicState.isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc MP3'}
            >
              {musicState.isPlaying ? '⏸' : '▶'}
            </button>

            {/* Reset / Replay */}
            <button
              type="button"
              onClick={() => {
                seekBgMusic(0);
                if (!musicState.isPlaying) playBgMusic();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'var(--ink)',
                borderRadius: '8px',
                padding: '5px 9px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
              title="Phát lại từ đầu"
            >
              ⏮ Từ đầu
            </button>
          </div>

          {/* Volume Slider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '10px',
              background: 'rgba(2, 6, 23, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              marginBottom: '10px',
            }}
          >
            <span
              style={{ fontSize: '13px', cursor: 'pointer' }}
              onClick={() => setBgMusicVolume(musicState.volume > 0 ? 0 : 0.45)}
              title="Bật/Tắt âm"
            >
              {musicState.volume === 0 ? '🔇' : musicState.volume < 0.5 ? '🔉' : '🔊'}
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={musicState.volume}
              onChange={(e) => setBgMusicVolume(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#f59e0b', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '10.5px', color: 'var(--mut)', width: '32px', textAlign: 'right' }}>
              {Math.round(musicState.volume * 100)}%
            </span>
          </div>

          {/* YouTube Alternative Option */}
          {onOpenYouTube && (
            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  pauseBgMusic();
                  setIsOpen(false);
                  onOpenYouTube();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f87171',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                🔴 Hoặc chuyển sang nghe Nhạc YouTube
              </button>
            </div>
          )}
        </div>
      )}

      {/* Global CSS Keyframes for Wave & Disc Rotation */}
      <style>{`
        @keyframes waveBounce {
          0% { height: 20%; }
          100% { height: 100%; }
        }
        @keyframes spinDisc {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
