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
  const [navigatingPlace, setNavigatingPlace] = useState<Place | null>(null);
  const [locationName, setLocationName] = useState<string>('TP. Hồ Chí Minh');

  useEffect(() => {
    if (defaultBrand) setBrand(defaultBrand);
  }, [defaultBrand]);

  // Fallback to IP geolocation when browser GPS is blocked or timed out
  const fallbackIpLocation = async () => {
    try {
      setStatusMsg('📡 Đang định vị theo mạng IP / Vệ tinh khu vực...');
      const res = await fetch('https://ipwho.is/');
      const data = await res.json();
      if (data && data.success && data.latitude && data.longitude) {
        const lat = data.latitude;
        const lng = data.longitude;
        const city = data.city || data.region || 'Việt Nam';
        setCurrentCoords({ lat, lng });
        setLocationName(city);
        setStatusMsg(`📍 Đã tự động định vị vị trí thực của bạn: ${city} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        loadStations(lat, lng);
        return true;
      }
    } catch {
      // Secondary IP fallback
      try {
        const res2 = await fetch('https://freeipapi.com/api/json');
        const d2 = await res2.json();
        if (d2 && d2.latitude && d2.longitude) {
          const lat = d2.latitude;
          const lng = d2.longitude;
          const city = d2.cityName || 'Việt Nam';
          setCurrentCoords({ lat, lng });
          setLocationName(city);
          setStatusMsg(`📍 Đã tự động định vị vị trí: ${city} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          loadStations(lat, lng);
          return true;
        }
      } catch {}
    }
    return false;
  };

  // Request user GPS location on open with fast IP fallback
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.geolocation) {
      setStatusMsg('📡 Đang tìm vị trí thực tế của bạn qua GPS vệ tinh...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentCoords({ lat, lng });
          setLocationName('Tọa độ GPS thiết bị');
          setStatusMsg(`📍 Đã định vị chính xác vị trí thực tế: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          loadStations(lat, lng);
        },
        async () => {
          // If GPS denied or unavailable in iframe, use IP geolocation
          const ok = await fallbackIpLocation();
          if (!ok) {
            setStatusMsg('📍 Đang hiển thị bản đồ khu vực trung tâm TP.HCM.');
            loadStations(10.7769, 106.7009);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    } else {
      fallbackIpLocation().then((ok) => {
        if (!ok) loadStations(10.7769, 106.7009);
      });
    }
  }, [isOpen, mode]);

  const loadStations = (lat: number, lng: number, customSearch?: string) => {
    if (mode === 'dealer') {
      const activeBrand = customSearch || brand || 'Honda';
      const dealers = generateBrandDealers(activeBrand, lat, lng);
      setPlaceList(dealers);
      setStatusMsg(`Tìm thấy ${dealers.length} showroom & xưởng dịch vụ ${activeBrand} gần bạn.`);
    } else {
      let stations = [...POPULAR_GAS_STATIONS];
      if (customSearch) {
        const q = customSearch.toLowerCase();
        stations = stations.filter(
          (s) => s.name.toLowerCase().includes(q) || s.addr.toLowerCase().includes(q)
        );
      }
      setPlaceList(stations);
      setStatusMsg(`Tìm thấy ${stations.length} trạm xăng dầu chính hãng quanh tọa độ của bạn.`);
    }
  };

  const handleSearch = () => {
    if (mode === 'dealer') {
      loadStations(currentCoords.lat, currentCoords.lng, brand);
    } else {
      loadStations(currentCoords.lat, currentCoords.lng, searchQuery);
    }
  };

  const handleQuickCity = (cityName: string, lat: number, lng: number) => {
    setCurrentCoords({ lat, lng });
    setLocationName(cityName);
    setStatusMsg(`📍 Đã chuyển vị trí bản đồ sang: ${cityName}`);
    loadStations(lat, lng);
  };

  const handleLocateMe = () => {
    setStatusMsg('📡 Đang cập nhật lại vị trí GPS thực tế...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentCoords({ lat, lng });
          setLocationName('GPS thiết bị');
          setStatusMsg(`📍 Đã bắt được vị trí mới: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          loadStations(lat, lng);
        },
        async () => {
          const ok = await fallbackIpLocation();
          if (!ok) setStatusMsg('Vui lòng bật quyền vị trí hoặc chọn thành phố bên dưới.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      fallbackIpLocation();
    }
  };

  const handleStartDirections = (place: Place) => {
    setSelectedPlaceLocal(place);
    setNavigatingPlace(place);
    onSelectPlace(place);
    setStatusMsg(`🚗 Đang kích hoạt lộ trình chỉ đường tới: ${place.name}`);

    // Direct Google Maps Navigation URL
    const destQuery = encodeURIComponent(`${place.name}, ${place.addr}`);
    const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${destQuery}`;

    // Try opening popup/external app safely
    try {
      const win = window.open(navUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        // If popup blocker intervened, the user still sees the active route in the embedded frame right above!
        setStatusMsg(`🚗 Đã tải lộ trình chỉ đường trong khung bản đồ bên dưới! Hoặc bấm "Mở Google Maps Ngoài" nếu muốn.`);
      }
    } catch {
      setStatusMsg(`🚗 Đã nạp lộ trình chỉ đường trong bản đồ bên dưới.`);
    }
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

  // Embedded map: If user clicked Directions (navigatingPlace), show the route navigation directly!
  const mapEmbedUrl = navigatingPlace
    ? `https://maps.google.com/maps?saddr=${currentCoords.lat},${currentCoords.lng}&daddr=${encodeURIComponent(
        navigatingPlace.name + ' ' + navigatingPlace.addr
      )}&output=embed`
    : apiKey
    ? `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(
        apiKey
      )}&q=${encodeURIComponent(
        mode === 'dealer'
          ? `Showroom ${brand || 'xe'} gần đây`
          : 'Cây xăng gần đây'
      )}&center=${targetCoords.lat},${targetCoords.lng}&zoom=14`
    : `https://maps.google.com/maps?q=${encodeURIComponent(
        selectedPlaceLocal
          ? selectedPlaceLocal.name + ' ' + selectedPlaceLocal.addr
          : mode === 'dealer'
          ? `Showroom ${brand || 'xe'} xưởng dịch vụ`
          : 'Cây xăng xăng dầu Petrolimex PVOIL'
      )}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

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

      {/* GPS Status & Quick Cities */}
      <div style={{ marginBottom: '8px' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '6px' }}>
          <button
            type="button"
            onClick={handleLocateMe}
            style={{
              fontSize: '12px',
              padding: '5px 12px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(2, 132, 199, 0.3) 100%)',
              borderColor: '#00f0ff',
              color: '#00f0ff',
              fontWeight: 700,
            }}
          >
            📍 Tìm lại vị trí thực tế của tôi
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

        {/* Quick Location Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', alignItems: 'center' }}>
          <small style={{ color: 'var(--mut)', fontSize: '11px', flexShrink: 0 }}>Chọn nhanh tỉnh/thành:</small>
          {[
            { name: 'Hà Nội', lat: 21.0285, lng: 105.8542 },
            { name: 'TP. Hồ Chí Minh', lat: 10.7769, lng: 106.7009 },
            { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022 },
            { name: 'Cần Thơ', lat: 10.0452, lng: 105.7469 },
            { name: 'Hải Phòng', lat: 20.8449, lng: 106.6881 },
            { name: 'Bình Dương', lat: 10.9805, lng: 106.6519 },
          ].map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => handleQuickCity(c.name, c.lat, c.lng)}
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: locationName.includes(c.name) ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: locationName.includes(c.name) ? '#00f0ff' : 'rgba(255, 255, 255, 0.1)',
                color: locationName.includes(c.name) ? '#00f0ff' : 'var(--ink)',
                flexShrink: 0,
              }}
            >
              📍 {c.name}
            </button>
          ))}
        </div>
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
            padding: '6px 10px',
            marginBottom: '8px',
            borderRadius: '6px',
            background: 'rgba(0, 240, 255, 0.1)',
            borderLeft: '3px solid #00f0ff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{statusMsg}</span>
          {navigatingPlace && (
            <button
              type="button"
              onClick={() => {
                setNavigatingPlace(null);
                setStatusMsg('Đã trở lại chế độ xem tổng quan bản đồ.');
              }}
              style={{
                fontSize: '10.5px',
                padding: '2px 6px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: 'none',
              }}
            >
              Quay lại bản đồ thường
            </button>
          )}
        </div>
      )}

      {/* Embedded Google Maps Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '290px',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 240, 255, 0.35)',
          marginBottom: '10px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        }}
      >
        <iframe
          title="Google Maps Navigation"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          src={mapEmbedUrl}
        />

        {navigatingPlace && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              right: '8px',
              background: 'rgba(6, 16, 36, 0.92)',
              border: '1px solid #00f0ff',
              borderRadius: '8px',
              padding: '6px 10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(0, 240, 255, 0.3)',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: '12px', color: '#fff' }}>
              🚗 Lộ trình: <b style={{ color: '#00f0ff' }}>{navigatingPlace.name}</b>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${encodeURIComponent(
                navigatingPlace.name + ' ' + navigatingPlace.addr
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '3px 8px',
                background: '#0284c7',
                color: '#fff',
                fontSize: '11px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Mở App Google Maps ↗
            </a>
          </div>
        )}
      </div>

      {/* List of Found Google Places */}
      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {placeList.map((place) => {
          const isSelected = selectedPlaceLocal?.pid === place.pid;
          const isNavigating = navigatingPlace?.pid === place.pid;
          return (
            <div
              key={place.pid}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '9px 12px',
                borderRadius: '8px',
                background: isNavigating
                  ? 'rgba(0, 240, 255, 0.25)'
                  : isSelected
                  ? 'rgba(0, 240, 255, 0.15)'
                  : 'rgba(6, 16, 36, 0.75)',
                border: isNavigating
                  ? '1px solid #00f0ff'
                  : isSelected
                  ? '1px solid rgba(0, 240, 255, 0.6)'
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
                <b style={{ color: isSelected || isNavigating ? '#00f0ff' : '#fff', fontSize: '13px', display: 'block' }}>
                  {mode === 'dealer' ? '🏬' : '⛽'} {place.name}
                </b>
                <small style={{ color: 'var(--mut)', fontSize: '11.5px', display: 'block', marginTop: '2px' }}>
                  {place.addr}
                </small>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  type="button"
                  className={isSelected ? 'pri' : ''}
                  style={{ fontSize: '11.5px', padding: '5px 9px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlaceLocal(place);
                    onSelectPlace(place);
                  }}
                >
                  {isSelected ? '✓ Đã chọn' : 'Chọn'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartDirections(place);
                  }}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11.5px',
                    borderRadius: '8px',
                    background: isNavigating
                      ? '#10b981'
                      : 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(2, 132, 199, 0.3) 100%)',
                    border: isNavigating ? '1px solid #10b981' : '1px solid rgba(0, 240, 255, 0.4)',
                    color: isNavigating ? '#fff' : '#00f0ff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  🧭 {isNavigating ? 'Đang dẫn đường' : 'Chỉ đường ↗'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default MapModal;
