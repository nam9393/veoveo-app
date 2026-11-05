import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, BackgroundConfig, Entry, Part, Vehicle, UserAccount } from './types';
import { calculateMedals, curOdoOf } from './utils/calc';
import {
  connectGoogleDrive,
  initGoogleSync,
  scheduleDrivePush,
} from './utils/sync';
import { playWarpSound } from './utils/sound';
import { Header } from './components/Header';
import { VehicleForm } from './components/VehicleForm';
import { Dashboard } from './components/Dashboard';
import { EntryForm } from './components/EntryForm';
import { HistoryList } from './components/HistoryList';
import { PartsManager } from './components/PartsManager';
import { ChartSection } from './components/ChartSection';
import { MedalsSection } from './components/MedalsSection';
import { BackgroundCustomizer } from './components/BackgroundCustomizer';
import { DataManager } from './components/DataManager';
import { AstroCopilot } from './components/AstroCopilot';
import { AuthModal } from './components/AuthModal';
import { PRESET_BACKGROUNDS, COCKPIT_THEMES } from './constants';
import { ParsedCommand } from './utils/voiceParser';
import { startLofiMusic, toggleLofiMusic, isLofiPlaying } from './utils/lofiAudio';
import { checkAndNotifyMaintenance } from './services/notificationService';

// First-time users start with clean slate (no forced default Toyota Vios)
const defaultAppState: AppState = {
  vehicles: [],
  entries: [],
  parts: [],
  cur: null,
  tomb: {},
};

export function App() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const r = localStorage.getItem('soxe_v1');
      if (r) {
        const p = JSON.parse(r);
        if (p && Array.isArray(p.vehicles) && Array.isArray(p.entries)) {
          return {
            vehicles: p.vehicles,
            entries: p.entries,
            parts: p.parts || [],
            cur: p.cur || (p.vehicles[0] ? p.vehicles[0].id : null),
            tomb: p.tomb || {},
          };
        }
      }
    } catch {}
    return defaultAppState;
  });

  // User Account & Authentication with Google / Local Login & Remember Me
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('veo_user_account') || sessionStorage.getItem('veo_user_account');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // On first launch if user is not logged in, prompt AuthModal
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('veo_user_account');
      if (!saved) return true;
    } catch {}
    return false;
  });

  const [period, setPeriod] = useState<string>('month');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('soxe_snd') !== '0';
    } catch {
      return true;
    }
  });

  // Lofi Chill Instrumental Music state
  const [lofiActive, setLofiActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('veo_lofi_enabled') === '1';
    } catch {
      return false;
    }
  });

  // Start relaxing Lo-Fi chill instrumental background music on first user interaction
  useEffect(() => {
    const handleFirstGesture = () => {
      try {
        const pref = localStorage.getItem('veo_lofi_enabled');
        if (pref !== '0') {
          const started = startLofiMusic();
          if (started) setLofiActive(true);
        }
      } catch {}
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const handleToggleLofi = () => {
    const next = toggleLofiMusic();
    setLofiActive(next);
  };

  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(() => {
    const def: BackgroundConfig = { mode: 'preset', id: 'luxury-cabin', data: '', op: 45, theme: 'bronze' };
    try {
      const b0 = JSON.parse(localStorage.getItem('soxe_bg') || 'null');
      if (b0 && b0.mode) {
        if (b0.mode === 'preset' && !PRESET_BACKGROUNDS.some((x) => x.id === b0.id)) {
          b0.id = 'luxury-cabin';
        }
        if (!b0.theme) {
          const match = PRESET_BACKGROUNDS.find((x) => x.id === b0.id);
          b0.theme = match?.theme || 'bronze';
        }
        return { ...def, ...b0 };
      }
    } catch {}
    return def;
  });

  const [syncStatus, setSyncStatus] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [appliedCommand, setAppliedCommand] = useState<ParsedCommand | null>(null);

  // Cockpit Navigation Deck Tab
  const [activeNav, setActiveNav] = useState<
    'dashboard' | 'entry' | 'history' | 'parts' | 'charts' | 'medals' | 'system'
  >('dashboard');

  // Vehicle form modal state
  const [vehicleModalOpen, setVehicleModalOpen] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Computed background image url
  const bgImageUrl = useMemo(() => {
    if (bgConfig.mode === 'none') return 'none';
    if (bgConfig.mode === 'img' && bgConfig.data) {
      return `url("${bgConfig.data}")`;
    }
    const p = PRESET_BACKGROUNDS.find((x) => x.id === bgConfig.id) || PRESET_BACKGROUNDS[0];
    if (p) {
      return `url("data:image/svg+xml,${encodeURIComponent(p.svg)}")`;
    }
    return 'none';
  }, [bgConfig]);

  // Apply background & theme colors
  useEffect(() => {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--bgimg', bgImageUrl);
    rootStyle.setProperty('--bgop', bgConfig.mode === 'none' ? '0' : String(bgConfig.op / 100));

    // Dynamic Theme selection
    const preset = PRESET_BACKGROUNDS.find((x) => x.id === bgConfig.id);
    const themeKey = bgConfig.theme || (preset?.theme as string) || 'amber';
    const th = COCKPIT_THEMES[themeKey] || COCKPIT_THEMES['amber'];

    rootStyle.setProperty('--acc', th.acc);
    rootStyle.setProperty('--accT', th.accText);
    rootStyle.setProperty('--line', th.cardBorder);
    rootStyle.setProperty('--card-glow', th.glow);
    rootStyle.setProperty('--acc-glow', th.glow);
    rootStyle.setProperty('--card', th.cardBg);

    try {
      localStorage.setItem('soxe_bg', JSON.stringify(bgConfig));
    } catch {}
  }, [bgConfig, bgImageUrl]);

  // Persist state & schedule Google Drive auto-sync
  const updateStateAndPersist = (updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem('soxe_v1', JSON.stringify(next));
      } catch {}
      scheduleDrivePush(
        setSyncStatus,
        (remoteUpdater) => updateStateAndPersist(remoteUpdater),
        () => next
      );
      return next;
    });
  };

  // Setup Google Drive sync listener
  useEffect(() => {
    initGoogleSync(
      setSyncStatus,
      (remoteUpdater) => updateStateAndPersist(remoteUpdater),
      () => stateRef.current
    );
  }, []);

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    try {
      localStorage.setItem('soxe_snd', nextVal ? '1' : '0');
    } catch {}
  };

  const handleNavSwitch = (tab: typeof activeNav) => {
    playWarpSound(soundEnabled);
    setActiveNav(tab);
  };

  const currentVehicle = state.vehicles.find((v) => v.id === state.cur) || null;
  const currentOdo = currentVehicle ? curOdoOf(currentVehicle.id, state.vehicles, state.entries) : 0;

  // Automated Day / Night Theme Switcher based on real-time hour (06:00 - 18:00 Day vs 18:00 - 06:00 Night)
  useEffect(() => {
    if (bgConfig.autoDayNight === false) return;

    const checkAndApplyDayNight = () => {
      const h = new Date().getHours();
      const isNight = h < 6 || h >= 18;
      const targetPreset = isNight ? 'luxury-cabin' : 'highway-drive';
      const targetTheme = isNight ? 'amber' : 'titanium';

      if (bgConfig.id !== targetPreset || bgConfig.theme !== targetTheme) {
        setBgConfig((prev) => {
          if (prev.autoDayNight === false) return prev;
          return {
            ...prev,
            mode: 'preset',
            id: targetPreset,
            theme: targetTheme,
          };
        });
      }
    };

    checkAndApplyDayNight();
    const interval = setInterval(checkAndApplyDayNight, 60000);
    return () => clearInterval(interval);
  }, [bgConfig.autoDayNight, bgConfig.id, bgConfig.theme]);

  // Automated Maintenance & Part Overdue Push Notification check
  useEffect(() => {
    if (!currentVehicle) return;
    const vehicleParts = state.parts.filter((p) => p.v === currentVehicle.id);
    for (const part of vehicleParts) {
      if (!part.km) continue;
      const dueKm = (part.odo || 0) + part.km;
      const isOverdue = currentOdo >= dueKm;
      const isNear = dueKm - currentOdo <= 300;
      if (isOverdue || isNear) {
        checkAndNotifyMaintenance(
          {
            name: part.name,
            dueKm,
            currentKm: currentOdo,
            isOverdue,
          },
          currentVehicle.name
        );
        break;
      }
    }
  }, [currentOdo, currentVehicle, state.parts]);

  // Ensure current vehicle is valid
  useEffect(() => {
    if (state.vehicles.length > 0 && !currentVehicle) {
      updateStateAndPersist((prev) => ({
        ...prev,
        cur: prev.vehicles[0].id,
      }));
    }
  }, [state.vehicles, currentVehicle]);

  // Medals calculation
  const medals = useMemo(() => {
    return calculateMedals(state, bgConfig.mode);
  }, [state, bgConfig.mode]);

  // Vehicle actions
  const handleSelectVehicle = (id: string) => {
    playWarpSound(soundEnabled);
    updateStateAndPersist((prev) => ({
      ...prev,
      cur: id,
    }));
  };

  const handleSaveVehicle = (vehicle: Vehicle) => {
    updateStateAndPersist((prev) => {
      const idx = prev.vehicles.findIndex((v) => v.id === vehicle.id);
      let vehicles = [...prev.vehicles];
      if (idx >= 0) {
        vehicles[idx] = vehicle;
      } else {
        vehicles.push(vehicle);
      }
      return {
        ...prev,
        vehicles,
        cur: vehicle.id,
      };
    });
    setVehicleModalOpen(false);
    setEditingVehicle(null);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    updateStateAndPersist((prev) => {
      const nextVehicles = prev.vehicles.filter((v) => v.id !== vehicleId);
      const nextEntries = prev.entries.filter((e) => e.v !== vehicleId);
      const nextParts = prev.parts.filter((p) => p.v !== vehicleId);
      const tomb = { ...prev.tomb, [vehicleId]: Date.now() };

      prev.entries
        .filter((e) => e.v === vehicleId)
        .forEach((e) => {
          tomb[e.id] = Date.now();
        });

      prev.parts
        .filter((p) => p.v === vehicleId)
        .forEach((p) => {
          tomb[p.id] = Date.now();
        });

      return {
        vehicles: nextVehicles,
        entries: nextEntries,
        parts: nextParts,
        cur: nextVehicles[0] ? nextVehicles[0].id : null,
        tomb,
      };
    });
  };

  // Entry actions
  const handleSaveEntry = (entry: Entry, isEdit: boolean) => {
    updateStateAndPersist((prev) => {
      const idx = prev.entries.findIndex((e) => e.id === entry.id);
      let entries = [...prev.entries];
      if (idx >= 0) {
        entries[idx] = entry;
      } else {
        entries.push(entry);
      }

      return {
        ...prev,
        entries,
      };
    });

    setEditingEntry(null);
    setAppliedCommand(null);
    setActiveNav('dashboard');
  };

  const handleDeleteEntry = (entryId: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      entries: prev.entries.filter((e) => e.id !== entryId),
      tomb: { ...prev.tomb, [entryId]: Date.now() },
    }));
  };

  // Part actions
  const handleSavePart = (part: Part) => {
    updateStateAndPersist((prev) => {
      const idx = prev.parts.findIndex((p) => p.id === part.id);
      let parts = [...prev.parts];
      if (idx >= 0) {
        parts[idx] = part;
      } else {
        parts.push(part);
      }
      return {
        ...prev,
        parts,
      };
    });
  };

  const handleDeletePart = (partId: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      parts: prev.parts.filter((p) => p.id !== partId),
      tomb: { ...prev.tomb, [partId]: Date.now() },
    }));
  };

  const handleReplacePart = (partId: string) => {
    if (!currentVehicle) return;
    updateStateAndPersist((prev) => ({
      ...prev,
      parts: prev.parts.map((p) => {
        if (p.id === partId) {
          return {
            ...p,
            date: new Date().toISOString().slice(0, 10),
            pct: 100,
            u: Date.now(),
          };
        }
        return p;
      }),
    }));
  };

  // Merge external backup
  const handleMergeBackup = (parsed: any) => {
    if (!parsed || !Array.isArray(parsed.vehicles) || !Array.isArray(parsed.entries)) {
      throw new Error('Invalid format');
    }

    updateStateAndPersist((prev) => {
      const vi = new Set(prev.vehicles.map((v) => v.id));
      const ei = new Set(prev.entries.map((e) => e.id));
      const tomb = { ...prev.tomb };
      const newVehicles = [...prev.vehicles];
      const newEntries = [...prev.entries];
      const newParts = [...prev.parts];

      parsed.vehicles.forEach((v: Vehicle) => {
        if (v && v.id && typeof v.name === 'string' && !vi.has(v.id)) {
          v.u = Date.now();
          delete tomb[v.id];
          newVehicles.push(v);
          vi.add(v.id);
        }
      });

      parsed.entries.forEach((e: Entry) => {
        if (
          e &&
          e.id &&
          e.v &&
          typeof e.date === 'string' &&
          typeof e.amount === 'number' &&
          !ei.has(e.id) &&
          newVehicles.some((v) => v.id === e.v)
        ) {
          e.u = Date.now();
          delete tomb[e.id];
          newEntries.push(e);
          ei.add(e.id);
        }
      });

      (parsed.parts || []).forEach((x: Part) => {
        if (
          x &&
          x.id &&
          x.v &&
          typeof x.name === 'string' &&
          !newParts.some((y) => y.id === x.id) &&
          newVehicles.some((v) => v.id === x.v)
        ) {
          x.u = Date.now();
          delete tomb[x.id];
          newParts.push(x);
        }
      });

      let cur = prev.cur;
      if (!cur && newVehicles[0]) cur = newVehicles[0].id;

      return {
        vehicles: newVehicles,
        entries: newEntries,
        parts: newParts,
        cur,
        tomb,
      };
    });
  };

  // Handle command applied from AstroCopilot
  const handleApplyVoiceOrAICommand = (cmd: ParsedCommand) => {
    setAppliedCommand(cmd);
    setActiveNav('entry');
  };

  // Strict Privacy & Authentication Lock:
  // When logged out or not yet authenticated, lock the cockpit and only display login/register UI
  if (!currentUser) {
    return (
      <>
        <div
          id="cockpit-bg-layer"
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            backgroundImage: bgImageUrl,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            opacity: bgConfig.mode === 'none' ? 0 : bgConfig.op / 100,
            pointerEvents: 'none',
            transition: 'opacity 0.4s ease, background-image 0.4s ease',
          }}
        />
        <div className="bg-canvas" aria-hidden="true" />
        <AuthModal
          isOpen={true}
          isLocked={true}
          onClose={() => {}}
          currentUser={null}
          onUserChange={(usr) => {
            setCurrentUser(usr);
            setAuthModalOpen(false);
          }}
          appState={state}
          onRestoreState={(newState) => updateStateAndPersist(() => newState)}
          syncStatus={syncStatus}
          onUpdateSyncStatus={setSyncStatus}
        />
      </>
    );
  }

  return (
    <>
      <div
        id="cockpit-bg-layer"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: bgImageUrl,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          opacity: bgConfig.mode === 'none' ? 0 : bgConfig.op / 100,
          pointerEvents: 'none',
          transition: 'opacity 0.4s ease, background-image 0.4s ease',
        }}
      />
      <div className="bg-canvas" aria-hidden="true" />
      <main id="app">
        <Header
          vehicles={state.vehicles}
          currentVehicleId={state.cur}
          onSelectVehicle={handleSelectVehicle}
          period={period}
          onSelectPeriod={setPeriod}
          syncStatus={syncStatus}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          currentUser={currentUser}
          onOpenAuth={() => setAuthModalOpen(true)}
          lofiPlaying={lofiActive}
          onToggleLofi={handleToggleLofi}
        />

        {/* Empty Garage Onboarding for First Time Users */}
        {state.vehicles.length === 0 && (
          <div
            className="card"
            style={{
              padding: '24px 20px',
              textAlign: 'center',
              marginTop: '16px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
              border: '1.5px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ fontSize: '42px', marginBottom: '10px' }}>🚘</div>
            <h2 style={{ fontSize: '18px', color: '#f8fafc', justifyContent: 'center', marginBottom: '8px' }}>
              Chào mừng bạn đến với Veo Sổ Xe Thông Minh!
            </h2>
            <p style={{ color: 'var(--mut)', fontSize: '13px', maxWidth: '520px', margin: '0 auto 18px', lineHeight: 1.6 }}>
              Bắt đầu theo dõi nhật ký phương tiện của bạn: kiểm soát tiêu thụ xăng chuẩn xác theo GPS, theo dõi áp suất lốp theo khuyến nghị hãng, quản lý phụ tùng bảo dưỡng và hỏi đáp trợ lý AI Em Vy.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setEditingVehicle(null);
                  setVehicleModalOpen(true);
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                }}
              >
                + Thêm chiếc xe đầu tiên của bạn
              </button>

              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                style={{
                  padding: '12px 18px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#f8fafc',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                ☁️ Đăng nhập tài khoản / Tải từ Google Drive
              </button>
            </div>
          </div>
        )}

        {/* Astro Copilot AI & Voice Radar Bar */}
        {state.vehicles.length > 0 && (
          <AstroCopilot
            currentVehicle={currentVehicle}
            currentOdo={currentOdo}
            soundEnabled={soundEnabled}
            onApplyCommand={handleApplyVoiceOrAICommand}
          />
        )}

        {/* Cockpit HUD Navigation Deck */}
        {state.vehicles.length > 0 && (
          <div className="hud-nav">
            <button
              type="button"
              className={`hud-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavSwitch('dashboard')}
            >
              🚗 Tổng Quan
            </button>
            <button
              type="button"
              className={`hud-nav-item ${activeNav === 'entry' ? 'active' : ''}`}
              onClick={() => handleNavSwitch('entry')}
            >
              ⚡ Ghi Nhận
            </button>
            <button
              type="button"
              className={`hud-nav-item ${activeNav === 'history' ? 'active' : ''}`}
              onClick={() => handleNavSwitch('history')}
            >
              📜 Nhật Ký
            </button>
            <button
              type="button"
              className={`hud-nav-item ${activeNav === 'parts' ? 'active' : ''}`}
              onClick={() => handleNavSwitch('parts')}
            >
              🔧 Linh Kiện
            </button>
            <button
              type="button"
              className={`hud-nav-item ${activeNav === 'charts' ? 'active' : ''}`}
              onClick={() => handleNavSwitch('charts')}
            >
              📊 Biểu Đồ
            </button>
            <button
              type="button"
              className={`hud-nav-item ${activeNav === 'medals' ? 'active' : ''}`}
              onClick={() => handleNavSwitch('medals')}
            >
              🏅 Danh Hiệu
            </button>
            <button
              type="button"
              className={`hud-nav-item ${activeNav === 'system' ? 'active' : ''}`}
              onClick={() => handleNavSwitch('system')}
            >
              ⚙️ Cài Đặt
            </button>
          </div>
        )}

        <VehicleForm
          vehicleToEdit={editingVehicle}
          isOpen={vehicleModalOpen}
          canCancel={state.vehicles.length > 0}
          onSave={handleSaveVehicle}
          onCancel={() => {
            setVehicleModalOpen(false);
            setEditingVehicle(null);
          }}
        />

        {/* Auth & Google Drive Modal */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          currentUser={currentUser}
          onUserChange={(usr) => setCurrentUser(usr)}
          appState={state}
          onRestoreState={(newState) => updateStateAndPersist(() => newState)}
          syncStatus={syncStatus}
          onUpdateSyncStatus={setSyncStatus}
        />

        {state.vehicles.length > 0 && (
          <>
            {/* Active Navigation Deck Modules */}
            {activeNav === 'dashboard' && (
              <Dashboard
                currentVehicle={currentVehicle}
                vehicles={state.vehicles}
                entries={state.entries}
                parts={state.parts}
                period={period}
                medals={medals}
                soundEnabled={soundEnabled}
                onNavigateTab={(tabKey) => handleNavSwitch(tabKey as any)}
              />
            )}

            {activeNav === 'entry' && (
              <EntryForm
                currentVehicle={currentVehicle}
                vehicles={state.vehicles}
                entries={state.entries}
                parts={state.parts}
                editingEntry={editingEntry}
                appliedCommand={appliedCommand}
                soundEnabled={soundEnabled}
                onSaveEntry={handleSaveEntry}
                onCancelEdit={() => setEditingEntry(null)}
                onSavePart={handleSavePart}
                onDeletePart={handleDeletePart}
                onReplacePart={handleReplacePart}
              />
            )}

            {activeNav === 'history' && (
              <HistoryList
                currentVehicle={currentVehicle}
                vehicles={state.vehicles}
                entries={state.entries}
                soundEnabled={soundEnabled}
                onEditEntry={(entry) => {
                  setEditingEntry(entry);
                  setActiveNav('entry');
                }}
                onDeleteEntry={handleDeleteEntry}
              />
            )}

            {activeNav === 'parts' && currentVehicle && (
              <div className="card">
                <h2>🔧 Quản lý linh kiện và hạn định kỳ ({currentVehicle.name})</h2>
                <PartsManager
                  vehicleId={currentVehicle.id}
                  curOdo={currentOdo}
                  parts={state.parts}
                  entries={state.entries}
                  onSavePart={handleSavePart}
                  onDeletePart={handleDeletePart}
                  onReplacePart={handleReplacePart}
                />
              </div>
            )}

            {activeNav === 'charts' && currentVehicle && (
              <ChartSection
                entries={state.entries}
                vehicleId={currentVehicle.id}
                soundEnabled={soundEnabled}
              />
            )}

            {activeNav === 'medals' && (
              <MedalsSection medals={medals} hasVehicle={!!currentVehicle} />
            )}

            {activeNav === 'system' && (
              <>
                <BackgroundCustomizer
                  bgConfig={bgConfig}
                  onChangeBg={(newConfig) => setBgConfig(newConfig)}
                />

                <DataManager
                  state={state}
                  currentVehicle={currentVehicle}
                  onAddVehicle={() => {
                    setEditingVehicle(null);
                    setVehicleModalOpen(true);
                  }}
                  onEditVehicle={() => {
                    if (currentVehicle) {
                      setEditingVehicle(currentVehicle);
                      setVehicleModalOpen(true);
                    }
                  }}
                  onDeleteVehicle={() => {
                    if (currentVehicle) {
                      handleDeleteVehicle(currentVehicle.id);
                    }
                  }}
                  onMergeState={handleMergeBackup}
                  onConnectDrive={() =>
                    connectGoogleDrive(
                      setSyncStatus,
                      (remoteUpdater) => updateStateAndPersist(remoteUpdater),
                      () => stateRef.current
                    )
                  }
                />
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}

export default App;
