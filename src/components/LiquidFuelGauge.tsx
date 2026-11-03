import React, { useState, useRef, useEffect } from 'react';
import { num } from '../utils/calc';

interface LiquidFuelGaugeProps {
  vehicleId: string;
  vehicleName: string;
  tankCapacity: number;
  lastFuelDateFromEntry?: string | null;
  lastFuelPercentFromEntry?: number | null;
}

// Synthesize authentic water/liquid slosh sound using Web Audio API
function playSloshSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // 1. Water mass slosh resonance
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.4);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);

    // 2. Secondary fluid splash droplet ripple
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(520, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.28);
        gain2.gain.setValueAtTime(0.1, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.31);
      } catch {}
    }, 110);
  } catch {}
}

export const LiquidFuelGauge: React.FC<LiquidFuelGaugeProps> = ({
  vehicleId,
  vehicleName,
  tankCapacity,
  lastFuelDateFromEntry,
  lastFuelPercentFromEntry,
}) => {
  // Stored Refuel Date in local storage or default to last entry or 4 days ago
  const [refuelDate, setRefuelDateState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`soxe_fuel_date_${vehicleId}`);
      if (saved) return saved;
    } catch {}
    if (lastFuelDateFromEntry) return lastFuelDateFromEntry;
    // Default to 4 days ago to demonstrate dynamic time drop immediately
    const d = new Date(Date.now() - 4 * 86400000);
    return d.toISOString().slice(0, 10);
  });

  // Initial fill percentage (default 100% full tank)
  const [initialPercent, setInitialPercentState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`soxe_fuel_pct_${vehicleId}`);
      if (saved) return Number(saved);
    } catch {}
    return lastFuelPercentFromEntry != null ? lastFuelPercentFromEntry : 100;
  });

  // Daily consumption rate % per day (e.g. 6% per day = ~16 days per full tank)
  const [dailyRate, setDailyRateState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`soxe_fuel_rate_${vehicleId}`);
      if (saved) return Number(saved);
    } catch {}
    return 6.0; // 6% per day
  });

  const [isSloshing, setIsSloshing] = useState(false);
  const [sloshCount, setSloshCount] = useState(0);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [showConfig, setShowConfig] = useState(false);
  const tankRef = useRef<HTMLDivElement | null>(null);

  const setRefuelDate = (d: string) => {
    setRefuelDateState(d);
    try {
      localStorage.setItem(`soxe_fuel_date_${vehicleId}`, d);
    } catch {}
  };

  const setDailyRate = (r: number) => {
    setDailyRateState(r);
    try {
      localStorage.setItem(`soxe_fuel_rate_${vehicleId}`, String(r));
    } catch {}
  };

  const setInitialPercent = (p: number) => {
    setInitialPercentState(p);
    try {
      localStorage.setItem(`soxe_fuel_pct_${vehicleId}`, String(p));
    } catch {}
  };

  // Real-time calculations:
  // Compute elapsed days & hours between now and refuelDate
  const now = new Date();
  const fillTime = new Date(refuelDate + 'T07:00:00');
  const diffMs = Math.max(0, now.getTime() - fillTime.getTime());
  const totalDaysElapsed = diffMs / (1000 * 60 * 60 * 24);
  const daysInt = Math.floor(totalDaysElapsed);
  const hoursRemainder = Math.floor((totalDaysElapsed - daysInt) * 24);

  // Total fuel burned since fill date
  const burnedPercent = Math.min(initialPercent, totalDaysElapsed * dailyRate);
  const currentPercentage = Math.max(0, Math.min(100, initialPercent - burnedPercent));
  const currentLiters = tankCapacity ? (currentPercentage / 100) * tankCapacity : 0;
  const burnedLiters = tankCapacity ? (burnedPercent / 100) * tankCapacity : 0;

  // Spectacular interactive touch/click slosh trigger
  const triggerSlosh = (e?: React.MouseEvent | React.TouchEvent) => {
    setIsSloshing(true);
    setSloshCount((c) => c + 1);
    playSloshSound();

    // Spawn splash ripple if event coordinates exist
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
    }, 1200);
  };

  // 1-Click refuel today
  const handleRefuelToday = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setRefuelDate(todayStr);
    setInitialPercent(100);
    triggerSlosh();
  };

  // Three-Stage Smart Fuel Color Transformation:
  // 1. Normal (>30%): Xanh ngọc Neon (Neon Cyan / Teal glow)
  // 2. Warning (15% - 30%): Vàng hổ phách cảnh báo (Amber Gold glow)
  // 3. Critical (<=15%): Đỏ Ruby phát sáng khi sắp cạn (Ruby Red pulsing glow)
  const isCritical = currentPercentage <= 15;
  const isWarning = currentPercentage > 15 && currentPercentage <= 30;

  let fluidPrimary = '#00f0ff';       // Xanh ngọc Neon
  let fluidSecondary = '#059669';     // Emerald glow
  let fluidGradientTop = '#00f0ff';
  let fluidGradientBottom = '#0284c7';
  let fluidThemeName = 'Xanh ngọc Neon';
  let containerGlowClass = 'neonCyanPulse';

  if (isCritical) {
    fluidPrimary = '#f43f5e';         // Đỏ Ruby phát sáng
    fluidSecondary = '#be123c';
    fluidGradientTop = '#fb7185';
    fluidGradientBottom = '#9f1239';
    fluidThemeName = 'Đỏ Ruby (Sắp cạn)';
    containerGlowClass = 'rubyCriticalPulse';
  } else if (isWarning) {
    fluidPrimary = '#f59e0b';         // Vàng hổ phách cảnh báo
    fluidSecondary = '#d97706';
    fluidGradientTop = '#fbbf24';
    fluidGradientBottom = '#b45309';
    fluidThemeName = 'Vàng hổ phách (Cảnh báo)';
    containerGlowClass = 'amberWarningPulse';
  }

  // Vertical scale graduation markers from top (F) to bottom (E)
  const verticalMarkers = [
    { label: 'F (Đầy)', pct: 100, desc: '100% dung tích' },
    { label: '3/4', pct: 75, desc: '3/4 bình xăng' },
    { label: '1/2', pct: 50, desc: '1/2 bình xăng' },
    { label: '1/4', pct: 25, desc: '1/4 bình xăng' },
    { label: 'E (Trống)', pct: 0, desc: '0% cạn bình' },
  ];

  return (
    <div style={{ marginTop: '10px' }}>
      {/* High-tech Cockpit Liquid Gauge Card */}
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
        {/* Top Header Row with Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⛽</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: 700 }}>
                  Bình Nhiên Liệu Chiều Dọc · Thời Gian Thực
                </h3>
                <small style={{ color: 'var(--mut)', fontSize: '11px' }}>
                  Mức xăng tự động hạ dần theo ngày trôi qua (từ F xuống E)
                </small>
              </div>
            </div>
          </div>

          {/* Large percentage display with color-coded glow */}
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

        {/* Main Vertical Gauge Layout: Vertical Glass Column + Vertical Scale Labels */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'stretch',
            justifyContent: 'center',
            margin: '8px 0 14px',
          }}
        >
          {/* Vertical Glass Fuel Tank Column */}
          <div
            ref={tankRef}
            onClick={triggerSlosh}
            onTouchStart={triggerSlosh}
            className={isSloshing ? 'tank-sloshing' : ''}
            style={{
              position: 'relative',
              width: '120px',
              height: '240px',
              borderRadius: '20px',
              background: 'linear-gradient(180deg, #050b18 0%, #02040a 100%)',
              border: `2px solid ${fluidPrimary}aa`,
              boxShadow: `0 0 24px ${fluidPrimary}33, inset 0 0 20px rgba(0, 0, 0, 0.95)`,
              overflow: 'hidden',
              cursor: 'pointer',
              userSelect: 'none',
              transformOrigin: 'bottom center',
              transition: 'transform 0.1s ease',
              flexShrink: 0,
            }}
            title="Chạm trực tiếp vào bình để tạo hiệu ứng sóng sánh chất lỏng!"
          >
            {/* Interactive Ripple on Touch */}
            {ripples.map((rip) => (
              <span
                key={rip.id}
                style={{
                  position: 'absolute',
                  left: rip.x - 25,
                  top: rip.y - 25,
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  border: `2px solid ${fluidPrimary}`,
                  pointerEvents: 'none',
                  zIndex: 35,
                  animation: 'rippleTouchEffect 0.8s ease-out forwards',
                }}
              />
            ))}

            {/* Rising Bubbles inside the liquid */}
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
                { left: 20, size: 6, dur: 2.2, delay: 0, drift: '4px' },
                { left: 45, size: 8, dur: 2.8, delay: 0.6, drift: '-5px' },
                { left: 70, size: 5, dur: 1.9, delay: 1.1, drift: '3px' },
                { left: 30, size: 9, dur: 2.5, delay: 1.5, drift: '-4px' },
                { left: 80, size: 6, dur: 2.1, delay: 0.3, drift: '5px' },
                { left: 55, size: 7, dur: 2.7, delay: 1.8, drift: '-3px' },
                ...(isSloshing
                  ? [
                      { left: 25, size: 10, dur: 1.2, delay: 0, drift: '8px' },
                      { left: 50, size: 12, dur: 1.1, delay: 0.1, drift: '-8px' },
                      { left: 75, size: 9, dur: 1.3, delay: 0.2, drift: '6px' },
                    ]
                  : []),
              ].map((b, idx) => (
                <span
                  key={idx + (isSloshing ? '_s_' + sloshCount : '')}
                  style={
                    {
                      position: 'absolute',
                      left: `${b.left}%`,
                      bottom: '8px',
                      width: `${b.size}px`,
                      height: `${b.size}px`,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, rgba(255, 255, 255, 0.4) 70%)',
                      boxShadow: '0 0 8px rgba(255, 255, 255, 0.9)',
                      animation: `bubbleFloatVertical ${b.dur}s ease-in-out infinite`,
                      animationDelay: `${b.delay}s`,
                      '--drift': b.drift,
                      '--drift-rev': `-${b.drift}`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>

            {/* Rising Fluid Mass (Height controlled by currentPercentage) */}
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
              {/* Back Wave Layer (Undulating Translucent Liquid Crest) */}
              <svg
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  top: isSloshing ? '-24px' : '-16px',
                  left: 0,
                  width: '200%',
                  height: isSloshing ? '40px' : '28px',
                  fill: fluidSecondary,
                  opacity: 0.7,
                  animation: `waveFlowBack ${isSloshing ? '0.7s' : '3.4s'} linear infinite alternate`,
                  zIndex: 2,
                }}
              >
                <path d="M0,20 C200,60 400,-20 600,25 C800,65 1000,-15 1200,20 L1200,120 L0,120 Z" />
              </svg>

              {/* Front Wave Layer (Vibrant Liquid Surface) */}
              <svg
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  top: isSloshing ? '-22px' : '-14px',
                  left: 0,
                  width: '200%',
                  height: isSloshing ? '38px' : '26px',
                  fill: fluidPrimary,
                  opacity: 0.95,
                  animation: `waveFlowFront ${isSloshing ? '0.5s' : '2.4s'} ease-in-out infinite alternate`,
                  zIndex: 4,
                  filter: `drop-shadow(0 -2px 6px ${fluidPrimary})`,
                }}
              >
                <path d="M0,10 C150,-15 350,45 550,15 C750,-20 950,40 1200,10 L1200,120 L0,120 Z" />
              </svg>

              {/* Glowing meniscus line at the fluid surface */}
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: '#ffffff',
                  boxShadow: `0 0 12px #fff, 0 0 20px ${fluidPrimary}`,
                  zIndex: 5,
                  opacity: 0.85,
                }}
              />

              {/* Liquid Body Gradient Fill */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(180deg, ${fluidGradientTop}ee 0%, ${fluidGradientBottom}ff 100%)`,
                  boxShadow: `inset 0 0 20px ${fluidPrimary}88`,
                }}
              />
            </div>

            {/* Glass Cylinder Sheen Reflections */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '6px',
                width: '18px',
                bottom: 0,
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 100%)',
                zIndex: 25,
                pointerEvents: 'none',
                borderRadius: '16px 0 0 16px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '6px',
                bottom: '8px',
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.16) 100%)',
                zIndex: 25,
                pointerEvents: 'none',
                borderRadius: '4px',
              }}
            />

            {/* Center interactive touch prompt overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              {isSloshing && (
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.65)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: `1px solid ${fluidPrimary}`,
                    boxShadow: `0 0 12px ${fluidPrimary}`,
                    animation: 'pulseGlow 0.4s ease infinite',
                  }}
                >
                  🌊 Sóng sánh!
                </div>
              )}
            </div>
          </div>

          {/* Vertical Graduation Scale from Top (F) to Bottom (E) */}
          <div
            style={{
              flex: 1,
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
                  {/* Graduation Notch Line */}
                  <div
                    style={{
                      width: marker.pct === 100 || marker.pct === 0 ? '22px' : '14px',
                      height: '2px',
                      background: isPassed ? fluidPrimary : 'rgba(255, 255, 255, 0.25)',
                      boxShadow: isPassed ? `0 0 8px ${fluidPrimary}` : undefined,
                      transition: 'all 0.3s ease',
                    }}
                  />

                  {/* Marker Label */}
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

        {/* Interactive Slosh Action Button & Color Indicator */}
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
          {/* Color Mode Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: fluidPrimary,
                boxShadow: `0 0 10px ${fluidPrimary}`,
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
              Màu chất lỏng: <b style={{ color: fluidPrimary }}>{fluidThemeName}</b>
            </span>
          </div>

          {/* Interactive Trigger Button */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: `0 0 12px ${fluidPrimary}44`,
              }}
              title="Nhấp để lắc mạnh bình xăng và nghe tiếng sóng sánh"
            >
              🌊 Lắc bình sóng sánh
            </button>

            <button
              type="button"
              onClick={handleRefuelToday}
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
              title="Đặt lại mức đầy bình 100% vào hôm nay"
            >
              ⚡ Đầy bình hôm nay
            </button>

            <button
              type="button"
              onClick={() => setShowConfig((p) => !p)}
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
              ⚙️ {showConfig ? 'Đóng' : 'Chỉnh ngày / mức hao'}
            </button>
          </div>
        </div>

        {/* Real-time Dynamic Consumption Breakdown */}
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
            ⏳ Đã trôi qua <b>{daysInt} ngày {hoursRemainder} giờ</b> kể từ lần đổ gần nhất ({new Date(refuelDate).toLocaleDateString('vi-VN')}).{' '}
            Hao hụt ước tính: <b style={{ color: '#f43f5e' }}>−{Math.round(burnedPercent)}% (~{num(burnedLiters)}L)</b> với định mức ~{dailyRate}%/ngày.{' '}
            Hiện còn: <b style={{ color: fluidPrimary }}>{Math.round(currentPercentage)}% (~{num(currentLiters)} / {tankCapacity}L)</b>.
          </span>
        </div>

        {/* Date & Consumption Adjustment Panel */}
        {showConfig && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '12px',
              fontSize: '11.5px',
            }}
          >
            {/* Last Refuel Date Input */}
            <div>
              <label style={{ display: 'block', color: '#f8fafc', fontWeight: 600, marginBottom: '4px' }}>
                📅 Ngày đổ xăng gần nhất:
              </label>
              <input
                type="date"
                value={refuelDate}
                onChange={(e) => setRefuelDate(e.target.value)}
                style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
              />
              <small style={{ color: fluidPrimary, marginTop: '3px', display: 'block' }}>
                Đã trôi qua: {daysInt} ngày {hoursRemainder} giờ
              </small>
            </div>

            {/* Daily Consumption Rate Options */}
            <div>
              <label style={{ display: 'block', color: '#f8fafc', fontWeight: 600, marginBottom: '4px' }}>
                🔥 Mức tiêu hao theo ngày:
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { r: 3.5, label: 'Ít đi (3.5%/ngày)' },
                  { r: 6.0, label: 'Chuẩn (6%/ngày)' },
                  { r: 10.0, label: 'Đi nhiều (10%/ngày)' },
                ].map((item) => (
                  <button
                    key={item.r}
                    type="button"
                    onClick={() => setDailyRate(item.r)}
                    style={{
                      padding: '4px 7px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      background: dailyRate === item.r ? fluidPrimary : 'rgba(255, 255, 255, 0.08)',
                      color: dailyRate === item.r ? '#0f172a' : 'var(--mut)',
                      border: 'none',
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <small style={{ color: 'var(--mut)', marginTop: '3px', display: 'block' }}>
                Hao hụt tính toán: −{Math.round(burnedPercent)}% (~{num(burnedLiters)}L)
              </small>
            </div>

            {/* Initial Fill Level */}
            <div>
              <label style={{ display: 'block', color: '#f8fafc', fontWeight: 600, marginBottom: '4px' }}>
                ⛽ Mức nạp lúc đổ:
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
