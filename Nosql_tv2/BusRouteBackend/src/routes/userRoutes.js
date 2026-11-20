const express = require("express");
const router = express.Router();

const {
    getUsers,
    register,
    editUser,
    removeUser,
    login
} = require("../controllers/userController");

const { protect, adminOnly, rateLimit } = require("../middleware/authMiddleware");

// Middleware tùy chọn gắn req.user nếu có token hợp lệ mà không bắt buộc
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const jwt = require("jsonwebtoken");
            const { findUserById } = require("../services/userService");
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_busroute_2026");
            const user = await findUserById(decoded.id || decoded._key);
            if (user) {
                req.user = {
                    id: user._key || user.id,
                    _key: user._key,
                    _id: user._id,
                    email: user.email,
                    vai_tro: user.vai_tro,
                    role: user.role
                };
            }
        }
    } catch (_) {}
    next();
};

// API lấy danh sách người dùng (Chỉ Quản trị viên)
router.get("/", protect, adminOnly, getUsers);

// API đăng ký / tạo tài khoản
// Người dùng tự đăng ký chỉ nhận role "user"
// Admin có thể gửi token để tạo tài khoản "admin" hoặc "staff"
router.post("/", optionalAuth, register);
router.post("/register", rateLimit(10, 60000), optionalAuth, register);

// API cập nhật (Chỉ người dùng đang đăng nhập hoặc Quản trị viên)
router.put("/:id", protect, editUser);

// API xóa người dùng (Chỉ Quản trị viên)
router.delete("/:id", protect, adminOnly, removeUser);

// API đăng nhập (Rate limit chống brute force)
router.post("/login", rateLimit(15, 60000), login);

// API lấy thông tin người dùng hiện tại
router.get("/me", protect, (req, res) => {
    res.status(200).json({
        success: true,
        message: "Xác thực thành công",
        data: {
            user: req.user
        }
    });
});

module.exports = router;
