/**
 * ============================================================================
 * MODULE 01 - THÀNH VIÊN 1: KHỞI TẠO & IMPORT DỮ LIỆU VÀO MONGODB (localhost:27017)
 * Chạy: node scripts/setup_and_import.js
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

async function setupAndImport() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log(`[1] Đã kết nối MongoDB tại ${MONGO_URI}`);

    const db = client.db(DB_NAME);
    const existingCols = (await db.listCollections().toArray()).map((c) => c.name);

    // 1. Tạo Vertex Collections & Edge Collections & Graph Collection
    const collections = ["TuyenXe", "TramDung", "NguoiDung", "CO_TRAM", "KE_TIEP", "BusRouteGraph"];
    for (const colName of collections) {
      if (!existingCols.includes(colName)) {
        await db.createCollection(colName);
        console.log(`+ Đã tạo Collection: ${colName}`);
      }
    }

    // 2. Tạo Indexes
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
    await db.collection("KE_TIEP").createIndex({ ma_tuyen: 1, ma_chieu: 1, thu_tu: 1 });
    console.log("[2] Đã thiết lập đầy đủ Indexes cho các Collections");

    // 3. Khởi tạo định nghĩa Graph BusRouteGraph
    await db.collection("BusRouteGraph").deleteMany({});
    await db.collection("BusRouteGraph").insertOne({
      _id: "BusRouteGraph/GRAPH_DEF",
      _key: "GRAPH_DEF",
      graph_name: "BusRouteGraph",
      database: DB_NAME,
      vertex_collections: ["TuyenXe", "TramDung", "NguoiDung"],
      edge_definitions: [
        {
          collection: "CO_TRAM",
          from: ["TuyenXe"],
          to: ["TramDung"],
          description: "Cạnh nối từ Tuyến xe đến Trạm dừng theo chiều và thứ tự"
        },
        {
          collection: "KE_TIEP",
          from: ["TramDung"],
          to: ["TramDung"],
          description: "Cạnh có hướng nối Trạm dừng hiện tại sang Trạm dừng kế tiếp kèm khoảng cách và thời gian"
        }
      ],
      created_at: new Date().toISOString()
    });
    console.log("[3] Đã khởi tạo Graph: BusRouteGraph");

    // 4. Import dữ liệu từ các file JSON chuẩn
    const jsonDir = path.join(__dirname, "../data/json");
    const dataFiles = [
      { col: "TuyenXe", file: "TuyenXe.json" },
      { col: "TramDung", file: "TramDung.json" },
      { col: "NguoiDung", file: "NguoiDung.json" },
      { col: "CO_TRAM", file: "CO_TRAM.json" },
      { col: "KE_TIEP", file: "KE_TIEP.json" }
    ];

    for (const item of dataFiles) {
      const filePath = path.join(jsonDir, item.file);
      const docs = JSON.parse(fs.readFileSync(filePath, "utf8"));
      await db.collection(item.col).deleteMany({});
      if (docs.length > 0) {
        await db.collection(item.col).insertMany(docs);
      }
      console.log(`+ Đã import ${docs.length} documents vào Collection [${item.col}]`);
    }

    console.log("=== HOÀN TẤT KHỞI TẠO & IMPORT DATABASE BusRouteDB ===");
  } catch (error) {
    console.error("Lỗi khởi tạo Database:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupAndImport();
