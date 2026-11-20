import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Search,
  Loader2,
  Sparkles,
  MapPin,
  Zap,
  Shuffle,
  Footprints,
  Milestone,
  Home,
  Briefcase,
  GraduationCap,
  Crosshair,
  Compass,
  Navigation,
  X,
} from 'lucide-react';
import { StopSelector } from './StopSelector.jsx';
import { authService } from '../../../services/authService';
import { passengerService } from '../../../services/passengerService';
import {
  HCM_POPULAR_LOCATIONS,
  findNearestStopsFromCoords,
  removeVietnameseTones,
  resolveAddressToCoords,
  formatDistance,
} from '../utils/routeHelpers.js';
import routePlannerService from '../services/routePlannerService.js';
import './search.css';

export function RouteSearch({
  fromStop,
  setFromStop,
  toStop,
  setToStop,
  criteria = 'least_transfers',
  setCriteria,
  onSwap,
  onSearch,
  loading = false,
  stops = [],
  originWalkInfo = null,
  setOriginWalkInfo,
  destWalkInfo = null,
  setDestWalkInfo,
}) {
  const [savedPlaces, setSavedPlaces] = useState([]);
  // Mặc định BẬT chế độ Tìm theo Vị trí / Địa chỉ & Định vị GPS
  const [smartMode, setSmartMode] = useState(true);

  // Smart location search state
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [originDropdownOpen, setOriginDropdownOpen] = useState(false);
  const [destDropdownOpen, setDestDropdownOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [resolvingBoth, setResolvingBoth] = useState(false);
  const [originStopRoutes, setOriginStopRoutes] = useState([]);
  const [destStopRoutes, setDestStopRoutes] = useState([]);
  const [nominatimOriginResults, setNominatimOriginResults] = useState([]);
  const [nominatimDestResults, setNominatimDestResults] = useState([]);
  const [searchingNominatimOrigin, setSearchingNominatimOrigin] = useState(false);
  const [searchingNominatimDest, setSearchingNominatimDest] = useState(false);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      passengerService
        .getSavedPlaces()
        .then((places) => {
          if (Array.isArray(places)) {
            setSavedPlaces(places.filter((p) => p.nearestStopId));
          }
        })
        .catch(() => {});
    }
  }, []);

  // Tự động gợi ý địa chỉ trực tiếp theo từng chữ gõ (Live Debounced Autocomplete giống Google Maps)
  useEffect(() => {
    if (!originQuery || originQuery.trim().length < 3 || !originDropdownOpen) return;
    const timer = setTimeout(() => {
      searchOpenStreetMapAddress(originQuery, true);
    }, 450);
    return () => clearTimeout(timer);
  }, [originQuery, originDropdownOpen]);

  useEffect(() => {
    if (!destQuery || destQuery.trim().length < 3 || !destDropdownOpen) return;
    const timer = setTimeout(() => {
      searchOpenStreetMapAddress(destQuery, false);
    }, 450);
    return () => clearTimeout(timer);
  }, [destQuery, destDropdownOpen]);

  const presets = [
    {
      label: '📍 401 Lê Đức Thọ ➔ ĐH Công Thương TP.HCM',
      originText: '401 Lê Đức Thọ, Gò Vấp',
      destText: 'Đại học Công Thương TP.HCM',
      isAddressPreset: true,
    },
    { label: 'Bến Thành ➔ BX Chợ Lớn (Tuyến 01)', from: 'TR_01', to: 'TR_08' },
    { label: 'Bến Thành ➔ ĐH Quốc Gia (Tuyến 19)', from: 'TR_01', to: 'TR_20' },
    { label: 'BX Chợ Lớn ➔ Sân bay TSN (Chuyển tuyến)', from: 'TR_08', to: 'TR_13' },
  ];

  const criteriaOptions = [
    { id: 'least_transfers', label: 'Ít chuyển tuyến nhất', icon: Shuffle, desc: 'Ưu tiên tuyến trực tiếp hoặc chuyển 1 lần' },
    { id: 'fastest', label: 'Nhanh nhất', icon: Zap, desc: 'Ưu tiên tổng thời gian di chuyển ngắn nhất' },
    { id: 'fewest_stops', label: 'Ít trạm dừng nhất', icon: Milestone, desc: 'Ưu tiên số trạm dừng trung gian ít nhất' },
  ];

  // Truy vấn danh sách các tuyến xe đi qua 1 bến để hiển thị trong hộp đề xuất bến gần nhất
  const fetchRoutesForSuggestedStop = async (stopId, isOrigin = true) => {
    if (!stopId) return;
    try {
      const res = await routePlannerService.searchByStop(stopId);
      const uniqueRoutes = [];
      const seen = new Set();
      (res?.routes || []).forEach((r) => {
        if (r.maTuyen && !seen.has(r.maTuyen)) {
          seen.add(r.maTuyen);
          uniqueRoutes.push(r);
        }
      });
      if (isOrigin) setOriginStopRoutes(uniqueRoutes);
      else setDestStopRoutes(uniqueRoutes);
    } catch (_) {}
  };

  // Hàm cốt lõi: Người dùng chỉ cần gõ 2 địa chỉ bất kỳ (VD: "401 Lê Đức Thọ" và "Đại học Công Thương TP.HCM")
  // rồi bấm "Tìm lộ trình" -> Tự động định vị GPS cả 2 nơi, tìm 2 bến gần nhất và tìm tuyến xe đi giữa 2 bến đó!
  const handleSmartResolveAndSearch = async (customOriginText, customDestText) => {
    const textA = (customOriginText !== undefined ? customOriginText : originQuery).trim();
    const textB = (customDestText !== undefined ? customDestText : destQuery).trim();

    if (!smartMode) {
      if (onSearch) onSearch(fromStop, toStop, criteria);
      return;
    }

    // Nếu người dùng đã có sẵn fromStop & toStop mà không nhập chữ mới
    if (!textA && !textB && fromStop && toStop) {
      if (onSearch) onSearch(fromStop, toStop, criteria);
      return;
    }

    try {
      setResolvingBoth(true);
      setOriginDropdownOpen(false);
      setDestDropdownOpen(false);

      let finalFromStopId = fromStop;
      let finalToStopId = toStop;

      // 1. Định vị GPS cho Điểm xuất phát (nếu có nhập textA)
      if (textA) {
        const resolvedA = await resolveAddressToCoords(textA, stops);
        if (resolvedA) {
          const nearestA = findNearestStopsFromCoords(resolvedA.lat, resolvedA.lng, stops, 3);
          if (nearestA.length > 0) {
            const bestA = nearestA[0];
            finalFromStopId = bestA.stopId;
            setFromStop(bestA.stopId);
            const walkA = {
              placeName: textA,
              resolvedLabel: resolvedA.resolvedLabel || textA,
              placeAddress: resolvedA.placeAddress,
              lat: resolvedA.lat,
              lng: resolvedA.lng,
              nearestStopId: bestA.stopId,
              nearestStopName: bestA.stopName,
              distanceMeters: bestA.distanceMeters,
              walkMinutes: bestA.walkMinutes,
              alternativeStop: nearestA[1] || null,
            };
            if (setOriginWalkInfo) setOriginWalkInfo(walkA);
            fetchRoutesForSuggestedStop(bestA.stopId, true);
          }
        }
      }

      // 2. Định vị GPS cho Điểm đến (nếu có nhập textB)
      if (textB) {
        const resolvedB = await resolveAddressToCoords(textB, stops);
        if (resolvedB) {
          const nearestB = findNearestStopsFromCoords(resolvedB.lat, resolvedB.lng, stops, 3);
          if (nearestB.length > 0) {
            // Nếu bến gần nhất của Điểm đến vô tình trùng với bến của Điểm đi thì lấy bến gần thứ 2
            let bestB = nearestB[0];
            if (bestB.stopId === finalFromStopId && nearestB.length > 1) {
              bestB = nearestB[1];
            }
            finalToStopId = bestB.stopId;
            setToStop(bestB.stopId);
            const walkB = {
              placeName: textB,
              resolvedLabel: resolvedB.resolvedLabel || textB,
              placeAddress: resolvedB.placeAddress,
              lat: resolvedB.lat,
              lng: resolvedB.lng,
              nearestStopId: bestB.stopId,
              nearestStopName: bestB.stopName,
              distanceMeters: bestB.distanceMeters,
              walkMinutes: bestB.walkMinutes,
              alternativeStop: nearestB.find((s) => s.stopId !== bestB.stopId) || null,
            };
            if (setDestWalkInfo) setDestWalkInfo(walkB);
            fetchRoutesForSuggestedStop(bestB.stopId, false);
          }
        }
      }

      // 3. Tự động gọi thuật toán tìm lộ trình giữa 2 bến vừa định vị được
      if (finalFromStopId && finalToStopId && onSearch) {
        onSearch(finalFromStopId, finalToStopId, criteria);
      }
    } finally {
      setResolvingBoth(false);
    }
  };

  const handleApplyPreset = (p) => {
    if (p.isAddressPreset) {
      setSmartMode(true);
      setOriginQuery(p.originText);
      setDestQuery(p.destText);
      handleSmartResolveAndSearch(p.originText, p.destText);
      return;
    }
    setFromStop(p.from);
    setToStop(p.to);
    setOriginQuery('');
    setDestQuery('');
    if (setOriginWalkInfo) setOriginWalkInfo(null);
    if (setDestWalkInfo) setDestWalkInfo(null);
    if (onSearch) {
      onSearch(p.from, p.to, criteria);
    }
  };

  // Tìm kiếm địa danh thực tế qua OpenStreetMap Nominatim (nếu người dùng gõ địa chỉ bất kỳ)
  const searchOpenStreetMapAddress = async (queryText, isOrigin = true) => {
    if (!queryText || queryText.trim().length < 3) return;
    try {
      if (isOrigin) setSearchingNominatimOrigin(true);
      else setSearchingNominatimDest(true);

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        queryText.trim() + ', Hồ Chí Minh, Việt Nam'
      )}&limit=4`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } });
      if (res.ok) {
        const data = await res.json();
        const mapped = (data || []).map((item, idx) => ({
          id: `OSM_${idx}_${item.place_id}`,
          name: item.display_name.split(',')[0],
          address: item.display_name.split(',').slice(1, 4).join(',').trim(),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          category: 'Bản đồ OSM',
        }));
        if (isOrigin) setNominatimOriginResults(mapped);
        else setNominatimDestResults(mapped);
      }
    } catch (_) {
      // Fallback sang danh sách địa danh nội bộ nếu không có mạng
    } finally {
      if (isOrigin) setSearchingNominatimOrigin(false);
      else setSearchingNominatimDest(false);
    }
  };

  // Khi người dùng chọn một Vị trí / Địa điểm cụ thể -> Tự động tìm Trạm gần nhất & tính khoảng cách đi bộ
  const handleSelectCustomLocation = (locationItem, isOrigin = true) => {
    const nearestList = findNearestStopsFromCoords(locationItem.lat, locationItem.lng, stops, 2);
    if (nearestList.length === 0) return;

    const best = nearestList[0];
    const walkData = {
      placeName: locationItem.name,
      placeAddress: locationItem.address,
      lat: locationItem.lat,
      lng: locationItem.lng,
      nearestStopId: best.stopId,
      nearestStopName: best.stopName,
      distanceMeters: best.distanceMeters,
      walkMinutes: best.walkMinutes,
      alternativeStop: nearestList[1] || null,
    };

    if (isOrigin) {
      setOriginQuery(locationItem.name);
      setOriginDropdownOpen(false);
      setFromStop(best.stopId);
      if (setOriginWalkInfo) setOriginWalkInfo(walkData);
      fetchRoutesForSuggestedStop(best.stopId, true);
      if (toStop && toStop !== best.stopId && onSearch) {
        onSearch(best.stopId, toStop, criteria);
      }
    } else {
      setDestQuery(locationItem.name);
      setDestDropdownOpen(false);
      setToStop(best.stopId);
      if (setDestWalkInfo) setDestWalkInfo(walkData);
      fetchRoutesForSuggestedStop(best.stopId, false);
      if (fromStop && fromStop !== best.stopId && onSearch) {
        onSearch(fromStop, best.stopId, criteria);
      }
    }
  };

  // Lấy GPS thực tế của trình duyệt để tìm trạm xuất phát gần nhất
  const handleUseCurrentGpsAsOrigin = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        handleSelectCustomLocation(
          {
            name: 'Vị trí GPS hiện tại của tôi',
            address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
          true
        );
      },
      () => {
        setGpsLoading(false);
        // Nếu người dùng từ chối quyền GPS trên trình duyệt, giả lập vị trí trung tâm Quận 1 (Phố đi bộ Nguyễn Huệ)
        handleSelectCustomLocation(
          {
            name: 'Vị trí hiện tại (Trung tâm Quận 1)',
            address: 'Phố đi bộ Nguyễn Huệ, Quận 1, TP.HCM',
            lat: 10.7738,
            lng: 106.7042,
          },
          true
        );
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const filterPopularLocations = (q) => {
    if (!q || !q.trim()) return HCM_POPULAR_LOCATIONS.slice(0, 8);
    const norm = removeVietnameseTones(q.trim());
    return HCM_POPULAR_LOCATIONS.filter(
      (loc) =>
        removeVietnameseTones(loc.name).includes(norm) ||
        removeVietnameseTones(loc.address).includes(norm) ||
        removeVietnameseTones(loc.category).includes(norm)
    );
  };

  const getPlaceIcon = (iconName) => {
    switch (iconName) {
      case 'home':
        return <Home size={13} />;
      case 'briefcase':
        return <Briefcase size={13} />;
      case 'school':
        return <GraduationCap size={13} />;
      default:
        return <MapPin size={13} />;
    }
  };

  const isReady = smartMode
    ? Boolean((originQuery.trim() || fromStop) && (destQuery.trim() || toStop))
    : Boolean(fromStop && toStop && fromStop !== toStop);

  return (
    <div className="route-search-card">
      <div className="search-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h3>Tìm đường đi bằng xe buýt TP.HCM</h3>
          <p>
            {smartMode
              ? 'Nhập vị trí, địa danh hoặc dùng GPS — Hệ thống tự động đề xuất trạm xe buýt gần nhất và lộ trình cho bạn'
              : 'Chọn trạm xuất phát và điểm đến để tìm lộ trình di chuyển tối ưu theo nhu cầu của bạn'}
          </p>
        </div>

        {/* Mode Switcher: Tìm theo Vị trí cụ thể vs Chọn Trạm */}
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
          <button
            type="button"
            onClick={() => setSmartMode(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: smartMode ? '#172B4D' : 'transparent',
              color: smartMode ? '#ffffff' : '#475569',
              transition: 'all 0.15s',
            }}
          >
            <Compass size={14} />
            <span>Tìm từ Vị trí / Địa chỉ bất kỳ</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSmartMode(false);
              if (setOriginWalkInfo) setOriginWalkInfo(null);
              if (setDestWalkInfo) setDestWalkInfo(null);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: !smartMode ? '#172B4D' : 'transparent',
              color: !smartMode ? '#ffffff' : '#475569',
              transition: 'all 0.15s',
            }}
          >
            <MapPin size={14} />
            <span>Chọn theo Trạm dừng</span>
          </button>
        </div>
      </div>

      {/* SMART LOCATION SEARCH BOX (Khi bật chế độ Tìm từ vị trí cụ thể) */}
      {smartMode && (
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Footprints size={15} />
              <span>Nhập nơi bạn đang đứng & nơi muốn đến (Hệ thống sẽ tự tìm Trạm xe buýt gần nhất):</span>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentGpsAsOrigin}
              disabled={gpsLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#16866B',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 11px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Crosshair size={13} className={gpsLoading ? 'spinner' : ''} />
              <span>{gpsLoading ? 'Đang định vị...' : '📍 Dùng vị trí GPS của tôi làm Điểm đi'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {/* Ô nhập Vị trí xuất phát */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
                🟢 Vị trí xuất phát của bạn (Địa chỉ, trường học, bệnh viện, chợ...):
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={originQuery}
                  onFocus={() => setOriginDropdownOpen(true)}
                  onChange={(e) => {
                    setOriginQuery(e.target.value);
                    setOriginDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSmartResolveAndSearch();
                    }
                  }}
                  placeholder="Gõ địa chỉ bất kỳ (VD: 401 Lê Đức Thọ, Dinh Độc Lập...)"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #86efac',
                    fontSize: '0.8125rem',
                    background: '#ffffff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => searchOpenStreetMapAddress(originQuery, true)}
                  disabled={searchingNominatimOrigin || originQuery.trim().length < 2}
                  title="Tìm địa chỉ bất kỳ trên bản đồ TP.HCM"
                  style={{
                    background: '#15803d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {searchingNominatimOrigin ? '...' : 'Tìm'}
                </button>
              </div>

              {/* Dropdown gợi ý địa danh Điểm đi */}
              {originDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    marginTop: '4px',
                    maxHeight: '230px',
                    overflowY: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                    <span>CHỌN ĐỊA ĐIỂM ĐỂ ĐỀ XUẤT TRẠM GẦN NHẤT</span>
                    <button type="button" onClick={() => setOriginDropdownOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                      <X size={13} />
                    </button>
                  </div>
                  {[...nominatimOriginResults, ...filterPopularLocations(originQuery)].map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => handleSelectCustomLocation(loc, true)}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <div style={{ fontWeight: 700, color: '#1e293b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>📍 {loc.name}</span>
                        <span style={{ fontSize: '0.68rem', color: '#16a34a', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                          {loc.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{loc.address}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Kết quả đề xuất trạm gần Điểm đi */}
              {originWalkInfo && (
                <div style={{ marginTop: '8px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', padding: '9px 12px', fontSize: '0.76rem', color: '#14532d' }}>
                  <div>
                    🟢 <strong>Bến đón gần nhất từ &quot;{originWalkInfo.placeName}&quot;:</strong>
                    <div style={{ marginTop: '3px', fontSize: '0.82rem', fontWeight: 800, color: '#166534' }}>
                      🚏 {originWalkInfo.nearestStopName} ({originWalkInfo.nearestStopId}) — Cách {formatDistance(originWalkInfo.distanceMeters)} (~{originWalkInfo.walkMinutes} phút)
                    </div>
                  </div>
                  {originStopRoutes.length > 0 && (
                    <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>Các tuyến đón tại bến này:</span>
                      {originStopRoutes.map((r) => (
                        <span
                          key={r.maTuyen}
                          style={{
                            background: r.mauSac || '#15803d',
                            color: '#fff',
                            padding: '1px 7px',
                            borderRadius: '999px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                          }}
                        >
                          Tuyến {r.maTuyen}
                        </span>
                      ))}
                    </div>
                  )}
                  {originWalkInfo.alternativeStop && (
                    <div style={{ marginTop: '5px', fontSize: '0.71rem', color: '#166534' }}>
                      Bến gần thứ 2: <strong>{originWalkInfo.alternativeStop.stopName}</strong> (cách {formatDistance(originWalkInfo.alternativeStop.distanceMeters)}){' '}
                      <button
                        type="button"
                        onClick={() => {
                          const alt = originWalkInfo.alternativeStop;
                          setFromStop(alt.stopId);
                          setOriginWalkInfo({
                            ...originWalkInfo,
                            nearestStopId: alt.stopId,
                            nearestStopName: alt.stopName,
                            distanceMeters: alt.distanceMeters,
                            walkMinutes: alt.walkMinutes,
                          });
                          fetchRoutesForSuggestedStop(alt.stopId, true);
                          if (toStop && onSearch) onSearch(alt.stopId, toStop, criteria);
                        }}
                        style={{ border: 'none', background: 'transparent', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Đổi sang bến này
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ô nhập Vị trí đích đến */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c', marginBottom: '4px' }}>
                🔴 Vị trí bạn muốn đến (Địa chỉ, tòa nhà, khu du lịch, sân bay...):
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={destQuery}
                  onFocus={() => setDestDropdownOpen(true)}
                  onChange={(e) => {
                    setDestQuery(e.target.value);
                    setDestDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSmartResolveAndSearch();
                    }
                  }}
                  placeholder="Gõ điểm đến bất kỳ (VD: Đại học Công Thương TP.HCM...)"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5',
                    fontSize: '0.8125rem',
                    background: '#ffffff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => searchOpenStreetMapAddress(destQuery, false)}
                  disabled={searchingNominatimDest || destQuery.trim().length < 2}
                  title="Tìm địa chỉ bất kỳ trên bản đồ TP.HCM"
                  style={{
                    background: '#b91c1c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {searchingNominatimDest ? '...' : 'Tìm'}
                </button>
              </div>

              {/* Dropdown gợi ý địa danh Điểm đến */}
              {destDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    marginTop: '4px',
                    maxHeight: '230px',
                    overflowY: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                    <span>CHỌN ĐỊA ĐIỂM ĐÍCH ĐỂ ĐỀ XUẤT TRẠM XUỐNG XE</span>
                    <button type="button" onClick={() => setDestDropdownOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                      <X size={13} />
                    </button>
                  </div>
                  {[...nominatimDestResults, ...filterPopularLocations(destQuery)].map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => handleSelectCustomLocation(loc, false)}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <div style={{ fontWeight: 700, color: '#1e293b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>🏁 {loc.name}</span>
                        <span style={{ fontSize: '0.68rem', color: '#b91c1c', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
                          {loc.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{loc.address}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Kết quả đề xuất trạm gần Điểm đến */}
              {destWalkInfo && (
                <div style={{ marginTop: '8px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '9px 12px', fontSize: '0.76rem', color: '#7f1d1d' }}>
                  <div>
                    🔴 <strong>Bến xuống gần nhất tới &quot;{destWalkInfo.placeName}&quot;:</strong>
                    <div style={{ marginTop: '3px', fontSize: '0.82rem', fontWeight: 800, color: '#991b1b' }}>
                      🚏 {destWalkInfo.nearestStopName} ({destWalkInfo.nearestStopId}) — Cách {formatDistance(destWalkInfo.distanceMeters)} (~{destWalkInfo.walkMinutes} phút)
                    </div>
                  </div>
                  {destStopRoutes.length > 0 && (
                    <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>Các tuyến đi tới bến này:</span>
                      {destStopRoutes.map((r) => (
                        <span
                          key={r.maTuyen}
                          style={{
                            background: r.mauSac || '#b91c1c',
                            color: '#fff',
                            padding: '1px 7px',
                            borderRadius: '999px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                          }}
                        >
                          Tuyến {r.maTuyen}
                        </span>
                      ))}
                    </div>
                  )}
                  {destWalkInfo.alternativeStop && (
                    <div style={{ marginTop: '5px', fontSize: '0.71rem', color: '#991b1b' }}>
                      Bến gần thứ 2: <strong>{destWalkInfo.alternativeStop.stopName}</strong> (cách {formatDistance(destWalkInfo.alternativeStop.distanceMeters)}){' '}
                      <button
                        type="button"
                        onClick={() => {
                          const alt = destWalkInfo.alternativeStop;
                          setToStop(alt.stopId);
                          setDestWalkInfo({
                            ...destWalkInfo,
                            nearestStopId: alt.stopId,
                            nearestStopName: alt.stopName,
                            distanceMeters: alt.distanceMeters,
                            walkMinutes: alt.walkMinutes,
                          });
                          fetchRoutesForSuggestedStop(alt.stopId, false);
                          if (fromStop && onSearch) onSearch(fromStop, alt.stopId, criteria);
                        }}
                        style={{ border: 'none', background: 'transparent', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Đổi sang bến này
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selectors Grid */}
      <div className="search-selectors-grid">
        <div className="search-field-wrapper">
          <StopSelector
            label={smartMode ? 'Trạm đón xe được đề xuất (Có thể đổi)' : 'Trạm xuất phát'}
            value={fromStop}
            onChange={(val) => {
              setFromStop(val);
              if (!smartMode && setOriginWalkInfo) setOriginWalkInfo(null);
            }}
            stops={stops}
            placeholder="Chọn trạm xuất phát..."
            iconColor="#16a34a"
            disabled={loading}
          />
        </div>

        <button
          type="button"
          className="search-swap-btn"
          title="Hoán đổi điểm đi và điểm đến"
          onClick={() => {
            onSwap();
            if (setOriginWalkInfo && setDestWalkInfo) {
              const temp = originWalkInfo;
              setOriginWalkInfo(destWalkInfo);
              setDestWalkInfo(temp);
            }
          }}
          disabled={loading || (!fromStop && !toStop)}
        >
          <ArrowLeftRight size={18} />
        </button>

        <div className="search-field-wrapper">
          <StopSelector
            label={smartMode ? 'Trạm xuống xe được đề xuất (Có thể đổi)' : 'Trạm đích'}
            value={toStop}
            onChange={(val) => {
              setToStop(val);
              if (!smartMode && setDestWalkInfo) setDestWalkInfo(null);
            }}
            stops={stops}
            placeholder="Chọn trạm đích đến..."
            iconColor="#dc2626"
            disabled={loading}
          />
        </div>
      </div>

      {/* Criteria Selection Bar */}
      <div style={{ marginTop: '14px', marginBottom: '14px' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} style={{ color: '#2563eb' }} />
          <span>Tiêu chí tối ưu lộ trình:</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          {criteriaOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = criteria === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCriteria && setCriteria(opt.id)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#475569',
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease-in-out',
                }}
                title={opt.desc}
              >
                <Icon size={16} style={{ color: isSelected ? '#2563eb' : '#64748b', shrink: 0 }} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Saved Places Quick Chips (if Passenger logged in) */}
      {savedPlaces.length > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Địa điểm của tôi:</span>
          {savedPlaces.map((place) => (
            <div
              key={place._id || place.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#f1f5f9',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.75rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center' }}>{getPlaceIcon(place.icon)}</span>
              <span style={{ fontWeight: 500, color: '#1e293b' }}>{place.name}:</span>
              <button
                type="button"
                onClick={() => setFromStop(place.nearestStopId)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#16a34a',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '0 2px',
                  textDecoration: 'underline',
                }}
                title={`Đặt ${place.name} làm Điểm đi`}
              >
                Đi
              </button>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <button
                type="button"
                onClick={() => setToStop(place.nearestStopId)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '0 2px',
                  textDecoration: 'underline',
                }}
                title={`Đặt ${place.name} làm Điểm đến`}
              >
                Đến
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action Presets and Submit */}
      <div className="search-actions">
        <div className="search-presets">
          <span className="preset-label">Gợi ý nhanh:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-chip"
              onClick={() => handleApplyPreset(p)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="search-submit-btn"
          onClick={() => handleSmartResolveAndSearch()}
          disabled={loading || resolvingBoth || !isReady}
        >
          {loading || resolvingBoth ? (
            <>
              <Loader2 size={18} className="spinner" />
              <span>{resolvingBoth ? 'Đang định vị GPS & tìm bến gần nhất...' : 'Đang tìm tuyến xe...'}</span>
            </>
          ) : (
            <>
              <Search size={18} />
              <span>{smartMode ? 'Định vị 2 bến gần nhất & Tìm tuyến' : 'Tìm lộ trình'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default RouteSearch;
