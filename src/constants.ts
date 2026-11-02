import { FuelType, EntryType } from './types';

export const FUEL_TYPES: Record<string, [string, string]> = {
  e10: ['E10 RON95', 'E10'],
  e5: ['E5 RON92', 'E5'],
  ron95: ['RON95 khoáng', 'RON95'],
  other: ['Loại khác', 'Khác'],
};

export const ENTRY_TYPES: Record<EntryType, { label: string; varColor: string; icon: string }> = {
  fuel: { label: 'Đổ xăng', varColor: '--fuel', icon: '⛽' },
  service: { label: 'Bảo dưỡng', varColor: '--svc', icon: '🔧' },
  other: { label: 'Chi phí khác', varColor: '--oth', icon: '🧾' },
  income: { label: 'Thu nhập', varColor: '--in', icon: '💰' },
};

export const COMMON_BRANDS = [
  'Honda',
  'Yamaha',
  'Suzuki',
  'SYM',
  'Piaggio',
  'Vespa',
  'VinFast',
  'Toyota',
  'Hyundai',
  'Kia',
  'Mazda',
  'Ford',
  'Mitsubishi',
  'Mercedes-Benz',
  'BMW',
  'Honda ô tô',
];

export const COMMON_PART_NAMES = [
  'Nhớt máy',
  'Bugi',
  'Lọc gió động cơ',
  'Lọc gió điều hòa',
  'Lọc nhớt',
  'Lọc xăng',
  'Má phanh',
  'Dầu phanh',
  'Dây curoa',
  'Nước làm mát',
  'Lốp trước',
  'Lốp sau',
  'Ắc quy',
];

export const SV = (b: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">${b}</svg>`;

export const PRESET_BACKGROUNDS = [
  {
    id: 'luxury-cabin',
    name: '🚗 Khoang lái xe sang (Đêm)',
    svg: SV(
      '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a18"/><stop offset="1" stop-color="#141f36"/></linearGradient><linearGradient id="dash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18263e"/><stop offset="1" stop-color="#090f1a"/></linearGradient><linearGradient id="neon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00f0ff"/><stop offset="0.5" stop-color="#3b82f6"/><stop offset="1" stop-color="#00f0ff"/></linearGradient></defs><rect width="800" height="500" fill="url(#sky)"/><path d="M0 240 Q400 190 800 240 L800 500 L0 500 Z" fill="url(#dash)"/><path d="M0 240 Q400 190 800 240" stroke="url(#neon)" stroke-width="3" fill="none" opacity="0.85"/><circle cx="400" cy="460" r="140" fill="none" stroke="#223354" stroke-width="24"/><circle cx="400" cy="460" r="130" fill="none" stroke="#00f0ff" stroke-width="3" stroke-dasharray="140 100" opacity="0.6"/><path d="M300 460 L500 460" stroke="#00f0ff" stroke-width="6" stroke-linecap="round"/><circle cx="210" cy="310" r="55" fill="#080e1a" stroke="#00f0ff" stroke-width="3" opacity="0.8"/><text x="210" y="305" text-anchor="middle" fill="#00f0ff" font-size="20" font-family="sans-serif" font-weight="bold">85</text><text x="210" y="325" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="sans-serif">KM/H</text><circle cx="590" cy="310" r="55" fill="#080e1a" stroke="#3b82f6" stroke-width="3" opacity="0.8"/><text x="590" y="305" text-anchor="middle" fill="#3b82f6" font-size="20" font-family="sans-serif" font-weight="bold">2.4</text><text x="590" y="325" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="sans-serif">RPM x1000</text>'
    ),
  },
  {
    id: 'highway-drive',
    name: '🛣️ Kính lái cao tốc (Ngày)',
    svg: SV(
      '<defs><linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="0.6" stop-color="#60a5fa"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient><linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="800" height="500" fill="url(#sky2)"/><polygon points="0,500 0,310 800,310 800,500" fill="#1e293b"/><polygon points="380,310 420,310 740,500 60,500" fill="url(#road)"/><line x1="400" y1="315" x2="400" y2="500" stroke="#facc15" stroke-width="5" stroke-dasharray="35 25"/><line x1="280" y1="500" x2="390" y2="315" stroke="#ffffff" stroke-width="2" stroke-dasharray="25 20" opacity="0.6"/><line x1="520" y1="500" x2="410" y2="315" stroke="#ffffff" stroke-width="2" stroke-dasharray="25 20" opacity="0.6"/><path d="M0 450 Q400 420 800 450 L800 500 L0 500 Z" fill="#0b1120" opacity="0.95"/>'
    ),
  },
  {
    id: 'city-night',
    name: '🌃 Phố đêm qua kính lái',
    svg: SV(
      '<defs><linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050814"/><stop offset="1" stop-color="#1e1b4b"/></linearGradient></defs><rect width="800" height="500" fill="url(#night)"/><circle cx="160" cy="220" r="40" fill="#f59e0b" opacity="0.3"/><circle cx="280" cy="250" r="30" fill="#ef4444" opacity="0.4"/><circle cx="520" cy="230" r="35" fill="#38bdf8" opacity="0.3"/><circle cx="680" cy="260" r="45" fill="#fbbf24" opacity="0.25"/><polygon points="370,270 430,270 780,500 20,500" fill="#090d16"/><line x1="400" y1="275" x2="400" y2="500" stroke="#fef08a" stroke-width="6" stroke-dasharray="30 20" opacity="0.8"/><circle cx="370" cy="340" r="6" fill="#ef4444"/><circle cx="430" cy="340" r="6" fill="#ef4444"/><path d="M0 430 Q400 395 800 430 L800 500 L0 500 Z" fill="#040711"/>'
    ),
  },
  {
    id: 'ev-cockpit',
    name: '⚡ Taplo xe điện hiện đại (EV)',
    svg: SV(
      '<defs><linearGradient id="evbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#080f1e"/><stop offset="1" stop-color="#020617"/></linearGradient><linearGradient id="cyanLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00f0ff" stop-opacity="0"/><stop offset="0.5" stop-color="#00f0ff"/><stop offset="1" stop-color="#00f0ff" stop-opacity="0"/></linearGradient></defs><rect width="800" height="500" fill="url(#evbg)"/><rect x="220" y="220" width="360" height="180" rx="16" fill="#091426" stroke="#00f0ff" stroke-width="2" opacity="0.9"/><rect x="240" y="240" width="320" height="2" fill="url(#cyanLine)"/><text x="270" y="310" fill="#00f0ff" font-size="36" font-family="sans-serif" font-weight="bold">68</text><text x="325" y="310" fill="#94a3b8" font-size="13" font-family="sans-serif">km/h</text><text x="470" y="310" fill="#10b981" font-size="28" font-family="sans-serif" font-weight="bold">88%</text><text x="470" y="330" fill="#94a3b8" font-size="11" font-family="sans-serif">PIN KHẢ DỤNG</text><path d="M0 430 Q400 380 800 430 L800 500 L0 500 Z" fill="#070c18"/>'
    ),
  },
  {
    id: 'sunset-drive',
    name: '🌅 Hoàng hôn ven biển',
    svg: SV(
      '<defs><linearGradient id="sunsetGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c1d95"/><stop offset="0.5" stop-color="#ea580c"/><stop offset="1" stop-color="#fef08a"/></linearGradient></defs><rect width="800" height="500" fill="url(#sunsetGrad)"/><circle cx="400" cy="270" r="65" fill="#fffbeb" opacity="0.9"/><polygon points="0,500 0,320 800,320 800,500" fill="#1e1b4b"/><polygon points="360,320 440,320 760,500 40,500" fill="#0f172a"/><line x1="400" y1="325" x2="400" y2="500" stroke="#fde047" stroke-width="5" stroke-dasharray="28 20"/><path d="M0 450 Q400 420 800 450 L800 500 L0 500 Z" fill="#090d16"/>'
    ),
  },
  {
    id: 'rain-drive',
    name: '🌧️ Lái xe trời mưa êm dịu',
    svg: SV(
      '<defs><linearGradient id="rainbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030712"/><stop offset="1" stop-color="#111827"/></linearGradient></defs><rect width="800" height="500" fill="url(#rainbg)"/><circle cx="220" cy="260" r="28" fill="#f87171" opacity="0.35"/><circle cx="360" cy="280" r="20" fill="#facc15" opacity="0.3"/><circle cx="480" cy="270" r="24" fill="#60a5fa" opacity="0.3"/><circle cx="600" cy="250" r="32" fill="#fb923c" opacity="0.3"/><path d="M120 180 Q122 195 120 210 M280 140 Q282 155 280 170 M450 160 Q452 175 450 190 M640 190 Q642 205 640 220" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" opacity="0.6"/><polygon points="380,310 420,310 750,500 50,500" fill="#030712"/><line x1="400" y1="315" x2="400" y2="500" stroke="#fbbf24" stroke-width="5" stroke-dasharray="30 20" opacity="0.7"/><path d="M0 440 Q400 410 800 440 L800 500 L0 500 Z" fill="#02040a"/>'
    ),
  },
  {
    id: 'sport-carbon',
    name: '🏎️ Vô lăng thể thao Carbon',
    svg: SV(
      '<defs><linearGradient id="darkC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#030712"/></linearGradient><linearGradient id="redG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ef4444"/><stop offset="1" stop-color="#b91c1c"/></linearGradient></defs><rect width="800" height="500" fill="url(#darkC)"/><circle cx="400" cy="480" r="170" fill="none" stroke="#1f2937" stroke-width="32"/><circle cx="400" cy="480" r="170" fill="none" stroke="url(#redG)" stroke-width="4" stroke-dasharray="80 140"/><circle cx="400" cy="480" r="70" fill="#090d16" stroke="#ef4444" stroke-width="3"/><rect x="396" y="310" width="8" height="30" fill="#ef4444" rx="4"/><text x="400" y="475" text-anchor="middle" fill="#ef4444" font-size="18" font-family="sans-serif" font-weight="bold">SPORT</text><text x="400" y="495" text-anchor="middle" fill="#9ca3af" font-size="11" font-family="sans-serif">MODE ACTIVE</text>'
    ),
  },
  {
    id: 'dark-minimal',
    name: '🌑 Tối giản Carbon cao cấp',
    svg: SV(
      '<defs><linearGradient id="slateGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#020617"/></linearGradient></defs><rect width="800" height="500" fill="url(#slateGrad)"/><line x1="0" y1="360" x2="800" y2="360" stroke="#1e293b" stroke-width="2"/><circle cx="400" cy="360" r="280" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="10 10"/>'
    ),
  },
];

export const GOOGLE_MAPS_ATTRIBUTION = 'gmp_mcp_codeassist_v1_aistudio';
export const DEF_CID =
  '1032619748060-172d176jjc9bkat78g547rt2vcen3t2c.apps.googleusercontent.com';
