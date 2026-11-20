const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    findUserByEmail,
    createUser,
    getAllUsers,
    updateUserById,
    deleteUserById
} = require("../services/userService");

const formatUserResponse = (u) => {
    if (!u) return null;
    const username =
        u.username || (u.email ? u.email.split("@")[0] : u._key);
    const { mat_khau, password, ...safeUser } = u;
    return {
        ...safeUser,
        id: u._key || u.id,
        username,
        fullName: u.ho_ten || u.fullName || username,
        ho_ten: u.ho_ten || u.fullName || username,
        role: u.role || (u.vai_tro === "admin" ? "admin" : "staff"),
        vai_tro: u.vai_tro || (u.role === "admin" ? "admin" : "user"),
        status: u.status || (u.trang_thai === "active" ? "active" : "locked"),
        trang_thai:
            u.trang_thai || (u.status === "locked" ? "inactive" : "active"),
        createdAt: u.createdAt || (u.ngay_tao || "").slice(0, 10)
    };
};

// LẤY DANH SÁCH NGƯỜI DÙNG (Admin Only)
const getUsers = async (req, res) => {
    try {
        const users = await getAllUsers();
        return res.status(200).json({
            success: true,
            message: "Lấy danh sách tài khoản thành công",
            data: users.map(formatUserResponse)
        });
    } catch (error) {
        console.error("Get users error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi lấy danh sách tài khoản"
        });
    }
};

// ĐĂNG KÝ / TẠO TÀI KHOẢN
// BẢO MẬT: Người dùng tự đăng ký KHÔNG THỂ tự cấp quyền Admin.
// Chỉ khi quản trị viên đã đăng nhập (req.user.role === 'admin') mới được cấp quyền admin cho tài khoản mới.
const register = async (req, res) => {
    try {
        const ho_ten = (req.body.ho_ten || req.body.fullName || "").trim();
        const username = (req.body.username || "").trim();
        const email = (
            req.body.email || (username ? `${username}@busroute.vn` : "")
        ).trim().toLowerCase();
        const mat_khau = req.body.mat_khau || req.body.password || "123456";
        const so_dien_thoai = (req.body.so_dien_thoai || "").trim();

        // Kiểm tra quyền của người thực hiện tạo tài khoản
        const isRequestByAdmin = req.user && (req.user.role === "admin" || req.user.vai_tro === "admin");
        
        let vai_tro = "user";
        let role = "staff";

        if (isRequestByAdmin) {
            // Admin có quyền chỉ định role
            if (req.body.vai_tro === "admin" || req.body.role === "admin") {
                vai_tro = "admin";
                role = "admin";
            }
        }

        const trang_thai =
            req.body.trang_thai ||
            (req.body.status === "locked" ? "inactive" : "active");

        if (!ho_ten || !email) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập họ tên, email và mật khẩu"
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Địa chỉ email không đúng định dạng"
            });
        }

        if (mat_khau.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu phải có ít nhất 6 ký tự"
            });
        }

        const existingUser = await findUserByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email hoặc tên đăng nhập đã được đăng ký"
            });
        }

        const hashedPassword = await bcrypt.hash(mat_khau, 10);

        const newUser = await createUser({
            ho_ten,
            fullName: ho_ten,
            username: username || email.split("@")[0],
            email,
            mat_khau: hashedPassword,
            so_dien_thoai,
            vai_tro,
            role,
            trang_thai,
            status: trang_thai === "active" ? "active" : "locked",
            ngay_tao: new Date().toISOString()
        });

        const formatted = formatUserResponse(newUser);
        return res.status(201).json({
            success: true,
            message: "Đăng ký tài khoản thành công",
            ...formatted,
            data: formatted
        });
    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi đăng ký tài khoản"
        });
    }
};

// CẬP NHẬT TÀI KHOẢN (Admin hoặc chính chủ)
const editUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {};

        // Chỉ Admin mới được đổi vai trò
        const isRequestByAdmin = req.user && (req.user.role === "admin" || req.user.vai_tro === "admin");

        if (req.body.ho_ten || req.body.fullName) {
            updateData.ho_ten = (req.body.ho_ten || req.body.fullName).trim();
            updateData.fullName = updateData.ho_ten;
        }
        if (req.body.email) {
            updateData.email = req.body.email.trim().toLowerCase();
        }
        if (req.body.so_dien_thoai !== undefined) {
            updateData.so_dien_thoai = req.body.so_dien_thoai.trim();
        }
        if (isRequestByAdmin && (req.body.role || req.body.vai_tro)) {
            const roleVal = req.body.role || req.body.vai_tro;
            updateData.vai_tro = roleVal === "admin" ? "admin" : "user";
            updateData.role = roleVal === "admin" ? "admin" : "staff";
        }
        if (isRequestByAdmin && (req.body.status || req.body.trang_thai)) {
            const st = req.body.status || req.body.trang_thai;
            updateData.trang_thai =
                st === "locked" || st === "inactive" ? "inactive" : "active";
            updateData.status =
                updateData.trang_thai === "active" ? "active" : "locked";
        }
        if (req.body.password || req.body.mat_khau) {
            const pwd = req.body.password || req.body.mat_khau;
            if (pwd.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Mật khẩu mới phải có ít nhất 6 ký tự"
                });
            }
            updateData.mat_khau = await bcrypt.hash(pwd, 10);
        }

        const updated = await updateUserById(id, updateData);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tài khoản"
            });
        }

        const formatted = formatUserResponse(updated);
        return res.status(200).json({
            success: true,
            message: "Cập nhật tài khoản thành công",
            ...formatted,
            data: formatted
        });
    } catch (error) {
        console.error("Update user error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi cập nhật tài khoản"
        });
    }
};

// XÓA TÀI KHOẢN (Admin Only)
const removeUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Không cho phép tự xóa chính mình
        if (req.user && (req.user.id === id || req.user._key === id)) {
            return res.status(400).json({
                success: false,
                message: "Không thể tự xóa tài khoản đang đăng nhập của chính bạn"
            });
        }

        const deleted = await deleteUserById(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tài khoản"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Xóa tài khoản thành công"
        });
    } catch (error) {
        console.error("Delete user error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi xóa tài khoản"
        });
    }
};

// ĐĂNG NHẬP
const login = async (req, res) => {
    try {
        const identifier = (
            req.body.email ||
            req.body.username ||
            ""
        ).trim().toLowerCase();
        const password = req.body.mat_khau || req.body.password || "";

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập email/tên đăng nhập và mật khẩu"
            });
        }

        const user = await findUserByEmail(identifier);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không chính xác"
            });
        }

        if (user.trang_thai === "inactive" || user.status === "locked") {
            return res.status(403).json({
                success: false,
                message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên."
            });
        }

        const isMatch = await bcrypt.compare(password, user.mat_khau);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không chính xác"
            });
        }

        const secret = process.env.JWT_SECRET || "default_jwt_secret_busroute_2026";
        const token = jwt.sign(
            {
                id: user._key || user.id,
                email: user.email,
                vai_tro: user.vai_tro || (user.role === "admin" ? "admin" : "user"),
                role: user.role || (user.vai_tro === "admin" ? "admin" : "staff")
            },
            secret,
            {
                expiresIn: "1d"
            }
        );

        const formattedUser = formatUserResponse(user);

        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            token,
            user: formattedUser,
            data: {
                token,
                user: formattedUser
            }
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi đăng nhập"
        });
    }
};

module.exports = {
    getUsers,
    register,
    editUser,
    removeUser,
    login,
    formatUserResponse
};
