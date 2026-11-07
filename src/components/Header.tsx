import React, { useRef, useState, useEffect } from 'react';
import { Vehicle, UserAccount } from '../types';
import { triggerSkidEffect } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';
import { ZipDownloadModal } from './ZipDownloadModal';
import { BackgroundMusicPlayer } from './BackgroundMusicPlayer';
import { YouTubeMusicPlayer } from './YouTubeMusicPlayer';
import {
  getNotificationStatus,
  requestNotificationPermission,
  sendTestNotification,
} from '../services/notificationService';

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
}) => {
  const soundBtnRef = useRef<HTMLButtonElement>(null);
  const [ytOpen, setYtOpen] = useState(false);
  const [ytPlaying, setYtPlaying] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() => getNotificationStatus().permission);

  const handleSoundClick = () => {
    onToggleSound();
    if (!soundEnabled) {
      triggerSkidEffect(soundBtnRef.current, true);
    }
  };

  const handleToggleNotifications = async () => {
    if (notifPerm !== 'granted') {
      const p = await requestNotificationPermission();
      setNotifPerm(p);
      if (p === 'granted') {
        await sendTestNotification();
      }
    } else {
      await sendTestNotification();
    }
  };

  return (
    <div className="top">
      <div>
        <h1>🚗 Veo App - Lái mượt, Quản lý chuẩn</h1>
        {syncStatus && (
          <small id="sync" className="empty" role="status" style={{ display: 'block' }}>
            {syncStatus}
          </small>
        )}
      </div>

      <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        {/* MP3 Background Music Player: Forever Tonight (Peter Cetera & Julie) */}
        <BackgroundMusicPlayer
          onOpenYouTube={() => {
            setYtOpen(true);
            setYtPlaying(true);
          }}
        />

        {/* YouTube Music Radio Player (Link: https://www.youtube.com/watch?v=1w1rqnZjQdE) */}
        <button
          type="button"
          onClick={() => {
            setYtOpen((p) => !p);
            if (!ytPlaying) setYtPlaying(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: '20px',
            background: ytPlaying
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.28) 0%, rgba(185, 28, 28, 0.4) 100%)'
              : 'rgba(255, 255, 255, 0.08)',
            border: `1.5px solid ${ytPlaying ? '#ef4444' : 'rgba(255, 255, 255, 0.18)'}`,
            padding: '4px 10px',
            gap: '6px',
            color: ytPlaying ? '#fca5a5' : 'var(--mut)',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: ytPlaying ? '0 0 12px rgba(239, 68, 68, 0.45)' : undefined,
          }}
          title="Bật / Mở trình phát nhạc YouTube Lái Xe"
        >
          <span>{ytPlaying ? '🔴' : '▶️'}</span>
          <span>YouTube</span>
          {ytPlaying && <span style={{ fontSize: '9px', color: '#10b981' }}>● Phát</span>}
        </button>

        {/* Browser Push Notifications Button */}
        <button
          type="button"
          onClick={handleToggleNotifications}
          style={{
            padding: '4px 9px',
            borderRadius: '20px',
            background: notifPerm === 'granted' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
            border: `1px solid ${notifPerm === 'granted' ? '#10b981' : 'rgba(255, 255, 255, 0.18)'}`,
            color: notifPerm === 'granted' ? '#34d399' : 'var(--mut)',
            fontSize: '11.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
          title={
            notifPerm === 'granted'
              ? 'Thông báo đẩy trình duyệt: Đã bật (Bấm để gửi thông báo thử)'
              : 'Bấm để bật thông báo trình duyệt nhắc lịch bảo dưỡng, nhiên liệu sắp cạn, mất GPS'
          }
        >
          <span>🔔</span>
          <span>{notifPerm === 'granted' ? 'Thông báo ON' : 'Bật thông báo'}</span>
        </button>

        {/* User Account / Google Drive Sync Button */}
        <button
          type="button"
          onClick={onOpenAuth}
          style={{
            padding: '4px 11px',
            borderRadius: '20px',
            background: currentUser
              ? currentUser.provider === 'google'
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)'
                : 'rgba(56, 189, 248, 0.15)'
              : 'rgba(255, 255, 255, 0.08)',
            border: `1.5px solid ${
              currentUser
                ? currentUser.provider === 'google'
                  ? '#10b981'
                  : '#38bdf8'
                : 'rgba(255, 255, 255, 0.2)'
            }`,
            color: currentUser ? '#f8fafc' : 'var(--mut)',
            fontSize: '11.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: currentUser?.provider === 'google' ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none',
          }}
          title={
            currentUser
              ? `Tài khoản đã đăng nhập: ${currentUser.name} (${currentUser.email})`
              : 'Đăng nhập tài khoản / Google Drive'
          }
        >
          <span>{currentUser ? (currentUser.provider === 'google' ? '☁️' : '👤') : '🔑'}</span>
          <span style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser ? currentUser.name : 'Đăng nhập'}
          </span>
          {currentUser && <span style={{ fontSize: '9px', color: '#10b981' }}>●</span>}
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

      <YouTubeMusicPlayer
        isOpen={ytOpen}
        onClose={() => setYtOpen(false)}
        isPlaying={ytPlaying}
        onTogglePlay={(p) => setYtPlaying(p)}
      />
    </div>
  );
};
