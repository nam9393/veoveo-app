import React, { useRef } from 'react';
import { Vehicle } from '../types';
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
}

export const Header: React.FC<HeaderProps> = ({
  vehicles,
  currentVehicleId,
  onSelectVehicle,
  period,
  onSelectPeriod,
  syncStatus,
  soundEnabled,
  onToggleSound,
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
      <div>
        <h1>🚗 Veo App - Lái mượt, Quản lý chuẩn</h1>
        {syncStatus && (
          <small id="sync" className="empty" role="status" style={{ display: 'block' }}>
            {syncStatus}
          </small>
        )}
      </div>
      <div className="row">
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
          title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
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
