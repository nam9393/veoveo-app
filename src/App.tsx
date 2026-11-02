import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, BackgroundConfig, Entry, Part, Vehicle } from './types';
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
import { PRESET_BACKGROUNDS, COCKPIT_THEMES } from './constants';
import { ParsedCommand } from './utils/voiceParser';

const starterVehicle: Vehicle = {
  id: 'veh-demo-1',
  name: 'Toyota Vios 1.5G',
  brand: 'Toyota',
  category: 'car',
  plate: '30K-888.68',
  tank: 42,
  cons: 5.8,
  odo: 12500,
  u: 1,
  currentTirePressures: {
    front: 2.2,
    rear: 2.2,
    fl: 2.2,
    fr: 2.2,
    rl: 2.2,
    rr: 2.2,
  },
};

const starterEntries: Entry[] = [
  {
    id: 'ent-demo-1',
    v: 'veh-demo-1',
    date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    type: 'fuel',
    odo: 12450,
    amount: 850000,
    liters: 36,
    price: 23610,
    full: true,
    ft: 'ron95',
    note: 'Đổ đầy xăng RON95 tại cây Petrolimex',
    u: 1,
  },
  {
    id: 'ent-demo-2',
    v: 'veh-demo-1',
    date: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10),
    type: 'service',
    odo: 10000,
    amount: 680000,
    part: 'Nhớt máy',
    note: 'Thay nhớt máy và kiểm tra định kỳ 10.000km',
    u: 2,
  },
];

const defaultAppState: AppState = {
  vehicles: [starterVehicle],
  entries: starterEntries,
  parts: [
    {
      id: 'part-demo-1',
      v: 'veh-demo-1',
      name: 'Nhớt máy',
      km: 5000,
      mo: 6,
      odo: 10000,
      date: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10),
      pct: 50,
      u: 1,
    },
    {
      id: 'part-demo-2',
      v: 'veh-demo-1',
      name: 'Lọc gió động cơ',
      km: 10000,
      mo: 12,
      odo: 10000,
      date: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10),
      pct: 75,
      u: 2,
    },
  ],
  cur: 'veh-demo-1',
  tomb: {},
};

export function App() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const r = localStorage.getItem('soxe_v1');
      if (r) {
        const p = JSON.parse(r);
        if (p && Array.isArray(p.vehicles) && Array.isArray(p.entries)) {
          // If user deleted the demo vehicle, respect tomb
          const tomb = p.tomb || {};
          if (p.vehicles.length === 0 && !tomb['veh-demo-1']) {
            return defaultAppState;
          }
          return {
            vehicles: p.vehicles,
            entries: p.entries,
            parts: p.parts || [],
            cur: p.cur || (p.vehicles[0] ? p.vehicles[0].id : null),
            tomb,
          };
        }
      }
    } catch {}
    return defaultAppState;
  });

  const [period, setPeriod] = useState<string>('month');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('soxe_snd') !== '0';
    } catch {
      return true;
    }
  });

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

  // Persist state & schedule Drive sync
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

  // Ensure current vehicle is valid
  useEffect(() => {
    if (state.vehicles.length > 0 && !currentVehicle) {
      updateStateAndPersist((prev) => ({
        ...prev,
        cur: prev.vehicles[0].id,
      }));
    }
  }, [state.vehicles.length, currentVehicle]);

  // Vehicle actions
  const handleSaveVehicle = (veh: Vehicle, isEdit: boolean) => {
    updateStateAndPersist((prev) => {
      let vehicles = [...prev.vehicles];
      if (isEdit) {
        vehicles = vehicles.map((v) => (v.id === veh.id ? veh : v));
      } else {
        vehicles.push(veh);
      }
      return {
        ...prev,
        vehicles,
        cur: veh.id,
      };
    });
    setVehicleModalOpen(false);
    setEditingVehicle(null);
  };

  const handleDeleteVehicle = () => {
    if (!currentVehicle) return;
    const delId = currentVehicle.id;
    const tt = Date.now();

    updateStateAndPersist((prev) => {
      const tomb = { ...prev.tomb, [delId]: tt };
      const parts = prev.parts.filter((p) => {
        if (p.v === delId) {
          tomb[p.id] = tt;
          return false;
        }
        return true;
      });
      const entries = prev.entries.filter((e) => {
        if (e.v === delId) {
          tomb[e.id] = tt;
          return false;
        }
        return true;
      });
      const vehicles = prev.vehicles.filter((v) => v.id !== delId);
      const cur = vehicles[0] ? vehicles[0].id : null;

      return {
        ...prev,
        vehicles,
        entries,
        parts,
        cur,
        tomb,
      };
    });
  };

  // Entry actions
  const handleSaveEntry = (entry: Entry, isEdit: boolean) => {
    updateStateAndPersist((prev) => {
      let entries = [...prev.entries];
      if (isEdit) {
        entries = entries.map((e) => (e.id === entry.id ? entry : e));
      } else {
        entries.push(entry);
      }

      // Update vehicle odo if entry odo is higher
      const vehicles = prev.vehicles.map((v) => {
        if (v.id === entry.v && entry.odo > (v.odo || 0)) {
          return { ...v, odo: entry.odo, u: Date.now() };
        }
        return v;
      });

      // Update part if service entry links to part
      let parts = [...prev.parts];
      if (entry.part) {
        parts = parts.map((p) => {
          if (p.id === entry.part) {
            return {
              ...p,
              odo: entry.odo || p.odo,
              date: entry.date,
              pct: 100,
              u: Date.now(),
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        vehicles,
        entries,
        parts,
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

  const medals = calculateMedals(state, bgConfig.mode);

  return (
    <>
      {/* Real-time Dynamic Cockpit Background Layer */}
      <div
        id="app-wallpaper-layer"
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none transition-all duration-500 ease-out"
        style={{
          zIndex: 0,
          backgroundImage: bgImageUrl,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          opacity: bgConfig.mode === 'none' ? 0 : Math.max(0.12, bgConfig.op / 100),
        }}
      />
      {/* Eye-friendly Ambient Cockpit Vignette */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(6, 11, 24, 0.1) 20%, rgba(4, 7, 15, 0.76) 100%)',
        }}
      />

      <main style={{ position: 'relative', zIndex: 1 }}>
        <Header
        vehicles={state.vehicles}
        currentVehicleId={state.cur}
        onSelectVehicle={(id) => updateStateAndPersist((prev) => ({ ...prev, cur: id }))}
        period={period}
        onSelectPeriod={setPeriod}
        syncStatus={syncStatus}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

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
        isOpen={vehicleModalOpen || state.vehicles.length === 0}
        canCancel={state.vehicles.length > 0}
        onSave={handleSaveVehicle}
        onCancel={() => {
          setVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
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
              <PartsManager
                vehicleId={currentVehicle.id}
                parts={state.parts}
                curOdo={currentOdo}
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
                onDeleteVehicle={handleDeleteVehicle}
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
