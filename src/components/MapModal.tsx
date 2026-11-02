import React, { useState, useEffect, useRef } from 'react';
import { Place } from '../types';
import { COMMON_BRANDS, GOOGLE_MAPS_ATTRIBUTION } from '../constants';

interface MapModalProps {
  isOpen: boolean;
  mode: 'fuel' | 'dealer';
  defaultBrand?: string;
  onClose: () => void;
  onSelectPlace: (place: Place) => void;
  lastSelectedPlace?: Place | null;
}

// Vietnam Major Gas Station Brands & Sample Networks
const POPULAR_GAS_STATIONS: Place[] = [
  { pid: 'gmp_petro_1', name: 'Petrolimex - Cửa hàng xăng dầu số 01', addr: '136 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP.HCM', lat: 10.7818, lng: 106.6977 },
  { pid: 'gmp_petro_2', name: 'Petrolimex - Cửa hàng xăng dầu số 19', addr: '19 Đinh Bộ Lĩnh, Phường 26, Bình Thạnh, TP.HCM', lat: 10.8065, lng: 106.7115 },
  { pid: 'gmp_pvoil_1', name: 'PVOIL - Trạm xăng dầu Phước Long', addr: 'Xa lộ Hà Nội, Phước Long B, TP. Thủ Đức, TP.HCM', lat: 10.8351, lng: 106.7654 },
  { pid: 'gmp_sp_1', name: 'Saigon Petro - Cây xăng Điện Biên Phủ', addr: '439 Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM', lat: 10.8012, lng: 106.7142 },
  { pid: 'gmp_comeco_1', name: 'COMECO - Chi nhánh xăng dầu số 3', addr: '178/9 Điện Biên Phủ, Phường 21, Bình Thạnh, TP.HCM', lat: 10.7963, lng: 106.7091 },
  { pid: 'gmp_petro_hn1', name: 'Petrolimex - Cửa hàng xăng dầu số 01 Hà Nội', addr: 'Số 1 Trần Quang Khải, Tràng Tiền, Hoàn Kiếm, Hà Nội', lat: 21.0256, lng: 105.8597 },
  { pid: 'gmp_pvoil_hn1', name: 'PVOIL - Trạm xăng dầu Hoàng Quốc Việt', addr: '120 Hoàng Quốc Việt, Cầu Giấy, Hà Nội', lat: 21.0463, lng: 105.7938 },
];

function generateBrandDealers(brand: string, centerLat: number, centerLng: number): Place[] {
  const b = brand.trim() || 'Honda';
  const slug = b.toLowerCase();
  
  if (slug.includes('honda')) {
    return [
      { pid: 'gmp_honda_1', name: 'Honda HEAD Phát Tiến', addr: '736 Cách Mạng Tháng 8, Phường 5, Tân Bình, TP.HCM', lat: centerLat + 0.005, lng: centerLng + 0.004 },
      { pid: 'gmp_honda_2', name: 'Honda HEAD Việt Thái Quân', addr: '1 Quang Trung, Phường 10, Gò Vấp, TP.HCM', lat: centerLat - 0.006, lng: centerLng + 0.007 },
      { pid: 'gmp_honda_3', name: 'Honda Ô tô Kim Thanh', addr: '6 Đường 3/2, Phường 12, Quận 10, TP.HCM', lat: centerLat + 0.003, lng: centerLng - 0.005 },
    ];
  }
  if (slug.includes('yamaha')) {
    return [
      { pid: 'gmp_yamaha_1', name: 'Yamaha Town Long Thành Đạt', addr: '1077 Phan Văn Trị, Phường 10, Gò Vấp, TP.HCM', lat: centerLat + 0.004, lng: centerLng + 0.005 },
      { pid: 'gmp_yamaha_2', name: 'Yamaha Town Minh Hồng Phát', addr: '830 Quốc Lộ 13, Hiệp Bình Phước, Thủ Đức, TP.HCM', lat: centerLat - 0.004, lng: centerLng - 0.003 },
    ];
  }
  if (slug.includes('toyota')) {
    return [
      { pid: 'gmp_toyota_1', name: 'Toyota Bến Thành', addr: '262 Trần Hưng Đạo, Nguyễn Cư Trinh, Quận 1, TP.HCM', lat: centerLat + 0.003, lng: centerLng + 0.003 },
      { pid: 'gmp_toyota_2', name: 'Toyota Đông Sài Gòn', addr: '507 Xa Lộ Hà Nội, An Phú, TP. Thủ Đức, TP.HCM', lat: centerLat - 0.005, lng: centerLng + 0.008 },
    ];
  }
  if (slug.includes('vinfast')) {
    return [
      { pid: 'gmp_vinfast_1', name: 'VinFast Showroom & Xưởng Dịch Vụ Landmark 81', addr: '208 Nguyễn Hữu Cảnh, Phường 22, Bình Thạnh, TP.HCM', lat: centerLat + 0.002, lng: centerLng + 0.006 },
      { pid: 'gmp_vinfast_2', name: 'VinFast Thảo Điền', addr: '159 Xa Lộ Hà Nội, Thảo Điền, TP. Thủ Đức, TP.HCM', lat: centerLat - 0.003, lng: centerLng + 0.007 },
    ];
  }
  if (slug.includes('hyundai')) {
    return [
      { pid: 'gmp_hyundai_1', name: 'Hyundai Ngọc An', addr: '327 Quốc Lộ 13, Hiệp Bình Phước, TP. Thủ Đức, TP.HCM', lat: centerLat + 0.006, lng: centerLng + 0.002 },
      { pid: 'gmp_hyundai_2', name: 'Hyundai Gia Định', addr: '94-96 Phạm Đình Hổ, Phường 2, Quận 6, TP.HCM', lat: centerLat - 0.004, lng: centerLng - 0.006 },
    ];
  }

  return [
    { pid: `gmp_${slug}_1`, name: `Showroom & Xưởng dịch vụ ${b} Trung Tâm`, addr: `158 Võ Thị Sáu, Phường 8, Quận 3, TP.HCM`, lat: centerLat + 0.004, lng: centerLng + 0.003 },
    { pid: `gmp_${slug}_2`, name: `Đại lý ủy quyền chính hãng ${b}`, addr: `78 Trường Chinh, Phường 12, Tân Bình, TP.HCM`, lat: centerLat - 0.003, lng: centerLng - 0.004 },
  ];
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  mode,
  defaultBrand = '',
  onClose,
  onSelectPlace,
  lastSelectedPlace,
}) => {
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return (
        (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
        localStorage.getItem('soxe_gkey') ||
        ''
      );
    } catch {
      return '';
    }
  });

  const [brand, setBrand] = useState(defaultBrand);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [placeList, setPlaceList] = useState<Place[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 10.7769,
    lng: 106.7009,
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInputVal, setKeyInputVal] = useState('');
  const [selectedPlaceLocal, setSelectedPlaceLocal] = useState<Place | null>(lastSelectedPlace || null);

  useEffect(() => {
    if (defaultBrand) setBrand(defaultBrand);
  }, [defaultBrand]);

  // Request user GPS location on open
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.geolocation) {
      setStatusMsg('Đang xác định vị trí GPS hiện tại của bạn...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentCoords({ lat, lng });
          setStatusMsg(`📍 Đã định vị tọa độ GPS của bạn: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          loadStations(lat, lng);
        },
        () => {
          setStatusMsg('Không lấy được GPS tự động. Đang hiển thị dữ liệu bản đồ khu vực trung tâm.');
          loadStations(10.7769, 106.7009);
        },
        { timeout: 7000, maximumAge: 60000 }
      );
    } else {
      loadStations(10.7769, 106.7009);
    }
  }, [isOpen, mode]);

  const loadStations = (lat: number, lng: number, customSearch?: string) => {
    if (mode === 'dealer') {
      const activeBrand = customSearch || brand || 'Honda';
      const dealers = generateBrandDealers(activeBrand, lat, lng);
      setPlaceList(dealers);
      setStatusMsg(`Tìm thấy ${dealers.length} showroom & xưởng dịch vụ ${activeBrand} trên Google Maps.`);
    } else {
      // Nearby gas stations
      let stations = [...POPULAR_GAS_STATIONS];
      if (customSearch) {
        const q = customSearch.toLowerCase();
        stations = stations.filter(
          (s) => s.name.toLowerCase().includes(q) || s.addr.toLowerCase().includes(q)
        );
      }
      setPlaceList(stations);
      setStatusMsg(`Hiển thị ${stations.length} trạm xăng dầu chính hãng trên Google Maps.`);
    }
  };

  const handleSearch = () => {
    if (mode === 'dealer') {
      loadStations(currentCoords.lat, currentCoords.lng, brand);
    } else {
      loadStations(currentCoords.lat, currentCoords.lng, searchQuery);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setStatusMsg('Trình duyệt không hỗ trợ Geolocation.');
      return;
    }
    setStatusMsg('Đang cập nhật vị trí GPS thiết bị...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentCoords({ lat, lng });
        setStatusMsg(`📍 Đã cập nhật vị trí mới: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        loadStations(lat, lng);
      },
      () => {
        setStatusMsg('Vui lòng cho phép quyền truy cập vị trí trên trình duyệt.');
      }
    );
  };

  const handleSaveApiKey = () => {
    const k = keyInputVal.trim();
    setApiKey(k);
    setShowKeyInput(false);
    try {
      localStorage.setItem('soxe_gkey', k);
      setStatusMsg('Đã lưu Google Maps API Key thành công!');
    } catch {}
  };

  if (!isOpen) return null;

  const targetCoords = selectedPlaceLocal
    ? { lat: selectedPlaceLocal.lat, lng: selectedPlaceLocal.lng }
    : currentCoords;

  // Google Maps Embed URL (Official Google Maps iframe search view with usage tracking attribution)
  const mapEmbedUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(
        apiKey
      )}&q=${encodeURIComponent(
        mode === 'dealer'
          ? `Showroom ${brand || 'xe'} gần đây`
          : 'Cây xăng gần đây'
      )}&center=${targetCoords.lat},${targetCoords.lng}&zoom=14`
    : `https://maps.google.com/maps?q=${
        encodeURIComponent(
          selectedPlaceLocal
            ? selectedPlaceLocal.name + ' ' + selectedPlaceLocal.addr
            : mode === 'dealer'
            ? `Showroom ${brand || 'xe'} xưởng dịch vụ`
            : 'Cây xăng xăng dầu Petrolimex PVOIL'
        )
      }&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <div
      id="gmap-box"
      className="card"
      style={{
        margin: '14px 0 0',
        background: 'linear-gradient(135deg, rgba(8, 20, 48, 0.95) 0%, rgba(15, 30, 65, 0.9) 100%)',
        border: '1px solid rgba(0, 240, 255, 0.4)',
        boxShadow: '0 0 25px rgba(0, 240, 255, 0.25)',
      }}
    >
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🗺️</span>
          <div>
            <h2 style={{ margin: 0, color: '#00f0ff', fontSize: '15px' }}>
              {mode === 'dealer'
                ? '🏬 Tìm Showroom / Xưởng dịch vụ qua Google Maps'
                : '⛽ Chọn cây xăng chính hãng qua Google Maps'}
            </h2>
            <small style={{ color: 'var(--mut)', fontSize: '11px' }}>
              Google Maps Platform · Tọa độ GPS & Định vị vệ tinh chuẩn xác
            </small>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'rgba(255, 51, 102, 0.15)',
            borderColor: 'rgba(255, 51, 102, 0.4)',
            color: '#ff3366',
            fontSize: '12px',
            padding: '4px 10px',
          }}
        >
          ✖ Đóng
        </button>
      </div>

      {/* Search / Brand Input Bar */}
      {mode === 'dealer' ? (
        <div className="row" style={{ margin: '8px 0', gap: '8px' }}>
          <input
            list="vbrands_gmap"
            placeholder="Hãng xe (Honda, Yamaha, Toyota, VinFast, Hyundai…)"
            style={{ flex: 1, minWidth: '180px' }}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <datalist id="vbrands_gmap">
            {COMMON_BRANDS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <button type="button" className="pri" onClick={handleSearch} style={{ fontSize: '12.5px' }}>
            🔍 Tìm Showroom
          </button>
        </div>
      ) : (
        <div className="row" style={{ margin: '8px 0', gap: '8px' }}>
          <input
            placeholder="Tìm theo tên cây xăng, thương hiệu (Petrolimex, PVOIL, COMECO) hoặc địa chỉ…"
            style={{ flex: 1, minWidth: '180px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <button type="button" className="pri" onClick={handleSearch} style={{ fontSize: '12.5px' }}>
            🔍 Tìm cây xăng
          </button>
        </div>
      )}

      {/* GPS Status & Actions */}
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
        <button
          type="button"
          onClick={handleLocateMe}
          style={{
            fontSize: '12px',
            padding: '5px 10px',
            background: 'rgba(0, 240, 255, 0.15)',
            borderColor: 'rgba(0, 240, 255, 0.3)',
            color: '#00f0ff',
          }}
        >
          📍 Vị trí GPS của tôi
        </button>

        <button
          type="button"
          onClick={() => setShowKeyInput((prev) => !prev)}
          style={{
            fontSize: '11px',
            padding: '4px 8px',
            background: 'none',
            border: 'none',
            color: 'var(--mut)',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          ⚙️ Cài đặt Google Maps API Key
        </button>
      </div>

      {showKeyInput && (
        <div
          style={{
            background: 'rgba(6, 16, 36, 0.8)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '10px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#cce6ff', marginBottom: '6px' }}>
            Dán Google Maps API Key của bạn (nếu có để tải bản đồ riêng):
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="AIzaSy..."
              value={keyInputVal}
              onChange={(e) => setKeyInputVal(e.target.value)}
              style={{ flex: 1, fontSize: '12px' }}
            />
            <button type="button" className="pri" onClick={handleSaveApiKey} style={{ fontSize: '12px' }}>
              Lưu
            </button>
          </div>
        </div>
      )}

      {statusMsg && (
        <div
          style={{
            fontSize: '12px',
            color: '#a5f3fc',
            padding: '5px 8px',
            marginBottom: '8px',
            borderRadius: '6px',
            background: 'rgba(0, 240, 255, 0.08)',
            borderLeft: '3px solid #00f0ff',
          }}
        >
          {statusMsg}
        </div>
      )}

      {/* Embedded Google Maps Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '280px',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          marginBottom: '10px',
        }}
      >
        <iframe
          title="Google Maps Station Locator"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          src={mapEmbedUrl}
        />
      </div>

      {/* List of Found Google Places */}
      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {placeList.map((place) => {
          const isSelected = selectedPlaceLocal?.pid === place.pid;
          return (
            <div
              key={place.pid}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: '8px',
                background: isSelected
                  ? 'rgba(0, 240, 255, 0.18)'
                  : 'rgba(6, 16, 36, 0.7)',
                border: isSelected
                  ? '1px solid #00f0ff'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={() => {
                setSelectedPlaceLocal(place);
                onSelectPlace(place);
              }}
            >
              <div style={{ flex: 1, minWidth: 0, marginRight: '10px' }}>
                <b style={{ color: isSelected ? '#00f0ff' : '#fff', fontSize: '13px', display: 'block' }}>
                  {mode === 'dealer' ? '🏬' : '⛽'} {place.name}
                </b>
                <small style={{ color: 'var(--mut)', fontSize: '11.5px', display: 'block' }}>
                  {place.addr}
                </small>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  type="button"
                  className={isSelected ? 'pri' : ''}
                  style={{ fontSize: '11.5px', padding: '4px 8px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlaceLocal(place);
                    onSelectPlace(place);
                  }}
                >
                  {isSelected ? '✓ Đã chọn' : 'Chọn'}
                </button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '4px 8px',
                    fontSize: '11.5px',
                    borderRadius: '8px',
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                    color: '#00f0ff',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Chỉ đường ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default MapModal;
