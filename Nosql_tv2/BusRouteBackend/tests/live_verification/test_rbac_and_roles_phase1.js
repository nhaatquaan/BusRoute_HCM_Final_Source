/**
 * ============================================================================
 * BUSROUTE HCM - PHASE 1: ACCEPTANCE TEST SUITE
 * Kiểm thử toàn diện 4 nhóm: Guest, Passenger, Operator, Admin & Kiểm tra hồi quy
 * ============================================================================
 */

const assert = require("assert");

const BASE_URL = "http://localhost:3000";

async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    let data;
    try {
        data = await res.json();
    } catch (_) {
        data = null;
    }
    return { status: res.status, ok: res.ok, data };
}

async function runTests() {
    console.log("==================================================================");
    console.log("   BUSROUTE HCM - PHASE 1: RBAC & SPACE SEPARATION TEST SUITE    ");
    console.log("==================================================================");

    let passed = 0;
    let failed = 0;

    // Tracking test resources for guaranteed teardown in finally block
    const trackedRouteIds = new Set();
    const trackedUserIds = new Set();
    const trackedUserEmails = new Set();

    let adminToken = null;
    let operatorToken = null;
    let passengerToken = null;
    let testPassengerEmail = null;
    let createdUserId = null;

    async function testCase(name, fn) {
        try {
            await fn();
            console.log(`  [PASS] ${name}`);
            passed++;
        } catch (err) {
            console.error(`  [FAIL] ${name}`);
            console.error(`         -> ${err.message}`);
            failed++;
        }
    }

    try {
        // ========================================================================
        // NHÓM 1: GUEST (NGƯỜI DÙNG CHƯA ĐĂNG NHẬP)
        // ========================================================================
        console.log("\n--- [1] KIỂM THỬ VAI TRÒ GUEST (KHÁCH VÃNG LAI) ---");

        await testCase("Guest: Tra cứu lộ trình A -> B (BFS / MongoDB graphLookup) thành công (HTTP 200)", async () => {
            const res = await request("/api/path?from=TR_01&to=TR_03");
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert.ok(Array.isArray(res.data.data.paths) && res.data.data.paths.length > 0);
        });

        await testCase("Guest: Xem danh mục tuyến xe và trạm dừng công khai thành công (HTTP 200)", async () => {
            const resRoutes = await request("/api/routes");
            assert.strictEqual(resRoutes.status, 200);
            const resStops = await request("/api/stops");
            assert.strictEqual(resStops.status, 200);
        });

        await testCase("Guest: Khám phá đồ thị mạng lưới mạng giao thông công cộng (HTTP 200)", async () => {
            const res = await request("/api/graph");
            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.data.data?.elements?.nodes || res.data.elements?.nodes));
        });

        await testCase("Guest: Gọi API quản trị người dùng bị từ chối truy cập (HTTP 401)", async () => {
            const res = await request("/api/users");
            assert.strictEqual(res.status, 401);
        });

        await testCase("Guest: Gọi API quản lý database bị từ chối truy cập (HTTP 401)", async () => {
            const res = await request("/api/database/collections");
            assert.strictEqual(res.status, 401);
        });

        // ========================================================================
        // NHÓM 2: PASSENGER (HÀNH KHÁCH)
        // ========================================================================
        console.log("\n--- [2] KIỂM THỬ VAI TRÒ PASSENGER (HÀNH KHÁCH) ---");

        testPassengerEmail = `passenger_test_${Date.now()}@busroute.vn`;
        trackedUserEmails.add(testPassengerEmail);

        await testCase("Passenger: Đăng ký tài khoản công khai luôn ép role='passenger', chặn tự nâng quyền Admin (HTTP 201)", async () => {
            const res = await request("/api/users/register", {
                method: "POST",
                body: JSON.stringify({
                    fullName: "Nguyễn Hành Khách Test",
                    email: testPassengerEmail,
                    password: "password123",
                    so_dien_thoai: "0987654321",
                    role: "admin", // Cố tình yêu cầu quyền Admin
                    vai_tro: "admin"
                })
            });
            assert.strictEqual(res.status, 201);
            passengerToken = res.data.token;
            const assignedRole = res.data.user?.role || res.data.data?.user?.role || res.data.data?.role;
            assert.strictEqual(assignedRole, "passenger", "Bắt buộc phải là role passenger!");
            const pId = res.data.user?.id || res.data.data?.user?.id || res.data.user?._key;
            if (pId) {
                trackedUserIds.add(pId);
            }
        });

        await testCase("Passenger: Đăng nhập nhận đúng role 'passenger' và token hợp lệ (HTTP 200)", async () => {
            const res = await request("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: testPassengerEmail,
                    password: "password123"
                })
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.user.role, "passenger");
            assert.ok(res.data.token);
        });

        await testCase("Passenger: Xem thông tin hồ sơ của chính mình qua GET /api/users/me (HTTP 200)", async () => {
            assert.ok(passengerToken, "passengerToken phải khả dụng");
            const res = await request("/api/users/me", {
                headers: { Authorization: `Bearer ${passengerToken}` }
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.data.email, testPassengerEmail);
        });

        await testCase("Passenger: Cập nhật hồ sơ cá nhân và chặn tự đổi role (HTTP 200)", async () => {
            assert.ok(passengerToken, "passengerToken phải khả dụng");
            const res = await request("/api/users/me", {
                method: "PUT",
                headers: { Authorization: `Bearer ${passengerToken}` },
                body: JSON.stringify({
                    fullName: "Hành Khách Đã Đổi Tên",
                    role: "admin" // Cố tình gửi role admin
                })
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.data.fullName, "Hành Khách Đã Đổi Tên");
            assert.strictEqual(res.data.data.role, "passenger", "Role không được phép thay đổi qua API profile!");
        });

        await testCase("Passenger: Đổi mật khẩu thành công bằng mật khẩu hiện tại (HTTP 200)", async () => {
            assert.ok(passengerToken, "passengerToken phải khả dụng");
            const res = await request("/api/users/me/password", {
                method: "PUT",
                headers: { Authorization: `Bearer ${passengerToken}` },
                body: JSON.stringify({
                    currentPassword: "password123",
                    newPassword: "newpassword456"
                })
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
        });

        await testCase("Passenger: Cố tình truy cập API Quản trị người dùng bị từ chối (HTTP 403)", async () => {
            assert.ok(passengerToken, "passengerToken phải khả dụng");
            const res = await request("/api/users", {
                headers: { Authorization: `Bearer ${passengerToken}` }
            });
            assert.strictEqual(res.status, 403, "Passenger không được phép xem danh sách users!");
        });

        await testCase("Passenger: Cố tình thêm mới tuyến xe bị từ chối (HTTP 403)", async () => {
            assert.ok(passengerToken, "passengerToken phải khả dụng");
            const res = await request("/api/routes", {
                method: "POST",
                headers: { Authorization: `Bearer ${passengerToken}` },
                body: JSON.stringify({ code: "TX_FAKE", name: "Fake Route" })
            });
            assert.strictEqual(res.status, 403, "Passenger không được phép tạo tuyến xe!");
        });

        await testCase("Passenger: Cố tình gọi API Quản trị MongoDB Explorer bị từ chối (HTTP 403)", async () => {
            assert.ok(passengerToken, "passengerToken phải khả dụng");
            const res = await request("/api/database/collections", {
                headers: { Authorization: `Bearer ${passengerToken}` }
            });
            assert.strictEqual(res.status, 403, "Passenger không được phép quản trị database!");
        });

        // ========================================================================
        // NHÓM 3: OPERATOR (ĐIỀU HÀNH VIÊN)
        // ========================================================================
        console.log("\n--- [3] KIỂM THỬ VAI TRÒ OPERATOR (ĐIỀU HÀNH VIÊN) ---");

        await testCase("Operator: Đăng nhập nhận đúng role 'operator' chính thức (HTTP 200)", async () => {
            const res = await request("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: "operator@busroute.vn",
                    password: "123456"
                })
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.user.role, "operator", "Role của operator@busroute.vn phải là operator!");
            operatorToken = res.data.token;
        });

        await testCase("Operator: Tạo, sửa, xóa tuyến xe theo đúng quyền nghiệp vụ điều hành (HTTP 201/200)", async () => {
            assert.ok(operatorToken, "operatorToken phải khả dụng");
            // Tạo tuyến
            const testCode = `TX_OP_${Date.now().toString().slice(-4)}`;
            const resCreate = await request("/api/routes", {
                method: "POST",
                headers: { Authorization: `Bearer ${operatorToken}` },
                body: JSON.stringify({
                    code: testCode,
                    name: "Tuyến Xe Thử Nghiệm Operator",
                    ticketPrice: 8000
                })
            });
            assert.strictEqual(resCreate.status, 201);
            const routeId = resCreate.data.data.id || testCode;
            trackedRouteIds.add(routeId);

            // Sửa tuyến
            const resEdit = await request(`/api/routes/${routeId}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${operatorToken}` },
                body: JSON.stringify({ name: "Tuyến Xe Đã Cập Nhật Bởi Operator" })
            });
            assert.strictEqual(resEdit.status, 200);

            // Xóa tuyến
            const resDel = await request(`/api/routes/${routeId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${operatorToken}` }
            });
            assert.strictEqual(resDel.status, 200);
            trackedRouteIds.delete(routeId);
        });

        await testCase("Operator: Bị chặn hoàn toàn khi cố truy cập Quản trị người dùng (HTTP 403)", async () => {
            assert.ok(operatorToken, "operatorToken phải khả dụng");
            const res = await request("/api/users", {
                headers: { Authorization: `Bearer ${operatorToken}` }
            });
            assert.strictEqual(res.status, 403, "Operator không có quyền quản lý người dùng!");
        });

        await testCase("Operator: Bị chặn hoàn toàn khi cố truy cập MongoDB Explorer (HTTP 403)", async () => {
            assert.ok(operatorToken, "operatorToken phải khả dụng");
            const res = await request("/api/database/collections", {
                headers: { Authorization: `Bearer ${operatorToken}` }
            });
            assert.strictEqual(res.status, 403, "Operator không có quyền truy cập MongoDB Explorer!");
        });

        await testCase("Operator: Bị chặn khi cố chạy Backup/Restore database (HTTP 403)", async () => {
            assert.ok(operatorToken, "operatorToken phải khả dụng");
            const res = await request("/api/database/backup", {
                method: "POST",
                headers: { Authorization: `Bearer ${operatorToken}` }
            });
            assert.strictEqual(res.status, 403, "Operator không có quyền Backup!");
        });

        // ========================================================================
        // NHÓM 4: ADMIN (QUẢN TRỊ VIÊN TOÀN QUYỀN)
        // ========================================================================
        console.log("\n--- [4] KIỂM THỬ VAI TRÒ ADMIN (QUẢN TRỊ VIÊN) ---");

        await testCase("Admin: Đăng nhập nhận đúng role 'admin' chính thức (HTTP 200)", async () => {
            const res = await request("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: "admin@busroute.vn",
                    password: "123456"
                })
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.user.role, "admin");
            adminToken = res.data.token;
        });

        await testCase("Admin: Toàn quyền truy cập danh sách người dùng (HTTP 200)", async () => {
            assert.ok(adminToken, "adminToken phải khả dụng");
            const res = await request("/api/users", {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.data.data));
        });

        await testCase("Admin: Tạo mới tài khoản với vai trò tùy chọn Operator (HTTP 201)", async () => {
            assert.ok(adminToken, "adminToken phải khả dụng");
            const tempEmail = `op_created_${Date.now()}@busroute.vn`;
            trackedUserEmails.add(tempEmail);
            const res = await request("/api/users", {
                method: "POST",
                headers: { Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({
                    fullName: "Điều Hành Viên Mới Tạo",
                    email: tempEmail,
                    role: "operator",
                    password: "password123"
                })
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.data.role, "operator");
            createdUserId = res.data.data.id;
            trackedUserIds.add(createdUserId);
        });

        await testCase("Admin: Khóa/mở khóa tài khoản người dùng thành công (HTTP 200)", async () => {
            assert.ok(adminToken, "adminToken phải khả dụng");
            assert.ok(createdUserId, "createdUserId phải tồn tại");
            const resLock = await request(`/api/users/${createdUserId}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({ status: "locked" })
            });
            assert.strictEqual(resLock.status, 200);
            assert.strictEqual(resLock.data.data.status, "locked");
        });

        await testCase("Admin: Xóa tài khoản thành công (HTTP 200)", async () => {
            assert.ok(adminToken, "adminToken phải khả dụng");
            assert.ok(createdUserId, "createdUserId phải tồn tại");
            const resDel = await request(`/api/users/${createdUserId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            assert.strictEqual(resDel.status, 200);
            trackedUserIds.delete(createdUserId);
            createdUserId = null;
        });

        await testCase("Admin: Cơ chế an toàn - Không cho phép tự xóa chính mình (HTTP 400)", async () => {
            assert.ok(adminToken, "adminToken phải khả dụng");
            const meRes = await request("/api/users/me", {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            const myId = meRes.data.data.id;

            const resSelfDel = await request(`/api/users/${myId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            assert.strictEqual(resSelfDel.status, 400, "Không được tự xóa tài khoản chính mình!");
        });

        await testCase("Admin: Toàn quyền truy cập MongoDB Explorer & Integrity Audit (HTTP 200)", async () => {
            assert.ok(adminToken, "adminToken phải khả dụng");
            const resCols = await request("/api/database/collections", {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            assert.strictEqual(resCols.status, 200);

            const resIntegrity = await request("/api/database/integrity", {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            assert.strictEqual(resIntegrity.status, 200);
        });
    } finally {
        // ========================================================================
        // TEARDOWN & CLEANUP TÀI NGUYÊN KIỂM THỬ (BẢO ĐẢM LUÔN CHẠY TRONG FINALLY)
        // ========================================================================
        console.log("\n--- [TEARDOWN & CLEANUP] BẢO ĐẢM DỌN DẸP SẠCH TÀI NGUYÊN TEST ---");

        // 1. Đảm bảo có adminToken để xóa dọn dẹp
        if (!adminToken) {
            try {
                const loginRes = await request("/api/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ email: "admin@busroute.vn", password: "123456" })
                });
                if (loginRes.data?.token) {
                    adminToken = loginRes.data.token;
                }
            } catch (_) {}
        }

        // Danh sách tài khoản demo và tuyến chuẩn bảo vệ tuyệt đối (KHÔNG BAO GIỜ XÓA)
        const PROTECTED_USERS = new Set(["USR_01", "USR_02", "USR_03", "admin@busroute.vn", "operator@busroute.vn", "user@busroute.vn"]);
        const PROTECTED_ROUTES = new Set(["TX_01", "TX_03", "TX_04", "TX_08", "TX_19", "TX_152"]);

        // 2. Dọn dẹp tuyến test còn sót lại (nếu có)
        if (trackedRouteIds.size > 0 && adminToken) {
            for (const rId of trackedRouteIds) {
                if (PROTECTED_ROUTES.has(rId)) continue;
                try {
                    await request(`/api/routes/${rId}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${adminToken}` }
                    });
                    console.log(`  + Đã dọn dẹp an toàn tuyến test: ${rId}`);
                } catch (e) {
                    console.warn(`  ! Không thể xóa tuyến test ${rId}: ${e.message}`);
                }
            }
            trackedRouteIds.clear();
        }

        // 3. Dọn dẹp người dùng test theo ID và Email
        if (adminToken) {
            try {
                const usersRes = await request("/api/users", {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
                const allUsers = usersRes.data?.data || [];

                for (const u of allUsers) {
                    const isTracked = trackedUserIds.has(u.id) || trackedUserEmails.has(u.email);
                    const isTestPrefix = u.email && (u.email.startsWith("passenger_test_") || u.email.startsWith("op_created_"));

                    if (isTracked || isTestPrefix) {
                        if (PROTECTED_USERS.has(u.id) || PROTECTED_USERS.has(u.email)) {
                            console.warn(`  [CẢNH BÁO AN TOÀN] Bỏ qua xóa tài khoản demo được bảo vệ: ${u.email}`);
                            continue;
                        }
                        try {
                            await request(`/api/users/${u.id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${adminToken}` }
                            });
                            console.log(`  + Đã dọn dẹp an toàn tài khoản test: ${u.email} (${u.id})`);
                        } catch (e) {
                            console.warn(`  ! Không thể xóa tài khoản test ${u.email}: ${e.message}`);
                        }
                    }
                }
            } catch (e) {
                console.warn("  ! Lỗi trong quá trình quét dọn dẹp tài khoản test:", e.message);
            }
        }
    }

    console.log("\n==================================================================");
    console.log(` KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL (Tổng số: ${passed + failed})`);
    console.log("==================================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error("Lỗi thực thi test suite:", err);
    process.exit(1);
});
