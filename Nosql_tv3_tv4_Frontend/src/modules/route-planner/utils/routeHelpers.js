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
  { id: 'LOC_01', name: 'Chợ Bến Thành (Cửa Nam)', address: 'Đường Lê Lợi, Phường Bến Thành, Quận 1', lat: 10.7725, lng: 106.6980, category: 'Địa danh' },
  { id: 'LOC_02', name: 'Dinh Độc Lập (Hội trường Thống Nhất)', address: '135 Nam Kỳ Khởi Nghĩa, Quận 1', lat: 10.7769, lng: 106.6953, category: 'Địa danh' },
  { id: 'LOC_03', name: 'Nhà thờ Đức Bà & Bưu điện Thành phố', address: '01 Công xã Paris, Bến Nghé, Quận 1', lat: 10.7798, lng: 106.6990, category: 'Địa danh' },
  { id: 'LOC_04', name: 'Phố đi bộ Nguyễn Huệ (Bến Bạch Đằng)', address: 'Đường Nguyễn Huệ, Quận 1', lat: 10.7738, lng: 106.7042, category: 'Địa danh' },
  { id: 'LOC_05', name: 'Tòa nhà Bitexco Financial Tower', address: '02 Hải Triều, Bến Nghé, Quận 1', lat: 10.7717, lng: 106.7044, category: 'Thương mại' },
  { id: 'LOC_06', name: 'Landmark 81 (Vinhomes Central Park)', address: '720A Điện Biên Phủ, Bình Thạnh', lat: 10.7950, lng: 106.7218, category: 'Thương mại' },
  { id: 'LOC_07', name: 'Trường Đại học Bách Khoa TP.HCM (Cơ sở 1)', address: '268 Lý Thường Kiệt, Phường 14, Quận 10', lat: 10.7721, lng: 106.6579, category: 'Trường học' },
  { id: 'LOC_08', name: 'Đại học Khoa học Tự nhiên / ĐH Sài Gòn', address: '227 Nguyễn Văn Cừ, Quận 5', lat: 10.7628, lng: 106.6822, category: 'Trường học' },
  { id: 'LOC_09', name: 'Khu Đô thị Đại học Quốc gia TP.HCM (Làng Đại học)', address: 'Phường Linh Trung, TP. Thủ Đức', lat: 10.8702, lng: 106.8031, category: 'Trường học' },
  { id: 'LOC_10', name: 'Bệnh viện Chợ Rẫy', address: '201B Nguyễn Chí Thanh, Phường 12, Quận 5', lat: 10.7578, lng: 106.6596, category: 'Bệnh viện' },
  { id: 'LOC_11', name: 'Bệnh viện Đại học Y Dược TP.HCM', address: '215 Hồng Bàng, Phường 11, Quận 5', lat: 10.7554, lng: 106.6645, category: 'Bệnh viện' },
  { id: 'LOC_12', name: 'Sân bay Quốc tế Tân Sơn Nhất (Ga Quốc nội)', address: 'Đường Trường Sơn, Phường 2, Tân Bình', lat: 10.8132, lng: 106.6625, category: 'Giao thông' },
  { id: 'LOC_13', name: 'Bến xe Chợ Lớn & Chợ Bình Tây', address: 'Lê Quang Sung, Phường 2, Quận 6', lat: 10.7510, lng: 106.6508, category: 'Giao thông' },
  { id: 'LOC_14', name: 'Bến xe Miền Đông Mới & Khu du lịch Suối Tiên', address: 'Xa lộ Hà Nội, TP. Thủ Đức', lat: 10.8662, lng: 106.8032, category: 'Giao thông' },
  { id: 'LOC_15', name: 'Bến xe An Sương', address: 'Quốc lộ 22, Bà Điểm, Hóc Môn', lat: 10.8442, lng: 106.6134, category: 'Giao thông' },
  { id: 'LOC_16', name: 'Bến xe Quận 8', address: 'Quốc lộ 50, Phường 5, Quận 8', lat: 10.7330, lng: 106.6602, category: 'Giao thông' },
  { id: 'LOC_17', name: 'Ngã tư Hàng Xanh (ĐH HUTECH / Ngoại Thương)', address: 'Xô Viết Nghệ Tĩnh - Điện Biên Phủ, Bình Thạnh', lat: 10.8014, lng: 106.7115, category: 'Giao thông' },
  { id: 'LOC_18', name: 'Công viên Hoàng Văn Thụ (Lăng Cha Cả)', address: 'Phan Đình Giót, Tân Bình', lat: 10.8005, lng: 106.6650, category: 'Địa danh' },
  { id: 'LOC_19', name: 'Chợ An Đông (An Đông Plaza)', address: '18 An Dương Vương, Quận 5', lat: 10.7582, lng: 106.6716, category: 'Thương mại' },
  { id: 'LOC_20', name: 'Khu dân cư Trung Sơn (Cầu Nguyễn Văn Cừ)', address: 'Đường 9A, Bình Hưng, Bình Chánh', lat: 10.7341, lng: 106.6881, category: 'Khu dân cư' },
];

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
