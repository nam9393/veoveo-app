import React, { useState } from 'react';
import { GpsRoute } from '../services/gpsTrackingService';

interface RouteMiniMapProps {
  route: GpsRoute;
  compact?: boolean;
}

export const RouteMiniMap: React.FC<RouteMiniMapProps> = ({ route, compact = false }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const waypoints = route.waypoints && route.waypoints.length > 0
    ? route.waypoints
    : [
        { lat: 10.7769, lng: 106.7009, time: 0, speedKmh: 0 },
        { lat: 10.7850, lng: 106.7115, time: 0, speedKmh: 35 },
        { lat: 10.7938, lng: 106.7215, time: 0, speedKmh: 0 },
      ];

  // Calculate latitude and longitude bounding box
  const lats = waypoints.map((w) => w.lat);
  const lngs = waypoints.map((w) => w.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latSpan = Math.max(0.012, maxLat - minLat);
  const lngSpan = Math.max(0.014, maxLng - minLng);

  // SVG dimensions
  const svgWidth = 360;
  const svgHeight = compact ? 150 : 200;
  const padding = 36;

  // Coordinate projection from GPS lat/lng to SVG x/y
  const projectPoint = (lat: number, lng: number) => {
    const x = padding + ((lng - minLng) / lngSpan) * (svgWidth - padding * 2);
    // Invert Y because latitude goes North (+) but SVG Y goes down
    const y = svgHeight - (padding + ((lat - minLat) / latSpan) * (svgHeight - padding * 2));
    return { x, y };
  };

  const projectedPoints = waypoints.map((w) => projectPoint(w.lat, w.lng));
  const polylineStr = projectedPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const startPoint = projectedPoints[0];
  const endPoint = projectedPoints[projectedPoints.length - 1];

  const firstWaypoint = waypoints[0];
  const lastWaypoint = waypoints[waypoints.length - 1];
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${firstWaypoint.lat},${firstWaypoint.lng}&destination=${lastWaypoint.lat},${lastWaypoint.lng}`;

  return (
    <div
      style={{
        marginTop: '10px',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #070d19 0%, #03060f 100%)',
        border: '1.5px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.8)',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes routeDashFlow {
          0% {
            stroke-dashoffset: 40;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes markerPulseGlow {
          0% {
            transform: scale(1);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.4;
          }
          100% {
            transform: scale(1);
            opacity: 0.9;
          }
        }
      `}</style>

      {/* Header bar of mini-map */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '11.5px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#00f0ff' }}>🛰️</span>
          <b style={{ color: '#f8fafc' }}>Bản đồ hành trình GPS</b>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            {waypoints.length} Tọa độ
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(2, 132, 199, 0.25)',
              border: '1px solid #0284c7',
              color: '#38bdf8',
              textDecoration: 'none',
              fontSize: '10.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Mở lộ trình chỉ đường trên Google Maps"
          >
            <span>🗺️ Mở Google Maps</span>
          </a>
        </div>
      </div>

      {/* SVG Vector Polyline Map */}
      <div style={{ position: 'relative', width: '100%', height: `${svgHeight}px`, overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.3s ease',
          }}
        >
          <defs>
            {/* Dark Tile Grid */}
            <pattern id={`mapGrid_${route.id}`} width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
            </pattern>

            {/* Glowing polyline neon filter */}
            <filter id={`polyGlow_${route.id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Map Base Grid & Subtle Waterways */}
          <rect width={svgWidth} height={svgHeight} fill={`url(#mapGrid_${route.id})`} />
          <path
            d={`M -20 ${svgHeight * 0.7} Q ${svgWidth * 0.4} ${svgHeight * 0.4} ${svgWidth + 20} ${svgHeight * 0.8}`}
            fill="none"
            stroke="rgba(30, 58, 138, 0.3)"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Secondary road network background lines */}
          <line x1="0" y1={svgHeight * 0.45} x2={svgWidth} y2={svgHeight * 0.45} stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeDasharray="5 5" />
          <line x1={svgWidth * 0.4} y1="0" x2={svgWidth * 0.4} y2={svgHeight} stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeDasharray="5 5" />

          {/* POLYLINE ROUTE (Background Glow Shadow) */}
          <polyline
            points={polylineStr}
            fill="none"
            stroke="#00f0ff"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.35"
            filter={`url(#polyGlow_${route.id})`}
          />

          {/* POLYLINE ROUTE (Main Neon Line with flowing dashes) */}
          <polyline
            points={polylineStr}
            fill="none"
            stroke="#00f0ff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 4"
            style={{ animation: 'routeDashFlow 1.5s linear infinite' }}
          />

          {/* Intermediate GPS Waypoint nodes */}
          {projectedPoints.map((p, idx) => {
            if (idx === 0 || idx === projectedPoints.length - 1) return null;
            return (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r="2.5"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="1"
              />
            );
          })}

          {/* Start Marker (Green Origin) */}
          {startPoint && (
            <g transform={`translate(${startPoint.x}, ${startPoint.y})`}>
              <circle r="8" fill="#10b981" opacity="0.3" style={{ animation: 'markerPulseGlow 1.8s infinite' }} />
              <circle r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
              <text x="8" y="4" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                Xuất phát
              </text>
            </g>
          )}

          {/* End Marker (Red Flag Destination) */}
          {endPoint && (
            <g transform={`translate(${endPoint.x}, ${endPoint.y})`}>
              <circle r="9" fill="#f43f5e" opacity="0.3" style={{ animation: 'markerPulseGlow 1.8s infinite 0.5s' }} />
              <circle r="5.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
              <text x="-8" y="-9" fill="#fda4af" fontSize="9" fontWeight="bold" fontFamily="sans-serif" textAnchor="end">
                🏁 Đến
              </text>
            </g>
          )}
        </svg>

        {/* Zoom Controls */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            zIndex: 10,
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomLevel((z) => Math.min(2.0, z + 0.25));
            }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f8fafc',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Phóng to bản đồ"
          >
            +
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomLevel((z) => Math.max(0.8, z - 0.25));
            }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f8fafc',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Thu nhỏ bản đồ"
          >
            −
          </button>
        </div>
      </div>

      {/* Telemetry Footer Info */}
      <div
        style={{
          padding: '8px 12px',
          background: 'rgba(3, 7, 18, 0.85)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px',
          fontSize: '11px',
        }}
      >
        <div style={{ color: '#f8fafc' }}>
          <b>{route.startAddr}</b> <span style={{ color: '#00f0ff' }}>➔</span> <b>{route.endAddr}</b>
        </div>
        <div style={{ display: 'flex', gap: '8px', color: 'var(--mut)' }}>
          <span>
            📏 <b style={{ color: '#00f0ff' }}>{route.distanceKm} km</b>
          </span>
          <span>
            ⏱️ <b>{route.durationMins || 25} phút</b>
          </span>
          <span>
            ⛽ <b style={{ color: '#f59e0b' }}>~{route.litersUsed}L xăng</b>
          </span>
        </div>
      </div>
    </div>
  );
};

export default RouteMiniMap;
