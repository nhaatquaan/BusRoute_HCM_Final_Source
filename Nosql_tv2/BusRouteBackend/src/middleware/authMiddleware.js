const jwt = require("jsonwebtoken");
const { findUserById } = require("../services/userService");
const { getJwtSecret } = require("../config/jwt");

// In-memory rate limiter cho các endpoint nhạy cảm (đăng ký, đăng nhập)
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 10, windowMs = 60 * 1000) => {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || "global";
        const now = Date.now();
        const clientData = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

        if (now > clientData.resetTime) {
            clientData.count = 1;
            clientData.resetTime = now + windowMs;
        } else {
            clientData.count += 1;
        }

        rateLimitMap.set(ip, clientData);

        if (clientData.count > maxRequests) {
            return res.status(429).json({
                success: false,
                message: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút."
            });
        }

        next();
    };
};

/**
 * Chuẩn hóa vai trò người dùng thành 3 role chính thức duy nhất:
 * 'admin' | 'operator' | 'passenger'
 */
const normalizeRole = (user) => {
    if (!user) return "passenger";
    const r = String(user.role || "").toLowerCase().trim();
    const v = String(user.vai_tro || "").toLowerCase().trim();
    const email = String(user.email || "").toLowerCase().trim();
    const username = String(user.username || "").toLowerCase().trim();

    if (r === "admin" || v === "admin") {
        if (email === "operator@busroute.vn" || username === "operator") {
            return "operator";
        }
        return "admin";
    }
    if (r === "operator" || v === "operator" || email === "operator@busroute.vn") {
        return "operator";
    }
    return "passenger";
};

// Middleware xác thực JWT & Nạp dữ liệu tài khoản
const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập để tiếp tục truy cập"
            });
        }

        const token = authHeader.split(" ")[1];
        const secret = getJwtSecret();
        const decoded = jwt.verify(token, secret);

        const user = await findUserById(decoded.id || decoded._key);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Tài khoản không tồn tại trên hệ thống"
            });
        }

        if (user.status === "locked" || user.trang_thai === "inactive") {
            return res.status(401).json({
                success: false,
                message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên."
            });
        }

        // Quyền hạn role là nguồn chân lý duy nhất (Single Source of Truth)
        const officialRole = normalizeRole(user);

        req.user = {
            id: user._key || user.id,
            _key: user._key || user.id,
            _id: user._id,
            ho_ten: user.ho_ten || user.fullName || "Người dùng",
            fullName: user.ho_ten || user.fullName || "Người dùng",
            email: user.email,
            so_dien_thoai: user.so_dien_thoai || "",
            role: officialRole,
            vai_tro: officialRole // Đồng bộ trường legacy
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"
        });
    }
};

/**
 * Middleware phân quyền trung tâm dựa trên danh sách vai trò được phép
 * @param  {...string} roles - Các role được phép truy cập ('admin', 'operator', 'passenger')
 */
const allowRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Yêu cầu đăng nhập để thực hiện thao tác này"
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Quyền truy cập bị từ chối: Chức năng này yêu cầu vai trò ${roles.join(" hoặc ")}`
            });
        }

        next();
    };
};

const adminOnly = allowRoles("admin");
const operatorOrAdmin = allowRoles("admin", "operator");
const passengerOnly = allowRoles("passenger");

module.exports = {
    protect,
    allowRoles,
    adminOnly,
    operatorOrAdmin,
    passengerOnly,
    normalizeRole,
    rateLimit
};
