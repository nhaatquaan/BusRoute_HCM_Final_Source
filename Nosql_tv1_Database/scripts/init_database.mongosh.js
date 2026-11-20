/**
 * ============================================================================
 * MODULE 01 - THÀNH VIÊN 1: KHỞI TẠO CƠ SỞ DỮ LIỆU MONGODB (BusRouteDB)
 * Chạy trên mongosh: mongosh "mongodb://localhost:27017/BusRouteDB" scripts/init_database.mongosh.js
 * ============================================================================
 */

const dbName = "BusRouteDB";
db = db.getSiblingDB(dbName);

print(`=== [1] Đang khởi tạo Database: ${dbName} ===`);

// 1. Tạo các Vertex Collections: TuyenXe, TramDung, NguoiDung
const vertexCollections = ["TuyenXe", "TramDung", "NguoiDung"];
for (const col of vertexCollections) {
  if (!db.getCollectionNames().includes(col)) {
    db.createCollection(col);
    print(`+ Đã tạo Vertex Collection: ${col}`);
  }
}

// 2. Tạo các Edge Collections: CO_TRAM, KE_TIEP
const edgeCollections = ["CO_TRAM", "KE_TIEP"];
for (const col of edgeCollections) {
  if (!db.getCollectionNames().includes(col)) {
    db.createCollection(col);
    print(`+ Đã tạo Edge Collection: ${col}`);
  }
}

// 3. Tạo Indexes để tối ưu hóa truy vấn và ràng buộc duy nhất
db.TuyenXe.createIndex({ _key: 1 }, { unique: true });
db.TuyenXe.createIndex({ ma_tuyen: 1 }, { unique: true });

db.TramDung.createIndex({ _key: 1 }, { unique: true });
db.TramDung.createIndex({ ma_tram: 1 }, { unique: true });

db.NguoiDung.createIndex({ _key: 1 }, { unique: true });
db.NguoiDung.createIndex({ email: 1 }, { unique: true });

db.CO_TRAM.createIndex({ _key: 1 }, { unique: true });
db.CO_TRAM.createIndex({ _from: 1, ma_chieu: 1, thu_tu: 1 });
db.CO_TRAM.createIndex({ _to: 1 });

db.KE_TIEP.createIndex({ _key: 1 }, { unique: true });
db.KE_TIEP.createIndex({ _from: 1 });
db.KE_TIEP.createIndex({ _to: 1 });
db.KE_TIEP.createIndex({ ma_tuyen: 1, ma_chieu: 1, thu_tu: 1 });

// 4. Xây dựng Graph BusRouteGraph (Lưu metadata định nghĩa đồ thị & View)
if (!db.getCollectionNames().includes("BusRouteGraph")) {
  db.createCollection("BusRouteGraph");
}

db.BusRouteGraph.deleteMany({});
db.BusRouteGraph.insertOne({
  _id: "BusRouteGraph/GRAPH_DEF",
  _key: "GRAPH_DEF",
  graph_name: "BusRouteGraph",
  database: "BusRouteDB",
  vertex_collections: ["TuyenXe", "TramDung", "NguoiDung"],
  edge_definitions: [
    {
      collection: "CO_TRAM",
      from: ["TuyenXe"],
      to: ["TramDung"],
      description: "Liên kết Tuyến xe đi qua Trạm dừng theo chiều và thứ tự"
    },
    {
      collection: "KE_TIEP",
      from: ["TramDung"],
      to: ["TramDung"],
      description: "Liên kết có hướng giữa 2 Trạm dừng liên tiếp trên cùng một tuyến"
    }
  ],
  created_at: new Date().toISOString()
});

print("=== Hoàn tất khởi tạo cấu trúc BusRouteDB và BusRouteGraph ===");
