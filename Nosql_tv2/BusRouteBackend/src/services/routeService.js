const { db, ensureDocumentKeys, buildIdFilter } = require("../config/database");

const routeCollection = db.collection("TuyenXe");
const stopCollection = db.collection("TramDung");
const coTramCollection = db.collection("CO_TRAM");
const keTiepCollection = db.collection("KE_TIEP");

// 1. Lấy danh sách tuyến xe
const getAllRoutes = async () => {
    return await routeCollection.find({}).sort({ ma_tuyen: 1 }).toArray();
};

// 2. Tìm tuyến xe theo ID (_key hoặc _id)
const getRouteById = async (routeId) => {
    return await routeCollection.findOne(buildIdFilter("TuyenXe", routeId));
};

// 3. Thêm tuyến xe
const createRoute = async (routeData) => {
    const doc = ensureDocumentKeys("TuyenXe", routeData);
    await routeCollection.insertOne(doc);
    return doc;
};

// 4. Cập nhật tuyến xe và đồng bộ mã tuyến trong các cạnh
const updateRoute = async (routeId, routeData) => {
    const route = await getRouteById(routeId);
    if (!route) {
        return null;
    }

    const oldCode = route.ma_tuyen;

    await routeCollection.updateOne(
        { _id: route._id },
        { $set: routeData }
    );

    const updatedRoute = await routeCollection.findOne({ _id: route._id });

    if (updatedRoute && updatedRoute.ma_tuyen !== oldCode) {
        await coTramCollection.updateMany(
            { _from: route._id },
            { $set: { ma_tuyen: updatedRoute.ma_tuyen } }
        );

        await keTiepCollection.updateMany(
            { ma_tuyen: oldCode },
            { $set: { ma_tuyen: updatedRoute.ma_tuyen } }
        );
    }

    return updatedRoute;
};

// 5. Xóa tuyến xe và các liên kết liên quan
const deleteRoute = async (routeId) => {
    const route = await getRouteById(routeId);
    if (!route) {
        return false;
    }

    await coTramCollection.deleteMany({ _from: route._id });
    await keTiepCollection.deleteMany({ ma_tuyen: route.ma_tuyen });
    await routeCollection.deleteOne({ _id: route._id });

    return true;
};

// Hàm lấy thông tin trạm
const getStopById = async (stopId) => {
    return await stopCollection.findOne(buildIdFilter("TramDung", stopId));
};

// 6. Gán danh sách trạm cho tuyến xe theo từng chiều
const assignStopsToRoute = async (routeId, direction, stops) => {
    // Kiểm tra chiều tuyến
    if (!["luot_di", "luot_ve"].includes(direction)) {
        throw new Error("Chiều tuyến không hợp lệ");
    }

    // Tìm tuyến xe
    const route = await getRouteById(routeId);

    if (!route) {
        throw new Error("Không tìm thấy tuyến xe");
    }

    // Kiểm tra danh sách trạm
    if (!Array.isArray(stops) || stops.length < 2) {
        throw new Error("Danh sách phải có ít nhất 2 trạm");
    }

    const stopIds = new Set();
    const resolvedStops = [];

    // Kiểm tra từng trạm
    for (let i = 0; i < stops.length; i++) {
        const item = stops[i];

        if (
            !item ||
            typeof item !== "object" ||
            typeof item.id !== "string" ||
            !item.id.trim()
        ) {
            throw new Error("ID trạm không hợp lệ");
        }

        const rawId = item.id.trim();
        if (stopIds.has(rawId)) {
            throw new Error("Danh sách trạm không được trùng ID");
        }

        stopIds.add(rawId);

        const stop = await getStopById(rawId);

        if (!stop || stop.trang_thai !== "active") {
            throw new Error(
                `Trạm ${item.id} không tồn tại hoặc đã ngừng hoạt động`
            );
        }

        // Kiểm tra khoảng cách và thời gian từ trạm trước đến trạm hiện tại
        if (i > 0) {
            if (
                !Number.isFinite(item.khoang_cach_km) ||
                item.khoang_cach_km < 0 ||
                !Number.isFinite(item.thoi_gian_di_chuyen_phut) ||
                item.thoi_gian_di_chuyen_phut < 0
            ) {
                throw new Error(
                    "Khoảng cách và thời gian di chuyển không hợp lệ"
                );
            }
        }

        resolvedStops.push({
            stopDoc: stop,
            khoang_cach_km: item.khoang_cach_km,
            thoi_gian_di_chuyen_phut: item.thoi_gian_di_chuyen_phut
        });
    }

    // Xây dựng các cạnh CO_TRAM
    const chieuShort = direction === "luot_ve" ? "ve" : "di";
    const coTramEdges = resolvedStops.map((item, index) =>
        ensureDocumentKeys("CO_TRAM", {
            _from: route._id,
            _to: item.stopDoc._id,
            ma_tuyen: route.ma_tuyen,
            maTuyen: route.ma_tuyen,
            ma_chieu: direction,
            chieuDi: chieuShort,
            thu_tu: index + 1,
            thuTu: index + 1
        })
    );

    // Xây dựng các cạnh KE_TIEP
    const keTiepEdges = [];

    for (let i = 0; i < resolvedStops.length - 1; i++) {
        const distKm = resolvedStops[i + 1].khoang_cach_km;
        const timeMin = resolvedStops[i + 1].thoi_gian_di_chuyen_phut;
        keTiepEdges.push(
            ensureDocumentKeys("KE_TIEP", {
                _from: resolvedStops[i].stopDoc._id,
                _to: resolvedStops[i + 1].stopDoc._id,
                ma_tuyen: route.ma_tuyen,
                maTuyen: route.ma_tuyen,
                ma_chieu: direction,
                chieuDi: chieuShort,
                thu_tu: i + 1,
                thuTu: i + 1,
                khoang_cach_km: distKm,
                khoangCach: Math.round(distKm * 1000),
                thoi_gian_di_chuyen_phut: timeMin,
                thoiGian: timeMin
            })
        );
    }

    // Thay thế các liên kết cũ bằng liên kết mới
    await coTramCollection.deleteMany({
        _from: route._id,
        ma_chieu: direction
    });

    await keTiepCollection.deleteMany({
        ma_tuyen: route.ma_tuyen,
        ma_chieu: direction
    });

    if (coTramEdges.length > 0) {
        await coTramCollection.insertMany(coTramEdges);
    }

    if (keTiepEdges.length > 0) {
        await keTiepCollection.insertMany(keTiepEdges);
    }

    return {
        ma_tuyen: route.ma_tuyen,
        ma_chieu: direction,
        so_tram: stops.length,
        so_lien_ket: keTiepEdges.length
    };
};

// 7. Lấy chi tiết tuyến xe kèm danh sách trạm và thông tin di chuyển
const getRouteWithStops = async (routeId, direction = null) => {
    const route = await getRouteById(routeId);

    if (!route) {
        return null;
    }

    const matchFilter = { _from: route._id };
    if (direction !== null) {
        matchFilter.ma_chieu = direction;
    }

    const stops = await coTramCollection
        .aggregate([
            { $match: matchFilter },
            { $sort: { ma_chieu: 1, thu_tu: 1 } },
            {
                $lookup: {
                    from: "TramDung",
                    localField: "_to",
                    foreignField: "_id",
                    as: "tramArr"
                }
            },
            { $unwind: "$tramArr" },
            {
                $lookup: {
                    from: "KE_TIEP",
                    let: {
                        maChieu: "$ma_chieu",
                        thuTu: "$thu_tu"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$ma_tuyen", route.ma_tuyen] },
                                        { $eq: ["$ma_chieu", "$$maChieu"] },
                                        { $eq: ["$thu_tu", "$$thuTu"] }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: "keTiepArr"
                }
            },
            {
                $project: {
                    _id: 0,
                    thu_tu: 1,
                    ma_chieu: 1,
                    tram: "$tramArr",
                    khoang_cach_den_tram_tiep_theo: {
                        $ifNull: [
                            { $arrayElemAt: ["$keTiepArr.khoang_cach_km", 0] },
                            null
                        ]
                    },
                    thoi_gian_den_tram_tiep_theo: {
                        $ifNull: [
                            {
                                $arrayElemAt: [
                                    "$keTiepArr.thoi_gian_di_chuyen_phut",
                                    0
                                ]
                            },
                            null
                        ]
                    }
                }
            }
        ])
        .toArray();

    return {
        tuyen_xe: route,
        danh_sach_tram: stops
    };
};

// 8. Kiểm tra mã tuyến đã tồn tại
const isRouteCodeExists = async (maTuyen, excludeId = null) => {
    const filter = { ma_tuyen: maTuyen };

    if (excludeId !== null) {
        const cleanKey = String(excludeId).includes("/")
            ? String(excludeId).split("/")[1]
            : String(excludeId);
        filter._key = { $ne: cleanKey };
        filter._id = { $ne: `TuyenXe/${cleanKey}` };
    }

    const existing = await routeCollection.findOne(filter);
    return Boolean(existing);
};

module.exports = {
    getAllRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
    assignStopsToRoute,
    getRouteWithStops,
    isRouteCodeExists
};
