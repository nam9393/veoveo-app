import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleCategory } from '../types';
import { COMMON_BRANDS } from '../constants';
import { uid } from '../utils/calc';
import { detectOemTireSpec, barToPsi } from '../utils/oemTireSpecs';

interface VehicleFormProps {
  vehicleToEdit: Vehicle | null;
  isOpen: boolean;
  onSave: (vehicle: Vehicle, isEdit: boolean) => void;
  onCancel: () => void;
  canCancel: boolean;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({
  vehicleToEdit,
  isOpen,
  onSave,
  onCancel,
  canCancel,
}) => {
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [odo, setOdo] = useState<number | ''>('');
  const [tank, setTank] = useState<number | ''>('');
  const [cons, setCons] = useState<number | ''>('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<VehicleCategory>('motorcycle');
  const [frontBar, setFrontBar] = useState<number>(2.0);
  const [rearBar, setRearBar] = useState<number>(2.25);
  const [oemNote, setOemNote] = useState<string>('');
  const [wheelCount, setWheelCount] = useState<2 | 4>(2);

  // Initialize form when vehicleToEdit changes
  useEffect(() => {
    if (vehicleToEdit) {
      setName(vehicleToEdit.name || '');
      setPlate(vehicleToEdit.plate || '');
      setOdo(vehicleToEdit.odo != null ? vehicleToEdit.odo : '');
      setTank(vehicleToEdit.tank != null ? vehicleToEdit.tank : '');
      setCons(vehicleToEdit.cons != null ? vehicleToEdit.cons : '');
      setBrand(vehicleToEdit.brand || '');
      const cat = vehicleToEdit.category || 'motorcycle';
      setCategory(cat);
      if (vehicleToEdit.oemTire) {
        setFrontBar(vehicleToEdit.oemTire.frontBar);
        setRearBar(vehicleToEdit.oemTire.rearBar);
        setOemNote(vehicleToEdit.oemTire.recommendationNote);
        setWheelCount(vehicleToEdit.oemTire.wheelCount);
      } else {
        const spec = detectOemTireSpec(vehicleToEdit.name, vehicleToEdit.brand, cat);
        setFrontBar(spec.frontBar);
        setRearBar(spec.rearBar);
        setOemNote(spec.recommendationNote);
        setWheelCount(spec.wheelCount);
      }
    } else {
      setName('');
      setPlate('');
      setOdo('');
      setTank('');
      setCons('');
      setBrand('');
      setCategory('motorcycle');
      const spec = detectOemTireSpec('', '', 'motorcycle');
      setFrontBar(spec.frontBar);
      setRearBar(spec.rearBar);
      setOemNote(spec.recommendationNote);
      setWheelCount(spec.wheelCount);
    }
  }, [vehicleToEdit, isOpen]);

  // Handle vehicle name / brand / category change to detect OEM tire spec
  const handleNameChange = (val: string) => {
    setName(val);
    if (!vehicleToEdit) {
      const spec = detectOemTireSpec(val, brand);
      setCategory(spec.category);
      setFrontBar(spec.frontBar);
      setRearBar(spec.rearBar);
      setOemNote(spec.recommendationNote);
      setWheelCount(spec.wheelCount);
    }
  };

  const handleCategoryChange = (cat: VehicleCategory) => {
    setCategory(cat);
    const spec = detectOemTireSpec(name, brand, cat);
    setFrontBar(spec.frontBar);
    setRearBar(spec.rearBar);
    setOemNote(spec.recommendationNote);
    setWheelCount(spec.wheelCount);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const detected = detectOemTireSpec(name, brand, category);

    const vehicleData: Vehicle = {
      id: vehicleToEdit ? vehicleToEdit.id : uid(),
      name: name.trim(),
      plate: plate.trim() || undefined,
      odo: typeof odo === 'number' ? odo : undefined,
      tank: typeof tank === 'number' ? tank : undefined,
      cons: typeof cons === 'number' ? cons : undefined,
      brand: brand.trim() || undefined,
      category,
      oemTire: {
        frontBar,
        rearBar,
        frontPsi: barToPsi(frontBar),
        rearPsi: barToPsi(rearBar),
        recommendationNote: oemNote || detected.recommendationNote,
        wheelCount,
      },
      currentTirePressures: vehicleToEdit?.currentTirePressures || {
        front: frontBar,
        rear: rearBar,
        fl: frontBar,
        fr: frontBar,
        rl: rearBar,
        rr: rearBar,
      },
      u: Date.now(),
    };

    onSave(vehicleData, !!vehicleToEdit);
  };

  return (
    <div id="vform" className="card">
      <h2 id="vh">{vehicleToEdit ? '✏️ Sửa phương tiện' : '🚗 Thêm phương tiện mới'}</h2>
      <form id="vf" onSubmit={handleSubmit}>
        {/* Vehicle Category Selector */}
        <div className="full" style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--mut)', marginBottom: '6px' }}>
            Phân loại phương tiện
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
            {[
              { id: 'motorcycle', label: '🏍️ Xe máy / Tay ga (2 bánh)' },
              { id: 'car', label: '🚗 Ô tô con Sedan (4 bánh)' },
              { id: 'suv', label: '🚙 Crossover / SUV (4 bánh)' },
              { id: 'truck', label: '🛻 Bán tải / Pickup (4 bánh)' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategoryChange(c.id as VehicleCategory)}
                style={{
                  padding: '7px 8px',
                  fontSize: '11.5px',
                  borderRadius: '8px',
                  background: category === c.id ? 'var(--acc)' : 'rgba(255, 255, 255, 0.05)',
                  color: category === c.id ? 'var(--accT)' : 'var(--ink)',
                  fontWeight: category === c.id ? 700 : 500,
                  border: category === c.id ? '1px solid var(--acc)' : '1px solid var(--line)',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <label className="full">
          Tên đời xe / Model
          <input
            id="vn"
            required
            placeholder="Ví dụ: Honda Air Blade 160, Mazda CX-5, Toyota Vios"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            autoFocus
          />
        </label>

        <label>
          Biển số xe
          <input
            id="vp"
            placeholder="61K-123.45, 59A-888.88"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
          />
        </label>

        <label>
          Số km ODO hiện tại
          <input
            id="vo"
            type="number"
            min="0"
            placeholder="0"
            value={odo}
            onChange={(e) => setOdo(e.target.value === '' ? '' : +e.target.value)}
          />
        </label>

        <label>
          🛢️ Dung tích bình (lít)
          <input
            id="vt"
            type="number"
            step="0.1"
            min="0"
            placeholder="Ví dụ: 4.4L (xe máy) hoặc 50L (ô tô)"
            value={tank}
            onChange={(e) => setTank(e.target.value === '' ? '' : +e.target.value)}
          />
        </label>

        <label>
          ⛽ Tiêu hao chuẩn (L/100km)
          <input
            id="vc"
            type="number"
            step="0.01"
            min="0"
            placeholder="Ví dụ: 2.1 (xe máy) hoặc 6.8 (ô tô)"
            value={cons}
            onChange={(e) => setCons(e.target.value === '' ? '' : +e.target.value)}
          />
        </label>

        <label className="full">
          🏷️ Hãng sản xuất
          <input
            id="vb"
            list="vbrands"
            placeholder="Honda, Yamaha, Toyota, Mazda, VinFast, Ford…"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>

        <datalist id="vbrands">
          {COMMON_BRANDS.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>



        <div className="full row" style={{ marginTop: '8px' }}>
          <button className="pri" type="submit">
            💾 Lưu thông tin xe
          </button>
          {canCancel && (
            <button type="button" id="vcancel" onClick={onCancel}>
              Đóng
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
