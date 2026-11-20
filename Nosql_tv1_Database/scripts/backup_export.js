/**
 * ============================================================================
 * MODULE 01 - THÀNH VIÊN 1: EXPORT & BACKUP DATABASE BusRouteDB (MONGODB)
 * Chạy: node scripts/backup_export.js
 * ============================================================================
 */
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("../../Nosql_tv2/BusRouteBackend/node_modules/mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGO_DATABASE || "BusRouteDB";

async function backupDatabase() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    const backupDir = path.join(__dirname, "../backup");
    const collectionsDir = path.join(backupDir, "collections");
    fs.mkdirSync(collectionsDir, { recursive: true });

    const collections = ["TuyenXe", "TramDung", "NguoiDung", "CO_TRAM", "KE_TIEP", "BusRouteGraph"];
    const fullBackup = {
      metadata: {
        database: DB_NAME,
        mongo_uri: MONGO_URI,
        graph_name: "BusRouteGraph",
        exported_at: new Date().toISOString(),
        collections_count: {}
      },
      data: {}
    };

    for (const colName of collections) {
      const docs = await db.collection(colName).find({}).toArray();
      fullBackup.metadata.collections_count[colName] = docs.length;
      fullBackup.data[colName] = docs;

      // Lưu từng file collection JSON
      const colFilePath = path.join(collectionsDir, `${colName}.backup.json`);
      fs.writeFileSync(colFilePath, JSON.stringify(docs, null, 2), "utf8");
      console.log(`+ Đã export Collection [${colName}] (${docs.length} documents) -> ${colFilePath}`);
    }

    // Lưu file full backup tổng hợp
    const fullBackupPath = path.join(backupDir, "BusRouteDB_FullBackup.json");
    fs.writeFileSync(fullBackupPath, JSON.stringify(fullBackup, null, 2), "utf8");
    console.log(`=== HOÀN TẤT BACKUP DATABASE -> ${fullBackupPath} ===`);
  } finally {
    await client.close();
  }
}

backupDatabase();
