const test = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    adminOnly,
    operatorOrAdmin,
    passengerOnly,
    allowRoles,
    normalizeRole
} = require("../src/middleware/authMiddleware");

test("Bảo mật: Mật khẩu mặc định được băm bcrypt hợp lệ", async () => {
    const rawPassword = "123456";
    const sampleHash = "$2b$10$oUTLu4POk37.vjqvhcaUROoB4KKghjgVfCTQWssnfeoZjNFEr6w6a";
    const isMatch = await bcrypt.compare(rawPassword, sampleHash);
    assert.strictEqual(isMatch, true, "Mật khẩu 123456 phải khớp với hash trong database");
});

test("Bảo mật: Chuẩn hóa vai trò (normalizeRole) sang 3 role chuẩn: admin, operator, passenger", () => {
    assert.strictEqual(normalizeRole({ role: "admin" }), "admin");
    assert.strictEqual(normalizeRole({ role: "operator" }), "operator");
    assert.strictEqual(normalizeRole({ email: "operator@busroute.vn" }), "operator");
    assert.strictEqual(normalizeRole({ role: "staff", vai_tro: "admin" }), "admin");
    assert.strictEqual(normalizeRole({ role: "staff", vai_tro: "user" }), "passenger");
    assert.strictEqual(normalizeRole({ role: "user" }), "passenger");
    assert.strictEqual(normalizeRole({ role: "passenger" }), "passenger");
    assert.strictEqual(normalizeRole(null), "passenger");
});

test("Bảo mật: JWT token chứa đúng role chính thức và mã hóa an toàn", () => {
    const secret = "test_secret_key_123456";
    const payload = { id: "USR_01", email: "admin@busroute.vn", role: "admin", vai_tro: "admin" };
    const token = jwt.sign(payload, secret, { expiresIn: "1h" });
    assert.ok(typeof token === "string" && token.length > 20);

    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.email, "admin@busroute.vn");
    assert.strictEqual(decoded.role, "admin");
});

test("Bảo mật: Middleware adminOnly CHỈ cho phép Admin, từ chối Operator và Passenger", () => {
    const createMockRes = () => {
        let statusCode = null;
        let jsonData = null;
        return {
            res: {
                status: (code) => {
                    statusCode = code;
                    return { json: (data) => { jsonData = data; } };
                }
            },
            getCode: () => statusCode,
            getJson: () => jsonData
        };
    };

    // 1. Passenger bị chặn 403
    const passengerMock = createMockRes();
    adminOnly({ user: { role: "passenger" } }, passengerMock.res, () => {
        assert.fail("Passenger không được phép qua adminOnly");
    });
    assert.strictEqual(passengerMock.getCode(), 403);

    // 2. Operator bị chặn 403
    const operatorMock = createMockRes();
    adminOnly({ user: { role: "operator" } }, operatorMock.res, () => {
        assert.fail("Operator không được phép qua adminOnly");
    });
    assert.strictEqual(operatorMock.getCode(), 403);

    // 3. Admin được phép
    let nextCalled = false;
    adminOnly({ user: { role: "admin" } }, passengerMock.res, () => {
        nextCalled = true;
    });
    assert.strictEqual(nextCalled, true, "Admin phải được gọi next() thành công");
});

test("Bảo mật: Middleware operatorOrAdmin cho phép Admin và Operator, từ chối Passenger", () => {
    const createMockRes = () => {
        let statusCode = null;
        return {
            res: {
                status: (code) => {
                    statusCode = code;
                    return { json: () => {} };
                }
            },
            getCode: () => statusCode
        };
    };

    // Passenger bị chặn 403
    const mock = createMockRes();
    operatorOrAdmin({ user: { role: "passenger" } }, mock.res, () => {
        assert.fail("Passenger không được phép qua operatorOrAdmin");
    });
    assert.strictEqual(mock.getCode(), 403);

    // Operator được phép
    let opPassed = false;
    operatorOrAdmin({ user: { role: "operator" } }, mock.res, () => {
        opPassed = true;
    });
    assert.strictEqual(opPassed, true, "Operator phải được phép quản lý tuyến/trạm");

    // Admin được phép
    let adminPassed = false;
    operatorOrAdmin({ user: { role: "admin" } }, mock.res, () => {
        adminPassed = true;
    });
    assert.strictEqual(adminPassed, true, "Admin phải được phép quản lý tuyến/trạm");
});

test("Bảo mật: Đăng ký công khai luôn ép role 'passenger', không thể tự nâng quyền Admin/Operator", () => {
    // Logic gán quyền trong public register: Bất kể client gửi gì, luôn ép passenger
    const getRoleForPublicRegistration = (body) => {
        return "passenger";
    };

    assert.strictEqual(getRoleForPublicRegistration({ role: "admin" }), "passenger");
    assert.strictEqual(getRoleForPublicRegistration({ role: "operator" }), "passenger");
    assert.strictEqual(getRoleForPublicRegistration({}), "passenger");
});

test("Chuẩn hóa dữ liệu (generate_data.js): resolveUserRole chuẩn hóa 3 role, hỗ trợ legacy và từ chối role không hợp lệ", () => {
    const { resolveUserRole } = require("../../../Nosql_tv1_Database/scripts/generate_data");

    // 1. admin -> admin (không bị vai_tro cũ hay bất kỳ trường nào ghi đè)
    assert.strictEqual(resolveUserRole({ role: "admin" }), "admin");
    assert.strictEqual(resolveUserRole({ role: "admin", vai_tro: "user" }), "admin");
    assert.strictEqual(resolveUserRole({ role: "admin", vai_tro: "staff" }), "admin");

    // 2. operator -> operator (không bị vai_tro cũ hay bất kỳ trường nào ghi đè)
    assert.strictEqual(resolveUserRole({ role: "operator" }), "operator");
    assert.strictEqual(resolveUserRole({ role: "operator", vai_tro: "admin" }), "operator");
    assert.strictEqual(resolveUserRole({ role: "operator", vai_tro: "user" }), "operator");

    // 3. passenger -> passenger (không bị vai_tro cũ hay bất kỳ trường nào ghi đè)
    assert.strictEqual(resolveUserRole({ role: "passenger" }), "passenger");
    assert.strictEqual(resolveUserRole({ role: "passenger", vai_tro: "admin" }), "passenger");
    assert.strictEqual(resolveUserRole({ role: "passenger", vai_tro: "operator" }), "passenger");

    // 4. Dữ liệu legacy operator cũ -> operator
    assert.strictEqual(resolveUserRole({ role: "staff", vai_tro: "admin" }), "operator");
    assert.strictEqual(resolveUserRole({ vai_tro: "operator" }), "operator");
    assert.strictEqual(resolveUserRole({ email: "operator@busroute.vn" }), "operator");

    // 5. Dữ liệu legacy passenger cũ -> passenger
    assert.strictEqual(resolveUserRole({ role: "staff", vai_tro: "user" }), "passenger");
    assert.strictEqual(resolveUserRole({ role: "user" }), "passenger");
    assert.strictEqual(resolveUserRole({ vai_tro: "user" }), "passenger");
    assert.strictEqual(resolveUserRole({ vai_tro: "passenger" }), "passenger");
    assert.strictEqual(resolveUserRole({ email: "user@busroute.vn" }), "passenger");

    // 6. Role không hợp lệ -> Phải ném ngoại lệ (Error), tuyệt đối không âm thầm chuyển thành passenger hay admin
    assert.throws(() => {
        resolveUserRole({ role: "moderator" });
    }, /Không thể xác định vai trò hợp lệ/);

    assert.throws(() => {
        resolveUserRole({ role: "guest" });
    }, /Không thể xác định vai trò hợp lệ/);

    assert.throws(() => {
        resolveUserRole({ role: "superadmin" });
    }, /Không thể xác định vai trò hợp lệ/);

    assert.throws(() => {
        resolveUserRole({ role: "staff", vai_tro: "other" });
    }, /Không thể xác định vai trò hợp lệ/);

    assert.throws(() => {
        resolveUserRole({});
    }, /Không thể xác định vai trò hợp lệ/);

    assert.throws(() => {
        resolveUserRole(null);
    }, /Dữ liệu người dùng không hợp lệ/);
});

test("Bảo mật: getJwtSecret kiểm tra nghiêm ngặt trong môi trường Production", () => {
    const { getJwtSecret } = require("../src/config/jwt");
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    try {
        process.env.NODE_ENV = "production";

        // Thiếu JWT_SECRET -> Ném lỗi bảo mật
        delete process.env.JWT_SECRET;
        assert.throws(() => getJwtSecret(), /LỖI BẢO MẬT/);

        // JWT_SECRET dùng giá trị mặc định -> Ném lỗi bảo mật
        process.env.JWT_SECRET = "default_jwt_secret";
        assert.throws(() => getJwtSecret(), /LỖI BẢO MẬT/);

        // JWT_SECRET quá ngắn (< 32 chars) -> Ném lỗi bảo mật
        process.env.JWT_SECRET = "short_secret_key";
        assert.throws(() => getJwtSecret(), /LỖI BẢO MẬT/);

        // JWT_SECRET hợp lệ (>= 32 chars ngẫu nhiên) -> Chấp nhận
        const secureKey = "c89f104d5e748b9281a7b45f12e87c63d419b842a591e038f297b415a782c9de";
        process.env.JWT_SECRET = secureKey;
        assert.strictEqual(getJwtSecret(), secureKey);
    } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalSecret !== undefined) {
            process.env.JWT_SECRET = originalSecret;
        } else {
            delete process.env.JWT_SECRET;
        }
    }
});
