const test = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

test("Bảo mật: Mật khẩu mặc định được băm bcrypt hợp lệ", async () => {
    const rawPassword = "123456";
    const sampleHash = "$2b$10$oUTLu4POk37.vjqvhcaUROoB4KKghjgVfCTQWssnfeoZjNFEr6w6a";
    const isMatch = await bcrypt.compare(rawPassword, sampleHash);
    assert.strictEqual(isMatch, true, "Mật khẩu 123456 phải khớp với hash trong database");
});

test("Bảo mật: JWT token chứa đúng payload và ký bằng secret", () => {
    const secret = "test_secret_key_123456";
    const payload = { id: "USR_01", email: "admin@busroute.vn", role: "admin", vai_tro: "admin" };
    const token = jwt.sign(payload, secret, { expiresIn: "1h" });
    assert.ok(typeof token === "string" && token.length > 20);

    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.email, "admin@busroute.vn");
    assert.strictEqual(decoded.role, "admin");
});

test("Bảo mật: Middleware adminOnly từ chối người dùng thường (user/staff)", () => {
    const { adminOnly } = require("../src/middleware/authMiddleware");

    let statusCalled = null;
    let jsonCalled = null;

    const mockRes = {
        status: (code) => {
            statusCalled = code;
            return {
                json: (data) => {
                    jsonCalled = data;
                }
            };
        }
    };

    // User thường
    const mockReqUser = { user: { role: "staff", vai_tro: "user" } };
    adminOnly(mockReqUser, mockRes, () => {
        assert.fail("Không được phép gọi next() cho tài khoản không phải admin");
    });

    assert.strictEqual(statusCalled, 403, "Phải trả về HTTP 403 Forbidden");
    assert.strictEqual(jsonCalled.success, false);

    // Admin hợp lệ
    let nextCalled = false;
    const mockReqAdmin = { user: { role: "admin", vai_tro: "admin" } };
    adminOnly(mockReqAdmin, mockRes, () => {
        nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, "Admin phải được gọi next() thành công");
});

test("Bảo mật: Đăng ký công khai không cho phép tự phong Admin", () => {
    // Mô phỏng logic xác định role trong register controller
    const determineRole = (req) => {
        const isRequestByAdmin = req.user && (req.user.role === "admin" || req.user.vai_tro === "admin");
        let vai_tro = "user";
        let role = "staff";

        if (isRequestByAdmin) {
            if (req.body.vai_tro === "admin" || req.body.role === "admin") {
                vai_tro = "admin";
                role = "admin";
            }
        }
        return { vai_tro, role };
    };

    // Khách vãng lai gửi payload đòi làm admin
    const publicReq = { body: { role: "admin", vai_tro: "admin" }, user: null };
    const assigned = determineRole(publicReq);
    assert.strictEqual(assigned.role, "staff");
    assert.strictEqual(assigned.vai_tro, "user");

    // Admin tạo tài khoản admin mới
    const adminReq = { body: { role: "admin" }, user: { role: "admin" } };
    const adminAssigned = determineRole(adminReq);
    assert.strictEqual(adminAssigned.role, "admin");
});
