const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const MONGO_DATABASE = process.env.DB_NAME || process.env.MONGO_DATABASE || "BusRouteDB";

const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10
});

const db = client.db(MONGO_DATABASE);

let isDbConnected = false;

/**
 * Tạo định danh Vertex/Edge chuẩn theo quy ước đồ thị:
 * _key: chuỗi định danh duy nhất
 * _id: "<CollectionName>/<Key>"
 */
const ensureDocumentKeys = (collectionName, data) => {
    const doc = { ...data };
    if (!doc._key) {
        if (doc._id && typeof doc._id === "string" && doc._id.includes("/")) {
            doc._key = doc._id.split("/")[1];
        } else {
            doc._key = new ObjectId().toHexString();
        }
    }
    if (!doc._id) {
        doc._id = `${collectionName}/${doc._key}`;
    }
    return doc;
};

/**
 * Xây dựng bộ lọc tìm kiếm theo ID linh hoạt (hỗ trợ cả _key như "TX_01" lẫn _id như "TuyenXe/TX_01")
 */
const buildIdFilter = (collectionName, idOrKey) => {
    const clean = String(idOrKey).trim();
    const key = clean.includes("/") ? clean.split("/")[1] : clean;
    const fullId = `${collectionName}/${key}`;
    return {
        $or: [{ _key: key }, { _id: fullId }, { _id: clean }]
    };
};

const connectDB = async () => {
    if (isDbConnected) {
        return true;
    }
    try {
        await client.connect();
        const admin = db.admin();
        const info = await admin.serverInfo();

        console.log("Connected to MongoDB successfully!");
        console.log("MongoDB version:", info.version);
        console.log("Database:", MONGO_DATABASE);
        isDbConnected = true;

        return true;
    } catch (error) {
        console.warn("MongoDB connection warning:", error.message);
        console.warn("Chưa thể kết nối tới cơ sở dữ liệu MongoDB:", MONGO_URI);
        isDbConnected = false;
        return false;
    }
};

const getDbConnectionStatus = () => isDbConnected;

module.exports = {
    client,
    db,
    connectDB,
    getDbConnectionStatus,
    ensureDocumentKeys,
    buildIdFilter
};
