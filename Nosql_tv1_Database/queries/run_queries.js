/**
 * ============================================================================
 * MODULE 01 - THÀNH VIÊN 1: KIỂM THỬ TOÀN BỘ TRUY VẤN & TÌM ĐƯỜNG TRÊN ĐỒ THỊ
 * Chạy: node queries/run_queries.js
 * ============================================================================
 */
const { MongoClient } = require("../../Nosql_tv2/BusRouteBackend/node_modules/mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGO_DATABASE || "BusRouteDB";

/**
 * Thuật toán Dijkstra tìm đường đi ngắn nhất trên đồ thị BusRouteGraph (collection KE_TIEP)
 * @param {object} db - MongoDB database instance
 * @param {string} fromStopKey - Mã trạm bắt đầu (VD: "TR_01")
 * @param {string} toStopKey - Mã trạm kết thúc (VD: "TR_13")
 * @param {string} criterion - "khoang_cach_km" hoặc "thoi_gian_di_chuyen_phut"
 */
async function findShortestPathGraph(db, fromStopKey, toStopKey, criterion = "khoang_cach_km") {
  const startId = fromStopKey.startsWith("TramDung/") ? fromStopKey : `TramDung/${fromStopKey}`;
  const endId = toStopKey.startsWith("TramDung/") ? toStopKey : `TramDung/${toStopKey}`;

  // 1. Sử dụng $graphLookup của MongoDB để duyệt toàn bộ đồ thị con có thể đi tới từ trạm xuất phát
  const graphResult = await db
    .collection("TramDung")
    .aggregate([
      { $match: { _id: startId } },
      {
        $graphLookup: {
          from: "KE_TIEP",
          startWith: "$_id",
          connectFromField: "_to",
          connectToField: "_from",
          as: "reachable_edges",
          maxDepth: 20,
          depthField: "depth"
        }
      }
    ])
    .toArray();

  if (!graphResult.length) {
    return null;
  }

  const edges = graphResult[0].reachable_edges;
  const stopsList = await db.collection("TramDung").find({}).toArray();
  const stopMap = new Map(stopsList.map((s) => [s._id, s]));

  // Xây dựng danh sách kề từ các cạnh duyệt được bằng $graphLookup
  const adj = new Map();
  for (const edge of edges) {
    if (!adj.has(edge._from)) adj.set(edge._from, []);
    adj.get(edge._from).push(edge);
  }

  // Chạy Dijkstra để tìm lộ trình tối ưu
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  dist.set(startId, 0);

  while (true) {
    let u = null;
    let best = Infinity;
    for (const [node, d] of dist.entries()) {
      if (!visited.has(node) && d < best) {
        best = d;
        u = node;
      }
    }
    if (u === null || u === endId) break;
    visited.add(u);

    const neighbors = adj.get(u) || [];
    for (const edge of neighbors) {
      const v = edge._to;
      const weight = Number(edge[criterion]) || 0;
      const alt = best + weight;
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, { from: u, edge });
      }
    }
  }

  if (!dist.has(endId)) {
    return { found: false, message: "Không tìm thấy đường đi giữa 2 trạm" };
  }

  // Truy vết đường đi
  const pathEdges = [];
  const pathVertices = [stopMap.get(endId)];
  let curr = endId;
  while (curr !== startId) {
    const step = prev.get(curr);
    pathEdges.unshift(step.edge);
    pathVertices.unshift(stopMap.get(step.from));
    curr = step.from;
  }

  const totalDistanceKm = Number(
    pathEdges.reduce((sum, e) => sum + (e.khoang_cach_km || 0), 0).toFixed(2)
  );
  const totalTimeMinutes = pathEdges.reduce(
    (sum, e) => sum + (e.thoi_gian_di_chuyen_phut || 0),
    0
  );

  return {
    found: true,
    tieu_chi_toi_uu: criterion,
    tram_xuat_phat: stopMap.get(startId)?.ten_tram,
    tram_dich: stopMap.get(endId)?.ten_tram,
    tong_so_tram_di_qua: pathVertices.length,
    tong_so_chang: pathEdges.length,
    tong_khoang_cach_km: totalDistanceKm,
    tong_thoi_gian_phut: totalTimeMinutes,
    lo_trinh_chi_tiet: pathEdges.map((e, idx) => ({
      chang: idx + 1,
      tuyen_xe: e.ma_tuyen,
      chieu: e.ma_chieu,
      tu_tram: `${stopMap.get(e._from)?.ma_tram} - ${stopMap.get(e._from)?.ten_tram}`,
      den_tram: `${stopMap.get(e._to)?.ma_tram} - ${stopMap.get(e._to)?.ten_tram}`,
      khoang_cach_km: e.khoang_cach_km,
      thoi_gian_phut: e.thoi_gian_di_chuyen_phut
    }))
  };
}

async function runAllQueries() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log("==================================================================");
    console.log("1. TRUY VẤN CRUD (THÊM, SỬA, XÓA, TÌM KIẾM)");
    console.log("==================================================================");

    // Thêm thử 1 tuyến
    await db.collection("TuyenXe").deleteOne({ _key: "TX_TEST" });
    await db.collection("TuyenXe").insertOne({
      _id: "TuyenXe/TX_TEST",
      _key: "TX_TEST",
      ma_tuyen: "99",
      ten_tuyen: "Tuyến Thử Nghiệm Bến Thành - Thủ Thiêm",
      diem_dau: "Bến Thành",
      diem_cuoi: "Thủ Thiêm",
      cu_ly_km: 7.5,
      thoi_gian_hoat_dong: { bat_dau: "05:00", ket_thuc: "21:00" },
      gia_ve: 6000,
      trang_thai: "active"
    });
    console.log("+ [THÊM] Đã thêm tuyến TX_TEST");

    // Sửa tuyến
    await db.collection("TuyenXe").updateOne(
      { _key: "TX_TEST" },
      { $set: { gia_ve: 7000 } }
    );
    const updated = await db.collection("TuyenXe").findOne({ _key: "TX_TEST" });
    console.log(`+ [SỬA] Giá vé mới của TX_TEST: ${updated.gia_ve} VNĐ`);

    // Xóa tuyến thử nghiệm
    await db.collection("TuyenXe").deleteOne({ _key: "TX_TEST" });
    console.log("+ [XÓA] Đã xóa tuyến thử nghiệm TX_TEST");

    // Tìm kiếm tuyến
    const searchRoutes = await db
      .collection("TuyenXe")
      .find({ ten_tuyen: { $regex: "Đại học Quốc gia", $options: "i" } })
      .project({ ma_tuyen: 1, ten_tuyen: 1, cu_ly_km: 1 })
      .toArray();
    console.log("+ [TÌM KIẾM] Các tuyến đi Đại học Quốc gia:", searchRoutes);

    console.log("\n==================================================================");
    console.log("2. TRUY VẤN LẤY CÁC TRẠM THUỘC TUYẾN (Tuyến 01 - Lượt đi)");
    console.log("==================================================================");
    const stopsOfRoute01 = await db
      .collection("CO_TRAM")
      .aggregate([
        { $match: { _from: "TuyenXe/TX_01", ma_chieu: "luot_di" } },
        { $sort: { thu_tu: 1 } },
        {
          $lookup: {
            from: "TramDung",
            localField: "_to",
            foreignField: "_id",
            as: "tram"
          }
        },
        { $unwind: "$tram" },
        {
          $lookup: {
            from: "KE_TIEP",
            let: { maTuyen: "$ma_tuyen", maChieu: "$ma_chieu", thuTu: "$thu_tu" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$ma_tuyen", "$$maTuyen"] },
                      { $eq: ["$ma_chieu", "$$maChieu"] },
                      { $eq: ["$thu_tu", "$$thuTu"] }
                    ]
                  }
                }
              },
              { $limit: 1 }
            ],
            as: "ke_tiep"
          }
        },
        {
          $project: {
            _id: 0,
            thu_tu: 1,
            ma_tram: "$tram.ma_tram",
            ten_tram: "$tram.ten_tram",
            khoang_cach_tiep_km: {
              $ifNull: [{ $arrayElemAt: ["$ke_tiep.khoang_cach_km", 0] }, null]
            },
            thoi_gian_tiep_phut: {
              $ifNull: [{ $arrayElemAt: ["$ke_tiep.thoi_gian_di_chuyen_phut", 0] }, null]
            }
          }
        }
      ])
      .toArray();
    console.table(stopsOfRoute01);

    console.log("\n==================================================================");
    console.log("3. TRUY VẤN TÌM CÁC TUYẾN ĐI QUA MỘT TRẠM (TR_01 - Bến Thành)");
    console.log("==================================================================");
    const routesPassingTR01 = await db
      .collection("CO_TRAM")
      .aggregate([
        { $match: { _to: "TramDung/TR_01" } },
        {
          $lookup: {
            from: "TuyenXe",
            localField: "_from",
            foreignField: "_id",
            as: "tuyen"
          }
        },
        { $unwind: "$tuyen" },
        {
          $group: {
            _id: "$tuyen.ma_tuyen",
            ten_tuyen: { $first: "$tuyen.ten_tuyen" },
            so_luot_di_qua: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
      .toArray();
    console.table(routesPassingTR01);

    console.log("\n==================================================================");
    console.log("4. TRUY VẤN DUYỆT ĐỒ THỊ ($graphLookup) & TÌM ĐƯỜNG NGẮN NHẤT");
    console.log("==================================================================");
    // Tìm đường từ Bến xe Chợ Lớn (TR_08) đến Sân bay Tân Sơn Nhất (TR_13) (có chuyển tuyến tại TR_01 hoặc TR_05/TR_06/TR_12)
    const shortestPath = await findShortestPathGraph(db, "TR_08", "TR_13", "khoang_cach_km");
    console.log("+ Kết quả tìm đường từ TR_08 (BX Chợ Lớn) -> TR_13 (Sân bay Tân Sơn Nhất):");
    console.log(JSON.stringify(shortestPath, null, 2));
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  runAllQueries();
}

module.exports = { findShortestPathGraph };
