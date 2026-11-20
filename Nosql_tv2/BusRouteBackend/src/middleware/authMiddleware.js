const jwt = require("jsonwebtoken");
const { findUserById } = require("../services/userService");

// In-memory rate limiter cho các endpoint nhạy cảm (đăng nhập)
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

// Middleware xác thực JWT
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_busroute_2026");

        const user = await findUserById(decoded.id || decoded._key);

        if (!user || (user.trang_thai !== "active" && user.status === "locked")) {
            return res.status(401).json({
                success: false,
                message: "Tài khoản không tồn tại hoặc đã bị khóa"
            });
        }

        req.user = {
            id: user._key || user.id,
            _key: user._key,
            _id: user._id,
            ho_ten: user.ho_ten || user.fullName,
            email: user.email,
            vai_tro: user.vai_tro || (user.role === "admin" ? "admin" : "user"),
            role: user.role || (user.vai_tro === "admin" ? "admin" : "staff")
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"
        });
    }
};

// Middleware phân quyền Quản trị viên (Admin Only)
const adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Yêu cầu đăng nhập để thực hiện thao tác này"
        });
    }

    const isAdmin = req.user.vai_tro === "admin" || req.user.role === "admin";

    if (!isAdmin) {
        return res.status(403).json({
            success: false,
            message: "Quyền truy cập bị từ chối: Chức năng này chỉ dành cho Quản trị viên (Admin)"
        });
    }

    next();
};

module.exports = {
    protect,
    adminOnly,
    rateLimit
};
