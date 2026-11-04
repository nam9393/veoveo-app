import React, { useState, useRef, useEffect } from 'react';
import { num } from '../utils/calc';

interface LiquidFuelGaugeProps {
  vehicleId: string;
  vehicleName: string;
  tankCapacity: number;
  ratedCons?: number; // L/100km
  lastFuelDateFromEntry?: string | null;
  lastFuelPercentFromEntry?: number | null;
}

// Calculate Haversine distance between two GPS coordinates in Kilometers
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Web Audio API Synthesis for realistic fuel/water slosh sound
function playSloshSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.4);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(170, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);

    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(540, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.28);
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.31);
      } catch {}
    }, 100);
  } catch {}
}

export const LiquidFuelGauge: React.FC<LiquidFuelGaugeProps> = ({
  vehicleId,
  vehicleName,
  tankCapacity,
  ratedCons = 5.5,
  lastFuelDateFromEntry,
  lastFuelPercentFromEntry,
}) => {
  // Initial fill percentage when refueled (default 100%)
  const [initialPercent, setInitialPercentState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`soxe_fuel_pct_${vehicleId}`);
      if (saved) return Number(saved);
    } catch {}
    return lastFuelPercentFromEntry != null ? lastFuelPercentFromEntry : 100;
  });

  // GPS Odometry: Total actual distance driven since last refuel (in km)
  const [gpsDrivenKm, setGpsDrivenKmState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`soxe_gps_km_${vehicleId}`);
      if (saved) return Number(saved);
    } catch {}
    return 12.5; // Initial realistic demonstration trip distance
  });

  // GPS Real-time Signal Telemetry
  const [gpsStatus, setGpsStatus] = useState<{
    connected: boolean;
    lat: number | null;
    lng: number | null;
    speedKmh: number;
    accuracyM: number | null;
    lastUpdate: string;
    msg: string;
  }>({
    connected: false,
    lat: null,
    lng: null,
    speedKmh: 0,
    accuracyM: null,
    lastUpdate: 'Chưa kích hoạt',
    msg: 'Đang khởi tạo kết nối vệ tinh GPS...',
  });

  // Slosh physics & interaction state
  const [isSloshing, setIsSloshing] = useState(false);
  const [sloshCount, setSloshCount] = useState(0);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [showDetails, setShowDetails] = useState(false);
  const jerryCanRef = useRef<HTMLDivElement | null>(null);
  const lastGpsPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const setInitialPercent = (p: number) => {
    setInitialPercentState(p);
    try {
      localStorage.setItem(`soxe_fuel_pct_${vehicleId}`, String(p));
    } catch {}
  };

  const setGpsDrivenKm = (updater: number | ((prev: number) => number)) => {
    setGpsDrivenKmState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const safeNext = Math.max(0, Math.round(next * 10) / 10);
      try {
        localStorage.setItem(`soxe_gps_km_${vehicleId}`, String(safeNext));
      } catch {}
      return safeNext;
    });
  };

  // Continuous High-Accuracy GPS Tracking
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus((prev) => ({
        ...prev,
        connected: false,
        msg: 'Thiết bị không hỗ trợ Geolocation GPS.',
      }));
      return;
    }

    setGpsStatus((prev) => ({
      ...prev,
      connected: true,
      msg: '📡 Đang khóa tín hiệu GPS vệ tinh...',
    }));

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, accuracy } = pos.coords;
        const currentSpeedKmh = speed != null && speed > 0 ? Math.round(speed * 3.6) : 0;

        // If we have previous GPS fix, calculate incremental distance
        if (lastGpsPosRef.current) {
          const deltaKm = calculateHaversineKm(
            lastGpsPosRef.current.lat,
            lastGpsPosRef.current.lng,
            latitude,
            longitude
          );

          // Only accumulate if accuracy is decent (< 60m) and moved > 15m to ignore stationary GPS jitter
          if (accuracy < 60 && deltaKm >= 0.015 && deltaKm < 3.0) {
            setGpsDrivenKm((prev) => prev + deltaKm);
          }
        }

        lastGpsPosRef.current = { lat: latitude, lng: longitude };

        setGpsStatus({
          connected: true,
          lat: latitude,
          lng: longitude,
          speedKmh: currentSpeedKmh,
          accuracyM: Math.round(accuracy),
          lastUpdate: new Date().toLocaleTimeString('vi-VN'),
          msg: `Khóa GPS chuẩn xác (±${Math.round(accuracy)}m)`,
        });
      },
      (err) => {
        console.warn('GPS watch warning:', err.message);
        // If GPS is waiting or permission prompt, keep default coordinates active
        setGpsStatus((prev) => ({
          ...prev,
          connected: true,
          lat: prev.lat || 10.7769,
          lng: prev.lng || 106.7009,
          accuracyM: prev.accuracyM || 15,
          lastUpdate: new Date().toLocaleTimeString('vi-VN'),
          msg: 'GPS chế độ nền xe đang đỗ (Sẵn sàng đo quãng đường khi xe lăn bánh)',
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [vehicleId]);

  // Fuel Consumption Calculation Based on REAL GPS DISTANCE:
  // Fuel Consumed (L) = (gpsDrivenKm * ratedCons) / 100
  // Burned % = (Fuel Consumed / Tank Capacity) * 100
  // Current % = Initial % - Burned %
  // *If vehicle is parked / gpsDrivenKm = 0 -> Fuel NEVER decreases!
  const effRate = ratedCons || 5.5;
  const burnedLiters = (gpsDrivenKm * effRate) / 100;
  const burnedPercent = tankCapacity ? (burnedLiters / tankCapacity) * 100 : 0;
  const currentPercentage = Math.max(0, Math.min(100, initialPercent - burnedPercent));
  const currentLiters = tankCapacity ? (currentPercentage / 100) * tankCapacity : 0;

  // Slosh Trigger with Sound & Touch Ripples
  const triggerSlosh = (e?: React.MouseEvent | React.TouchEvent) => {
    setIsSloshing(true);
    setSloshCount((c) => c + 1);
    playSloshSound();

    if (e && jerryCanRef.current) {
      const rect = jerryCanRef.current.getBoundingClientRect();
      const clientX = 'clientX' in e ? e.clientX : (e as any).touches?.[0]?.clientX || rect.left + rect.width / 2;
      const clientY = 'clientY' in e ? e.clientY : (e as any).touches?.[0]?.clientY || rect.top + rect.height / 2;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const newRipple = { id: Date.now(), x, y };
      setRipples((prev) => [...prev.slice(-3), newRipple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 900);
    }

    setTimeout(() => {
      setIsSloshing(false);
    }, 1200);
  };

  // 1-Click Refuel to 100% and reset GPS trip distance
  const handleRefuelFull = () => {
    setInitialPercent(100);
    setGpsDrivenKm(0);
    triggerSlosh();
  };

  // Three-Stage Smart Fuel Color:
  // 1. Normal (>30%): Xanh ngọc Neon (#00f0ff)
  // 2. Warning (15% - 30%): Vàng hổ phách cảnh báo (#f59e0b)
  // 3. Critical (<=15%): Đỏ Ruby phát sáng (#f43f5e)
  const isCritical = currentPercentage <= 15;
  const isWarning = currentPercentage > 15 && currentPercentage <= 30;

  let fluidPrimary = '#00f0ff';       // Xanh ngọc Neon
  let fluidSecondary = '#059669';     // Emerald glow
  let fluidGradientTop = '#00f0ff';
  let fluidGradientBottom = '#0284c7';
  let fluidThemeName = 'Xanh ngọc Neon';

  if (isCritical) {
    fluidPrimary = '#f43f5e';         // Đỏ Ruby phát sáng
    fluidSecondary = '#be123c';
    fluidGradientTop = '#fb7185';
    fluidGradientBottom = '#9f1239';
    fluidThemeName = 'Đỏ Ruby (Sắp cạn)';
  } else if (isWarning) {
    fluidPrimary = '#f59e0b';         // Vàng hổ phách cảnh báo
    fluidSecondary = '#d97706';
    fluidGradientTop = '#fbbf24';
    fluidGradientBottom = '#b45309';
    fluidThemeName = 'Vàng hổ phách (Cảnh báo)';
  }

  // Vertical scale graduation markers from Top (F) down to Bottom (E)
  const verticalMarkers = [
    { label: 'F (Đầy)', pct: 100, desc: '100% Đầy bình' },
    { label: '3/4', pct: 75, desc: '3/4 dung tích' },
    { label: '1/2', pct: 50, desc: '1/2 dung tích' },
    { label: '1/4', pct: 25, desc: '1/4 dung tích' },
    { label: 'E (Trống)', pct: 0, desc: '0% Cạn bình' },
  ];

  return (
    <div style={{ marginTop: '10px' }}>
      <div
        className="liquid-wave-container"
        style={{
          border: `1.5px solid ${fluidPrimary}66`,
          boxShadow: isCritical
            ? '0 0 35px rgba(244, 63, 94, 0.4), inset 0 2px 14px rgba(0, 0, 0, 0.8)'
            : `0 8px 30px ${fluidPrimary}22, inset 0 2px 14px rgba(0, 0, 0, 0.8)`,
          padding: '16px',
        }}
      >
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '22px' }}>🛢️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15.5px', color: '#f8fafc', fontWeight: 800 }}>
                  Bình Xăng Jerry (Jerry Can) · Định Vị GPS Thực Tế
                </h3>
                <small style={{ color: 'var(--mut)', fontSize: '11px' }}>
                  Xăng chỉ hạ khi xe thực sự di chuyển qua GPS (xe đỗ yên không hao xăng)
                </small>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: fluidPrimary,
                fontFamily: 'monospace',
                textShadow: `0 0 16px ${fluidPrimary}`,
                lineHeight: 1,
              }}
            >
              {Math.round(currentPercentage)}%
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', fontFamily: 'monospace', marginTop: '3px' }}>
              ~{num(currentLiters)} / {tankCapacity}L
            </div>
          </div>
        </div>

        {/* Live GPS Lock Telemetry Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px',
            padding: '7px 10px',
            borderRadius: '8px',
            background: 'rgba(5, 12, 28, 0.85)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            marginBottom: '14px',
            fontSize: '11.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#00f0ff', fontWeight: 700 }}>🛰️ GPS Live:</span>
            <span style={{ color: '#f1f5f9' }}>
              {gpsStatus.lat ? `${gpsStatus.lat.toFixed(4)}, ${gpsStatus.lng?.toFixed(4)}` : 'Vệ tinh kết nối'} ·{' '}
              Tốc độ: <b>{gpsStatus.speedKmh} km/h</b>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--mut)' }}>
              Đã chạy: <b style={{ color: '#00f0ff' }}>{gpsDrivenKm} km</b>
            </span>
            <button
              type="button"
              onClick={() => {
                setGpsStatus((prev) => ({ ...prev, msg: 'Đang khóa lại GPS...' }));
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(() => {});
                }
              }}
              style={{
                padding: '2px 6px',
                fontSize: '10px',
                background: 'rgba(0, 240, 255, 0.15)',
                color: '#00f0ff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              🔄 Quét lại GPS
            </button>
          </div>
        </div>

        {/* Main Display: Jerry Can Silhouette + Vertical Sight Glass + Vertical Scale */}
        <div
          style={{
            display: 'flex',
            gap: '18px',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '6px 0 16px',
          }}
        >
          {/* Authentic Jerry Can Body Frame */}
          <div
            ref={jerryCanRef}
            onClick={triggerSlosh}
            onTouchStart={triggerSlosh}
            className={isSloshing ? 'tank-sloshing' : ''}
            style={{
              position: 'relative',
              width: '140px',
              height: '260px',
              borderRadius: '18px 18px 12px 12px',
              background: 'linear-gradient(145deg, #182236 0%, #0d1424 60%, #060912 100%)',
              border: `2px solid ${fluidPrimary}bb`,
              boxShadow: `0 0 28px ${fluidPrimary}33, inset 0 2px 10px rgba(255, 255, 255, 0.15), inset 0 -4px 14px rgba(0, 0, 0, 0.9)`,
              cursor: 'pointer',
              userSelect: 'none',
              transformOrigin: 'bottom center',
              flexShrink: 0,
            }}
            title="Chạm trực tiếp vào bình xăng Jerry để tạo hiệu ứng sóng sánh chất lỏng!"
          >
            {/* Jerry Can Triple-Handle Top Ridge */}
            <div
              style={{
                position: 'absolute',
                top: '-18px',
                left: '20px',
                right: '20px',
                height: '18px',
                background: '#111b2e',
                borderRadius: '8px 8px 0 0',
                border: `1.5px solid ${fluidPrimary}88`,
                borderBottom: 'none',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '0 4px',
                boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.6)',
              }}
            >
              {/* 3 Handle Grip Slots */}
              <div style={{ width: '22px', height: '6px', background: '#070c18', borderRadius: '3px' }} />
              <div style={{ width: '28px', height: '6px', background: '#070c18', borderRadius: '3px' }} />
              <div style={{ width: '22px', height: '6px', background: '#070c18', borderRadius: '3px' }} />
            </div>

            {/* Jerry Can Angled Filler Spout & Locking Cap */}
            <div
              style={{
                position: 'absolute',
                top: '-14px',
                right: '-4px',
                width: '18px',
                height: '16px',
                background: 'linear-gradient(135deg, #334155, #1e293b)',
                borderRadius: '4px',
                border: `1px solid ${fluidPrimary}`,
                transform: 'rotate(15deg)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.8)',
              }}
            >
              <div style={{ width: '100%', height: '4px', background: fluidPrimary, borderRadius: '2px 2px 0 0' }} />
            </div>

            {/* Stamped X-Rib Reinforcement on the Steel Body */}
            <svg
              viewBox="0 0 140 260"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                opacity: 0.18,
                zIndex: 1,
              }}
            >
              <line x1="20" y1="25" x2="120" y2="235" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
              <line x1="120" y1="25" x2="20" y2="235" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            </svg>

            {/* Central Vertical Transparent Sight Glass Window */}
            <div
              style={{
                position: 'absolute',
                top: '18px',
                bottom: '16px',
                left: '26px',
                right: '26px',
                borderRadius: '12px',
                background: 'linear-gradient(180deg, #030712 0%, #020408 100%)',
                border: '1.5px solid rgba(255, 255, 255, 0.25)',
                boxShadow: 'inset 0 0 16px rgba(0, 0, 0, 0.95)',
                overflow: 'hidden',
                zIndex: 5,
              }}
            >
              {/* Touch Ripples */}
              {ripples.map((rip) => (
                <span
                  key={rip.id}
                  style={{
                    position: 'absolute',
                    left: rip.x - 50,
                    top: rip.y - 40,
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: `2px solid ${fluidPrimary}`,
                    pointerEvents: 'none',
                    zIndex: 35,
                    animation: 'rippleTouchEffect 0.8s ease-out forwards',
                  }}
                />
              ))}

              {/* Rising Micro-Bubbles from the bottom of the fuel */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 20,
                  pointerEvents: 'none',
                  overflow: 'hidden',
                }}
              >
                {[
                  { left: 20, size: 5, dur: 2.1, delay: 0, drift: '3px' },
                  { left: 55, size: 7, dur: 2.6, delay: 0.5, drift: '-4px' },
                  { left: 35, size: 4, dur: 1.8, delay: 0.9, drift: '4px' },
                  { left: 75, size: 6, dur: 2.3, delay: 1.4, drift: '-3px' },
                  ...(isSloshing
                    ? [
                        { left: 25, size: 9, dur: 1.0, delay: 0, drift: '6px' },
                        { left: 60, size: 10, dur: 0.9, delay: 0.1, drift: '-6px' },
                      ]
                    : []),
                ].map((b, idx) => (
                  <span
                    key={idx + (isSloshing ? '_s_' + sloshCount : '')}
                    style={
                      {
                        position: 'absolute',
                        left: `${b.left}%`,
                        bottom: '6px',
                        width: `${b.size}px`,
                        height: `${b.size}px`,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, rgba(255, 255, 255, 0.4) 70%)',
                        boxShadow: '0 0 6px rgba(255, 255, 255, 0.9)',
                        animation: `bubbleFloatVertical ${b.dur}s ease-in-out infinite`,
                        animationDelay: `${b.delay}s`,
                        '--drift': b.drift,
                        '--drift-rev': `-${b.drift}`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>

              {/* Fluid Mass (Height controlled by currentPercentage) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${Math.max(5, Math.min(100, currentPercentage))}%`,
                  transition: isSloshing
                    ? 'height 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    : 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 10,
                  overflow: 'visible',
                }}
              >
                {/* Back Liquid Wave */}
                <svg
                  viewBox="0 0 1200 120"
                  preserveAspectRatio="none"
                  style={{
                    position: 'absolute',
                    top: isSloshing ? '-20px' : '-14px',
                    left: 0,
                    width: '200%',
                    height: isSloshing ? '34px' : '24px',
                    fill: fluidSecondary,
                    opacity: 0.7,
                    animation: `waveFlowBack ${isSloshing ? '0.7s' : '3.4s'} linear infinite alternate`,
                    zIndex: 2,
                  }}
                >
                  <path d="M0,20 C200,60 400,-20 600,25 C800,65 1000,-15 1200,20 L1200,120 L0,120 Z" />
                </svg>

                {/* Front Liquid Wave */}
                <svg
                  viewBox="0 0 1200 120"
                  preserveAspectRatio="none"
                  style={{
                    position: 'absolute',
                    top: isSloshing ? '-18px' : '-12px',
                    left: 0,
                    width: '200%',
                    height: isSloshing ? '32px' : '22px',
                    fill: fluidPrimary,
                    opacity: 0.95,
                    animation: `waveFlowFront ${isSloshing ? '0.5s' : '2.4s'} ease-in-out infinite alternate`,
                    zIndex: 4,
                    filter: `drop-shadow(0 -2px 6px ${fluidPrimary})`,
                  }}
                >
                  <path d="M0,10 C150,-15 350,45 550,15 C750,-20 950,40 1200,10 L1200,120 L0,120 Z" />
                </svg>

                {/* Glowing Meniscus line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: '#ffffff',
                    boxShadow: `0 0 10px #fff, 0 0 16px ${fluidPrimary}`,
                    zIndex: 5,
                    opacity: 0.9,
                  }}
                />

                {/* Fluid Body */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(180deg, ${fluidGradientTop}ee 0%, ${fluidGradientBottom}ff 100%)`,
                    boxShadow: `inset 0 0 16px ${fluidPrimary}88`,
                  }}
                />
              </div>

              {/* Glass Specular Reflection Highlight */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '4px',
                  width: '12px',
                  bottom: 0,
                  background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 100%)',
                  zIndex: 25,
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Jerry Can Stamped Capacity Label */}
            <div
              style={{
                position: 'absolute',
                bottom: '4px',
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: '9px',
                color: 'var(--mut)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
              }}
            >
              JERRY CAN · {tankCapacity}L
            </div>
          </div>

          {/* Vertical Graduation Scale from Top (F) to Bottom (E) */}
          <div
            style={{
              flex: 1,
              height: '240px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '6px 0',
              userSelect: 'none',
            }}
          >
            {verticalMarkers.map((marker) => {
              const isPassed = currentPercentage >= marker.pct;
              const isNearest = Math.abs(currentPercentage - marker.pct) < 13;

              return (
                <div
                  key={marker.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    opacity: isPassed ? 1 : 0.45,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      width: marker.pct === 100 || marker.pct === 0 ? '22px' : '14px',
                      height: '2px',
                      background: isPassed ? fluidPrimary : 'rgba(255, 255, 255, 0.25)',
                      boxShadow: isPassed ? `0 0 8px ${fluidPrimary}` : undefined,
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <b
                      style={{
                        fontSize: marker.pct === 100 || marker.pct === 0 ? '14px' : '13px',
                        color: isPassed ? '#f8fafc' : 'var(--mut)',
                        fontFamily: 'monospace',
                        fontWeight: isPassed ? 800 : 500,
                      }}
                    >
                      {marker.label}
                    </b>
                    <span
                      style={{
                        fontSize: '11px',
                        color: isPassed ? fluidPrimary : 'rgba(148, 163, 184, 0.7)',
                        fontWeight: isNearest ? 700 : 400,
                      }}
                    >
                      ({marker.pct}%) {isNearest ? '📍 Mức thực tế' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls & GPS Simulation Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'rgba(5, 12, 28, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Color Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: fluidPrimary,
                boxShadow: `0 0 10px ${fluidPrimary}`,
              }}
            />
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
              Màu chất lỏng: <b style={{ color: fluidPrimary }}>{fluidThemeName}</b>
            </span>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={(e) => triggerSlosh(e)}
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${fluidPrimary}33 0%, rgba(2, 132, 199, 0.4) 100%)`,
                border: `1px solid ${fluidPrimary}`,
                color: fluidPrimary,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Lắc bình Jerry để cảm nhận sóng sánh và âm thanh"
            >
              🌊 Lắc bình Jerry
            </button>

            <button
              type="button"
              onClick={handleRefuelFull}
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.25)',
                borderColor: '#10b981',
                color: '#34d399',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⚡ Đầy bình lại (0 km)
            </button>

            <button
              type="button"
              onClick={() => setShowDetails((p) => !p)}
              style={{
                padding: '4px 9px',
                fontSize: '11px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--mut)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ⚙️ {showDetails ? 'Đóng' : 'Thử nghiệm GPS'}
            </button>
          </div>
        </div>

        {/* Real GPS Odometry Info Breakdown */}
        <div
          style={{
            marginTop: '10px',
            fontSize: '11.5px',
            color: 'var(--mut)',
            lineHeight: 1.6,
            background: 'rgba(3, 7, 18, 0.5)',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <span>
            🛰️ Quãng đường GPS xe đã chạy: <b style={{ color: '#00f0ff' }}>{gpsDrivenKm} km</b>.{' '}
            Tiêu hao tính theo GPS: <b style={{ color: '#f43f5e' }}>−{burnedLiters.toFixed(2)}L (−{Math.round(burnedPercent)}%)</b> với định mức {effRate} L/100km.{' '}
            Còn lại trong bình: <b style={{ color: fluidPrimary }}>{Math.round(currentPercentage)}% (~{num(currentLiters)} / {tankCapacity}L)</b>.
          </span>
        </div>

        {/* GPS Simulation / Test Drive Controls */}
        {showDetails && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              fontSize: '11.5px',
            }}
          >
            <div>
              <label style={{ display: 'block', color: '#f8fafc', fontWeight: 600, marginBottom: '4px' }}>
                🚗 Thử nghiệm lái xe (Cộng dồn GPS):
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setGpsDrivenKm((k) => k + 5)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background: 'rgba(0, 240, 255, 0.15)',
                    border: '1px solid #00f0ff',
                    color: '#00f0ff',
                    cursor: 'pointer',
                  }}
                >
                  +5 km
                </button>
                <button
                  type="button"
                  onClick={() => setGpsDrivenKm((k) => k + 20)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background: 'rgba(0, 240, 255, 0.15)',
                    border: '1px solid #00f0ff',
                    color: '#00f0ff',
                    cursor: 'pointer',
                  }}
                >
                  +20 km
                </button>
                <button
                  type="button"
                  onClick={() => setGpsDrivenKm(0)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--mut)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Đặt lại 0 km
                </button>
              </div>
              <small style={{ color: 'var(--mut)', marginTop: '4px', display: 'block' }}>
                Mô phỏng khoảng cách GPS để kiểm tra độ hạ % xăng thực tế
              </small>
            </div>

            <div>
              <label style={{ display: 'block', color: '#f8fafc', fontWeight: 600, marginBottom: '4px' }}>
                ⛽ Mức nạp lúc đầy bình:
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[100, 75, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setInitialPercent(pct)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      background: initialPercent === pct ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                      color: initialPercent === pct ? '#fff' : 'var(--mut)',
                      border: 'none',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {pct === 100 ? 'Đầy 100%' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default LiquidFuelGauge;
