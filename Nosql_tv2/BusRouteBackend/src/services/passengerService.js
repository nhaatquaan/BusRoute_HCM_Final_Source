const { db, ensureDocumentKeys, buildIdFilter } = require("../config/database");
const { ObjectId } = require("mongodb");

const HISTORY_COLLECTION = "LichSuTimKiem";
const PLACES_COLLECTION = "DiaDiemYeuThich";
const FAVORITES_COLLECTION = "TuyenYeuThich";
const USERS_COLLECTION = "NguoiDung";
const STOPS_COLLECTION = "TramDung";
const ROUTES_COLLECTION = "TuyenXe";

/**
 * Khởi tạo Index cho các Collection cá nhân hóa (chạy 1 lần an toàn)
 */
let indexesInitialized = false;
async function ensurePassengerIndexes() {
    if (indexesInitialized) return;
    try {
        const collections = (await db.listCollections().toArray()).map((c) => c.name);

        if (!collections.includes(HISTORY_COLLECTION)) {
            await db.createCollection(HISTORY_COLLECTION);
        }
        await db.collection(HISTORY_COLLECTION).createIndex({ userId: 1, createdAt: -1 });
        // TTL Index: tự động xóa lịch sử sau 90 ngày (7776000 giây)
        await db.collection(HISTORY_COLLECTION).createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: 90 * 24 * 3600 }
        );

        if (!collections.includes(PLACES_COLLECTION)) {
            await db.createCollection(PLACES_COLLECTION);
        }
        await db.collection(PLACES_COLLECTION).createIndex({ userId: 1, type: 1 });
        await db.collection(PLACES_COLLECTION).createIndex({ location: "2dsphere" });

        if (!collections.includes(FAVORITES_COLLECTION)) {
            await db.createCollection(FAVORITES_COLLECTION);
        }
        await db.collection(FAVORITES_COLLECTION).createIndex(
            { userId: 1, routeId: 1 },
            { unique: true }
        );

        indexesInitialized = true;
    } catch (err) {
        console.warn("ensurePassengerIndexes warning:", err.message);
    }
}

// ============================================================================
// 1. LỊCH SỬ TÌM KIẾM LỘ TRÌNH (LichSuTimKiem)
// ============================================================================

/**
 * Ghi nhận một lần tìm kiếm lộ trình của Passenger
 */
async function recordSearchHistory({
    userId,
    fromStopId,
    toStopId,
    fromStopName,
    toStopName,
    criteria = "least_transfers",
    summaryResult = null
}) {
    await ensurePassengerIndexes();
    if (!userId || !fromStopId || !toStopId) {
        throw new Error("Thiếu thông tin bắt buộc để ghi nhận lịch sử tìm kiếm.");
    }

    const doc = ensureDocumentKeys(HISTORY_COLLECTION, {
        userId: String(userId),
        fromStopId: String(fromStopId),
        toStopId: String(toStopId),
        fromStopName: String(fromStopName || fromStopId),
        toStopName: String(toStopName || toStopId),
        criteria: String(criteria),
        summaryResult: summaryResult
            ? {
                  totalPaths: summaryResult.pathsCount || (summaryResult.paths ? summaryResult.paths.length : 0),
                  transfers: summaryResult.transfers ?? null,
                  durationMinutes: summaryResult.durationMinutes ?? null,
                  primaryRoute: summaryResult.primaryRoute ?? null
              }
            : null,
        createdAt: new Date()
    });

    const res = await db.collection(HISTORY_COLLECTION).insertOne(doc);
    return { id: doc._key, _id: res.insertedId, ...doc };
}

/**
 * Lấy danh sách lịch sử tìm kiếm của người dùng (phân trang)
 */
async function getSearchHistory(userId, { limit = 20, page = 1 } = {}) {
    await ensurePassengerIndexes();
    const parsedLimit = Math.max(1, Math.min(50, Number(limit) || 20));
    const parsedPage = Math.max(1, Number(page) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = { userId: String(userId) };

    const [items, total] = await Promise.all([
        db.collection(HISTORY_COLLECTION)
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parsedLimit)
            .toArray(),
        db.collection(HISTORY_COLLECTION).countDocuments(query)
    ]);

    return {
        data: items.map((item) => ({
            id: item._key || item._id,
            ...item
        })),
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    };
}

/**
 * Xóa một mục lịch sử tìm kiếm (Bảo vệ IDOR: Chỉ xóa khi khớp userId)
 */
async function deleteSearchHistoryItem(userId, itemId) {
    await ensurePassengerIndexes();
    const filter = {
        userId: String(userId),
        $or: [{ _key: String(itemId) }, { _id: String(itemId) }]
    };
    if (ObjectId.isValid(itemId)) {
        filter.$or.push({ _id: new ObjectId(itemId) });
    }

    const res = await db.collection(HISTORY_COLLECTION).deleteOne(filter);
    return res.deletedCount > 0;
}

/**
 * Xóa toàn bộ lịch sử tìm kiếm của chính mình
 */
async function clearAllSearchHistory(userId) {
    await ensurePassengerIndexes();
    const res = await db.collection(HISTORY_COLLECTION).deleteMany({ userId: String(userId) });
    return res.deletedCount;
}

/**
 * Đồng bộ lịch sử tìm kiếm từ LocalStorage của Guest vào tài khoản sau đăng nhập
 */
async function syncGuestHistory(userId, guestList = []) {
    await ensurePassengerIndexes();
    if (!Array.isArray(guestList) || guestList.length === 0) {
        return { syncedCount: 0 };
    }

    const validItems = guestList
        .filter((item) => item && item.fromStopId && item.toStopId)
        .slice(0, 10); // Giới hạn tối đa 10 mục

    let syncedCount = 0;
    for (const item of validItems) {
        // Kiểm tra tránh trùng lặp cùng cặp trạm trong vòng 24 giờ qua
        const existing = await db.collection(HISTORY_COLLECTION).findOne({
            userId: String(userId),
            fromStopId: String(item.fromStopId),
            toStopId: String(item.toStopId)
        });

        if (!existing) {
            await recordSearchHistory({
                userId,
                fromStopId: item.fromStopId,
                toStopId: item.toStopId,
                fromStopName: item.fromStopName || item.fromStopId,
                toStopName: item.toStopName || item.toStopId,
                criteria: item.criteria || "least_transfers",
                summaryResult: item.summaryResult || null
            });
            syncedCount++;
        }
    }

    return { syncedCount };
}

// ============================================================================
// 2. ĐỊA ĐIỂM ĐÃ LƯU (DiaDiemYeuThich - Nhà, Cơ quan, Trường học, v.v.)
// ============================================================================

/**
 * Tìm trạm dừng gần nhất dựa trên tọa độ
 */
async function findNearestStop(lng, lat) {
    if (typeof lng !== "number" || typeof lat !== "number") return null;
    try {
        const stops = await db.collection(STOPS_COLLECTION).find({}).toArray();
        let minDistance = Infinity;
        let nearest = null;

        for (const stop of stops) {
            const stopLat = stop.vi_do || stop.latitude || stop.lat;
            const stopLng = stop.kinh_do || stop.longitude || stop.lng;
            if (typeof stopLat === "number" && typeof stopLng === "number") {
                // Công thức Haversine tính cự ly ước tính km
                const dLat = ((stopLat - lat) * Math.PI) / 180;
                const dLng = ((stopLng - lng) * Math.PI) / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((lat * Math.PI) / 180) *
                        Math.cos((stopLat * Math.PI) / 180) *
                        Math.sin(dLng / 2) *
                        Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distKm = 6371 * c;

                if (distKm < minDistance) {
                    minDistance = distKm;
                    nearest = {
                        stopId: stop.ma_tram || stop.code || stop._key,
                        stopName: stop.ten_tram || stop.name,
                        distanceKm: Math.round(distKm * 100) / 100
                    };
                }
            }
        }
        return nearest;
    } catch (_) {
        return null;
    }
}

/**
 * Lấy danh sách địa điểm đã lưu của người dùng
 */
async function getSavedPlaces(userId) {
    await ensurePassengerIndexes();
    const items = await db
        .collection(PLACES_COLLECTION)
        .find({ userId: String(userId) })
        .sort({ updatedAt: -1, createdAt: -1 })
        .toArray();

    return items.map((item) => ({
        id: item._key || item._id,
        ...item
    }));
}

/**
 * Thêm địa điểm đã lưu mới
 */
async function addSavedPlace(userId, { type = "other", name, address = "", latitude, longitude, nearestStopId, nearestStopName }) {
    await ensurePassengerIndexes();
    if (!name || !name.trim()) {
        throw new Error("Tên địa điểm không được để trống.");
    }

    const validTypes = ["home", "work", "school", "other"];
    const placeType = validTypes.includes(type) ? type : "other";

    let lat = typeof latitude === "number" ? latitude : parseFloat(latitude);
    let lng = typeof longitude === "number" ? longitude : parseFloat(longitude);
    let location = null;

    if (!isNaN(lat) && !isNaN(lng)) {
        location = {
            type: "Point",
            coordinates: [lng, lat]
        };
    }

    let finalNearestStopId = nearestStopId || null;
    let finalNearestStopName = nearestStopName || null;

    if (!finalNearestStopId && location) {
        const foundNearest = await findNearestStop(lng, lat);
        if (foundNearest) {
            finalNearestStopId = foundNearest.stopId;
            finalNearestStopName = foundNearest.stopName;
        }
    }

    const doc = ensureDocumentKeys(PLACES_COLLECTION, {
        userId: String(userId),
        type: placeType,
        name: name.trim(),
        address: (address || "").trim(),
        latitude: !isNaN(lat) ? lat : null,
        longitude: !isNaN(lng) ? lng : null,
        location,
        nearestStopId: finalNearestStopId,
        nearestStopName: finalNearestStopName,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const res = await db.collection(PLACES_COLLECTION).insertOne(doc);
    return { id: doc._key, _id: res.insertedId, ...doc };
}

/**
 * Cập nhật địa điểm đã lưu (Chống IDOR)
 */
async function updateSavedPlace(userId, placeId, updateData = {}) {
    await ensurePassengerIndexes();
    const filter = {
        userId: String(userId),
        $or: [{ _key: String(placeId) }, { _id: String(placeId) }]
    };
    if (ObjectId.isValid(placeId)) {
        filter.$or.push({ _id: new ObjectId(placeId) });
    }

    const existing = await db.collection(PLACES_COLLECTION).findOne(filter);
    if (!existing) {
        return null;
    }

    const updateFields = { updatedAt: new Date() };
    if (updateData.name) updateFields.name = updateData.name.trim();
    if (updateData.type) updateFields.type = updateData.type;
    if (updateData.address !== undefined) updateFields.address = updateData.address.trim();

    let lat = typeof updateData.latitude === "number" ? updateData.latitude : parseFloat(updateData.latitude);
    let lng = typeof updateData.longitude === "number" ? updateData.longitude : parseFloat(updateData.longitude);

    if (!isNaN(lat) && !isNaN(lng)) {
        updateFields.latitude = lat;
        updateFields.longitude = lng;
        updateFields.location = { type: "Point", coordinates: [lng, lat] };

        if (!updateData.nearestStopId) {
            const nearest = await findNearestStop(lng, lat);
            if (nearest) {
                updateFields.nearestStopId = nearest.stopId;
                updateFields.nearestStopName = nearest.stopName;
            }
        }
    }

    if (updateData.nearestStopId !== undefined) {
        updateFields.nearestStopId = updateData.nearestStopId;
    }
    if (updateData.nearestStopName !== undefined) {
        updateFields.nearestStopName = updateData.nearestStopName;
    }

    await db.collection(PLACES_COLLECTION).updateOne(filter, { $set: updateFields });
    return await db.collection(PLACES_COLLECTION).findOne(filter);
}

/**
 * Xóa địa điểm đã lưu (Chống IDOR)
 */
async function deleteSavedPlace(userId, placeId) {
    await ensurePassengerIndexes();
    const filter = {
        userId: String(userId),
        $or: [{ _key: String(placeId) }, { _id: String(placeId) }]
    };
    if (ObjectId.isValid(placeId)) {
        filter.$or.push({ _id: new ObjectId(placeId) });
    }

    const res = await db.collection(PLACES_COLLECTION).deleteOne(filter);
    return res.deletedCount > 0;
}

// ============================================================================
// 3. TUYẾN XE YÊU THÍCH (TuyenYeuThich)
// ============================================================================

/**
 * Lấy danh sách tuyến yêu thích của người dùng
 */
async function getFavoriteRoutes(userId) {
    await ensurePassengerIndexes();
    const items = await db
        .collection(FAVORITES_COLLECTION)
        .find({ userId: String(userId) })
        .sort({ createdAt: -1 })
        .toArray();

    // Lấy thông tin bổ sung từ TuyenXe
    const routeCodes = items.map((i) => i.routeCode || i.routeId);
    const routes = await db
        .collection(ROUTES_COLLECTION)
        .find({ $or: [{ ma_tuyen: { $in: routeCodes } }, { _key: { $in: routeCodes } }] })
        .toArray();

    const routeMap = new Map();
    routes.forEach((r) => {
        routeMap.set(r.ma_tuyen, r);
        routeMap.set(r._key, r);
    });

    return items.map((item) => {
        const routeData = routeMap.get(item.routeCode || item.routeId) || {};
        return {
            id: item._key || item._id,
            userId: item.userId,
            routeId: item.routeId,
            routeCode: item.routeCode || routeData.ma_tuyen || item.routeId,
            routeName: item.routeName || routeData.ten_tuyen || routeData.name || `Tuyến ${item.routeId}`,
            color: routeData.mauSac || "#2563eb",
            fare: routeData.gia_ve ?? routeData.ticketPrice ?? null,
            operatingHours: routeData.thoi_gian_hoat_dong || routeData.operatingHours || null,
            createdAt: item.createdAt
        };
    });
}

/**
 * Thêm tuyến xe vào danh sách yêu thích
 */
async function addFavoriteRoute(userId, { routeId, routeCode, routeName }) {
    await ensurePassengerIndexes();
    if (!routeId) {
        throw new Error("Mã tuyến xe không được để trống.");
    }

    const cleanRouteId = String(routeId).trim();

    // Tra cứu thông tin tuyến từ DB
    const route = await db.collection(ROUTES_COLLECTION).findOne({
        $or: [{ _key: cleanRouteId }, { ma_tuyen: cleanRouteId }, { _id: `TuyenXe/${cleanRouteId}` }]
    });

    const code = routeCode || route?.ma_tuyen || cleanRouteId;
    const name = routeName || route?.ten_tuyen || route?.name || `Tuyến ${code}`;

    const doc = ensureDocumentKeys(FAVORITES_COLLECTION, {
        userId: String(userId),
        routeId: cleanRouteId,
        routeCode: code,
        routeName: name,
        createdAt: new Date()
    });

    try {
        await db.collection(FAVORITES_COLLECTION).updateOne(
            { userId: String(userId), routeId: cleanRouteId },
            { $setOnInsert: doc },
            { upsert: true }
        );
        return { success: true, routeId: cleanRouteId, routeCode: code, routeName: name };
    } catch (err) {
        if (err.code === 11000) {
            return { success: true, message: "Tuyến xe đã có trong danh sách yêu thích." };
        }
        throw err;
    }
}

/**
 * Bỏ thích tuyến xe
 */
async function removeFavoriteRoute(userId, routeId) {
    await ensurePassengerIndexes();
    const cleanRouteId = String(routeId).trim();
    const res = await db.collection(FAVORITES_COLLECTION).deleteOne({
        userId: String(userId),
        $or: [{ routeId: cleanRouteId }, { routeCode: cleanRouteId }]
    });
    return res.deletedCount > 0;
}

// ============================================================================
// 4. SỞ THÍCH TÌM ĐƯỜNG (Preferences trong document NguoiDung)
// ============================================================================

async function getUserPreferences(userId) {
    const user = await db.collection(USERS_COLLECTION).findOne(buildIdFilter(USERS_COLLECTION, userId));
    if (!user) return { defaultCriteria: "least_transfers", maxWalkingKm: 1.0 };
    return (
        user.preferences || {
            defaultCriteria: "least_transfers",
            maxWalkingKm: 1.0
        }
    );
}

async function updateUserPreferences(userId, prefs = {}) {
    const validCriteria = ["least_transfers", "fastest", "fewest_stops", "least_walking"];
    const current = await getUserPreferences(userId);

    const updated = {
        ...current,
        defaultCriteria: validCriteria.includes(prefs.defaultCriteria) ? prefs.defaultCriteria : current.defaultCriteria || "least_transfers",
        maxWalkingKm: typeof prefs.maxWalkingKm === "number" ? Math.max(0.2, Math.min(5, prefs.maxWalkingKm)) : current.maxWalkingKm || 1.0
    };

    await db.collection(USERS_COLLECTION).updateOne(
        buildIdFilter(USERS_COLLECTION, userId),
        { $set: { preferences: updated, updatedAt: new Date() } }
    );

    return updated;
}

// ============================================================================
// 5. HỆ THỐNG GỢI Ý / ĐỀ XUẤT LỘ TRÌNH (Smart Recommendations)
// Dựa trên dữ liệu thực: Aggregation LichSuTimKiem, DiaDiemYeuThich, TuyenYeuThich
// ============================================================================

async function getPersonalizedRecommendations(userId) {
    await ensurePassengerIndexes();
    const cleanUserId = String(userId);

    // 1. Phân tích lịch sử tìm kiếm: Top các cặp trạm xuất phát -> đích thường tìm nhất
    const frequentPairs = await db
        .collection(HISTORY_COLLECTION)
        .aggregate([
            { $match: { userId: cleanUserId } },
            {
                $group: {
                    _id: { from: "$fromStopId", to: "$toStopId" },
                    fromName: { $first: "$fromStopName" },
                    toName: { $first: "$toStopName" },
                    searchCount: { $sum: 1 },
                    lastSearched: { $max: "$createdAt" },
                    preferredCriteria: { $first: "$criteria" }
                }
            },
            { $sort: { searchCount: -1, lastSearched: -1 } },
            { $limit: 4 }
        ])
        .toArray();

    // 2. Lấy địa điểm đã lưu (Nhà, Công ty, Trường)
    const savedPlaces = await db
        .collection(PLACES_COLLECTION)
        .find({ userId: cleanUserId })
        .toArray();

    // 3. Lấy tuyến xe yêu thích
    const favoriteRoutes = await getFavoriteRoutes(cleanUserId);

    // 4. Lấy sở thích tìm đường
    const preferences = await getUserPreferences(cleanUserId);

    // Xây dựng gợi ý thông minh dựa trên dữ liệu thực tế
    const suggestedTrips = [];

    // Gợi ý từ lịch sử tìm kiếm thường xuyên
    frequentPairs.forEach((p, idx) => {
        suggestedTrips.push({
            id: `rec_hist_${idx}`,
            type: "frequent_search",
            badge: "Thường tìm kiếm",
            title: `${p.fromName} ➔ ${p.toName}`,
            fromStopId: p._id.from,
            toStopId: p._id.to,
            fromStopName: p.fromName,
            toStopName: p.toName,
            searchCount: p.searchCount,
            suggestedCriteria: p.preferredCriteria || preferences.defaultCriteria,
            explanation: `Bạn đã tìm tuyến đường này ${p.searchCount} lần.`
        });
    });

    // Gợi ý từ Địa điểm đã lưu (Ví dụ: Nhà ➔ Công ty nếu có trạm gần)
    const home = savedPlaces.find((p) => p.type === "home" && p.nearestStopId);
    const work = savedPlaces.find((p) => (p.type === "work" || p.type === "school") && p.nearestStopId);

    if (home && work && home.nearestStopId !== work.nearestStopId) {
        suggestedTrips.push({
            id: "rec_home_work",
            type: "saved_commute",
            badge: "Lộ trình đi làm/học",
            title: `${home.name} ➔ ${work.name}`,
            fromStopId: home.nearestStopId,
            toStopId: work.nearestStopId,
            fromStopName: `${home.nearestStopName || home.name} (Gần ${home.name})`,
            toStopName: `${work.nearestStopName || work.name} (Gần ${work.name})`,
            suggestedCriteria: preferences.defaultCriteria,
            explanation: `Được tạo từ địa điểm "${home.name}" và "${work.name}" đã lưu của bạn.`
        });
    }

    const hasData = suggestedTrips.length > 0 || favoriteRoutes.length > 0;

    return {
        hasData,
        basedOn: suggestedTrips.length > 0 ? "actual_history_and_places" : favoriteRoutes.length > 0 ? "favorite_routes" : "empty_new_user",
        recommendations: suggestedTrips,
        favoriteRoutes: favoriteRoutes.slice(0, 5),
        savedPlacesCount: savedPlaces.length,
        totalSearchesCount: await db.collection(HISTORY_COLLECTION).countDocuments({ userId: cleanUserId }),
        preferences
    };
}

module.exports = {
    ensurePassengerIndexes,
    recordSearchHistory,
    getSearchHistory,
    deleteSearchHistoryItem,
    clearAllSearchHistory,
    syncGuestHistory,
    getSavedPlaces,
    addSavedPlace,
    updateSavedPlace,
    deleteSavedPlace,
    getFavoriteRoutes,
    addFavoriteRoute,
    removeFavoriteRoute,
    getUserPreferences,
    updateUserPreferences,
    getPersonalizedRecommendations
};
