/**
 * ============================================================================
 * BUSROUTE HCM - DATA MIGRATION: STANDARDIZE USER ROLES
 * Chuẩn hóa 3 vai trò: admin, operator, passenger
 * 
 * Cách chạy:
 * Dry-run (chỉ kiểm tra, không sửa DB):
 *   node scripts/migrate_users_roles.js --dry-run
 * 
 * Thực thi thật:
 *   node scripts/migrate_users_roles.js --execute
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("../../Nosql_tv2/BusRouteBackend/node_modules/mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGO_DATABASE || "BusRouteDB";

async function migrateUserRoles() {
    const isDryRun = process.argv.includes("--dry-run") || !process.argv.includes("--execute");

    console.log("=================================================================");
    console.log(` BUSROUTE HCM - USER ROLES MIGRATION (${isDryRun ? "DRY-RUN MODE" : "LIVE EXECUTION"})`);
    console.log("=================================================================");
    console.log(`Target Database: ${MONGO_URI}/${DB_NAME}`);

    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const userCollection = db.collection("NguoiDung");

        const users = await userCollection.find({}).toArray();
        console.log(`\n[1] Tìm thấy tổng cộng: ${users.length} tài khoản trong collection [NguoiDung]`);

        // Backup to JSON file
        const backupDir = path.join(__dirname, "../backup");
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(backupDir, `NguoiDung_pre_migration_${timestamp}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(users, null, 2), "utf8");
        console.log(`[2] Đã sao lưu dữ liệu NguoiDung trước migration tại:`);
        console.log(`    -> ${backupPath}`);

        console.log("\n[3] Kế hoạch chuẩn hóa vai trò (Role Mapping Analysis):");
        const updates = [];
        const manualReview = [];

        for (const user of users) {
            let targetRole = null;
            let reason = "";

            if (user.email === "admin@busroute.vn" || (user.role === "admin" && user.email !== "operator@busroute.vn")) {
                targetRole = "admin";
                reason = "Quản trị viên hệ thống";
            } else if (
                user.email === "operator@busroute.vn" ||
                user.role === "operator" ||
                (user.role === "staff" && user.vai_tro === "admin") ||
                user.username === "operator"
            ) {
                targetRole = "operator";
                reason = "Điều hành viên mạng lưới";
            } else if (
                user.email === "user@busroute.vn" ||
                user.role === "passenger" ||
                user.role === "user" ||
                (user.role === "staff" && user.vai_tro === "user") ||
                user.vai_tro === "user" ||
                user.username === "user"
            ) {
                targetRole = "passenger";
                reason = "Hành khách sử dụng dịch vụ";
            } else {
                manualReview.push(user);
                continue;
            }

            const isAlreadyStandard = user.role === targetRole && user.vai_tro === targetRole;
            updates.push({
                user,
                targetRole,
                reason,
                isAlreadyStandard
            });

            console.log(
                ` - [${user._key || user._id}] ${user.email.padEnd(24)} : Hiện tại (role='${user.role}', vai_tro='${user.vai_tro}') -> Mục tiêu ('${targetRole}') [${reason}] ${isAlreadyStandard ? "(Đã chuẩn)" : "==> CẦN CẬP NHẬT"}`
            );
        }

        if (manualReview.length > 0) {
            console.log(`\n[CẢNH BÁO] Có ${manualReview.length} tài khoản không rõ quy tắc, cần xem xét thủ công:`);
            manualReview.forEach((u) => console.log(`   - ${u.email}: role=${u.role}, vai_tro=${u.vai_tro}`));
        }

        if (isDryRun) {
            console.log("\n[DRY-RUN KẾT THÚC] Không có thay đổi nào được ghi vào MongoDB.");
            console.log("Để thực thi thật, chạy lệnh: node scripts/migrate_users_roles.js --execute");
            return;
        }

        // Live execution
        console.log("\n[4] Đang thực thi cập nhật vào MongoDB...");
        let updatedCount = 0;
        for (const item of updates) {
            if (!item.isAlreadyStandard) {
                await userCollection.updateOne(
                    { _id: item.user._id },
                    {
                        $set: {
                            role: item.targetRole,
                            vai_tro: item.targetRole,
                            status: item.user.status || "active",
                            trang_thai: item.user.trang_thai || "active",
                            updated_at: new Date().toISOString()
                        }
                    }
                );
                updatedCount++;
            }
        }

        console.log(`[5] Hoàn tất cập nhật: ${updatedCount} tài khoản đã được chuẩn hóa.`);
        
        // Post migration check
        const usersAfter = await userCollection.find({}).toArray();
        console.log("\n[6] Kiểm tra sau migration (Danh sách tài khoản sau khi chuẩn hóa):");
        usersAfter.forEach((u) => {
            console.log(` - [${u._key}] ${u.email.padEnd(24)}: role='${u.role}' | vai_tro='${u.vai_tro}' | status='${u.status || u.trang_thai}'`);
        });

        console.log("\n=== MIGRATION THÀNH CÔNG RỰC RỠ ===");
    } catch (err) {
        console.error("Lỗi migration:", err);
        process.exit(1);
    } finally {
        await client.close();
    }
}

migrateUserRoles();
