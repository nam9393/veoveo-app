export type EntryType = 'fuel' | 'service' | 'other' | 'income';

export type FuelType = 'e10' | 'e5' | 'ron95' | 'other';

export interface Place {
  pid: string;
  name: string;
  addr: string;
  lng: number;
  lat: number;
}

export type VehicleCategory = 'motorcycle' | 'car' | 'suv' | 'truck';

export interface TirePressureSpec {
  frontBar: number;
  rearBar: number;
  frontPsi: number;
  rearPsi: number;
  recommendationNote: string;
  wheelCount: 2 | 4;
  modelTitle?: string;
  category?: VehicleCategory;
}

export interface Vehicle {
  id: string;
  name: string;
  plate?: string;
  odo?: number;
  tank?: number;
  cons?: number;
  brand?: string;
  category?: VehicleCategory;
  oemTire?: TirePressureSpec;
  currentTirePressures?: {
    front?: number;
    rear?: number;
    fl?: number;
    fr?: number;
    rl?: number;
    rr?: number;
  };
  u: number;
}

export interface Entry {
  id: string;
  v: string; // vehicle id
  type: EntryType;
  date: string;
  odo: number;
  note?: string;
  amount: number;
  u: number;
  // fuel specific
  liters?: number;
  price?: number;
  full?: boolean;
  ft?: string;
  place?: Place;
  // service specific
  part?: string;
  ontime?: boolean;
}

export interface Part {
  id: string;
  v: string;
  name: string;
  km: number;
  mo: number;
  odo: number;
  date: string;
  pct: number;
  u: number;
}

export interface AppState {
  vehicles: Vehicle[];
  entries: Entry[];
  parts: Part[];
  cur: string | null;
  tomb: Record<string, number>;
}

export interface BackgroundConfig {
  mode: 'none' | 'preset' | 'img';
  id: string;
  data: string;
  op: number;
  theme?: string;
}

export interface Medal {
  g: 'fuel' | 'service' | 'gen';
  fam: string;
  icon: string;
  name: string;
  desc: string;
  cur: number;
  goal: number;
  when?: string | null;
}

export interface PartInfo {
  pct: number | null;
  dueOdo: number | null;
  remK: number | null;
  dueDate: Date | null;
}
