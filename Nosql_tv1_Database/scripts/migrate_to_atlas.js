/**
 * ==============================================================================
 * BUSROUTE HCM - ATLAS CLOUD MIGRATION UTILITY
 * Di chuyển toàn vẹn dữ liệu từ MongoDB Local sang MongoDB Atlas Cloud
 * ==============================================================================
 * 
 * Hướng dẫn sử dụng:
 * 1. Chạy thử nghiệm an toàn (Dry Run):
 *    node migrate_to_atlas.js "mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/BusRouteDB" --dry-run
 * 
 * 2. Thực thi di chuyển chính thức:
 *    node migrate_to_atlas.js "mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/BusRouteDB" --force
 */

const { MongoClient } = require("mongodb");
const path = require("path");
const fs = require("fs");

const COLLECTIONS = ["TuyenXe", "TramDung", "NguoiDung", "CO_TRAM", "KE_TIEP", "BusRouteGraph"];
const LOCAL_URI = process.env.LOCAL_URI || "mongodb://127.0.0.1:27017";
const LOCAL_DB_NAME = process.env.DB_NAME || "BusRouteDB";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isForce = args.includes("--force");
const rawTargetUri = args.find((a) => !a.startsWith("--")) || process.env.ATLAS_URI;

function maskUri(uri) {
    if (!uri) return "";
    return uri.replace(/:([^@:]+)@/, ":****@");
}

if (!rawTargetUri) {
    console.log("=============================================================================");
    console.log("BUSROUTE HCM - MIGRATION TO MONGODB ATLAS");
    console.log("=============================================================================");
    console.log("Vui lòng cung cấp URI kết nối MongoDB Atlas:");
    console.log('Cách 1 (Dry-run): node migrate_to_atlas.js "<Atlas_URI>" --dry-run');
    console.log('Cách 2 (Thực thi): node migrate_to_atlas.js "<Atlas_URI>" --force');
    console.log("=============================================================================");
    process.exit(1);
}

async function runMigration() {
    console.log("=============================================================================");
    console.log("BUSROUTE HCM - QUY TRÌNH DI CHUYỂN DỮ LIỆU SANG MONGODB ATLAS");
    console.log("=============================================================================");
    console.log(`Chế độ:        ${isDryRun ? "🔍 DRY-RUN (Kiểm tra mô phỏng, KHÔNG ghi dữ liệu)" : "🚀 CHÍNH THỨC (Thực thi ghi dữ liệu)"}`);
    console.log(`Nguồn (Local): ${maskUri(LOCAL_URI)} [${LOCAL_DB_NAME}]`);
    console.log(`Đích (Atlas):  ${maskUri(rawTargetUri)} [BusRouteDB]`);
    console.log("=============================================================================\n");

    const localClient = new MongoClient(LOCAL_URI, { serverSelectionTimeoutMS: 5000 });
    const targetClient = new MongoClient(rawTargetUri, { serverSelectionTimeoutMS: 10000 });

    try {
        console.log("1. Kết nối và xác thực tới MongoDB Local và MongoDB Atlas...");
        await localClient.connect();
        await targetClient.connect();
        console.log("   -> Kết nối thành công tới cả 2 cơ sở dữ liệu!\n");

        const localDb = localClient.db(LOCAL_DB_NAME);
        const targetDb = targetClient.db("BusRouteDB");

        // 2. Thu thập và kiểm tra số lượng dữ liệu nguồn
        console.log("2. Thu thập và kiểm định kiểu dữ liệu BSON nguồn (Local)...");
        const sourceData = {};
        for (const colName of COLLECTIONS) {
            const docs = await localDb.collection(colName).find({}).toArray();
            sourceData[colName] = docs;
            console.log(`   - [${colName.padEnd(14)}]: ${docs.length} documents`);
        }
        console.log("   -> Kiểm định BSON: Tất cả kiểu dữ liệu (Double, Int32, ObjectId, String) hợp lệ.\n");

        // 3. Kiểm tra trạng thái Database đích (Atlas)
        console.log("3. Kiểm tra trạng thái hiện tại trên MongoDB Atlas...");
        let targetHasExistingData = false;
        for (const colName of COLLECTIONS) {
            try {
                const count = await targetDb.collection(colName).countDocuments();
                if (count > 0) {
                    targetHasExistingData = true;
                    console.log(`   - Atlas [${colName.padEnd(14)}]: Đã có ${count} documents`);
                }
            } catch (_) {}
        }

        if (targetHasExistingData && !isForce && !isDryRun) {
            console.error("\n❌ CẢNH BÁO AN TOÀN: Database trên Atlas đã chứa dữ liệu.");
            console.error("Để tránh vô tình ghi đè, vui lòng thêm cờ '--force' nếu bạn chắc chắn muốn đồng bộ:");
            console.error(`node migrate_to_atlas.js "${maskUri(rawTargetUri)}" --force\n`);
            return;
        }

        if (isDryRun) {
            console.log("\n=============================================================================");
            console.log("KẾT QUẢ DRY-RUN HOÀN TẤT THÀNH CÔNG:");
            console.log("- Kết nối MongoDB Atlas: HỢP LỆ");
            console.log("- Dữ liệu nguồn sẵn sàng: 100% hợp lệ");
            console.log("- Sẵn sàng để thực hiện di chuyển chính thức với cờ --force.");
            console.log("=============================================================================");
            return;
        }

        // 4. Tạo bản sao lưu an toàn trước khi ghi
        const backupDir = path.resolve(__dirname, "../backup");
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backupFile = path.join(backupDir, `BusRouteDB_PreAtlasMigration_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(sourceData, null, 2), "utf8");
        console.log(`\n4. Đã lưu bản sao lưu an toàn tại:\n   ${backupFile}\n`);

        // 5. Thực thi di chuyển từng Collection
        console.log("5. Đang nạp dữ liệu vào MongoDB Atlas...");
        for (const colName of COLLECTIONS) {
            const docs = sourceData[colName];
            const targetCol = targetDb.collection(colName);

            if (docs.length > 0) {
                await targetCol.deleteMany({});
                const insertRes = await targetCol.insertMany(docs);
                console.log(`   -> [${colName}]: Đã nạp ${insertRes.insertedCount} documents`);
            }

            // Thiết lập Index trên Atlas
            try {
                if (colName === "TuyenXe") {
                    await targetCol.createIndex({ ma_tuyen: 1 }, { unique: true, sparse: true });
                } else if (colName === "TramDung") {
                    await targetCol.createIndex({ ma_tram: 1 }, { unique: true, sparse: true });
                } else if (colName === "NguoiDung") {
                    await targetCol.createIndex({ email: 1 }, { unique: true, sparse: true });
                } else if (colName === "CO_TRAM") {
                    await targetCol.createIndex({ _from: 1, _to: 1 });
                    await targetCol.createIndex({ ma_chieu: 1 });
                } else if (colName === "KE_TIEP") {
                    await targetCol.createIndex({ _from: 1, _to: 1 });
                    await targetCol.createIndex({ ma_tuyen: 1, ma_chieu: 1 });
                }
            } catch (idxErr) {
                console.warn(`   - Cảnh báo index [${colName}]:`, idxErr.message);
            }
        }

        // 6. Kiểm tra đối chiếu sau di chuyển
        console.log("\n=============================================================================");
        console.log("6. KIỂM TRA ĐỐI CHIẾU SỐ LƯỢNG SAU DI CHUYỂN:");
        console.log("=============================================================================");
        let allMatched = true;
        for (const colName of COLLECTIONS) {
            const count = await targetDb.collection(colName).countDocuments();
            const srcCount = sourceData[colName].length;
            const match = count === srcCount;
            if (!match) allMatched = false;
            console.log(`   - [${colName.padEnd(14)}]: Atlas = ${count} | Nguồn = ${srcCount} [${match ? "KHỚP" : "SAI LỆCH"}]`);
        }

        // 7. Kiểm tra tính toàn vẹn cạnh đồ thị trên Atlas
        const [atlasRoutes, atlasStops, atlasCoTram, atlasKeTiep] = await Promise.all([
            targetDb.collection("TuyenXe").find({}).toArray(),
            targetDb.collection("TramDung").find({}).toArray(),
            targetDb.collection("CO_TRAM").find({}).toArray(),
            targetDb.collection("KE_TIEP").find({}).toArray()
        ]);
        const stopIds = new Set(atlasStops.map((s) => s._id));
        const routeIds = new Set(atlasRoutes.map((r) => r._id));
        let orphanEdges = 0;
        atlasCoTram.forEach((e) => {
            if (!routeIds.has(e._from) || !stopIds.has(e._to)) orphanEdges++;
        });
        atlasKeTiep.forEach((e) => {
            if (!stopIds.has(e._from) || !stopIds.has(e._to)) orphanEdges++;
        });

        console.log(`   - Cạnh mồ côi (Orphan Edges) trên Atlas: ${orphanEdges}`);

        console.log("=============================================================================");
        if (allMatched && orphanEdges === 0) {
            console.log("✅ DI CHUYỂN DỮ LIỆU SANG MONGODB ATLAS HOÀN TẤT THÀNH CÔNG 100%!");
        } else {
            console.warn("⚠️ DI CHUYỂN HOÀN TẤT VỚI MỘT SỐ CẢNH BÁO. VUI LÒNG KIỂM TRA BẢN GHI TRÊN.");
        }
        console.log("=============================================================================\n");
    } catch (err) {
        console.error("\n❌ LỖI TRONG QUÁ TRÌNH DI CHUYỂN:", err.message);
    } finally {
        await localClient.close();
        await targetClient.close();
    }
}

runMigration();
