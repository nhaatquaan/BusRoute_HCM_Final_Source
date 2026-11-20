/**
 * Helper utility functions for Route Planner module
 */

export function formatDistance(meters) {
  if (meters === undefined || meters === null) return '--';
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(minutes) {
  if (minutes === undefined || minutes === null) return '--';
  if (minutes < 60) {
    return `${minutes} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours} giờ ${remainingMins} phút` : `${hours} giờ`;
}

export function formatCurrency(amount) {
  if (!amount && amount !== 0) return '--';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Remove Vietnamese accents for fast fuzzy search
 */
export function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/đ/g, 'd').replace(/Đ/g, 'D');
  return str.toLowerCase();
}

/**
 * Filter items by search text
 */
export function matchSearch(text, query) {
  if (!text || !query) return false;
  const rawText = removeVietnameseTones(text);
  const rawQuery = removeVietnameseTones(query);
  return rawText.includes(rawQuery);
}

/**
 * Tính khoảng cách Haversine giữa 2 tọa độ GPS (trả về mét)
 */
export function calculateDistanceMeters(lat1, lng1, lat2, lng2) {
  const nLat1 = Number(lat1);
  const nLng1 = Number(lng1);
  const nLat2 = Number(lat2);
  const nLng2 = Number(lng2);
  if ([nLat1, nLng1, nLat2, nLng2].some((v) => isNaN(v) || v === 0)) {
    return Infinity;
  }
  const R = 6371000; // Bán kính Trái Đất (m)
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLng = ((nLng2 - nLng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Tìm các trạm xe buýt gần nhất từ một tọa độ GPS (lat, lng)
 */
export function findNearestStopsFromCoords(lat, lng, stops = [], topN = 3) {
  if (!Array.isArray(stops) || stops.length === 0) return [];
  const scored = stops
    .map((s) => {
      const sLat = Number(s.latitude ?? s.vi_do ?? s.lat);
      const sLng = Number(s.longitude ?? s.kinh_do ?? s.lng);
      const distMeters = calculateDistanceMeters(lat, lng, sLat, sLng);
      const walkMinutes = Math.max(1, Math.round(distMeters / 80)); // tốc độ đi bộ trung bình 80m/phút
      return {
        stop: s,
        stopId: s.maTram || s.ma_tram || s.code || s._key || s.id,
        stopName: s.tenTram || s.ten_tram || s.name,
        distanceMeters: distMeters,
        walkMinutes,
      };
    })
    .filter((item) => Number.isFinite(item.distanceMeters))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return scored.slice(0, topN);
}

/**
 * Danh sách địa danh, trường học, bệnh viện, khu thương mại phổ biến tại TP.HCM
 * giúp tìm kiếm tức thì kết hợp cùng OpenStreetMap Nominatim Geocoding
 */
export const HCM_POPULAR_LOCATIONS = [
  { id: 'LOC_01', name: '401 Lê Đức Thọ, Gò Vấp', address: '401 Lê Đức Thọ, Phường 17, Quận Gò Vấp, TP.HCM', lat: 10.8426, lng: 106.6683, category: 'Địa chỉ' },
  { id: 'LOC_02', name: 'Đại học Công Thương TP.HCM (HUIT)', address: '140 Lê Trọng Tấn, Phường Tây Thạnh, Quận Tân Phú, TP.HCM', lat: 10.8069, lng: 106.6288, category: 'Trường học' },
  { id: 'LOC_03', name: 'Chợ Bến Thành (Cửa Nam)', address: 'Đường Lê Lợi, Phường Bến Thành, Quận 1', lat: 10.7725, lng: 106.6980, category: 'Địa danh' },
  { id: 'LOC_04', name: 'Dinh Độc Lập (Hội trường Thống Nhất)', address: '135 Nam Kỳ Khởi Nghĩa, Quận 1', lat: 10.7769, lng: 106.6953, category: 'Địa danh' },
  { id: 'LOC_05', name: 'Nhà thờ Đức Bà & Bưu điện Thành phố', address: '01 Công xã Paris, Bến Nghé, Quận 1', lat: 10.7798, lng: 106.6990, category: 'Địa danh' },
  { id: 'LOC_06', name: 'Phố đi bộ Nguyễn Huệ (Bến Bạch Đằng)', address: 'Đường Nguyễn Huệ, Quận 1', lat: 10.7738, lng: 106.7042, category: 'Địa danh' },
  { id: 'LOC_07', name: 'Tòa nhà Bitexco Financial Tower', address: '02 Hải Triều, Bến Nghé, Quận 1', lat: 10.7717, lng: 106.7044, category: 'Thương mại' },
  { id: 'LOC_08', name: 'Landmark 81 (Vinhomes Central Park)', address: '720A Điện Biên Phủ, Bình Thạnh', lat: 10.7950, lng: 106.7218, category: 'Thương mại' },
  { id: 'LOC_09', name: 'Trường Đại học Bách Khoa TP.HCM (Cơ sở 1)', address: '268 Lý Thường Kiệt, Phường 14, Quận 10', lat: 10.7721, lng: 106.6579, category: 'Trường học' },
  { id: 'LOC_10', name: 'Đại học Khoa học Tự nhiên / ĐH Sài Gòn', address: '227 Nguyễn Văn Cừ, Quận 5', lat: 10.7628, lng: 106.6822, category: 'Trường học' },
  { id: 'LOC_11', name: 'Khu Đô thị Đại học Quốc gia TP.HCM (Làng Đại học)', address: 'Phường Linh Trung, TP. Thủ Đức', lat: 10.8702, lng: 106.8031, category: 'Trường học' },
  { id: 'LOC_12', name: 'Đại học Công nghiệp TP.HCM (IUH - Gò Vấp)', address: '12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp', lat: 10.8222, lng: 106.6875, category: 'Trường học' },
  { id: 'LOC_13', name: 'Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE)', address: '01 Võ Văn Ngân, Linh Chiểu, TP. Thủ Đức', lat: 10.8507, lng: 106.7719, category: 'Trường học' },
  { id: 'LOC_14', name: 'Đại học Kinh tế TP.HCM (UEH)', address: '59C Nguyễn Đình Chiểu, Quận 3', lat: 10.7828, lng: 106.6952, category: 'Trường học' },
  { id: 'LOC_15', name: 'Đại học Văn Lang (Cơ sở 3 - Gò Vấp)', address: '69/68 Đặng Thùy Trâm, Bình Thạnh / Gò Vấp', lat: 10.8275, lng: 106.7001, category: 'Trường học' },
  { id: 'LOC_16', name: 'Đại học Tôn Đức Thắng (Quận 7)', address: '19 Nguyễn Hữu Thọ, Tân Phong, Quận 7', lat: 10.7326, lng: 106.6998, category: 'Trường học' },
  { id: 'LOC_17', name: ' Đại học FPT TP.HCM / Khu Công nghệ cao', address: 'Lô E2a-7, Đường D1, Khu Công nghệ cao, TP. Thủ Đức', lat: 10.8412, lng: 106.8099, category: 'Trường học' },
  { id: 'LOC_18', name: 'Bệnh viện Chợ Rẫy', address: '201B Nguyễn Chí Thanh, Phường 12, Quận 5', lat: 10.7578, lng: 106.6596, category: 'Bệnh viện' },
  { id: 'LOC_19', name: 'Bệnh viện Đại học Y Dược TP.HCM', address: '215 Hồng Bàng, Phường 11, Quận 5', lat: 10.7554, lng: 106.6645, category: 'Bệnh viện' },
  { id: 'LOC_20', name: 'Sân bay Quốc tế Tân Sơn Nhất (Ga Quốc nội)', address: 'Đường Trường Sơn, Phường 2, Tân Bình', lat: 10.8132, lng: 106.6625, category: 'Giao thông' },
  { id: 'LOC_21', name: 'Bến xe Chợ Lớn & Chợ Bình Tây', address: 'Lê Quang Sung, Phường 2, Quận 6', lat: 10.7510, lng: 106.6508, category: 'Giao thông' },
  { id: 'LOC_22', name: 'Bến xe Miền Đông Mới & Khu du lịch Suối Tiên', address: 'Xa lộ Hà Nội, TP. Thủ Đức', lat: 10.8662, lng: 106.8032, category: 'Giao thông' },
  { id: 'LOC_23', name: 'Bến xe An Sương', address: 'Quốc lộ 22, Bà Điểm, Hóc Môn', lat: 10.8442, lng: 106.6134, category: 'Giao thông' },
  { id: 'LOC_24', name: 'Bến xe Quận 8', address: 'Quốc lộ 50, Phường 5, Quận 8', lat: 10.7330, lng: 106.6602, category: 'Giao thông' },
  { id: 'LOC_25', name: 'Ngã tư Hàng Xanh (ĐH HUTECH / Ngoại Thương)', address: 'Xô Viết Nghệ Tĩnh - Điện Biên Phủ, Bình Thạnh', lat: 10.8014, lng: 106.7115, category: 'Giao thông' },
  { id: 'LOC_26', name: 'AEON Mall Tân Phú Celadon', address: '30 Tân Thắng, Sơn Kỳ, Quận Tân Phú', lat: 10.8016, lng: 106.6174, category: 'Thương mại' },
  { id: 'LOC_27', name: 'Lotte Mart Gò Vấp', address: '242 Nguyễn Văn Lượng, Phường 10, Quận Gò Vấp', lat: 10.8382, lng: 106.6689, category: 'Thương mại' },
  { id: 'LOC_28', name: 'Công viên Gia Định / Ngã 6 Gò Vấp', address: 'Hoàng Minh Giám, Phường 3, Quận Gò Vấp', lat: 10.8165, lng: 106.6778, category: 'Địa danh' },
];

/**
 * Trung tâm tọa độ các Quận/Huyện và các tuyến đường lớn tại TP.HCM
 * giúp định vị GPS chính xác kể cả khi người dùng gõ địa chỉ bất kỳ mà OpenStreetMap bị chậm
 */
const HCM_ROAD_AND_DISTRICT_COORDS = [
  { keywords: ['le duc tho', 'nguyen van luong', 'thong nhat', 'phan van tri', 'quang trung', 'go vap', 'nga 6 go vap'], name: 'Khu vực Quận Gò Vấp', lat: 10.8385, lng: 106.6685 },
  { keywords: ['cong thuong', 'huit', 'hufi', 'le trong tan', 'tan ky tan quy', 'tay thanh', 'tan phu', 'au co', 'luy ban bich', 'celadon'], name: 'Khu vực Quận Tân Phú (Lê Trọng Tấn)', lat: 10.8069, lng: 106.6288 },
  { keywords: ['cong nghiep', 'nguyen van bao', 'iuh'], name: 'ĐH Công nghiệp TP.HCM (Gò Vấp)', lat: 10.8222, lng: 106.6875 },
  { keywords: ['bach khoa', 'ly thuong kiet', 'quan 10', '3 thang 2', 'su van hanh', 'thanh thai'], name: 'Khu vực Quận 10', lat: 10.7721, lng: 106.6579 },
  { keywords: ['tan son nhat', 'truong son', 'cong hoa', 'hoang van thu', 'lang cha ca', 'tan binh'], name: 'Khu vực Quận Tân Bình', lat: 10.8050, lng: 106.6625 },
  { keywords: ['an suong', 'quoc lo 22', 'hoc mon', 'ba diem', 'quan 12', 'to ky', 'phan mem quang trung'], name: 'Khu vực An Sương / Quận 12', lat: 10.8442, lng: 106.6134 },
  { keywords: ['thanh loc', 'ha huy giap', 'nguyen oanh', 'nga tu ga'], name: 'Khu vực Thạnh Lộc / Quận 12', lat: 10.8650, lng: 106.6800 },
  { keywords: ['hang xanh', 'xo viet nghe tinh', 'dien bien phu', 'binh thanh', 'hutech', 'landmark', 'van thanh'], name: 'Khu vực Quận Bình Thạnh', lat: 10.8014, lng: 106.7115 },
  { keywords: ['dai hoc quoc gia', 'dhqg', 'lang dai hoc', 'linh trung', 'suoi tien', 'thu duc', 'vo van ngan', 'xa lo ha noi'], name: 'Khu vực TP. Thủ Đức', lat: 10.8662, lng: 106.8032 },
  { keywords: ['cho lon', 'binh tay', 'quan 5', 'quan 6', 'hong bang', 'nguyen trai', 'tran hung dao', 'an dong', 'cho ray'], name: 'Khu vực Quận 5 / Chợ Lớn', lat: 10.7540, lng: 106.6600 },
  { keywords: ['quan 8', 'pham the hien', 'quoc lo 50', 'ta quang buu', 'trung son', 'nguyen van linh', 'quan 7'], name: 'Khu vực Quận 7 / Quận 8', lat: 10.7335, lng: 106.6750 },
  { keywords: ['ben thanh', 'le loi', 'nguyen hue', 'ham nghi', 'dong khoi', 'nam ky khoi nghia', 'dinh doc lap', 'duc ba', 'quan 1', 'quan 3'], name: 'Khu vực Trung tâm Quận 1', lat: 10.7725, lng: 106.6980 },
];

/**
 * Tự động phân giải một chuỗi địa chỉ / tên trường / vị trí bất kỳ tại TP.HCM ra tọa độ GPS (lat, lng)
 * Kết hợp:
 * 1. Khớp trực tiếp với Trạm dừng có sẵn trong MongoDB
 * 2. Khớp với danh mục Địa danh / Trường học / Tuyến đường tại TP.HCM
 * 3. Gọi OpenStreetMap Nominatim Geocoding API theo thời gian thực
 */
export async function resolveAddressToCoords(rawQuery, stops = []) {
  if (!rawQuery || !rawQuery.trim()) return null;
  const clean = rawQuery.trim();
  const norm = removeVietnameseTones(clean);

  // 1. Kiểm tra xem người dùng có nhập đúng mã trạm hoặc tên trạm dừng có sẵn không
  const exactStop = stops.find(
    (s) =>
      removeVietnameseTones(s.maTram || s.ma_tram || s.code || '') === norm ||
      removeVietnameseTones(s.tenTram || s.ten_tram || s.name || '') === norm
  );
  if (exactStop) {
    return {
      placeName: exactStop.tenTram || exactStop.ten_tram || exactStop.name,
      placeAddress: exactStop.diaChi || exactStop.dia_chi || exactStop.address || 'TP.HCM',
      lat: Number(exactStop.latitude ?? exactStop.vi_do ?? exactStop.lat),
      lng: Number(exactStop.longitude ?? exactStop.kinh_do ?? exactStop.lng),
      isDirectStop: true,
      directStopId: exactStop.maTram || exactStop.ma_tram || exactStop.code || exactStop._key,
    };
  }

  // 2. Kiểm tra trong danh sách Địa danh & Trường học phổ biến
  const popularMatch = HCM_POPULAR_LOCATIONS.find(
    (loc) =>
      removeVietnameseTones(loc.name).includes(norm) ||
      norm.includes(removeVietnameseTones(loc.name.split('(')[0].trim())) ||
      removeVietnameseTones(loc.address).includes(norm)
  );
  if (popularMatch) {
    return {
      placeName: clean,
      resolvedLabel: popularMatch.name,
      placeAddress: popularMatch.address,
      lat: popularMatch.lat,
      lng: popularMatch.lng,
    };
  }

  // 3. Thử gọi OpenStreetMap Nominatim Geocoding API thực tế
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const qUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      `${clean}, Hồ Chí Minh, Việt Nam`
    )}&limit=1`;
    const res = await fetch(qUrl, {
      headers: { 'Accept-Language': 'vi' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        if (!isNaN(lat) && !isNaN(lng) && lat >= 10.2 && lat <= 11.3 && lng >= 106.2 && lng <= 107.2) {
          return {
            placeName: clean,
            resolvedLabel: first.display_name.split(',')[0],
            placeAddress: first.display_name.split(',').slice(0, 4).join(', '),
            lat,
            lng,
          };
        }
      }
    }
  } catch (_) {
    // Nếu mạng chậm hoặc Nominatim giới hạn thì xuống bước 4
  }

  // 4. Khớp thông minh theo tên đường / Quận / Trường học tại TP.HCM
  for (const rule of HCM_ROAD_AND_DISTRICT_COORDS) {
    if (rule.keywords.some((kw) => norm.includes(kw))) {
      return {
        placeName: clean,
        resolvedLabel: rule.name,
        placeAddress: `${clean} (${rule.name}, TP.HCM)`,
        lat: rule.lat,
        lng: rule.lng,
      };
    }
  }

  // 5. Kiểm tra khớp một phần với tên trạm hoặc địa chỉ trạm trong MongoDB
  const partialStop = stops.find(
    (s) =>
      removeVietnameseTones(s.tenTram || s.ten_tram || s.name || '').includes(norm) ||
      removeVietnameseTones(s.diaChi || s.dia_chi || s.address || '').includes(norm)
  );
  if (partialStop) {
    return {
      placeName: clean,
      resolvedLabel: partialStop.tenTram || partialStop.ten_tram || partialStop.name,
      placeAddress: partialStop.diaChi || partialStop.dia_chi || partialStop.address,
      lat: Number(partialStop.latitude ?? partialStop.vi_do ?? partialStop.lat),
      lng: Number(partialStop.longitude ?? partialStop.kinh_do ?? partialStop.lng),
    };
  }

  // 6. Fallback an toàn về trung tâm TP.HCM
  return {
    placeName: clean,
    resolvedLabel: `${clean} (Khu vực TP.HCM)`,
    placeAddress: `${clean}, TP. Hồ Chí Minh`,
    lat: 10.7769,
    lng: 106.6953,
  };
}

/**
 * In thông tin Tuyến xe hoặc Lộ trình ra cửa sổ Print / PDF chuẩn đẹp
 */
export function printRouteDocument({ title, subtitle, routeInfo, stops = [], segments = [], metaList = [] }) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Trình duyệt đã chặn cửa sổ bật lên (Pop-up). Vui lòng cho phép Pop-up để in thông tin tuyến xe.');
    return;
  }

  const nowStr = new Date().toLocaleString('vi-VN');
  const metaHtml = metaList
    .map(
      (m) => `
      <div class="meta-box">
        <div class="meta-label">${m.label}</div>
        <div class="meta-value">${m.value}</div>
      </div>`
    )
    .join('');

  const stopsRowsHtml = stops
    .map(
      (s, idx) => `
      <tr>
        <td style="text-align:center;font-weight:bold;">${idx + 1}</td>
        <td><strong>${s.name || s.ten_tram || s.tenTram}</strong></td>
        <td style="font-family:monospace;">${s.code || s.ma_tram || s.maTram || s.id || s._key || '—'}</td>
        <td>${s.address || s.dia_chi || s.diaChi || 'TP.HCM'}</td>
        <td style="text-align:center;">${
          idx === 0
            ? 'Trạm đầu'
            : idx === stops.length - 1
            ? 'Trạm cuối'
            : s.khoang_cach_km
            ? `${s.khoang_cach_km} km (~${s.thoi_gian_di_chuyen_phut || 5}p)`
            : 'Trạm trung gian'
        }</td>
      </tr>`
    )
    .join('');

  const segmentsHtml =
    segments.length > 0
      ? `
      <div class="section-title">CHI TIẾT CÁC CHẶNG DI CHUYỂN</div>
      ${segments
        .map(
          (seg, i) => `
        <div class="seg-card">
          <div class="seg-header">
            <span class="seg-badge">Chặng ${i + 1}: Tuyến ${seg.routeCode}</span>
            <strong>${seg.routeName}</strong>
            <span style="margin-left:auto;font-size:12px;color:#475569;">
              ${seg.stopsCount} trạm • ${formatDistance(seg.distance)} • ~${formatDuration(seg.duration)}
            </span>
          </div>
          <div class="seg-stops">
            Từ <strong>${seg.fromStop?.tenTram || seg.fromStop?.name}</strong> ➔ Đến <strong>${seg.toStop?.tenTram || seg.toStop?.name}</strong>
          </div>
        </div>`
        )
        .join('')}`
      : '';

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>${title || 'Phiếu thông tin Tuyến xe buýt TP.HCM'}</title>
      <style>
        * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, Arial, sans-serif; }
        body { margin: 0; padding: 28px; color: #1e293b; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #172B4D; padding-bottom: 14px; margin-bottom: 18px; }
        .brand { font-size: 20px; font-weight: 800; color: #172B4D; }
        .brand-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
        .doc-title { font-size: 22px; font-weight: 800; color: #172B4D; margin: 10px 0 4px; }
        .doc-subtitle { font-size: 13px; color: #475569; margin-bottom: 16px; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .meta-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; background: #f8fafc; }
        .meta-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .meta-value { font-size: 15px; font-weight: 700; color: #172B4D; margin-top: 4px; }
        .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #172B4D; margin: 18px 0 10px; letter-spacing: 0.5px; }
        .seg-card { border: 1px solid #cbd5e1; border-left: 4px solid #245A85; border-radius: 6px; padding: 10px 14px; margin-bottom: 10px; }
        .seg-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .seg-badge { background: #172B4D; color: #fff; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 4px; }
        .seg-stops { font-size: 12.5px; color: #334155; }
        table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 8px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
        th { background: #172B4D; color: #ffffff; font-size: 11.5px; text-transform: uppercase; }
        tr:nth-child(even) { background: #f8fafc; }
        .footer { margin-top: 24px; padding-top: 12px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
        @media print {
          .no-print { display: none !important; }
          body { padding: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:16px;text-align:right;">
        <button onclick="window.print()" style="background:#172B4D;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:700;cursor:pointer;">
          🖨️ In ngay / Lưu PDF
        </button>
        <button onclick="window.close()" style="background:#e2e8f0;color:#334155;border:none;padding:8px 14px;border-radius:6px;font-weight:600;cursor:pointer;margin-left:8px;">
          Đóng
        </button>
      </div>

      <div class="header">
        <div>
          <div class="brand">BUSROUTE HCM — HỆ THỐNG GIAO THÔNG CÔNG CỘNG TP.HCM</div>
          <div class="brand-sub">Cơ sở dữ liệu Đồ thị NoSQL MongoDB (BusRouteDB / BusRouteGraph)</div>
        </div>
        <div style="text-align:right;font-size:11.5px;color:#475569;">
          <div><strong>Ngày xuất phiếu:</strong> ${nowStr}</div>
          <div>Nguồn dữ liệu: MongoDB Atlas Cloud</div>
        </div>
      </div>

      <div class="doc-title">${title}</div>
      <div class="doc-subtitle">${subtitle || ''}</div>

      ${metaHtml ? `<div class="meta-grid">${metaHtml}</div>` : ''}
      ${segmentsHtml}

      <div class="section-title">DANH SÁCH THỨ TỰ TRẠM DỪNG (${stops.length} TRẠM)</div>
      <table>
        <thead>
          <tr>
            <th style="width:45px;text-align:center;">STT</th>
            <th>Tên trạm dừng</th>
            <th style="width:90px;">Mã trạm</th>
            <th>Địa chỉ / Khu vực</th>
            <th style="width:140px;text-align:center;">Ghi chú chặng</th>
          </tr>
        </thead>
        <tbody>
          ${stopsRowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <span>Tài liệu được trích xuất tự động từ hệ thống BusRoute HCM v2.0</span>
        <span>Hotline hỗ trợ xe buýt TP.HCM: 1022</span>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 350);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
