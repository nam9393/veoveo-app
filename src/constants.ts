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

export interface CockpitTheme {
  id: string;
  name: string;
  acc: string;
  accText: string;
  cardBorder: string;
  glow: string;
  cardBg: string;
  desc: string;
}

export const COCKPIT_THEMES: Record<string, CockpitTheme> = {
  amber: {
    id: 'amber',
    name: '🌙 Hổ phách đêm (BMW / Mercedes)',
    acc: '#f59e0b',
    accText: '#18181b',
    cardBorder: 'rgba(245, 158, 11, 0.22)',
    glow: 'rgba(245, 158, 11, 0.15)',
    cardBg: 'rgba(18, 14, 10, 0.82)',
    desc: 'Ánh sáng vàng ấm cổ điển, triệt tiêu ánh sáng xanh, chống mỏi mắt tuyệt đối khi lái xe ban đêm.',
  },
  titanium: {
    id: 'titanium',
    name: '🛡️ Thép Titan (Titanium Slate)',
    acc: '#38bdf8',
    accText: '#0f172a',
    cardBorder: 'rgba(56, 189, 248, 0.2)',
    glow: 'rgba(56, 189, 248, 0.12)',
    cardBg: 'rgba(11, 19, 36, 0.82)',
    desc: 'Tông màu xám thép mờ và xanh kim loại dịu nhẹ, sang trọng và không gây chói mắt.',
  },
  emerald: {
    id: 'emerald',
    name: '🍃 Xanh ngọc thư giãn (Emerald)',
    acc: '#10b981',
    accText: '#064e3b',
    cardBorder: 'rgba(16, 185, 129, 0.22)',
    glow: 'rgba(16, 185, 129, 0.15)',
    cardBg: 'rgba(8, 22, 18, 0.82)',
    desc: 'Sắc xanh ngọc mát mắt, tạo cảm giác êm dịu, thư thái cho mắt trong các chuyến đi dài.',
  },
  bronze: {
    id: 'bronze',
    name: '🍂 Đồng hoàng hôn (Warm Bronze)',
    acc: '#fb923c',
    accText: '#1c1917',
    cardBorder: 'rgba(251, 146, 60, 0.22)',
    glow: 'rgba(251, 146, 60, 0.15)',
    cardBg: 'rgba(22, 14, 10, 0.82)',
    desc: 'Tông màu nội thất da Nappa và gỗ nâu xe sang, ấm cúng và dịu mắt.',
  },
  nordic: {
    id: 'nordic',
    name: '❄️ Xanh lam Bắc Âu (Nordic Blue)',
    acc: '#60a5fa',
    accText: '#0f172a',
    cardBorder: 'rgba(96, 165, 250, 0.2)',
    glow: 'rgba(96, 165, 250, 0.12)',
    cardBg: 'rgba(10, 18, 38, 0.82)',
    desc: 'Sắc xanh dịu mát trung tính, hiện đại và không chói mắt.',
  },
};

export const PRESET_BACKGROUNDS = [
  {
    id: 'luxury-cabin',
    name: '🚗 Khoang lái xe sang (Đêm)',
    theme: 'bronze',
    svg: SV(
      '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070c18"/><stop offset="1" stop-color="#182030"/></linearGradient><linearGradient id="dash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241e17"/><stop offset="1" stop-color="#0c0a08"/></linearGradient><linearGradient id="warmLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fb923c" stop-opacity="0.2"/><stop offset="0.5" stop-color="#f59e0b" stop-opacity="0.8"/><stop offset="1" stop-color="#fb923c" stop-opacity="0.2"/></linearGradient></defs><rect width="800" height="500" fill="url(#sky)"/><path d="M0 240 Q400 190 800 240 L800 500 L0 500 Z" fill="url(#dash)"/><path d="M0 240 Q400 190 800 240" stroke="url(#warmLine)" stroke-width="3" fill="none" opacity="0.85"/><circle cx="400" cy="460" r="140" fill="none" stroke="#332a21" stroke-width="24"/><circle cx="400" cy="460" r="130" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="140 100" opacity="0.5"/><path d="M300 460 L500 460" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/><circle cx="210" cy="310" r="55" fill="#140f0c" stroke="#f59e0b" stroke-width="2" opacity="0.85"/><text x="210" y="305" text-anchor="middle" fill="#fbbf24" font-size="20" font-family="sans-serif" font-weight="bold">85</text><text x="210" y="325" text-anchor="middle" fill="#a8a29e" font-size="10" font-family="sans-serif">KM/H</text><circle cx="590" cy="310" r="55" fill="#140f0c" stroke="#fb923c" stroke-width="2" opacity="0.85"/><text x="590" y="305" text-anchor="middle" fill="#fb923c" font-size="20" font-family="sans-serif" font-weight="bold">2.4</text><text x="590" y="325" text-anchor="middle" fill="#a8a29e" font-size="10" font-family="sans-serif">RPM x1000</text>'
    ),
  },
  {
    id: 'highway-drive',
    name: '🛣️ Kính lái cao tốc (Ngày)',
    theme: 'titanium',
    svg: SV(
      '<defs><linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="0.6" stop-color="#60a5fa"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient><linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="800" height="500" fill="url(#sky2)"/><polygon points="0,500 0,310 800,310 800,500" fill="#1e293b"/><polygon points="380,310 420,310 740,500 60,500" fill="url(#road)"/><line x1="400" y1="315" x2="400" y2="500" stroke="#facc15" stroke-width="5" stroke-dasharray="35 25"/><line x1="280" y1="500" x2="390" y2="315" stroke="#ffffff" stroke-width="2" stroke-dasharray="25 20" opacity="0.6"/><line x1="520" y1="500" x2="410" y2="315" stroke="#ffffff" stroke-width="2" stroke-dasharray="25 20" opacity="0.6"/><path d="M0 450 Q400 420 800 450 L800 500 L0 500 Z" fill="#0b1120" opacity="0.95"/>'
    ),
  },
  {
    id: 'city-night',
    name: '🌃 Phố đêm qua kính lái',
    theme: 'amber',
    svg: SV(
      '<defs><linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070a14"/><stop offset="1" stop-color="#1c1917"/></linearGradient></defs><rect width="800" height="500" fill="url(#night)"/><circle cx="160" cy="220" r="40" fill="#f59e0b" opacity="0.35"/><circle cx="280" cy="250" r="30" fill="#ef4444" opacity="0.35"/><circle cx="520" cy="230" r="35" fill="#fde047" opacity="0.3"/><circle cx="680" cy="260" r="45" fill="#fb923c" opacity="0.3"/><polygon points="370,270 430,270 780,500 20,500" fill="#0c0e14"/><line x1="400" y1="275" x2="400" y2="500" stroke="#fde047" stroke-width="6" stroke-dasharray="30 20" opacity="0.75"/><circle cx="370" cy="340" r="6" fill="#ef4444"/><circle cx="430" cy="340" r="6" fill="#ef4444"/><path d="M0 430 Q400 395 800 430 L800 500 L0 500 Z" fill="#070a12"/>'
    ),
  },
  {
    id: 'ev-cockpit',
    name: '⚡ Taplo xe điện hiện đại (EV)',
    theme: 'nordic',
    svg: SV(
      '<defs><linearGradient id="evbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1329"/><stop offset="1" stop-color="#030712"/></linearGradient><linearGradient id="blueLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#38bdf8" stop-opacity="0"/><stop offset="0.5" stop-color="#38bdf8"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></linearGradient></defs><rect width="800" height="500" fill="url(#evbg)"/><rect x="220" y="220" width="360" height="180" rx="16" fill="#0d1b33" stroke="#38bdf8" stroke-width="1.5" opacity="0.9"/><rect x="240" y="240" width="320" height="2" fill="url(#blueLine)"/><text x="270" y="310" fill="#38bdf8" font-size="36" font-family="sans-serif" font-weight="bold">68</text><text x="325" y="310" fill="#94a3b8" font-size="13" font-family="sans-serif">km/h</text><text x="470" y="310" fill="#10b981" font-size="28" font-family="sans-serif" font-weight="bold">88%</text><text x="470" y="330" fill="#94a3b8" font-size="11" font-family="sans-serif">PIN KHẢ DỤNG</text><path d="M0 430 Q400 380 800 430 L800 500 L0 500 Z" fill="#070d1a"/>'
    ),
  },
  {
    id: 'sunset-drive',
    name: '🌅 Hoàng hôn ven biển',
    theme: 'amber',
    svg: SV(
      '<defs><linearGradient id="sunsetGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b1d54"/><stop offset="0.5" stop-color="#c2410c"/><stop offset="1" stop-color="#fde047"/></linearGradient></defs><rect width="800" height="500" fill="url(#sunsetGrad)"/><circle cx="400" cy="270" r="65" fill="#fef3c7" opacity="0.95"/><polygon points="0,500 0,320 800,320 800,500" fill="#1e1b4b"/><polygon points="360,320 440,320 760,500 40,500" fill="#0f172a"/><line x1="400" y1="325" x2="400" y2="500" stroke="#fde047" stroke-width="5" stroke-dasharray="28 20"/><path d="M0 450 Q400 420 800 450 L800 500 L0 500 Z" fill="#090d16"/>'
    ),
  },
  {
    id: 'rain-drive',
    name: '🌧️ Lái xe trời mưa êm dịu',
    theme: 'titanium',
    svg: SV(
      '<defs><linearGradient id="rainbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050914"/><stop offset="1" stop-color="#111827"/></linearGradient></defs><rect width="800" height="500" fill="url(#rainbg)"/><circle cx="220" cy="260" r="28" fill="#f87171" opacity="0.35"/><circle cx="360" cy="280" r="20" fill="#facc15" opacity="0.3"/><circle cx="480" cy="270" r="24" fill="#60a5fa" opacity="0.3"/><circle cx="600" cy="250" r="32" fill="#fb923c" opacity="0.3"/><path d="M120 180 Q122 195 120 210 M280 140 Q282 155 280 170 M450 160 Q452 175 450 190 M640 190 Q642 205 640 220" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" opacity="0.6"/><polygon points="380,310 420,310 750,500 50,500" fill="#030712"/><line x1="400" y1="315" x2="400" y2="500" stroke="#fbbf24" stroke-width="5" stroke-dasharray="30 20" opacity="0.7"/><path d="M0 440 Q400 410 800 440 L800 500 L0 500 Z" fill="#03060f"/>'
    ),
  },
  {
    id: 'sport-carbon',
    name: '🏎️ Vô lăng thể thao Carbon',
    theme: 'bronze',
    svg: SV(
      '<defs><linearGradient id="darkC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#141a29"/><stop offset="1" stop-color="#050811"/></linearGradient><linearGradient id="amberG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#b45309"/></linearGradient></defs><rect width="800" height="500" fill="url(#darkC)"/><circle cx="400" cy="480" r="170" fill="none" stroke="#1f2937" stroke-width="32"/><circle cx="400" cy="480" r="170" fill="none" stroke="url(#amberG)" stroke-width="3" stroke-dasharray="80 140"/><circle cx="400" cy="480" r="70" fill="#090d16" stroke="#f59e0b" stroke-width="2"/><rect x="396" y="310" width="8" height="30" fill="#f59e0b" rx="4"/><text x="400" y="475" text-anchor="middle" fill="#f59e0b" font-size="18" font-family="sans-serif" font-weight="bold">SPORT</text><text x="400" y="495" text-anchor="middle" fill="#9ca3af" font-size="11" font-family="sans-serif">MODE ACTIVE</text>'
    ),
  },
  {
    id: 'dark-minimal',
    name: '🌑 Tối giản Carbon cao cấp',
    theme: 'titanium',
    svg: SV(
      '<defs><linearGradient id="slateGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#020617"/></linearGradient></defs><rect width="800" height="500" fill="url(#slateGrad)"/><line x1="0" y1="360" x2="800" y2="360" stroke="#1e293b" stroke-width="2"/><circle cx="400" cy="360" r="280" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="10 10"/>'
    ),
  },
];

export const GOOGLE_MAPS_ATTRIBUTION = 'gmp_mcp_codeassist_v1_aistudio';
export const DEF_CID =
  '1032619748060-172d176jjc9bkat78g547rt2vcen3t2c.apps.googleusercontent.com';

