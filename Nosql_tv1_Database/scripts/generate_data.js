/**
 * Script tạo dữ liệu chuẩn JSON và CSV cho các Collections:
 * - TuyenXe, TramDung, NguoiDung (Vertices)
 * - CO_TRAM, KE_TIEP (Edges)
 * Đảm bảo tương thích đồng thời với quy ước snake_case (TV1, TV2), camelCase (TV4) và English aliases (TV3).
 */
const fs = require("fs");
const path = require("path");

const VALID_ROLES = ["admin", "operator", "passenger"];

/**
 * Chuẩn hóa vai trò người dùng (Standardize User Role)
 * - Ưu tiên role chuẩn: admin, operator, passenger
 * - Không để vai_tro ghi đè một role chuẩn đã tồn tại
 * - Ánh xạ tường minh dữ liệu legacy (staff/user/vai_tro)
 * - Ném lỗi khi gặp role không hợp lệ, tuyệt đối không gán ngầm staff hoặc passenger
 */
function resolveUserRole(user) {
  if (!user || typeof user !== "object") {
    throw new Error("Dữ liệu người dùng không hợp lệ (null/undefined/không phải object)");
  }

  const rawRole = typeof user.role === "string" ? user.role.trim().toLowerCase() : "";
  const rawVaiTro = typeof user.vai_tro === "string" ? user.vai_tro.trim().toLowerCase() : "";
  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";

  // 1. Ưu tiên trường role chuẩn khi dữ liệu đã được chuẩn hóa (KHÔNG để vai_tro ghi đè)
  if (VALID_ROLES.includes(rawRole)) {
    return rawRole;
  }

  // 2. Hỗ trợ mapping dữ liệu legacy một cách tường minh:
  // Case A: Dữ liệu legacy của Operator
  if (
    rawVaiTro === "operator" ||
    (rawRole === "staff" && rawVaiTro === "admin") ||
    email === "operator@busroute.vn"
  ) {
    return "operator";
  }

  // Case B: Dữ liệu legacy của Admin
  if (
    email === "admin@busroute.vn" ||
    (rawVaiTro === "admin" && rawRole !== "staff")
  ) {
    return "admin";
  }

  // Case C: Dữ liệu legacy của Passenger
  if (
    rawVaiTro === "passenger" ||
    rawVaiTro === "user" ||
    rawRole === "user" ||
    (rawRole === "staff" && rawVaiTro === "user") ||
    email === "user@busroute.vn"
  ) {
    return "passenger";
  }

  // 3. Trường hợp không thể xác định role thì báo lỗi, không tự động gán staff hay passenger
  throw new Error(
    `Không thể xác định vai trò hợp lệ cho người dùng '${user.email || user.username || user._key || "Unknown"}'. Role='${user.role}', vai_tro='${user.vai_tro}'. Yêu cầu rà soát dữ liệu nguồn.`
  );
}

function generateUnifiedData() {
const jsonDir = path.join(__dirname, "../data/json");
const csvDir = path.join(__dirname, "../data/csv");

fs.mkdirSync(jsonDir, { recursive: true });
fs.mkdirSync(csvDir, { recursive: true });

const ROUTE_COLORS = {
  "01": "#2563eb",
  "03": "#d97706",
  "04": "#0284c7",
  "08": "#7c3aed",
  "19": "#059669",
  "152": "#dc2626"
};

const routePlans = [
  {
    routeKey: "TX_01",
    ma_tuyen: "01",
    luot_di: [
      ["TR_03", 0, 0],
      ["TR_04", 0.6, 2],
      ["TR_02", 0.5, 2],
      ["TR_01", 0.9, 3],
      ["TR_05", 2.1, 6],
      ["TR_06", 2.4, 7],
      ["TR_07", 1.1, 4],
      ["TR_08", 1.0, 3]
    ],
    luot_ve: [
      ["TR_08", 0, 0],
      ["TR_07", 1.0, 3],
      ["TR_06", 1.1, 4],
      ["TR_05", 2.4, 7],
      ["TR_01", 2.1, 6],
      ["TR_02", 0.9, 3],
      ["TR_04", 0.5, 2],
      ["TR_03", 0.6, 2]
    ]
  },
  {
    routeKey: "TX_03",
    ma_tuyen: "03",
    luot_di: [
      ["TR_01", 0, 0],
      ["TR_02", 0.9, 3],
      ["TR_09", 1.2, 4],
      ["TR_23", 3.1, 9],
      ["TR_24", 3.4, 10],
      ["TR_25", 6.2, 16]
    ],
    luot_ve: [
      ["TR_25", 0, 0],
      ["TR_24", 6.2, 16],
      ["TR_23", 3.4, 10],
      ["TR_09", 3.1, 9],
      ["TR_02", 1.2, 4],
      ["TR_01", 0.9, 3]
    ]
  },
  {
    routeKey: "TX_04",
    ma_tuyen: "04",
    luot_di: [
      ["TR_01", 0, 0],
      ["TR_10", 1.1, 4],
      ["TR_11", 2.0, 6],
      ["TR_12", 2.2, 7],
      ["TR_14", 1.6, 5],
      ["TR_15", 3.5, 10],
      ["TR_16", 3.6, 10]
    ],
    luot_ve: [
      ["TR_16", 0, 0],
      ["TR_15", 3.6, 10],
      ["TR_14", 3.5, 10],
      ["TR_12", 1.6, 5],
      ["TR_11", 2.2, 7],
      ["TR_10", 2.0, 6],
      ["TR_01", 1.1, 4]
    ]
  },
  {
    routeKey: "TX_08",
    ma_tuyen: "08",
    luot_di: [
      ["TR_22", 0, 0],
      ["TR_06", 2.6, 8],
      ["TR_14", 4.3, 12],
      ["TR_12", 1.6, 5],
      ["TR_23", 1.8, 5],
      ["TR_17", 3.3, 10],
      ["TR_18", 6.5, 15],
      ["TR_19", 4.1, 10],
      ["TR_20", 3.8, 9]
    ],
    luot_ve: [
      ["TR_20", 0, 0],
      ["TR_19", 3.8, 9],
      ["TR_18", 4.1, 10],
      ["TR_17", 6.5, 15],
      ["TR_23", 3.3, 10],
      ["TR_12", 1.8, 5],
      ["TR_14", 1.6, 5],
      ["TR_06", 4.3, 12],
      ["TR_22", 2.6, 8]
    ]
  },
  {
    routeKey: "TX_19",
    ma_tuyen: "19",
    luot_di: [
      ["TR_01", 0, 0],
      ["TR_04", 1.0, 3],
      ["TR_03", 0.6, 2],
      ["TR_09", 1.0, 3],
      ["TR_17", 3.1, 9],
      ["TR_18", 6.5, 15],
      ["TR_19", 4.1, 10],
      ["TR_20", 3.8, 9]
    ],
    luot_ve: [
      ["TR_20", 0, 0],
      ["TR_19", 3.8, 9],
      ["TR_18", 4.1, 10],
      ["TR_17", 6.5, 15],
      ["TR_09", 3.1, 9],
      ["TR_03", 1.0, 3],
      ["TR_04", 0.6, 2],
      ["TR_01", 1.0, 3]
    ]
  },
  {
    routeKey: "TX_152",
    ma_tuyen: "152",
    luot_di: [
      ["TR_21", 0, 0],
      ["TR_05", 2.6, 8],
      ["TR_01", 2.1, 6],
      ["TR_10", 1.1, 4],
      ["TR_11", 2.0, 6],
      ["TR_23", 1.1, 4],
      ["TR_12", 1.8, 5],
      ["TR_13", 1.7, 5]
    ],
    luot_ve: [
      ["TR_13", 0, 0],
      ["TR_12", 1.7, 5],
      ["TR_23", 1.8, 5],
      ["TR_11", 1.1, 4],
      ["TR_10", 2.0, 6],
      ["TR_01", 1.1, 4],
      ["TR_05", 2.1, 6],
      ["TR_21", 2.6, 8]
    ]
  }
];

const coTramEdges = [];
const keTiepEdges = [];
const routeStopIdsMap = new Map();

let ctIndex = 1;
let ktIndex = 1;

for (const plan of routePlans) {
  routeStopIdsMap.set(plan.routeKey, plan.luot_di.map(([stopKey]) => stopKey));
  for (const direction of ["luot_di", "luot_ve"]) {
    const chieuShort = direction === "luot_ve" ? "ve" : "di";
    const stops = plan[direction];
    for (let i = 0; i < stops.length; i++) {
      const [stopKey] = stops[i];
      const ctKey = `CT_${String(ctIndex++).padStart(3, "0")}`;
      coTramEdges.push({
        _id: `CO_TRAM/${ctKey}`,
        _key: ctKey,
        _from: `TuyenXe/${plan.routeKey}`,
        _to: `TramDung/${stopKey}`,
        ma_tuyen: plan.ma_tuyen,
        maTuyen: plan.ma_tuyen,
        ma_chieu: direction,
        chieuDi: chieuShort,
        thu_tu: i + 1,
        thuTu: i + 1
      });

      if (i < stops.length - 1) {
        const [nextStopKey, distKm, timeMin] = stops[i + 1];
        const ktKey = `KT_${String(ktIndex++).padStart(3, "0")}`;
        keTiepEdges.push({
          _id: `KE_TIEP/${ktKey}`,
          _key: ktKey,
          _from: `TramDung/${stopKey}`,
          _to: `TramDung/${nextStopKey}`,
          ma_tuyen: plan.ma_tuyen,
          maTuyen: plan.ma_tuyen,
          ma_chieu: direction,
          chieuDi: chieuShort,
          thu_tu: i + 1,
          thuTu: i + 1,
          khoang_cach_km: distKm,
          khoangCach: Math.round(distKm * 1000),
          thoi_gian_di_chuyen_phut: timeMin,
          thoiGian: timeMin
        });
      }
    }
  }
}

// Bổ sung đầy đủ các trường chuẩn hóa cho TuyenXe và TramDung
const rawTuyenXe = JSON.parse(fs.readFileSync(path.join(jsonDir, "TuyenXe.json"), "utf8"));
const tuyenXe = rawTuyenXe.map((t) => {
  const opStr = `${t.thoi_gian_hoat_dong.bat_dau} - ${t.thoi_gian_hoat_dong.ket_thuc}`;
  const stopIds = routeStopIdsMap.get(t._key) || [];
  return {
    ...t,
    id: t._key,
    maTuyen: t.ma_tuyen,
    code: t.ma_tuyen,
    tenTuyen: t.ten_tuyen,
    name: t.ten_tuyen,
    startPoint: t.diem_dau,
    endPoint: t.diem_cuoi,
    operatingHours: opStr,
    thoiGianHoatDong: opStr,
    giaVe: t.gia_ve,
    ticketPrice: t.gia_ve,
    loaiTuyen: "Phổ thông - có trợ giá",
    gianCachChuyen: "10 - 15 phút/chuyến",
    frequency: "10 - 15 phút/chuyến",
    mauSac: ROUTE_COLORS[t.ma_tuyen] || "#2563eb",
    cuLy: `${t.cu_ly_km} km`,
    status: t.trang_thai,
    stopIds,
    updatedAt: "2026-11-20"
  };
});

const extractDistrict = (address) => {
  if (!address) return "TP.HCM";
  const parts = address.split(",").map((s) => s.trim());
  return parts.find((p) => /^(Quận|Huyện|TP\.)/i.test(p)) || parts[parts.length - 2] || "TP.HCM";
};

const rawTramDung = JSON.parse(fs.readFileSync(path.join(jsonDir, "TramDung.json"), "utf8"));
const tramDung = rawTramDung.map((s) => {
  const khuVuc = extractDistrict(s.dia_chi);
  return {
    ...s,
    id: s._key,
    maTram: s.ma_tram,
    code: s.ma_tram,
    tenTram: s.ten_tram,
    name: s.ten_tram,
    diaChi: s.dia_chi,
    address: s.dia_chi,
    khuVuc,
    district: khuVuc,
    latitude: s.vi_do,
    longitude: s.kinh_do,
    lat: s.vi_do,
    lng: s.kinh_do,
    status: s.trang_thai
  };
});

const rawNguoiDung = JSON.parse(fs.readFileSync(path.join(jsonDir, "NguoiDung.json"), "utf8"));
const nguoiDung = rawNguoiDung.map((u) => {
  const username = u.email ? u.email.split("@")[0] : u._key.toLowerCase();
  const role = resolveUserRole(u);
  return {
    ...u,
    id: u._key,
    username,
    fullName: u.ho_ten || u.fullName || username,
    role,
    vai_tro: role,
    status: u.trang_thai === "active" || u.status === "active" ? "active" : "locked",
    createdAt: (u.ngay_tao || u.createdAt || "2026-11-20").slice(0, 10)
  };
});

fs.writeFileSync(path.join(jsonDir, "TuyenXe.json"), JSON.stringify(tuyenXe, null, 2), "utf8");
fs.writeFileSync(path.join(jsonDir, "TramDung.json"), JSON.stringify(tramDung, null, 2), "utf8");
fs.writeFileSync(path.join(jsonDir, "NguoiDung.json"), JSON.stringify(nguoiDung, null, 2), "utf8");
fs.writeFileSync(path.join(jsonDir, "CO_TRAM.json"), JSON.stringify(coTramEdges, null, 2), "utf8");
fs.writeFileSync(path.join(jsonDir, "KE_TIEP.json"), JSON.stringify(keTiepEdges, null, 2), "utf8");

function toCSV(items, headers) {
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(",")];
  for (const item of items) {
    lines.push(headers.map((h) => escape(item[h])).join(","));
  }
  return lines.join("\n");
}

fs.writeFileSync(
  path.join(csvDir, "TuyenXe.csv"),
  toCSV(
    tuyenXe.map((t) => ({
      ...t,
      bat_dau: t.thoi_gian_hoat_dong.bat_dau,
      ket_thuc: t.thoi_gian_hoat_dong.ket_thuc
    })),
    ["_id", "_key", "ma_tuyen", "ten_tuyen", "diem_dau", "diem_cuoi", "cu_ly_km", "bat_dau", "ket_thuc", "gia_ve", "trang_thai"]
  ),
  "utf8"
);

fs.writeFileSync(
  path.join(csvDir, "TramDung.csv"),
  toCSV(tramDung, ["_id", "_key", "ma_tram", "ten_tram", "dia_chi", "vi_do", "kinh_do", "trang_thai"]),
  "utf8"
);

fs.writeFileSync(
  path.join(csvDir, "NguoiDung.csv"),
  toCSV(nguoiDung, ["_id", "_key", "ho_ten", "email", "mat_khau", "so_dien_thoai", "vai_tro", "role", "trang_thai", "ngay_tao"]),
  "utf8"
);

fs.writeFileSync(
  path.join(csvDir, "CO_TRAM.csv"),
  toCSV(coTramEdges, ["_id", "_key", "_from", "_to", "ma_tuyen", "ma_chieu", "thu_tu"]),
  "utf8"
);

fs.writeFileSync(
  path.join(csvDir, "KE_TIEP.csv"),
  toCSV(keTiepEdges, ["_id", "_key", "_from", "_to", "ma_tuyen", "ma_chieu", "thu_tu", "khoang_cach_km", "thoi_gian_di_chuyen_phut"]),
  "utf8"
);

console.log(`Generated unified data: ${tuyenXe.length} TuyenXe, ${tramDung.length} TramDung, ${coTramEdges.length} CO_TRAM, ${keTiepEdges.length} KE_TIEP.`);
}

if (require.main === module) {
  generateUnifiedData();
}

module.exports = {
  resolveUserRole,
  VALID_ROLES,
  generateUnifiedData
};
