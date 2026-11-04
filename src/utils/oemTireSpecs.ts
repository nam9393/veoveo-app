import { VehicleCategory, TirePressureSpec } from '../types';

export const barToPsi = (bar: number): number => Math.round(bar * 14.5038);
export const psiToBar = (psi: number): number => Math.round((psi / 14.5038) * 10) / 10;

interface KnownModelSpec {
  keywords: string[];
  category: VehicleCategory;
  modelName: string;
  brand: string;
  wheelCount: 2 | 4;
  frontBar: number;
  rearBar: number;
  recommendationNote: string;
}

const KNOWN_MODELS: KnownModelSpec[] = [
  // Xe máy Honda
  {
    keywords: ['air blade', 'airblade', 'ab125', 'ab150', 'ab160'],
    category: 'motorcycle',
    modelName: 'Honda Air Blade 125/160',
    brand: 'Honda',
    wheelCount: 2,
    frontBar: 2.0,
    rearBar: 2.25,
    recommendationNote: 'Khuyến cáo Honda: Bánh trước 2.0 bar (29 PSI), bánh sau 2.25 bar (33 PSI). Chở 2 người hoặc đồ nặng bơm sau 2.5 bar.',
  },
  {
    keywords: ['sh 125', 'sh 150', 'sh 160', 'sh 350', 'sh mode', 'shmode'],
    category: 'motorcycle',
    modelName: 'Honda SH',
    brand: 'Honda',
    wheelCount: 2,
    frontBar: 2.0,
    rearBar: 2.25,
    recommendationNote: 'Khuyến cáo Honda: Bánh trước 2.0 bar (29 PSI), bánh sau 2.25 bar (33 PSI) bảo đảm êm ái và bám đường tối đa.',
  },
  {
    keywords: ['vision'],
    category: 'motorcycle',
    modelName: 'Honda Vision',
    brand: 'Honda',
    wheelCount: 2,
    frontBar: 2.0,
    rearBar: 2.25,
    recommendationNote: 'Khuyến cáo Honda: Bánh trước 2.0 bar (29 PSI), bánh sau 2.25 bar (33 PSI) giúp tay lái nhẹ và tiết kiệm xăng.',
  },
  {
    keywords: ['lead'],
    category: 'motorcycle',
    modelName: 'Honda Lead',
    brand: 'Honda',
    wheelCount: 2,
    frontBar: 2.0,
    rearBar: 2.25,
    recommendationNote: 'Khuyến cáo Honda: Bánh trước 2.0 bar (29 PSI), bánh sau 2.25 bar (33 PSI).',
  },
  {
    keywords: ['wave', 'blade', 'future', 'winner', 'winner x', 'rsx'],
    category: 'motorcycle',
    modelName: 'Honda Wave / Future / Winner',
    brand: 'Honda',
    wheelCount: 2,
    frontBar: 2.0,
    rearBar: 2.25,
    recommendationNote: 'Khuyến cáo Honda: Bánh trước 2.0 bar (29 PSI), bánh sau 2.25 bar (33 PSI).',
  },

  // Xe máy Yamaha
  {
    keywords: ['exciter', 'ex 150', 'ex 155'],
    category: 'motorcycle',
    modelName: 'Yamaha Exciter 150/155',
    brand: 'Yamaha',
    wheelCount: 2,
    frontBar: 2.0,
    rearBar: 2.3,
    recommendationNote: 'Khuyến cáo Yamaha: Bánh trước 2.0 bar (29 PSI), bánh sau 2.3 bar (33 PSI) tối ưu gia tốc và độ ổn định khi ôm cua.',
  },
  {
    keywords: ['nvx', 'grande', 'janus', 'latte', 'sirius', 'jupiter'],
    category: 'motorcycle',
    modelName: 'Yamaha Scooter / Tay ga',
    brand: 'Yamaha',
    wheelCount: 2,
    frontBar: 2.0,
    rearBar: 2.25,
    recommendationNote: 'Khuyến cáo Yamaha: Bánh trước 2.0 bar (29 PSI), bánh sau 2.25 bar (33 PSI).',
  },

  // Vespa / Piaggio
  {
    keywords: ['vespa', 'sprint', 'primavera', 'gts', 'liberty'],
    category: 'motorcycle',
    modelName: 'Vespa / Piaggio',
    brand: 'Piaggio',
    wheelCount: 2,
    frontBar: 2.0,
    rearBar: 2.2,
    recommendationNote: 'Khuyến cáo Piaggio: Bánh trước 2.0 bar (29 PSI), bánh sau 2.2 bar (32 PSI).',
  },

  // Ô tô Sedan / Hatchback
  {
    keywords: ['vios'],
    category: 'car',
    modelName: 'Toyota Vios',
    brand: 'Toyota',
    wheelCount: 4,
    frontBar: 2.2,
    rearBar: 2.2,
    recommendationNote: 'Khuyến cáo Toyota: 2.2 bar (32 PSI) cả 4 bánh khi tải nhẹ; 2.3 bar (33 PSI) khi chở đủ 5 người.',
  },
  {
    keywords: ['mazda 3', 'mazda 2', 'mazda 6'],
    category: 'car',
    modelName: 'Mazda 3 / 2 / 6',
    brand: 'Mazda',
    wheelCount: 4,
    frontBar: 2.3,
    rearBar: 2.3,
    recommendationNote: 'Khuyến cáo Mazda: 2.3 bar (33 PSI) cả 4 bánh theo tem dán khung cửa trụ B xe.',
  },
  {
    keywords: ['city', 'civic', 'accord'],
    category: 'car',
    modelName: 'Honda City / Civic',
    brand: 'Honda',
    wheelCount: 4,
    frontBar: 2.2,
    rearBar: 2.1,
    recommendationNote: 'Khuyến cáo Honda Ô tô: Trước 2.2 bar (32 PSI), sau 2.1 bar (30 PSI) tối ưu độ bám và êm ái.',
  },
  {
    keywords: ['accent', 'elantra', 'i10', 'grand i10'],
    category: 'car',
    modelName: 'Hyundai Accent / Elantra',
    brand: 'Hyundai',
    wheelCount: 4,
    frontBar: 2.3,
    rearBar: 2.3,
    recommendationNote: 'Khuyến cáo Hyundai: 2.3 bar (33 PSI) cho cả 4 bánh xe.',
  },
  {
    keywords: ['k3', 'cerato', 'soluto', 'morning'],
    category: 'car',
    modelName: 'Kia K3 / Cerato / Soluto',
    brand: 'Kia',
    wheelCount: 4,
    frontBar: 2.3,
    rearBar: 2.3,
    recommendationNote: 'Khuyến cáo Kia: 2.3 bar (33 PSI) cả 4 bánh.',
  },
  {
    keywords: ['camry'],
    category: 'car',
    modelName: 'Toyota Camry',
    brand: 'Toyota',
    wheelCount: 4,
    frontBar: 2.3,
    rearBar: 2.3,
    recommendationNote: 'Khuyến cáo Toyota: 2.3 bar (33 PSI) cho cả 4 bánh.',
  },

  // SUV / Crossover / MPV
  {
    keywords: ['cx-5', 'cx5', 'cx-8', 'cx8', 'cx-30'],
    category: 'suv',
    modelName: 'Mazda CX-5 / CX-8',
    brand: 'Mazda',
    wheelCount: 4,
    frontBar: 2.4,
    rearBar: 2.4,
    recommendationNote: 'Khuyến cáo Mazda: 2.4 bar (35 PSI) cho cả 4 bánh xe vành 19 inch.',
  },
  {
    keywords: ['fortuner', 'innova', 'cross', 'corolla cross'],
    category: 'suv',
    modelName: 'Toyota Fortuner / Cross',
    brand: 'Toyota',
    wheelCount: 4,
    frontBar: 2.3,
    rearBar: 2.4,
    recommendationNote: 'Khuyến cáo Toyota: Trước 2.3 bar (33 PSI), Sau 2.4 bar (35 PSI).',
  },
  {
    keywords: ['santafe', 'santa fe', 'tucson', 'creta', 'custin'],
    category: 'suv',
    modelName: 'Hyundai Santa Fe / Tucson',
    brand: 'Hyundai',
    wheelCount: 4,
    frontBar: 2.4,
    rearBar: 2.4,
    recommendationNote: 'Khuyến cáo Hyundai: 2.4 bar (35 PSI) cho cả 4 bánh xe.',
  },
  {
    keywords: ['cr-v', 'crv'],
    category: 'suv',
    modelName: 'Honda CR-V',
    brand: 'Honda',
    wheelCount: 4,
    frontBar: 2.3,
    rearBar: 2.3,
    recommendationNote: 'Khuyến cáo Honda: 2.3 bar (33 PSI) cả 4 bánh xe.',
  },
  {
    keywords: ['xpander', 'outlander'],
    category: 'suv',
    modelName: 'Mitsubishi Xpander',
    brand: 'Mitsubishi',
    wheelCount: 4,
    frontBar: 2.4,
    rearBar: 2.6,
    recommendationNote: 'Khuyến cáo Mitsubishi: Trước 2.4 bar (35 PSI), Sau 2.6 bar (38 PSI) khi chở 7 người.',
  },
  {
    keywords: ['vf8', 'vf 8', 'vf9', 'vf 9', 'vf7', 'vf 7', 'vf6', 'vf 6'],
    category: 'suv',
    modelName: 'VinFast EV SUV (VF6/VF7/VF8/VF9)',
    brand: 'VinFast',
    wheelCount: 4,
    frontBar: 2.5,
    rearBar: 2.5,
    recommendationNote: 'Khuyến cáo VinFast: 2.5 bar (36 PSI) cả 4 bánh xe để tối ưu tầm hoạt động của pin xe điện.',
  },
  {
    keywords: ['vf3', 'vf 3', 'vf5', 'vf 5'],
    category: 'car',
    modelName: 'VinFast VF3 / VF5 Plus',
    brand: 'VinFast',
    wheelCount: 4,
    frontBar: 2.3,
    rearBar: 2.3,
    recommendationNote: 'Khuyến cáo VinFast: 2.3 bar (33 PSI) cả 4 bánh xe; vành lốp 16 inch.',
  },
  {
    keywords: ['veloz', 'veloz cross', 'yaris cross', 'raize', 'avanza'],
    category: 'suv',
    modelName: 'Toyota Veloz Cross / Yaris Cross / Raize',
    brand: 'Toyota',
    wheelCount: 4,
    frontBar: 2.3,
    rearBar: 2.4,
    recommendationNote: 'Khuyến cáo Toyota: Trước 2.3 bar (33 PSI), Sau 2.4 bar (35 PSI). Khi chở đủ 7 người bơm sau 2.6 bar.',
  },
  {
    keywords: ['xforce', 'attrage'],
    category: 'suv',
    modelName: 'Mitsubishi Xforce / Attrage',
    brand: 'Mitsubishi',
    wheelCount: 4,
    frontBar: 2.3,
    rearBar: 2.3,
    recommendationNote: 'Khuyến cáo Mitsubishi: 2.3 bar (33 PSI) cả 4 bánh xe vành 18 inch.',
  },
  {
    keywords: ['seltos', 'sonet', 'carnival', 'sportage', 'carens'],
    category: 'suv',
    modelName: 'Kia Seltos / Sonet / Carnival',
    brand: 'Kia',
    wheelCount: 4,
    frontBar: 2.4,
    rearBar: 2.4,
    recommendationNote: 'Khuyến cáo Kia: 2.4 bar (35 PSI) cho cả 4 bánh xe.',
  },
  {
    keywords: ['everest', 'territory', 'explorer'],
    category: 'suv',
    modelName: 'Ford Everest / Territory',
    brand: 'Ford',
    wheelCount: 4,
    frontBar: 2.4,
    rearBar: 2.5,
    recommendationNote: 'Khuyến cáo Ford: Trước 2.4 bar (35 PSI), Sau 2.5 bar (36 PSI).',
  },
  {
    keywords: ['hr-v', 'hrv', 'br-v', 'brv'],
    category: 'suv',
    modelName: 'Honda HR-V / BR-V',
    brand: 'Honda',
    wheelCount: 4,
    frontBar: 2.3,
    rearBar: 2.3,
    recommendationNote: 'Khuyến cáo Honda: 2.3 bar (33 PSI) cho cả 4 bánh xe.',
  },

  // Bán tải / Bán tải Pickup
  {
    keywords: ['ranger', 'raptor'],
    category: 'truck',
    modelName: 'Ford Ranger / Raptor',
    brand: 'Ford',
    wheelCount: 4,
    frontBar: 2.4,
    rearBar: 2.6,
    recommendationNote: 'Khuyến cáo Ford: Trước 2.4 bar (35 PSI), Sau 2.6 bar (38 PSI) khi không tải, 2.8 bar (41 PSI) khi tải hàng nặng thùng sau.',
  },
  {
    keywords: ['hilux', 'triton', 'd-max', 'dmax', 'navara', 'bt-50'],
    category: 'truck',
    modelName: 'Xe Bán Tải Pickup',
    brand: 'Bán tải',
    wheelCount: 4,
    frontBar: 2.4,
    rearBar: 2.6,
    recommendationNote: 'Khuyến cáo nhà sản xuất: Trước 2.4 bar (35 PSI), Sau 2.6 bar (38 PSI).',
  },
];

// Fallback defaults per vehicle category
const CATEGORY_DEFAULTS: Record<VehicleCategory, { front: number; rear: number; note: string; wheelCount: 2 | 4 }> = {
  motorcycle: {
    front: 2.0,
    rear: 2.25,
    note: 'Khuyến cáo xe máy tiêu chuẩn: Bánh trước 2.0 bar (29 PSI), bánh sau 2.25 bar (33 PSI).',
    wheelCount: 2,
  },
  car: {
    front: 2.3,
    rear: 2.3,
    note: 'Khuyến cáo ô tô con Sedan/Hatchback: 2.3 bar (33 PSI) cả 4 bánh xe.',
    wheelCount: 4,
  },
  suv: {
    front: 2.4,
    rear: 2.4,
    note: 'Khuyến cáo ô tô gầm cao SUV/Crossover: 2.4 bar (35 PSI) cả 4 bánh xe.',
    wheelCount: 4,
  },
  truck: {
    front: 2.4,
    rear: 2.6,
    note: 'Khuyến cáo xe bán tải/tải nhẹ: Bánh trước 2.4 bar (35 PSI), bánh sau 2.6 bar (38 PSI).',
    wheelCount: 4,
  },
};

export function detectOemTireSpec(
  name: string,
  brand?: string,
  categoryOverride?: VehicleCategory
): TirePressureSpec & { category: VehicleCategory; modelTitle: string } {
  const norm = `${name || ''} ${brand || ''}`.toLowerCase();

  // If user selected explicit category override, filter or fallback to it
  if (categoryOverride) {
    const matched = KNOWN_MODELS.find(
      (m) => m.category === categoryOverride && m.keywords.some((k) => norm.includes(k))
    );
    if (matched) {
      return {
        category: matched.category,
        modelTitle: matched.modelName,
        wheelCount: matched.wheelCount,
        frontBar: matched.frontBar,
        rearBar: matched.rearBar,
        frontPsi: barToPsi(matched.frontBar),
        rearPsi: barToPsi(matched.rearBar),
        recommendationNote: matched.recommendationNote,
      };
    }
    const def = CATEGORY_DEFAULTS[categoryOverride];
    return {
      category: categoryOverride,
      modelTitle: categoryOverride === 'motorcycle' ? 'Xe máy tiêu chuẩn' : 'Ô tô tiêu chuẩn',
      wheelCount: def.wheelCount,
      frontBar: def.front,
      rearBar: def.rear,
      frontPsi: barToPsi(def.front),
      rearPsi: barToPsi(def.rear),
      recommendationNote: def.note,
    };
  }

  // Auto detect by keywords
  for (const m of KNOWN_MODELS) {
    if (m.keywords.some((k) => norm.includes(k))) {
      return {
        category: m.category,
        modelTitle: m.modelName,
        wheelCount: m.wheelCount,
        frontBar: m.frontBar,
        rearBar: m.rearBar,
        frontPsi: barToPsi(m.frontBar),
        rearPsi: barToPsi(m.rearBar),
        recommendationNote: m.recommendationNote,
      };
    }
  }

  // Motorcycle keywords heuristic
  const isMoto = /xe máy|honda|yamaha|vespa|piaggio|sym|suzuki|sh|vision|lead|wave|future|exciter|nvx|grande|janus|scooter|tay ga/i.test(
    norm
  );
  const isSuv = /suv|crossover|cx|crv|fortuner|santafe|tucson|cross|xpander|7 chỗ/i.test(norm);
  const isTruck = /ranger|bán tải|pickup|hilux|triton/i.test(norm);

  const cat: VehicleCategory = isTruck ? 'truck' : isSuv ? 'suv' : isMoto ? 'motorcycle' : 'car';
  const def = CATEGORY_DEFAULTS[cat];

  return {
    category: cat,
    modelTitle: cat === 'motorcycle' ? 'Xe 2 bánh (Xe máy / Tay ga)' : 'Xe 4 bánh (Ô tô)',
    wheelCount: def.wheelCount,
    frontBar: def.front,
    rearBar: def.rear,
    frontPsi: barToPsi(def.front),
    rearPsi: barToPsi(def.rear),
    recommendationNote: def.note,
  };
}

export function evaluateTireStatus(
  currentBar: number,
  oemBar: number
): {
  status: 'ok' | 'low' | 'high';
  label: string;
  badgeClass: string;
  diffBar: number;
  diffPsi: number;
} {
  const diffBar = Math.round((currentBar - oemBar) * 100) / 100;
  const diffPsi = barToPsi(currentBar) - barToPsi(oemBar);

  if (Math.abs(diffBar) <= 0.15) {
    return {
      status: 'ok',
      label: 'Đạt chuẩn OEM an toàn',
      badgeClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
      diffBar,
      diffPsi,
    };
  }

  if (diffBar < -0.15) {
    return {
      status: 'low',
      label: 'Non lốp / Thiếu hơi (Cần bơm)',
      badgeClass: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
      diffBar,
      diffPsi,
    };
  }

  return {
    status: 'high',
    label: 'Căng hơi (Dễ xóc & mòn giữa)',
    badgeClass: 'text-orange-400 bg-orange-950/40 border-orange-500/30',
    diffBar,
    diffPsi,
  };
}
