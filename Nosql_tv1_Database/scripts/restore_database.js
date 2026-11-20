/**
 * ============================================================================
 * MODULE 01 - THÀNH VIÊN 1: RESTORE DATABASE BusRouteDB TỪ FILE BACKUP
 * Chạy: node scripts/restore_database.js
 * ============================================================================
 */
const fs = require("fs");
const path = require("path");
require("../../Nosql_tv2/BusRouteBackend/node_modules/dotenv").config({
  path: path.resolve(__dirname, "../../Nosql_tv2/BusRouteBackend/.env")
});
const { MongoClient } = require("../../Nosql_tv2/BusRouteBackend/node_modules/mongodb");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGO_DATABASE || "BusRouteDB";

async function restoreDatabase() {
  const fullBackupPath = path.join(__dirname, "../backup/BusRouteDB_FullBackup.json");
  if (!fs.existsSync(fullBackupPath)) {
    console.error("Không tìm thấy file backup:", fullBackupPath);
    process.exit(1);
  }

  const backupContent = JSON.parse(fs.readFileSync(fullBackupPath, "utf8"));
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`=== Đang khôi phục (Restore) Database [${DB_NAME}] từ bản backup ngày ${backupContent.metadata.exported_at} ===`);

    for (const [colName, docs] of Object.entries(backupContent.data)) {
      await db.collection(colName).deleteMany({});
      if (Array.isArray(docs) && docs.length > 0) {
        await db.collection(colName).insertMany(docs);
      }
      console.log(`+ Đã khôi phục Collection [${colName}]: ${docs.length} documents`);
    }

    // Tạo lại các Indexes chuẩn
    await db.collection("TuyenXe").createIndex({ _key: 1 }, { unique: true });
    await db.collection("TuyenXe").createIndex({ ma_tuyen: 1 }, { unique: true });
    await db.collection("TramDung").createIndex({ _key: 1 }, { unique: true });
    await db.collection("TramDung").createIndex({ ma_tram: 1 }, { unique: true });
    await db.collection("NguoiDung").createIndex({ _key: 1 }, { unique: true });
    await db.collection("NguoiDung").createIndex({ email: 1 }, { unique: true });
    await db.collection("CO_TRAM").createIndex({ _key: 1 }, { unique: true });
    await db.collection("CO_TRAM").createIndex({ _from: 1, ma_chieu: 1, thu_tu: 1 });
    await db.collection("CO_TRAM").createIndex({ _to: 1 });
    await db.collection("KE_TIEP").createIndex({ _key: 1 }, { unique: true });
    await db.collection("KE_TIEP").createIndex({ _from: 1 });
    await db.collection("KE_TIEP").createIndex({ _to: 1 });

    console.log("=== KHÔI PHỤC DATABASE BusRouteDB THÀNH CÔNG ===");
  } finally {
    await client.close();
  }
}

restoreDatabase();
