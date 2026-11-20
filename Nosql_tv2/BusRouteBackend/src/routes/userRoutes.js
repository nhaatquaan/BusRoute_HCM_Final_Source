const express = require("express");
const router = express.Router();

const {
    login,
    register,
    getMe,
    updateMe,
    changePassword,
    getUsers,
    createUserByAdmin,
    editUser,
    removeUser
} = require("../controllers/userController");

const { protect, adminOnly, rateLimit } = require("../middleware/authMiddleware");

// ============================================================================
// 1. PUBLIC ENDPOINTS
// ============================================================================

// Đăng nhập (Chống Brute Force: 15 req / phút)
router.post("/login", rateLimit(15, 60000), login);

// Đăng ký tài khoản công khai (Bắt buộc role: 'passenger', 10 req / phút)
router.post("/register", rateLimit(10, 60000), register);

// ============================================================================
// 2. USER SELF PROFILE (Chính chủ quản lý thông tin & đổi mật khẩu - Chống IDOR)
// ============================================================================
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.patch("/me", protect, updateMe);
router.put("/me/password", protect, changePassword);
router.patch("/me/password", protect, changePassword);

// ============================================================================
// 3. ADMIN MANAGEMENT (Chỉ dành riêng cho Quản trị viên - Admin Only)
// ============================================================================
router.get("/", protect, adminOnly, getUsers);
router.post("/", protect, adminOnly, createUserByAdmin);
router.put("/:id", protect, adminOnly, editUser);
router.delete("/:id", protect, adminOnly, removeUser);

module.exports = router;
