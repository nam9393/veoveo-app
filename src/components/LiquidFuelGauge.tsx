import React, { useState, useRef, useEffect } from 'react';
import { num } from '../utils/calc';
import { gpsTrackingService, GpsRoute, GpsTelemetryStatus } from '../services/gpsTrackingService';
import { checkAndNotifyFuel, notifyGpsLost } from '../services/notificationService';

interface LiquidFuelGaugeProps {
  vehicleId: string;
  vehicleName: string;
  tankCapacity: number;
  ratedCons?: number; // L/100km
  lastFuelDateFromEntry?: string | null;
  lastFuelPercentFromEntry?: number | null;
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
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.45);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(820, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.45);

    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.46);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.48);

    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(520, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(210, ctx.currentTime + 0.3);
        gain2.gain.setValueAtTime(0.14, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.33);
      } catch {}
    }, 110);
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

  // GPS Telemetry State from gpsTrackingService
  const [telemetry, setTelemetry] = useState<GpsTelemetryStatus>(() =>
    gpsTrackingService.getStatus()
  );

  // 3-Day Rolling Traveled Routes
  const [traveledRoutes, setTraveledRoutes] = useState<GpsRoute[]>(() =>
    gpsTrackingService.getTraveledRoutes(vehicleId)
  );

  // Visual Interactive Slosh State
  const [isSloshing, setIsSloshing] = useState(false);
  const [sloshCount, setSloshCount] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  // Manual trip modal state
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [newTripStart, setNewTripStart] = useState('');
  const [newTripEnd, setNewTripEnd] = useState('');
  const [newTripKm, setNewTripKm] = useState('6.0');

  const tankRef = useRef<HTMLDivElement>(null);

  // Initialize and subscribe to GPS Tracking Service
  useEffect(() => {
    gpsTrackingService.startTracking(vehicleId);

    const unsubStatus = gpsTrackingService.subscribeStatus((st) => {
      setTelemetry(st);
    });

    const unsubRoutes = gpsTrackingService.subscribeRoutes((routes) => {
      setTraveledRoutes(routes);
    });

    setTraveledRoutes(gpsTrackingService.getTraveledRoutes(vehicleId));

    return () => {
      unsubStatus();
      unsubRoutes();
    };
  }, [vehicleId]);

  // Sync initial fill % to local storage
  const setInitialPercent = (val: number) => {
    setInitialPercentState(val);
    try {
      localStorage.setItem(`soxe_fuel_pct_${vehicleId}`, String(val));
    } catch {}
  };

  // Fuel Consumption Calculation Based on REAL GPS ACCUMULATED DISTANCE:
  // Burned Liters = (accumulatedDistanceKm * ratedCons) / 100
  // Burned % = (Burned Liters / Tank Capacity) * 100
  // Current % = Initial % - Burned %
  const effRate = ratedCons || 5.5;
  const gpsDrivenKm = telemetry.accumulatedDistanceKm;
  const burnedLiters = (gpsDrivenKm * effRate) / 100;
  const burnedPercent = tankCapacity ? (burnedLiters / tankCapacity) * 100 : 0;
  const currentPercentage = Math.max(0, Math.min(100, initialPercent - burnedPercent));
  const currentLiters = tankCapacity ? (currentPercentage / 100) * tankCapacity : 0;

  // Web Push notification check for critical/warning fuel levels
  useEffect(() => {
    checkAndNotifyFuel(currentPercentage, vehicleName);
  }, [currentPercentage, vehicleName]);

  // Slosh Trigger with Sound & Touch Ripples
  const triggerSlosh = (e?: React.MouseEvent | React.TouchEvent) => {
    setIsSloshing(true);
    setSloshCount((c) => c + 1);
    playSloshSound();

    if (e && tankRef.current) {
      const rect = tankRef.current.getBoundingClientRect();
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
    }, 1400);
  };

  // 1-Click Refuel to 100% and reset GPS trip distance
  const handleRefuelFull = () => {
    setInitialPercent(100);
    gpsTrackingService.resetOdometryKm(vehicleId);
    triggerSlosh();
  };

  // Record a new completed route
  const handleAddTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const km = parseFloat(newTripKm) || 4;
    const liters = (km * effRate) / 100;
    const now = new Date();
    const start = new Date(now.getTime() - Math.round(km * 2.5) * 60000);

    const newRoute: GpsRoute = {
      id: `route-${Date.now()}`,
      vehicleId,
      startTime: start.toISOString(),
      endTime: now.toISOString(),
      distanceKm: km,
      startAddr: newTripStart.trim() || 'Vị trí khởi hành GPS',
      endAddr: newTripEnd.trim() || 'Điểm đến GPS',
      litersUsed: parseFloat(liters.toFixed(2)),
      durationMins: Math.round(km * 2.5),
      avgSpeedKmh: Math.round(km / ((km * 2.5) / 60)) || 25,
      maxSpeedKmh: Math.round((km / ((km * 2.5) / 60)) * 1.6) || 45,
    };

    const updated = gpsTrackingService.recordRoute(newRoute);
    setTraveledRoutes(updated);
    setShowAddTripModal(false);
    setNewTripStart('');
    setNewTripEnd('');
    triggerSlosh();
  };

  // Three-Stage Smart Fuel Color:
  // 1. Normal (>30%): Xanh ngọc Neon (#00f0ff)
  // 2. Warning (15% - 30%): Vàng hổ phách cảnh báo (#f59e0b) - Nhắc nhở chủ xe chuẩn bị ghé cây xăng
  // 3. Critical (<=15%): Đỏ Ruby phát sáng (#f43f5e) - Hiệu ứng cảnh báo nhấp nháy khẩn cấp
  const isCritical = currentPercentage <= 15;
  const isWarning = currentPercentage > 15 && currentPercentage <= 30;

  let fluidPrimary = '#00f0ff'; // Xanh ngọc Neon
  let fluidSecondary = '#0284c7';
  let fluidGradientTop = '#00f0ff';
  let fluidGradientBottom = '#0284c7';
  let fluidThemeName = 'Xanh ngọc Neon (An toàn)';

  if (isCritical) {
    fluidPrimary = '#f43f5e'; // Đỏ Ruby phát sáng
    fluidSecondary = '#be123c';
    fluidGradientTop = '#fb7185';
    fluidGradientBottom = '#9f1239';
    fluidThemeName = 'Đỏ Ruby phát sáng (Báo động khẩn cấp)';
  } else if (isWarning) {
    fluidPrimary = '#f59e0b'; // Vàng hổ phách cảnh báo
    fluidSecondary = '#d97706';
    fluidGradientTop = '#fbbf24';
    fluidGradientBottom = '#b45309';
    fluidThemeName = 'Vàng hổ phách (Cảnh báo chuẩn bị ghé cây xăng)';
  }

  // Vertical scale graduation markers from Top (F) down to Bottom (E)
  const verticalMarkers = [
    { label: 'F (Đầy)', pct: 100 },
    { label: '3/4', pct: 75 },
    { label: '1/2', pct: 50 },
    { label: '1/4', pct: 25 },
    { label: 'E (Trống)', pct: 0 },
  ];

  return (
    <div style={{ marginTop: '10px' }}>
      <style>{`
        /* Smooth, stable, continuous ocean wave rolling left-to-right and right-to-left */
        @keyframes oceanWaveRollLeftRight1 {
          0% {
            transform: translate3d(-35%, 0, 0);
          }
          50% {
            transform: translate3d(-10%, 0, 0);
          }
          100% {
            transform: translate3d(-35%, 0, 0);
          }
        }

        @keyframes oceanWaveRollLeftRight2 {
          0% {
            transform: translate3d(-10%, 0, 0);
          }
          50% {
            transform: translate3d(-38%, 0, 0);
          }
          100% {
            transform: translate3d(-10%, 0, 0);
          }
        }

        @keyframes oceanWaveRollLeftRight3 {
          0% {
            transform: translate3d(-25%, 0, 0);
          }
          50% {
            transform: translate3d(-5%, 0, 0);
          }
          100% {
            transform: translate3d(-25%, 0, 0);
          }
        }

        /* 14 Micro-bubbles rising continuously across the full height and width of the tank */
        @keyframes fullTankBodyBubbleRising {
          0% {
            transform: translateY(0) translateX(0) scale(0.6);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          85% {
            opacity: 0.85;
            transform: translateY(-240px) translateX(var(--drift, 4px)) scale(1.05);
          }
          100% {
            transform: translateY(-278px) translateX(var(--drift, 4px)) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes rubyEmergencyPulse {
          0% {
            box-shadow: 0 0 16px rgba(244, 63, 94, 0.4), inset 0 0 12px rgba(244, 63, 94, 0.3);
            border-color: #f43f5e;
          }
          100% {
            box-shadow: 0 0 42px rgba(244, 63, 94, 0.95), inset 0 0 24px rgba(244, 63, 94, 0.7);
            border-color: #ff2a55;
          }
        }

        @keyframes rippleTouchEffect {
          0% { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(2.6); opacity: 0; }
        }

        /* Custom sleek scrollbar for 3-day route history */
        .veo-route-history-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .veo-route-history-scroll::-webkit-scrollbar-track {
          background: rgba(2, 6, 23, 0.4);
          border-radius: 4px;
        }
        .veo-route-history-scroll::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.3);
          border-radius: 4px;
        }
        .veo-route-history-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(56, 189, 248, 0.6);
        }
      `}</style>

      <div
        className="liquid-wave-container"
        style={{
          border: `1.5px solid ${fluidPrimary}88`,
          boxShadow: isCritical
            ? '0 0 35px rgba(244, 63, 94, 0.4), inset 0 2px 14px rgba(0, 0, 0, 0.8)'
            : isWarning
            ? '0 0 30px rgba(245, 158, 11, 0.35), inset 0 2px 14px rgba(0, 0, 0, 0.8)'
            : `0 8px 30px ${fluidPrimary}22, inset 0 2px 14px rgba(0, 0, 0, 0.8)`,
          padding: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '22px' }}>🛢️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15.5px', color: '#f8fafc', fontWeight: 800 }}>
                  Bình Xăng Trơn Thủy Tinh (Sóng Biển Động Cuộn Trào)
                </h3>
                <small style={{ color: 'var(--mut)', fontSize: '11px' }}>
                  Thiết kế bình trơn tối giản · Bọt khí chuẩn xác theo mức xăng · Sóng cuộn trào mượt mà
                </small>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid #10b981',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              GPS Live
            </span>
          </div>
        </div>

        {/* MAIN CAN & SCALE ROW */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            margin: '10px 0 16px',
            flexWrap: 'wrap',
          }}
        >
          {/* THE SLEEK SMOOTH TANK (BÌNH TRƠN TỐI GIẢN) */}
          <div
            ref={tankRef}
            onClick={(e) => triggerSlosh(e)}
            onTouchStart={(e) => triggerSlosh(e)}
            style={{
              position: 'relative',
              width: '180px',
              height: '270px',
              borderRadius: '26px', // Smooth capsule pill styling (no handles/spouts/stamps)
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(15, 23, 42, 0.45) 50%, rgba(2, 6, 23, 0.85) 100%)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: `2px solid ${fluidPrimary}`,
              boxShadow: isCritical
                ? '0 0 32px rgba(244, 63, 94, 0.7), inset 0 0 20px rgba(244, 63, 94, 0.4)'
                : `0 0 25px ${fluidPrimary}44, inset 0 0 18px rgba(0, 0, 0, 0.85)`,
              cursor: 'pointer',
              userSelect: 'none',
              transformOrigin: 'bottom center',
              flexShrink: 0,
              overflow: 'hidden',
              animation: isCritical ? 'rubyEmergencyPulse 0.9s infinite alternate ease-in-out' : undefined,
            }}
            title="Chạm hoặc nhấp trực tiếp vào bình nhiên liệu để tạo sóng sánh chất lỏng!"
          >
            {/* Top Minimalist Polished Bezel */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '8px',
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%)',
                zIndex: 25,
              }}
            />

            {/* Touch Ripples */}
            {ripples.map((rip) => (
              <span
                key={rip.id}
                style={{
                  position: 'absolute',
                  left: rip.x - 45,
                  top: rip.y - 45,
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: `2px solid ${fluidPrimary}`,
                  pointerEvents: 'none',
                  zIndex: 35,
                  animation: 'rippleTouchEffect 0.8s ease-out forwards',
                }}
              />
            ))}

            {/* 14 MICRO-BUBBLES SPREAD ACROSS ENTIRE TANK WIDTH & HEIGHT (TOÀN BỘ CHIỀU RỘNG VÀ CHIỀU CAO THÂN BÌNH) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 18,
                pointerEvents: 'none',
                overflow: 'hidden',
              }}
            >
              {[
                { left: 5, size: 4, dur: 2.8, delay: 0, drift: '4px' },
                { left: 12, size: 6, dur: 3.4, delay: 0.4, drift: '-5px' },
                { left: 19, size: 5, dur: 2.7, delay: 1.1, drift: '6px' },
                { left: 26, size: 7, dur: 3.8, delay: 0.2, drift: '-6px' },
                { left: 33, size: 4, dur: 2.5, delay: 1.5, drift: '5px' },
                { left: 41, size: 6, dur: 3.2, delay: 0.7, drift: '-5px' },
                { left: 48, size: 7, dur: 3.9, delay: 1.8, drift: '7px' },
                { left: 56, size: 5, dur: 2.9, delay: 0.3, drift: '-4px' },
                { left: 63, size: 7, dur: 3.6, delay: 1.0, drift: '6px' },
                { left: 71, size: 4, dur: 2.6, delay: 2.1, drift: '-6px' },
                { left: 78, size: 6, dur: 3.3, delay: 0.6, drift: '5px' },
                { left: 85, size: 7, dur: 4.0, delay: 1.3, drift: '-5px' },
                { left: 91, size: 5, dur: 3.0, delay: 1.9, drift: '4px' },
                { left: 96, size: 6, dur: 3.5, delay: 0.5, drift: '-4px' },
                ...(isSloshing
                  ? [
                      { left: 28, size: 9, dur: 1.2, delay: 0, drift: '8px' },
                      { left: 50, size: 10, dur: 1.1, delay: 0.1, drift: '-8px' },
                      { left: 72, size: 9, dur: 1.3, delay: 0.2, drift: '6px' },
                    ]
                  : []),
              ].map((b, idx) => (
                <span
                  key={idx + (isSloshing ? '_slosh_' + sloshCount : '')}
                  style={
                    {
                      position: 'absolute',
                      left: `${b.left}%`,
                      bottom: '-8px',
                      width: `${b.size}px`,
                      height: `${b.size}px`,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, rgba(255, 255, 255, 0.45) 75%)',
                      boxShadow: `0 0 6px rgba(255, 255, 255, 0.95), 0 0 10px ${fluidPrimary}55`,
                      animation: `fullTankBodyBubbleRising ${b.dur}s ease-in-out infinite`,
                      animationDelay: `${b.delay}s`,
                      '--drift': b.drift,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>

            {/* FULL-BODY FLUID MASS (With small top air gap: max 90% height) */}
            {(() => {
              // Always keep a small air gap at the top so the tank never touches 100% ceiling
              const maxFluidHeight = 90;
              const fluidHeightPct = Math.max(7, Math.min(maxFluidHeight, (currentPercentage / 100) * maxFluidHeight));

              return (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${fluidHeightPct}%`,
                    transition: isSloshing
                      ? 'height 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                      : 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 10,
                    overflow: 'visible',
                  }}
                >

                  {/* SÓNG BIỂN ĐỘNG 1: Deep rolling swell left-to-right */}
                  <svg
                    viewBox="0 0 1600 120"
                    preserveAspectRatio="none"
                    style={{
                      position: 'absolute',
                      top: isSloshing ? '-26px' : '-16px',
                      left: 0,
                      width: '250%',
                      height: isSloshing ? '40px' : '28px',
                      fill: fluidSecondary,
                      opacity: 0.65,
                      animation: `oceanWaveRollLeftRight1 ${isSloshing ? '0.9s' : '3.8s'} ease-in-out infinite`,
                      zIndex: 2,
                    }}
                  >
                    <path d="M0,30 C200,70 400,-10 600,35 C800,80 1000,-10 1200,35 C1400,80 1600,-10 1600,35 L1600,120 L0,120 Z" />
                  </svg>

                  {/* SÓNG BIỂN ĐỘNG 2: Mid surge right-to-left */}
                  <svg
                    viewBox="0 0 1600 120"
                    preserveAspectRatio="none"
                    style={{
                      position: 'absolute',
                      top: isSloshing ? '-24px' : '-14px',
                      left: 0,
                      width: '250%',
                      height: isSloshing ? '36px' : '26px',
                      fill: fluidPrimary,
                      opacity: 0.85,
                      animation: `oceanWaveRollLeftRight2 ${isSloshing ? '0.7s' : '2.9s'} ease-in-out infinite`,
                      zIndex: 3,
                    }}
                  >
                    <path d="M0,20 C200,-15 400,60 600,20 C800,-20 1000,55 1200,20 C1400,-15 1600,55 1600,20 L1600,120 L0,120 Z" />
                  </svg>

                  {/* SÓNG BIỂN ĐỘNG 3: Front Crest Wave with glowing drop shadow */}
                  <svg
                    viewBox="0 0 1600 120"
                    preserveAspectRatio="none"
                    style={{
                      position: 'absolute',
                      top: isSloshing ? '-20px' : '-12px',
                      left: 0,
                      width: '250%',
                      height: isSloshing ? '34px' : '24px',
                      fill: fluidPrimary,
                      opacity: 0.98,
                      animation: `oceanWaveRollLeftRight3 ${isSloshing ? '0.6s' : '2.3s'} ease-in-out infinite`,
                      zIndex: 4,
                      filter: `drop-shadow(0 -3px 8px ${fluidPrimary})`,
                    }}
                  >
                    <path d="M0,15 C200,-25 400,50 600,18 C800,-25 1000,45 1200,15 C1400,-20 1600,45 1600,15 L1600,120 L0,120 Z" />
                  </svg>

                  {/* Luminous Liquid Surface Line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      left: 0,
                      right: 0,
                      height: '3.5px',
                      background: '#ffffff',
                      boxShadow: `0 0 12px #fff, 0 0 18px ${fluidPrimary}`,
                      zIndex: 5,
                      opacity: 0.95,
                    }}
                  />

                  {/* Liquid Mass Body */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `linear-gradient(180deg, ${fluidGradientTop}dd 0%, ${fluidGradientBottom}fa 100%)`,
                      boxShadow: `inset 0 0 20px ${fluidPrimary}aa`,
                    }}
                  />
                </div>
              );
            })()}

            {/* Specular Glass Highlight Glare on the left edge */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '8px',
                width: '16px',
                bottom: 0,
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 100%)',
                zIndex: 25,
                pointerEvents: 'none',
              }}
            />

            {/* Bottom Minimal Fuel Capacity Pill */}
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: '10px',
                color: '#fff',
                opacity: 0.85,
                fontWeight: 800,
                letterSpacing: '0.06em',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                zIndex: 26,
              }}
            >
              FUEL TANK · {tankCapacity}L
            </div>
          </div>

          {/* Vertical Graduation Scale: Top (F) to Bottom (E) */}
          <div
            style={{
              flex: 1,
              minWidth: '150px',
              height: '250px',
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
                      width: marker.pct === 100 || marker.pct === 0 ? '24px' : '14px',
                      height: '2.5px',
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
                      ({marker.pct}%) {isNearest ? '📍 Mức hiện tại' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PROMINENT AMBER & RUBY WARNING ALERT BANNERS */}
        {isCritical && (
          <div
            style={{
              marginBottom: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.28) 0%, rgba(159, 18, 57, 0.45) 100%)',
              border: '2px solid #f43f5e',
              animation: 'rubyEmergencyPulse 0.8s infinite alternate ease-in-out',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '28px' }}>🚨</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🔴 ĐỎ RUBY PHÁT SÁNG · BÁO ĐỘNG KHẨN CẤP DƯỚI 15% (Còn {Math.round(currentPercentage)}% · ~{num(currentLiters)}L)!
              </div>
              <div style={{ color: '#fecdd3', fontSize: '11.5px', marginTop: '3px' }}>
                Bình nhiên liệu sắp cạn kiệt, bơm xăng có nguy cơ bị hụt tải gây chết máy. Hãy tìm và ghé trạm xăng gần nhất ngay lập tức!
              </div>
            </div>
          </div>
        )}

        {isWarning && (
          <div
            style={{
              marginBottom: '12px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(180, 83, 9, 0.35) 100%)',
              border: '1.5px solid #f59e0b',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '26px' }}>⚠️</span>
            <div>
              <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '13px' }}>
                🟡 VÀNG HỔ PHÁCH CẢNH BÁO (15% - 30%): Nhắc nhở chủ xe chuẩn bị ghé cây xăng!
              </div>
              <div style={{ color: '#fef3c7', fontSize: '11.5px', marginTop: '2px' }}>
                Lượng xăng trong bình còn {Math.round(currentPercentage)}% (~{num(currentLiters)}L). Vui lòng lên kế hoạch tiếp thêm nhiên liệu trên lộ trình tiếp theo.
              </div>
            </div>
          </div>
        )}

        {/* CONTROLS & ODOMETRY STATUS */}
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
              Trạng thái chất lỏng: <b style={{ color: fluidPrimary }}>{fluidThemeName}</b>
            </span>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={(e) => triggerSlosh(e)}
              style={{
                padding: '5px 12px',
                fontSize: '11.5px',
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${fluidPrimary}33 0%, rgba(2, 132, 199, 0.4) 100%)`,
                border: `1px solid ${fluidPrimary}`,
                color: fluidPrimary,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Nhấp để lắc bình tạo sóng biển động cuộn trào và hiệu ứng âm thanh sống động"
            >
              🌊 Lắc tạo sóng biển động
            </button>

            <button
              type="button"
              onClick={handleRefuelFull}
              style={{
                padding: '5px 12px',
                fontSize: '11.5px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.25)',
                border: '1px solid #10b981',
                color: '#34d399',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⚡ Đầy bình (0 km)
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
            🛰️ <b>Tín hiệu GPS:</b> {telemetry.statusMessage}. Quãng đường GPS xe đã lăn bánh:{' '}
            <b style={{ color: '#00f0ff' }}>{gpsDrivenKm} km</b>.{' '}
            Tiêu hao tính theo GPS: <b style={{ color: '#f43f5e' }}>−{burnedLiters.toFixed(2)}L (−{Math.round(burnedPercent)}%)</b> với định mức {effRate} L/100km.{' '}
            Còn lại trong bình: <b style={{ color: fluidPrimary }}>{Math.round(currentPercentage)}% (~{num(currentLiters)} / {tankCapacity}L)</b>.
          </span>
        </div>

        {/* 3-DAY ROLLING GPS TRAVELED ROUTES: SCROLLABLE HISTORY VIEW */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '13.5px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🗺️ Lộ trình di chuyển theo GPS ({traveledRoutes.length} chuyến trong 3 ngày gần nhất)
            </h4>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setShowAddTripModal(true)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.18)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Ghi nhận lộ trình mới
              </button>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--mut)', marginBottom: '8px' }}>
            📌 Lịch sử lưu tự động lộ trình xe chạy trong <b>72 giờ (3 ngày) gần nhất</b> theo dịch vụ GPS, sau đó tự động cuốn chiếu.
          </div>

          {/* SCROLLABLE ROUTE HISTORY CONTAINER */}
          <div
            className="veo-route-history-scroll"
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              paddingRight: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {traveledRoutes.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  background: 'rgba(2, 6, 23, 0.4)',
                  borderRadius: '8px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  color: 'var(--mut)',
                  fontSize: '12px',
                }}
              >
                Chưa có lộ trình nào được ghi nhận trong 3 ngày qua. Lộ trình sẽ tự động xuất hiện khi xe lăn bánh!
              </div>
            ) : (
              traveledRoutes.map((trip) => {
                const startTime = new Date(trip.startTime);
                const timeStr = `${startTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} ${startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

                return (
                  <div
                    key={trip.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>🚗</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#f8fafc' }}>
                          {trip.startAddr} <span style={{ color: '#38bdf8' }}>➔</span> {trip.endAddr}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--mut)', marginTop: '2px' }}>
                          🕒 {timeStr}
                          {trip.durationMins ? ` · ${trip.durationMins} phút` : ''}
                          {trip.avgSpeedKmh ? ` · TB: ${trip.avgSpeedKmh} km/h` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
                        {trip.distanceKm} km
                      </div>
                      <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                        ⛽ ~{trip.litersUsed}L xăng
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Trip Modal */}
          {showAddTripModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                background: 'rgba(2, 6, 23, 0.85)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
              onClick={() => setShowAddTripModal(false)}
            >
              <div
                className="card"
                style={{
                  width: '100%',
                  maxWidth: '380px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1.5px solid #38bdf8',
                  padding: '16px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#f8fafc' }}>
                  📍 Ghi nhận lộ trình xe vừa di chuyển
                </h3>
                <form onSubmit={handleAddTrip} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--mut)', marginBottom: '3px' }}>
                      Điểm xuất phát:
                    </label>
                    <input
                      type="text"
                      required
                      value={newTripStart}
                      onChange={(e) => setNewTripStart(e.target.value)}
                      placeholder="VD: Nhà riêng, Q1"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--mut)', marginBottom: '3px' }}>
                      Điểm đến:
                    </label>
                    <input
                      type="text"
                      required
                      value={newTripEnd}
                      onChange={(e) => setNewTripEnd(e.target.value)}
                      placeholder="VD: Cây xăng Petrolimex Q3"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--mut)', marginBottom: '3px' }}>
                      Quãng đường đã đi (km):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={newTripKm}
                      onChange={(e) => setNewTripKm(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddTripModal(false)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: 'var(--mut)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '6px 14px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Lưu lộ trình
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiquidFuelGauge;
