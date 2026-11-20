const { db, ensureDocumentKeys, buildIdFilter } = require("../config/database");

const stopCollection = db.collection("TramDung");
const coTramCollection = db.collection("CO_TRAM");
const keTiepCollection = db.collection("KE_TIEP");

// 1. Lấy danh sách trạm dừng
const getAllStops = async () => {
    return await stopCollection.find({}).sort({ ma_tram: 1 }).toArray();
};

// 2. Lấy trạm theo ID (_key hoặc _id)
const getStopById = async (stopId) => {
    return await stopCollection.findOne(buildIdFilter("TramDung", stopId));
};

// 3. Thêm trạm dừng
const createStop = async (stopData) => {
    const doc = ensureDocumentKeys("TramDung", stopData);
    await stopCollection.insertOne(doc);
    return doc;
};

// 4. Cập nhật trạm dừng
const updateStop = async (stopId, stopData) => {
    const existing = await getStopById(stopId);
    if (!existing) {
        return null;
    }

    await stopCollection.updateOne(
        { _id: existing._id },
        { $set: stopData }
    );

    return await stopCollection.findOne({ _id: existing._id });
};

// 5. Kiểm tra số lượng liên kết của một trạm
const getStopUsage = async (stopDocumentId) => {
    const coTramCount = await coTramCollection.countDocuments({
        _to: stopDocumentId
    });

    const keTiepCount = await keTiepCollection.countDocuments({
        $or: [{ _from: stopDocumentId }, { _to: stopDocumentId }]
    });

    return {
        co_tram: coTramCount,
        ke_tiep: keTiepCount
    };
};

// 6. Xóa trạm dừng nếu không còn liên kết
const deleteStop = async (stopId) => {
    const stop = await getStopById(stopId);

    if (!stop) {
        return {
            deleted: false,
            notFound: true
        };
    }

    const usage = await getStopUsage(stop._id);

    if (usage.co_tram > 0 || usage.ke_tiep > 0) {
        return {
            deleted: false,
            inUse: true,
            usage
        };
    }

    await stopCollection.deleteOne({ _id: stop._id });

    return {
        deleted: true
    };
};

// 7. Kiểm tra mã trạm đã tồn tại
const isStopCodeExists = async (maTram, excludeId = null) => {
    const filter = { ma_tram: maTram };

    if (excludeId !== null) {
        const cleanKey = String(excludeId).includes("/")
            ? String(excludeId).split("/")[1]
            : String(excludeId);
        filter._key = { $ne: cleanKey };
        filter._id = { $ne: `TramDung/${cleanKey}` };
    }

    const existing = await stopCollection.findOne(filter);
    return Boolean(existing);
};

module.exports = {
    getAllStops,
    getStopById,
    createStop,
    updateStop,
    deleteStop,
    isStopCodeExists
};
