import React, { useRef, useState, useEffect } from 'react';
import { Vehicle, UserAccount } from '../types';
import { triggerSkidEffect } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';
import { ZipDownloadModal } from './ZipDownloadModal';
import {
  getCurrentTrack,
  LUXURY_TRACKS,
  switchTrack,
  subscribeTrackChange,
  MusicTrack,
} from '../utils/lofiAudio';
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
  const [activeTrack, setActiveTrack] = useState<MusicTrack>(getCurrentTrack());
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() => getNotificationStatus().permission);

  useEffect(() => {
    return subscribeTrackChange((t) => setActiveTrack(t));
  }, []);

  const handleSoundClick = () => {
    onToggleSound();
    if (!soundEnabled) {
      triggerSkidEffect(soundBtnRef.current, true);
    }
  };

  const handleTrackSelect = (trackId: string) => {
    switchTrack(trackId);
    setShowTrackMenu(false);
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
      <style>{`
        @keyframes kennyPulseGlow {
          0% { box-shadow: 0 0 6px rgba(245, 158, 11, 0.35); }
          50% { box-shadow: 0 0 16px rgba(245, 158, 11, 0.85); }
          100% { box-shadow: 0 0 6px rgba(245, 158, 11, 0.35); }
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
        {/* Kenny G Luxury Saxophone & Lo-Fi Music Player */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: '20px',
              background: lofiPlaying
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(180, 83, 9, 0.35) 100%)'
                : 'rgba(255, 255, 255, 0.08)',
              border: `1.5px solid ${lofiPlaying ? '#f59e0b' : 'rgba(255, 255, 255, 0.18)'}`,
              padding: '2px 4px 2px 8px',
              gap: '4px',
              animation: lofiPlaying ? 'kennyPulseGlow 2.5s infinite ease-in-out' : undefined,
            }}
          >
            <button
              type="button"
              onClick={onToggleLofi}
              style={{
                background: 'transparent',
                border: 'none',
                color: lofiPlaying ? '#fbbf24' : 'var(--mut)',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                padding: '3px 4px',
              }}
              title={lofiPlaying ? 'Đang phát Kenny G (Bấm để tạm dừng)' : 'Bật nhạc Kenny G sang trọng'}
            >
              <span>{lofiPlaying ? '🎷' : '🎵'}</span>
              <span style={{ maxWidth: '130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeTrack.title}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowTrackMenu((p) => !p)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f8fafc',
                fontSize: '10px',
                cursor: 'pointer',
              }}
              title="Chọn bài nhạc Kenny G / Lo-Fi"
            >
              ▾
            </button>
          </div>

          {/* Track selection popup */}
          {showTrackMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '6px',
                background: 'rgba(15, 23, 42, 0.98)',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '12px',
                padding: '6px',
                zIndex: 1000,
                minWidth: '220px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(245, 158, 11, 0.2)',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', padding: '4px 8px' }}>
                🎷 Album Kenny G Sang Trọng
              </div>
              {LUXURY_TRACKS.map((t) => {
                const isCur = activeTrack.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTrackSelect(t.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 8px',
                      borderRadius: '8px',
                      background: isCur ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: isCur ? '#fbbf24' : '#e2e8f0',
                      fontSize: '12px',
                    }}
                  >
                    <span>{t.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isCur ? 700 : 500 }}>{t.title}</div>
                      <div style={{ fontSize: '10px', color: 'var(--mut)' }}>{t.artist.split(' (')[0]}</div>
                    </div>
                    {isCur && <span style={{ fontSize: '10px', color: '#10b981' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
    </div>
  );
};
