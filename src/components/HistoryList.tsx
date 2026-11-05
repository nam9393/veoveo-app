import React, { useState } from 'react';
import { Entry, EntryType, Vehicle } from '../types';
import { ENTRY_TYPES, FUEL_TYPES } from '../constants';
import { fmtD, levels, money, num } from '../utils/calc';
import { triggerSkidEffect } from '../utils/sound';
import { RouteMiniMap } from './RouteMiniMap';
import { gpsTrackingService } from '../services/gpsTrackingService';

interface HistoryListProps {
  currentVehicle: Vehicle | null;
  vehicles: Vehicle[];
  entries: Entry[];
  soundEnabled: boolean;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (entryId: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  currentVehicle,
  vehicles,
  entries,
  soundEnabled,
  onEditEntry,
  onDeleteEntry,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [expandedMapEntryId, setExpandedMapEntryId] = useState<string | null>(null);
  const [showMasterMap, setShowMasterMap] = useState<boolean>(false);

  if (!currentVehicle) return null;

  const handleFilterClick = (f: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setFilter(f);
    triggerSkidEffect(e.currentTarget, soundEnabled);
  };

  const toggleKey = (k: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleEntryMap = (entryId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedMapEntryId((prev) => (prev === entryId ? null : entryId));
  };

  const LV = levels(currentVehicle.id, vehicles, entries);

  const vehicleEntries = entries
    .filter((e) => e.v === currentVehicle.id && (filter === 'all' || e.type === filter))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.odo || 0) - (a.odo || 0));

  const years: Record<string, Record<string, Entry[]>> = {};
  vehicleEntries.forEach((e) => {
    const y = e.date.slice(0, 4);
    const m = e.date.slice(0, 7);
    years[y] = years[y] || {};
    (years[y][m] = years[y][m] || []).push(e);
  });

  const sumCategory = (arr: Entry[], type: EntryType) =>
    arr.filter((e) => e.type === type).reduce((sum, e) => sum + e.amount, 0);

  const filterTabs: [string, string][] = [
    ['all', '📋 Tất cả'],
    ['fuel', '⛽ Đổ xăng'],
    ['service', '🔧 Bảo dưỡng'],
    ['other', '🧾 Chi phí khác'],
    ['income', '💰 Thu nhập'],
  ];

  const recentTraveledRoutes = gpsTrackingService.getTraveledRoutes(currentVehicle.id);
  const latestRoute = recentTraveledRoutes[0];

  return (
    <details className="card fold" id="hd" open>
      <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🕘 Lịch sử & Nhật ký hành trình</h2>
      </summary>

      {/* Filter Tabs & Master Map Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <div className="tabs" id="hf" style={{ margin: 0 }}>
          {filterTabs.map(([val, label]) => (
            <button
              key={val}
              type="button"
              data-hf={val}
              aria-pressed={val === filter}
              className={val === filter ? 'active' : ''}
              onClick={(e) => handleFilterClick(val, e)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Button to toggle master GPS route overview */}
        {latestRoute && (
          <button
            type="button"
            onClick={() => setShowMasterMap((prev) => !prev)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: showMasterMap ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
              border: `1.5px solid ${showMasterMap ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}`,
              color: showMasterMap ? '#38bdf8' : '#f8fafc',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🗺️ {showMasterMap ? 'Ẩn bản đồ GPS' : 'Xem bản đồ GPS lộ trình'}</span>
          </button>
        )}
      </div>

      {/* Master GPS Map View at Top of History */}
      {showMasterMap && latestRoute && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 700, marginBottom: '6px' }}>
            🛰️ Tuyến đường xe vừa di chuyển (Tọa độ GPS Polyline trực quan):
          </div>
          <RouteMiniMap route={latestRoute} compact={false} />
        </div>
      )}

      <div id="list">
        {Object.keys(years).length === 0 ? (
          <div className="empty">Chưa có khoản nào.</div>
        ) : (
          Object.keys(years)
            .sort()
            .reverse()
            .map((y) => {
              const months = years[y];
              const yearEntries = Object.values(months).flat();
              const yearExpense = yearEntries
                .filter((e) => e.type !== 'income')
                .reduce((s, e) => s + e.amount, 0);
              const yearIncome = yearEntries
                .filter((e) => e.type === 'income')
                .reduce((s, e) => s + e.amount, 0);
              const yKey = 'Y' + y;
              const isYearOpen = openKeys.has(yKey);

              return (
                <details
                  key={y}
                  className="yr"
                  open={isYearOpen}
                  onToggle={(e) => {
                    const isOpen = (e.currentTarget as HTMLDetailsElement).open;
                    setOpenKeys((prev) => {
                      const next = new Set(prev);
                      if (isOpen) next.add(yKey);
                      else next.delete(yKey);
                      return next;
                    });
                  }}
                >
                  <summary>
                    <span className="st">📆 Năm {y}</span>
                    <span className="sm">
                      {yearEntries.length} khoản · <b>−{money(yearExpense)}</b>
                      {yearIncome > 0 && <b className="in"> +{money(yearIncome)}</b>}
                    </span>
                    <span className="ch2">
                      {(['fuel', 'service', 'other', 'income'] as EntryType[]).map((t) => {
                        const c = sumCategory(yearEntries, t);
                        if (!c) return null;
                        return (
                          <span
                            key={t}
                            className="ch"
                            style={{ color: `var(${ENTRY_TYPES[t].varColor})` }}
                          >
                            {ENTRY_TYPES[t].icon} {t === 'income' ? '+' : ''}
                            {money(c)}
                          </span>
                        );
                      })}
                    </span>
                  </summary>

                  {Object.keys(months)
                    .sort()
                    .reverse()
                    .map((mKey) => {
                      const monthEntries = months[mKey];
                      const monthExpense = monthEntries
                        .filter((e) => e.type !== 'income')
                        .reduce((s, e) => s + e.amount, 0);
                      const monthIncome = monthEntries
                        .filter((e) => e.type === 'income')
                        .reduce((s, e) => s + e.amount, 0);
                      const isMonthOpen = openKeys.has(mKey);

                      return (
                        <details
                          key={mKey}
                          className="mg"
                          open={isMonthOpen}
                          onToggle={(e) => {
                            const isOpen = (e.currentTarget as HTMLDetailsElement).open;
                            setOpenKeys((prev) => {
                              const next = new Set(prev);
                              if (isOpen) next.add(mKey);
                              else next.delete(mKey);
                              return next;
                            });
                          }}
                        >
                          <summary>
                            <span className="st">
                              📅 Tháng {mKey.slice(5)}/{y}
                            </span>
                            <span className="sm">
                              {monthEntries.length} khoản · <b>−{money(monthExpense)}</b>
                              {monthIncome > 0 && <b className="in"> +{money(monthIncome)}</b>}
                            </span>
                            <span className="ch2">
                              {(['fuel', 'service', 'other', 'income'] as EntryType[]).map((t) => {
                                const c = sumCategory(monthEntries, t);
                                if (!c) return null;
                                return (
                                  <span
                                    key={t}
                                    className="ch"
                                    style={{ color: `var(${ENTRY_TYPES[t].varColor})` }}
                                  >
                                    {ENTRY_TYPES[t].icon} {t === 'income' ? '+' : ''}
                                    {money(c)}
                                  </span>
                                );
                              })}
                            </span>
                          </summary>

                          {monthEntries.map((e) => {
                            const T = ENTRY_TYPES[e.type];
                            const isInc = e.type === 'income';
                            const isMapOpen = expandedMapEntryId === e.id;
                            const subParts: string[] = [
                              fmtD(e.date),
                              e.odo ? `${e.odo.toLocaleString('vi-VN')} km` : '',
                            ];

                            if (e.type === 'fuel' && e.liters) {
                              let fuelDetails = `${num(e.liters)} L`;
                              if (e.price) fuelDetails += ` · ${money(e.price)}/L`;
                              if (e.ft && FUEL_TYPES[e.ft]) fuelDetails += ` · ${FUEL_TYPES[e.ft][1]}`;
                              if (e.full) fuelDetails += ` · đầy bình`;
                              if (
                                LV.tank &&
                                LV.m &&
                                LV.m[e.id] &&
                                LV.m[e.id].after !== null
                              ) {
                                fuelDetails += ` · sau đổ ~${Math.round(
                                  (LV.m[e.id].after! / LV.tank) * 100
                                )}%`;
                              }
                              subParts.push(fuelDetails);
                            }

                            if (e.place?.name) {
                              subParts.push(`📍 ${e.place.name}`);
                            }

                            const sub = subParts.filter(Boolean).join(' · ');
                            const entryRoute = gpsTrackingService.getRouteForEntry(
                              currentVehicle.id,
                              e.id,
                              e.date,
                              e.place?.name
                            );

                            return (
                              <div
                                key={e.id}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                  padding: '4px 0',
                                }}
                              >
                                <div
                                  className="item"
                                  onClick={() => toggleEntryMap(e.id)}
                                  style={{
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    padding: '8px 6px',
                                    transition: 'background 0.2s ease',
                                    background: isMapOpen ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                                  }}
                                  title="Nhấp vào mục này để xem bản đồ nhỏ tọa độ GPS Polyline"
                                >
                                  <span
                                    className="tag"
                                    style={{ background: `var(${T.varColor})` }}
                                  />
                                  <div className="t">
                                    <b style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{T.icon} {e.note || T.label}</span>
                                      <span
                                        style={{
                                          fontSize: '10px',
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          background: isMapOpen ? '#0284c7' : 'rgba(255, 255, 255, 0.08)',
                                          color: isMapOpen ? '#fff' : 'var(--mut)',
                                          fontWeight: 600,
                                        }}
                                      >
                                        🗺️ {isMapOpen ? 'Đóng bản đồ' : 'Bản đồ GPS'}
                                      </span>
                                    </b>
                                    <small>
                                      {T.label} · {sub}
                                    </small>
                                  </div>
                                  <span
                                    className="amt"
                                    style={{ color: `var(${T.varColor})` }}
                                  >
                                    {isInc ? '+' : '−'}
                                    {money(e.amount)}
                                  </span>
                                  <button
                                    type="button"
                                    className="lnk"
                                    data-edit={e.id}
                                    aria-label="Sửa khoản này"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      onEditEntry(e);
                                    }}
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    className="lnk"
                                    data-del={e.id}
                                    aria-label="Xóa khoản này"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      onDeleteEntry(e.id);
                                    }}
                                  >
                                    Xóa
                                  </button>
                                </div>

                                {/* INLINE MINI-MAP DIRECTLY INSIDE THIS ENTRY ITEM */}
                                {isMapOpen && (
                                  <div
                                    style={{
                                      padding: '0 8px 10px',
                                      animation: 'fadeIn 0.25s ease',
                                    }}
                                    onClick={(ev) => ev.stopPropagation()}
                                  >
                                    <RouteMiniMap route={entryRoute} compact={true} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </details>
                      );
                    })}
                </details>
              );
            })
        )}
      </div>
    </details>
  );
};
