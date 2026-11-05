import React, { useRef } from 'react';
import { Vehicle, UserAccount } from '../types';
import { triggerSkidEffect } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';
import { ZipDownloadModal } from './ZipDownloadModal';

interface HeaderProps {
  vehicles: Vehicle[];
  currentVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  period: string;
  onSelectPeriod: (p: string) => void;
  syncStatus: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  currentUser?: UserAccount | null;
  onOpenAuth: () => void;
  lofiPlaying: boolean;
  onToggleLofi: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vehicles,
  currentVehicleId,
  onSelectVehicle,
  syncStatus,
  soundEnabled,
  onToggleSound,
  currentUser,
  onOpenAuth,
  lofiPlaying,
  onToggleLofi,
}) => {
  const soundBtnRef = useRef<HTMLButtonElement>(null);

  const handleSoundClick = () => {
    onToggleSound();
    if (!soundEnabled) {
      triggerSkidEffect(soundBtnRef.current, true);
    }
  };

  return (
    <div className="top">
      <style>{`
        @keyframes lofiGlowPulse {
          0% { box-shadow: 0 0 4px rgba(168, 85, 247, 0.3); }
          50% { box-shadow: 0 0 14px rgba(168, 85, 247, 0.7); }
          100% { box-shadow: 0 0 4px rgba(168, 85, 247, 0.3); }
        }
      `}</style>

      <div>
        <h1>🚗 Veo App - Lái mượt, Quản lý chuẩn</h1>
        {syncStatus && (
          <small id="sync" className="empty" role="status" style={{ display: 'block' }}>
            {syncStatus}
          </small>
        )}
      </div>
      <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        {/* Lofi Chill Music Toggle */}
        <button
          type="button"
          onClick={onToggleLofi}
          style={{
            padding: '4px 9px',
            borderRadius: '20px',
            background: lofiPlaying
              ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.28) 0%, rgba(126, 34, 206, 0.38) 100%)'
              : 'rgba(255, 255, 255, 0.08)',
            border: `1px solid ${lofiPlaying ? '#c084fc' : 'rgba(255, 255, 255, 0.18)'}`,
            color: lofiPlaying ? '#f3e8ff' : 'var(--mut)',
            fontSize: '11.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            animation: lofiPlaying ? 'lofiGlowPulse 2.4s infinite ease-in-out' : undefined,
          }}
          title={lofiPlaying ? 'Đang phát nhạc Lofi Chill thư giãn (Nhấp để tắt)' : 'Bật nhạc không lời Lofi Chill thư giãn'}
        >
          <span>{lofiPlaying ? '🎵' : '☕'}</span>
          <span>{lofiPlaying ? 'Lofi Chill' : 'Nhạc Lofi'}</span>
        </button>

        {/* User Account / Google Drive Sync Button */}
        <button
          type="button"
          onClick={onOpenAuth}
          style={{
            padding: '4px 10px',
            borderRadius: '20px',
            background: currentUser
              ? currentUser.provider === 'google'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(56, 189, 248, 0.15)'
              : 'rgba(255, 255, 255, 0.08)',
            border: `1px solid ${
              currentUser
                ? currentUser.provider === 'google'
                  ? '#f59e0b'
                  : '#38bdf8'
                : 'rgba(255, 255, 255, 0.2)'
            }`,
            color: currentUser ? '#f8fafc' : 'var(--mut)',
            fontSize: '11.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
          title={currentUser ? `Tài khoản: ${currentUser.name} (${currentUser.email})` : 'Đăng nhập tài khoản / Google Drive'}
        >
          <span>{currentUser ? (currentUser.provider === 'google' ? '☁️' : '👤') : '🔑'}</span>
          <span>{currentUser ? currentUser.name : 'Đăng nhập'}</span>
        </button>

        {vehicles.length > 0 && (
          <select
            id="veh"
            aria-label="Chọn xe"
            value={currentVehicleId || ''}
            onChange={(e) => onSelectVehicle(e.target.value)}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.plate ? ` · ${v.plate}` : ''}
              </option>
            ))}
          </select>
        )}

        <button
          ref={soundBtnRef}
          type="button"
          id="snd"
          aria-label="Âm thanh"
          title={soundEnabled ? 'Tắt âm thanh thao tác' : 'Bật âm thanh thao tác'}
          onClick={handleSoundClick}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        <ZipDownloadModal />
        <PWAInstallButton />
      </div>
    </div>
  );
};
