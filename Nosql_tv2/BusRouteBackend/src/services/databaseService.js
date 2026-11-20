const fs = require("fs");
const path = require("path");
const { db, client, ensureDocumentKeys, buildIdFilter } = require("../config/database");

const COLLECTIONS = ["TuyenXe", "TramDung", "NguoiDung", "CO_TRAM", "KE_TIEP", "BusRouteGraph"];

// Thư mục lưu trữ backup an toàn
const BACKUP_DIR = path.resolve(__dirname, "../../../../Nosql_tv1_Database/backup");
const DATA_JSON_DIR = path.resolve(__dirname, "../../../../Nosql_tv1_Database/data/json");
const DATA_CSV_DIR = path.resolve(__dirname, "../../../../Nosql_tv1_Database/data/csv");

// Đảm bảo thư mục backup tồn tại
if (!fs.existsSync(BACKUP_DIR)) {
    try {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    } catch (_) {}
}

/**
 * 1. LẤY TỔNG QUAN TẤT CẢ COLLECTIONS
 */
const getCollectionsOverview = async () => {
    const results = [];

    for (const colName of COLLECTIONS) {
        try {
            const col = db.collection(colName);
            const count = await col.countDocuments();
            let indexes = [];
            try {
                indexes = await col.indexes();
            } catch (_) {}

            let type = "Vertex Collection";
            let role = "Lưu trữ dữ liệu đỉnh";

            if (colName === "CO_TRAM") {
                type = "Edge Collection";
                role = "Liên kết Tuyến xe -> Trạm dừng (_from, _to, thứ tự, chiều)";
            } else if (colName === "KE_TIEP") {
                type = "Edge Collection";
                role = "Cạnh có hướng giữa 2 trạm liên tiếp kèm khoảng cách & thời gian";
            } else if (colName === "BusRouteGraph") {
                type = "Graph Metadata";
                role = "Định nghĩa đồ thị và các quy tắc duyệt $graphLookup";
            } else if (colName === "TuyenXe") {
                type = "Vertex Collection";
                role = "Thông tin tuyến xe buýt TP.HCM (mã, tên, giá vé, cự ly, giờ chạy)";
            } else if (colName === "TramDung") {
                type = "Vertex Collection";
                role = "Thông tin trạm dừng xe buýt và tọa độ GPS (latitude, longitude)";
            } else if (colName === "NguoiDung") {
                type = "Vertex Collection";
                role = "Tài khoản quản trị viên và người dùng hệ thống";
            }

            results.push({
                name: colName,
                type,
                role,
                documentCount: count,
                indexCount: indexes.length,
                indexes: indexes.map((idx) => ({
                    name: idx.name,
                    key: idx.key,
                    unique: Boolean(idx.unique)
                }))
            });
        } catch (error) {
            results.push({
                name: colName,
                error: error.message,
                documentCount: 0
            });
        }
    }

    return results;
};

/**
 * 2. LẤY DANH SÁCH DOCUMENTS CÓ PHÂN TRANG & BỘ LỌC
 */
const getDocuments = async (collectionName, { page = 1, limit = 20, search = "", sort = "_id", order = 1 }) => {
    if (!COLLECTIONS.includes(collectionName)) {
        throw new Error(`Collection không hợp lệ: ${collectionName}`);
    }

    const col = db.collection(collectionName);
    const filter = {};

    if (search && search.trim()) {
        const q = search.trim();
        const searchRegex = { $regex: q, $options: "i" };
        if (collectionName === "TuyenXe") {
            filter.$or = [{ ma_tuyen: searchRegex }, { ten_tuyen: searchRegex }, { _key: searchRegex }];
        } else if (collectionName === "TramDung") {
            filter.$or = [{ ma_tram: searchRegex }, { ten_tram: searchRegex }, { dia_chi: searchRegex }, { _key: searchRegex }];
        } else if (collectionName === "NguoiDung") {
            filter.$or = [{ ho_ten: searchRegex }, { email: searchRegex }, { username: searchRegex }];
        } else if (collectionName === "CO_TRAM" || collectionName === "KE_TIEP") {
            filter.$or = [{ _from: searchRegex }, { _to: searchRegex }, { ma_tuyen: searchRegex }];
        } else {
            filter.$or = [{ _id: searchRegex }, { _key: searchRegex }];
        }
    }

    const total = await col.countDocuments(filter);
    const skip = (Math.max(1, page) - 1) * Math.max(1, Math.min(100, limit));

    const sortObj = {};
    sortObj[sort] = order === -1 || order === "-1" ? -1 : 1;

    // Không trả về mat_khau trong NguoiDung
    const projection = collectionName === "NguoiDung" ? { mat_khau: 0 } : {};

    const documents = await col
        .find(filter, { projection })
        .sort(sortObj)
        .skip(skip)
        .limit(Math.max(1, Math.min(100, limit)))
        .toArray();

    return {
        collection: collectionName,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit) || 1,
        documents
    };
};

/**
 * 3. CRUD TRÊN DOCUMENT
 */
const insertDocument = async (collectionName, docData) => {
    if (!COLLECTIONS.includes(collectionName)) {
        throw new Error(`Collection không hợp lệ: ${collectionName}`);
    }
    const col = db.collection(collectionName);
    const formatted = ensureDocumentKeys(collectionName, docData);

    const exists = await col.findOne({ _id: formatted._id });
    if (exists) {
        throw new Error(`Document với _id "${formatted._id}" đã tồn tại`);
    }

    await col.insertOne(formatted);
    return formatted;
};

const updateDocument = async (collectionName, id, updateData) => {
    if (!COLLECTIONS.includes(collectionName)) {
        throw new Error(`Collection không hợp lệ: ${collectionName}`);
    }
    const col = db.collection(collectionName);
    const filter = buildIdFilter(collectionName, id);

    const existing = await col.findOne(filter);
    if (!existing) {
        return null;
    }

    // Không cho phép ghi đè _id
    const { _id, ...safeUpdates } = updateData;

    await col.updateOne({ _id: existing._id }, { $set: safeUpdates });
    return await col.findOne({ _id: existing._id });
};

const deleteDocument = async (collectionName, id) => {
    if (!COLLECTIONS.includes(collectionName)) {
        throw new Error(`Collection không hợp lệ: ${collectionName}`);
    }
    const col = db.collection(collectionName);
    const filter = buildIdFilter(collectionName, id);

    const existing = await col.findOne(filter);
    if (!existing) {
        return false;
    }

    await col.deleteOne({ _id: existing._id });
    return true;
};

/**
 * 4. QUẢN LÝ INDEXES
 */
const getIndexes = async (collectionName) => {
    if (!COLLECTIONS.includes(collectionName)) {
        throw new Error(`Collection không hợp lệ: ${collectionName}`);
    }
    return await db.collection(collectionName).indexes();
};

const createCustomIndex = async (collectionName, field, isUnique = false) => {
    if (!COLLECTIONS.includes(collectionName)) {
        throw new Error(`Collection không hợp lệ: ${collectionName}`);
    }
    const allowedFields = ["_key", "ma_tuyen", "ma_tram", "email", "_from", "_to", "thu_tu", "ma_chieu", "trang_thai"];
    if (!allowedFields.includes(field)) {
        throw new Error(`Trường index không hợp lệ hoặc không an toàn: ${field}`);
    }

    const indexSpec = {};
    indexSpec[field] = 1;

    return await db.collection(collectionName).createIndex(indexSpec, {
        unique: Boolean(isUnique),
        background: true
    });
};

/**
 * 5. MONGODB PLAYGROUND – TRUY VẤN MẪU ĐƯỢC ĐỊNH NGHĨA AN TOÀN
 */
const PLAYGROUND_PRESETS = [
    {
        id: "active_routes",
        name: "A. Tuyến xe đang hoạt động",
        type: "find",
        description: "Lọc tất cả tuyến xe có trạng thái active bằng phương thức find()",
        queryCode: `db.TuyenXe.find({ trang_thai: "active" })`,
        run: async () => {
            return await db.collection("TuyenXe").find({ trang_thai: "active" }).toArray();
        }
    },
    {
        id: "route_01_stops",
        name: "B. Danh sách trạm thuộc Tuyến 01 theo thứ tự",
        type: "aggregate",
        description: "Sử dụng $lookup và $sort nối CO_TRAM với TramDung để lấy thứ tự trạm của Tuyến 01",
        queryCode: `db.CO_TRAM.aggregate([
  { $match: { _from: "TuyenXe/TX_01", ma_chieu: "luot_di" } },
  { $sort: { thu_tu: 1 } },
  { $lookup: { from: "TramDung", localField: "_to", foreignField: "_id", as: "tram" } },
  { $unwind: "$tram" },
  { $project: { _id: 0, thu_tu: 1, ma_chieu: 1, ma_tram: "$tram.ma_tram", ten_tram: "$tram.ten_tram", dia_chi: "$tram.dia_chi" } }
])`,
        run: async () => {
            return await db.collection("CO_TRAM").aggregate([
                { $match: { _from: "TuyenXe/TX_01", ma_chieu: "luot_di" } },
                { $sort: { thu_tu: 1 } },
                { $lookup: { from: "TramDung", localField: "_to", foreignField: "_id", as: "tram" } },
                { $unwind: "$tram" },
                { $project: { _id: 0, thu_tu: 1, ma_chieu: 1, ma_tram: "$tram.ma_tram", ten_tram: "$tram.ten_tram", dia_chi: "$tram.dia_chi" } }
            ]).toArray();
        }
    },
    {
        id: "routes_most_stops",
        name: "C. Xếp hạng tuyến có nhiều trạm nhất",
        type: "aggregate",
        description: "Sử dụng $group và $lookup thống kê tổng số lượng trạm trên mỗi tuyến xe",
        queryCode: `db.CO_TRAM.aggregate([
  { $match: { ma_chieu: "luot_di" } },
  { $group: { _id: "$_from", so_tram: { $sum: 1 }, ma_tuyen: { $first: "$ma_tuyen" } } },
  { $lookup: { from: "TuyenXe", localField: "_id", foreignField: "_id", as: "tuyen" } },
  { $unwind: "$tuyen" },
  { $project: { ma_tuyen: 1, ten_tuyen: "$tuyen.ten_tuyen", so_tram: 1, gia_ve: "$tuyen.gia_ve" } },
  { $sort: { so_tram: -1 } }
])`,
        run: async () => {
            return await db.collection("CO_TRAM").aggregate([
                { $match: { ma_chieu: "luot_di" } },
                { $group: { _id: "$_from", so_tram: { $sum: 1 }, ma_tuyen: { $first: "$ma_tuyen" } } },
                { $lookup: { from: "TuyenXe", localField: "_id", foreignField: "_id", as: "tuyen" } },
                { $unwind: "$tuyen" },
                { $project: { ma_tuyen: 1, ten_tuyen: "$tuyen.ten_tuyen", so_tram: 1, gia_ve: "$tuyen.gia_ve" } },
                { $sort: { so_tram: -1 } }
            ]).toArray();
        }
    },
    {
        id: "stops_most_routes",
        name: "D. Các trạm được nhiều tuyến phục vụ nhất (Hub giao thông)",
        type: "aggregate",
        description: "Nhóm các trạm dừng theo số lượng tuyến xe buýt đi qua để phát hiện trạm trung chuyển",
        queryCode: `db.CO_TRAM.aggregate([
  { $group: { _id: "$_to", so_tuyen: { $addToSet: "$ma_tuyen" } } },
  { $project: { _id: 1, danh_sach_tuyen: "$so_tuyen", so_luong_tuyen: { $size: "$so_tuyen" } } },
  { $lookup: { from: "TramDung", localField: "_id", foreignField: "_id", as: "tram" } },
  { $unwind: "$tram" },
  { $project: { ma_tram: "$tram.ma_tram", ten_tram: "$tram.ten_tram", dia_chi: "$tram.dia_chi", so_luong_tuyen: 1, danh_sach_tuyen: 1 } },
  { $sort: { so_luong_tuyen: -1 } },
  { $limit: 10 }
])`,
        run: async () => {
            return await db.collection("CO_TRAM").aggregate([
                { $group: { _id: "$_to", so_tuyen: { $addToSet: "$ma_tuyen" } } },
                { $project: { _id: 1, danh_sach_tuyen: "$so_tuyen", so_luong_tuyen: { $size: "$so_tuyen" } } },
                { $lookup: { from: "TramDung", localField: "_id", foreignField: "_id", as: "tram" } },
                { $unwind: "$tram" },
                { $project: { ma_tram: "$tram.ma_tram", ten_tram: "$tram.ten_tram", dia_chi: "$tram.dia_chi", so_luong_tuyen: 1, danh_sach_tuyen: 1 } },
                { $sort: { so_luong_tuyen: -1 } },
                { $limit: 10 }
            ]).toArray();
        }
    },
    {
        id: "direct_connections_tr01",
        name: "E. Các trạm liên kết trực tiếp từ Trạm Bến Thành (TR_01)",
        type: "aggregate",
        description: "Truy vấn cạnh KE_TIEP để lấy các trạm có kết nối trực tiếp đi từ TR_01",
        queryCode: `db.KE_TIEP.aggregate([
  { $match: { _from: "TramDung/TR_01" } },
  { $lookup: { from: "TramDung", localField: "_to", foreignField: "_id", as: "tram_den" } },
  { $unwind: "$tram_den" },
  { $project: { ma_tuyen: 1, ma_chieu: 1, khoang_cach_km: 1, thoi_gian_phut: "$thoi_gian_di_chuyen_phut", tram_den: "$tram_den.ten_tram", ma_tram_den: "$tram_den.ma_tram" } }
])`,
        run: async () => {
            return await db.collection("KE_TIEP").aggregate([
                { $match: { _from: "TramDung/TR_01" } },
                { $lookup: { from: "TramDung", localField: "_to", foreignField: "_id", as: "tram_den" } },
                { $unwind: "$tram_den" },
                { $project: { ma_tuyen: 1, ma_chieu: 1, khoang_cach_km: 1, thoi_gian_phut: "$thoi_gian_di_chuyen_phut", tram_den: "$tram_den.ten_tram", ma_tram_den: "$tram_den.ma_tram" } }
            ]).toArray();
        }
    },
    {
        id: "graph_lookup_traversal",
        name: "F. Duyệt đồ thị mạng lưới bằng $graphLookup",
        type: "graphLookup",
        description: "Duyệt đệ quy tất cả các trạm có thể tiếp cận từ TR_01 trong tối đa 4 bước chuyển tiếp",
        queryCode: `db.TramDung.aggregate([
  { $match: { _id: "TramDung/TR_01" } },
  {
    $graphLookup: {
      from: "KE_TIEP",
      startWith: "$_id",
      connectFromField: "_to",
      connectToField: "_from",
      as: "cac_tram_co_the_den",
      maxDepth: 3,
      depthField: "so_chang"
    }
  },
  {
    $project: {
      ma_tram: 1,
      ten_tram: 1,
      tong_ket_noi: { $size: "$cac_tram_co_the_den" },
      danh_sach_canh: {
        $map: {
          input: { $slice: ["$cac_tram_co_the_den", 10] },
          as: "e",
          in: { tu: "$$e._from", den: "$$e._to", tuyen: "$$e.ma_tuyen", chang: "$$e.so_chang" }
        }
      }
    }
  }
])`,
        run: async () => {
            return await db.collection("TramDung").aggregate([
                { $match: { _id: "TramDung/TR_01" } },
                {
                    $graphLookup: {
                        from: "KE_TIEP",
                        startWith: "$_id",
                        connectFromField: "_to",
                        connectToField: "_from",
                        as: "cac_tram_co_the_den",
                        maxDepth: 3,
                        depthField: "so_chang"
                    }
                },
                {
                    $project: {
                        ma_tram: 1,
                        ten_tram: 1,
                        tong_ket_noi: { $size: "$cac_tram_co_the_den" },
                        danh_sach_canh: {
                            $map: {
                                input: { $slice: ["$cac_tram_co_the_den", 10] },
                                as: "e",
                                in: { tu: "$$e._from", den: "$$e._to", tuyen: "$$e.ma_tuyen", chang: "$$e.so_chang" }
                            }
                        }
                    }
                }
            ]).toArray();
        }
    },
    {
        id: "transfer_hub_analysis",
        name: "G. Phân tích điểm trung chuyển nhiều kết nối ($facet)",
        type: "aggregate",
        description: "Sử dụng $facet thực hiện đồng thời nhiều phân tích: trạm nhiều tuyến và trạm nhiều liên kết cạnh",
        queryCode: `db.CO_TRAM.aggregate([
  {
    $facet: {
      "top_tram_nhieu_tuyen": [
        { $group: { _id: "$_to", so_tuyen: { $addToSet: "$ma_tuyen" } } },
        { $project: { _id: 1, so_luong: { $size: "$so_tuyen" } } },
        { $sort: { so_luong: -1 } },
        { $limit: 5 }
      ],
      "phan_bo_theo_chieu": [
        { $group: { _id: "$ma_chieu", so_luong_tram_duoc_gan: { $sum: 1 } } }
      ]
    }
  }
])`,
        run: async () => {
            return await db.collection("CO_TRAM").aggregate([
                {
                    $facet: {
                        "top_tram_nhieu_tuyen": [
                            { $group: { _id: "$_to", so_tuyen: { $addToSet: "$ma_tuyen" } } },
                            { $project: { _id: 1, so_luong: { $size: "$so_tuyen" } } },
                            { $sort: { so_luong: -1 } },
                            { $limit: 5 }
                        ],
                        "phan_bo_theo_chieu": [
                            { $group: { _id: "$ma_chieu", so_luong_tram_duoc_gan: { $sum: 1 } } }
                        ]
                    }
                }
            ]).toArray();
        }
    },
    {
        id: "district_stop_stats",
        name: "H. Thống kê phân bố trạm dừng theo Quận / Khu vực",
        type: "aggregate",
        description: "Nhóm các trạm theo khu vực địa lý để đánh giá độ phủ mạng lưới xe buýt TP.HCM",
        queryCode: `db.TramDung.aggregate([
  { $group: { _id: "$khuVuc", so_tram: { $sum: 1 }, danh_sach_tram: { $push: "$ten_tram" } } },
  { $project: { khu_vuc: { $ifNull: ["$_id", "Khác"] }, so_tram: 1, mau_tram: { $slice: ["$danh_sach_tram", 3] } } },
  { $sort: { so_tram: -1 } }
])`,
        run: async () => {
            return await db.collection("TramDung").aggregate([
                { $group: { _id: "$khuVuc", so_tram: { $sum: 1 }, danh_sach_tram: { $push: "$ten_tram" } } },
                { $project: { khu_vuc: { $ifNull: ["$_id", "Khác"] }, so_tram: 1, mau_tram: { $slice: ["$danh_sach_tram", 3] } } },
                { $sort: { so_tram: -1 } }
            ]).toArray();
        }
    }
];

const getPlaygroundPresets = () => {
    return PLAYGROUND_PRESETS.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        description: p.description,
        queryCode: p.queryCode
    }));
};

const runPlaygroundQuery = async (queryId) => {
    const preset = PLAYGROUND_PRESETS.find((p) => p.id === queryId);
    if (!preset) {
        throw new Error(`Mẫu truy vấn không tồn tại: ${queryId}`);
    }

    const startTime = Date.now();
    const result = await preset.run();
    const executionTimeMs = Date.now() - startTime;

    return {
        queryId: preset.id,
        name: preset.name,
        type: preset.type,
        description: preset.description,
        queryCode: preset.queryCode,
        executionTimeMs,
        resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
        data: result
    };
};

/**
 * 6. KIỂM TRA TÍNH TOÀN VẸN CƠ SỞ DỮ LIỆU (DATABASE INTEGRITY AUDIT)
 */
const auditDatabaseIntegrity = async () => {
    const issues = [];

    // Lấy toàn bộ dữ liệu cần thiết để kiểm tra
    const [routes, stops, coTramEdges, keTiepEdges] = await Promise.all([
        db.collection("TuyenXe").find({}).toArray(),
        db.collection("TramDung").find({}).toArray(),
        db.collection("CO_TRAM").find({}).toArray(),
        db.collection("KE_TIEP").find({}).toArray()
    ]);

    const routeIds = new Set(routes.map((r) => r._id));
    const stopIds = new Set(stops.map((s) => s._id));
    const routeCodes = new Set(routes.map((r) => r.ma_tuyen || r.maTuyen));
    const stopCodes = new Set(stops.map((s) => s.ma_tram || s.maTram));

    // 1. Kiểm tra cạnh CO_TRAM mồ côi (trỏ đến TuyenXe hoặc TramDung không tồn tại)
    let orphanCoTram = 0;
    coTramEdges.forEach((e) => {
        if (!routeIds.has(e._from)) {
            orphanCoTram++;
            issues.push({
                severity: "HIGH",
                category: "ORPHAN_EDGE",
                message: `Cạnh CO_TRAM ${e._id} trỏ đến Tuyến xe không tồn tại: ${e._from}`,
                documentId: e._id,
                remediation: "Xóa cạnh mồ côi hoặc cập nhật lại _from đúng mã tuyến"
            });
        }
        if (!stopIds.has(e._to)) {
            orphanCoTram++;
            issues.push({
                severity: "HIGH",
                category: "ORPHAN_EDGE",
                message: `Cạnh CO_TRAM ${e._id} trỏ đến Trạm dừng không tồn tại: ${e._to}`,
                documentId: e._id,
                remediation: "Xóa cạnh mồ côi hoặc cập nhật lại _to đúng mã trạm"
            });
        }
    });

    // 2. Kiểm tra cạnh KE_TIEP mồ côi
    let orphanKeTiep = 0;
    keTiepEdges.forEach((e) => {
        if (!stopIds.has(e._from)) {
            orphanKeTiep++;
            issues.push({
                severity: "HIGH",
                category: "ORPHAN_EDGE",
                message: `Cạnh KE_TIEP ${e._id} có trạm bắt đầu không tồn tại: ${e._from}`,
                documentId: e._id,
                remediation: "Kiểm tra và gán lại trạm xuất phát hợp lệ"
            });
        }
        if (!stopIds.has(e._to)) {
            orphanKeTiep++;
            issues.push({
                severity: "HIGH",
                category: "ORPHAN_EDGE",
                message: `Cạnh KE_TIEP ${e._id} có trạm kết thúc không tồn tại: ${e._to}`,
                documentId: e._id,
                remediation: "Kiểm tra và gán lại trạm đích hợp lệ"
            });
        }
    });

    // 3. Kiểm tra tọa độ không hợp lệ trong TramDung
    stops.forEach((s) => {
        const lat = Number(s.latitude ?? s.vi_do ?? s.lat);
        const lng = Number(s.longitude ?? s.kinh_do ?? s.lng);

        // Tọa độ TP.HCM thường nằm trong khoảng: Lat 10.3 - 11.2, Lng 106.3 - 107.1
        if (isNaN(lat) || isNaN(lng) || lat < 10.0 || lat > 11.5 || lng < 106.0 || lng > 107.5) {
            issues.push({
                severity: "MEDIUM",
                category: "INVALID_COORDINATES",
                message: `Trạm ${s.ten_tram || s._id} có tọa độ (${lat}, ${lng}) nằm ngoài phạm vi TP.HCM`,
                documentId: s._id,
                remediation: "Cập nhật tọa độ chính xác của trạm dừng"
            });
        }
    });

    // 4. Kiểm tra tuyến không có trạm
    routes.forEach((r) => {
        const hasStops = coTramEdges.some((e) => e._from === r._id);
        if (!hasStops) {
            issues.push({
                severity: "MEDIUM",
                category: "EMPTY_ROUTE",
                message: `Tuyến ${r.ma_tuyen || r._id} (${r.ten_tuyen}) chưa được gán bất kỳ trạm dừng nào`,
                documentId: r._id,
                remediation: "Gán danh sách trạm dừng qua chức năng Quản lý tuyến"
            });
        }
    });

    // 5. Kiểm tra trạm mồ côi (không thuộc tuyến nào)
    stops.forEach((s) => {
        const isInRoute = coTramEdges.some((e) => e._to === s._id);
        if (!isInRoute) {
            issues.push({
                severity: "LOW",
                category: "UNUSED_STOP",
                message: `Trạm ${s.ten_tram || s._id} chưa được tuyến xe nào đi qua`,
                documentId: s._id,
                remediation: "Gán trạm vào lộ trình hoặc xóa nếu trạm không còn phục vụ"
            });
        }
    });

    return {
        checkedAt: new Date().toISOString(),
        summary: {
            totalIssues: issues.length,
            highSeverity: issues.filter((i) => i.severity === "HIGH").length,
            mediumSeverity: issues.filter((i) => i.severity === "MEDIUM").length,
            lowSeverity: issues.filter((i) => i.severity === "LOW").length,
            status: issues.length === 0 ? "HEALTHY" : issues.some((i) => i.severity === "HIGH") ? "CRITICAL" : "WARNING"
        },
        counts: {
            routes: routes.length,
            stops: stops.length,
            coTram: coTramEdges.length,
            keTiep: keTiepEdges.length
        },
        issues
    };
};

/**
 * 7. BACKUP VÀ RESTORE
 */
const listBackups = () => {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    const files = fs.readdirSync(BACKUP_DIR);
    return files
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
            const stats = fs.statSync(path.join(BACKUP_DIR, f));
            return {
                filename: f,
                sizeBytes: stats.size,
                sizeKb: (stats.size / 1024).toFixed(1),
                createdAt: stats.mtime.toISOString()
            };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const createFullBackup = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `BusRouteDB_Backup_${timestamp}.json`;
    const targetPath = path.join(BACKUP_DIR, filename);

    const backupData = {
        metadata: {
            database: "BusRouteDB",
            exportedAt: new Date().toISOString(),
            version: "1.0.0"
        },
        collections: {}
    };

    for (const colName of COLLECTIONS) {
        const docs = await db.collection(colName).find({}).toArray();
        backupData.collections[colName] = docs;
    }

    fs.writeFileSync(targetPath, JSON.stringify(backupData, null, 2), "utf8");

    return {
        filename,
        path: targetPath,
        sizeBytes: fs.statSync(targetPath).size,
        counts: Object.fromEntries(Object.entries(backupData.collections).map(([k, v]) => [k, v.length]))
    };
};

const restoreFromBackup = async (filename) => {
    const cleanFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, cleanFilename);

    if (!fs.existsSync(filePath)) {
        throw new Error(`File backup không tồn tại: ${cleanFilename}`);
    }

    const content = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(content);

    if (!data.collections || typeof data.collections !== "object") {
        throw new Error("Cấu trúc file backup không đúng định dạng BusRouteDB");
    }

    const restoredCounts = {};

    for (const [colName, docs] of Object.entries(data.collections)) {
        if (!COLLECTIONS.includes(colName)) continue;
        const col = db.collection(colName);
        await col.deleteMany({});
        if (Array.isArray(docs) && docs.length > 0) {
            await col.insertMany(docs);
        }
        restoredCounts[colName] = docs.length;
    }

    return {
        restoredFile: cleanFilename,
        restoredCounts,
        restoredAt: new Date().toISOString()
    };
};

const getFullBackupData = async () => {
    const backupData = {
        metadata: {
            database: "BusRouteDB",
            exportedAt: new Date().toISOString(),
            version: "2.0.0"
        },
        collections: {}
    };

    for (const colName of COLLECTIONS) {
        const docs = await db.collection(colName).find({}).toArray();
        backupData.collections[colName] = docs;
    }

    return backupData;
};

const restoreFromUploadData = async (backupData) => {
    if (!backupData || typeof backupData !== "object" || !backupData.collections) {
        throw new Error("File JSON sao lưu không hợp lệ: thiếu thuộc tính 'collections'.");
    }

    const { collections } = backupData;
    const requiredCollections = ["TuyenXe", "TramDung", "NguoiDung", "CO_TRAM", "KE_TIEP"];
    for (const reqCol of requiredCollections) {
        if (!collections[reqCol] || !Array.isArray(collections[reqCol])) {
            throw new Error(`Dữ liệu không hợp lệ: thiếu collection bắt buộc "${reqCol}".`);
        }
    }

    const restoredCounts = {};
    for (const [colName, docs] of Object.entries(collections)) {
        if (!COLLECTIONS.includes(colName)) continue;
        const col = db.collection(colName);
        await col.deleteMany({});
        if (Array.isArray(docs) && docs.length > 0) {
            await col.insertMany(docs);
        }
        restoredCounts[colName] = docs.length;
    }

    return {
        restoredCounts,
        restoredAt: new Date().toISOString()
    };
};

/**
 * 8. IMPORT & EXPORT
 */
const exportCollection = async (collectionName, format = "json") => {
    if (!COLLECTIONS.includes(collectionName)) {
        throw new Error(`Collection không hợp lệ: ${collectionName}`);
    }

    const docs = await db.collection(collectionName).find({}).toArray();

    if (format === "csv") {
        if (!docs.length) return "";
        const keys = Object.keys(docs[0]).filter((k) => k !== "_id" && typeof docs[0][k] !== "object");
        const header = keys.join(",");
        const rows = docs.map((d) => keys.map((k) => `"${String(d[k] ?? "").replace(/"/g, '""')}"`).join(","));
        return [header, ...rows].join("\n");
    }

    return docs;
};

const importCollection = async (collectionName, items, mode = "insert") => {
    if (!COLLECTIONS.includes(collectionName)) {
        throw new Error(`Collection không hợp lệ: ${collectionName}`);
    }
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Dữ liệu import phải là mảng các document");
    }

    const col = db.collection(collectionName);
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of items) {
        const formatted = ensureDocumentKeys(collectionName, item);
        const existing = await col.findOne({ _id: formatted._id });

        if (existing) {
            if (mode === "upsert") {
                await col.updateOne({ _id: formatted._id }, { $set: formatted });
                updated++;
            } else {
                skipped++;
            }
        } else {
            await col.insertOne(formatted);
            inserted++;
        }
    }

    return {
        collection: collectionName,
        totalSubmitted: items.length,
        inserted,
        updated,
        skipped
    };
};

module.exports = {
    COLLECTIONS,
    getCollectionsOverview,
    getDocuments,
    insertDocument,
    updateDocument,
    deleteDocument,
    getIndexes,
    createCustomIndex,
    getPlaygroundPresets,
    runPlaygroundQuery,
    auditDatabaseIntegrity,
    listBackups,
    createFullBackup,
    restoreFromBackup,
    getFullBackupData,
    restoreFromUploadData,
    exportCollection,
    importCollection
};
