/**
 * ============================================================================
 * MODULE 01 - THÀNH VIÊN 1: IMPORT DỮ LIỆU TỪ CSV VÀO MONGODB (localhost:27017)
 * Chạy: node scripts/import_csv.js
 * ============================================================================
 */
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("../../Nosql_tv2/BusRouteBackend/node_modules/mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGO_DATABASE || "BusRouteDB";

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function readCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf8").trim();
  const lines = content.split(/\r?\n/);
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx];
    });
    return obj;
  });
}

async function importFromCSV() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const csvDir = path.join(__dirname, "../data/csv");

    // 1. TuyenXe
    const tuyenXeRows = readCSV(path.join(csvDir, "TuyenXe.csv")).map((r) => ({
      _id: r._id,
      _key: r._key,
      ma_tuyen: r.ma_tuyen,
      ten_tuyen: r.ten_tuyen,
      diem_dau: r.diem_dau,
      diem_cuoi: r.diem_cuoi,
      cu_ly_km: Number(r.cu_ly_km),
      thoi_gian_hoat_dong: {
        bat_dau: r.bat_dau,
        ket_thuc: r.ket_thuc
      },
      gia_ve: Number(r.gia_ve),
      trang_thai: r.trang_thai
    }));
    await db.collection("TuyenXe").deleteMany({});
    await db.collection("TuyenXe").insertMany(tuyenXeRows);
    console.log(`+ Đã import CSV: ${tuyenXeRows.length} TuyenXe`);

    // 2. TramDung
    const tramDungRows = readCSV(path.join(csvDir, "TramDung.csv")).map((r) => ({
      _id: r._id,
      _key: r._key,
      ma_tram: r.ma_tram,
      ten_tram: r.ten_tram,
      dia_chi: r.dia_chi,
      vi_do: Number(r.vi_do),
      kinh_do: Number(r.kinh_do),
      trang_thai: r.trang_thai
    }));
    await db.collection("TramDung").deleteMany({});
    await db.collection("TramDung").insertMany(tramDungRows);
    console.log(`+ Đã import CSV: ${tramDungRows.length} TramDung`);

    // 3. NguoiDung
    const nguoiDungRows = readCSV(path.join(csvDir, "NguoiDung.csv"));
    await db.collection("NguoiDung").deleteMany({});
    await db.collection("NguoiDung").insertMany(nguoiDungRows);
    console.log(`+ Đã import CSV: ${nguoiDungRows.length} NguoiDung`);

    // 4. CO_TRAM
    const coTramRows = readCSV(path.join(csvDir, "CO_TRAM.csv")).map((r) => ({
      _id: r._id,
      _key: r._key,
      _from: r._from,
      _to: r._to,
      ma_tuyen: r.ma_tuyen,
      ma_chieu: r.ma_chieu,
      thu_tu: Number(r.thu_tu)
    }));
    await db.collection("CO_TRAM").deleteMany({});
    await db.collection("CO_TRAM").insertMany(coTramRows);
    console.log(`+ Đã import CSV: ${coTramRows.length} CO_TRAM`);

    // 5. KE_TIEP
    const keTiepRows = readCSV(path.join(csvDir, "KE_TIEP.csv")).map((r) => ({
      _id: r._id,
      _key: r._key,
      _from: r._from,
      _to: r._to,
      ma_tuyen: r.ma_tuyen,
      ma_chieu: r.ma_chieu,
      thu_tu: Number(r.thu_tu),
      khoang_cach_km: Number(r.khoang_cach_km),
      thoi_gian_di_chuyen_phut: Number(r.thoi_gian_di_chuyen_phut)
    }));
    await db.collection("KE_TIEP").deleteMany({});
    await db.collection("KE_TIEP").insertMany(keTiepRows);
    console.log(`+ Đã import CSV: ${keTiepRows.length} KE_TIEP`);

    console.log("=== HOÀN TẤT IMPORT DỮ LIỆU TỪ CSV ===");
  } finally {
    await client.close();
  }
}

importFromCSV();
