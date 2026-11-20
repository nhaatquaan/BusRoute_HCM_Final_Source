const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    findUserByEmail,
    createUser,
    getAllUsers,
    updateUserById,
    deleteUserById,
    findUserById,
    countActiveAdmins
} = require("../services/userService");

const { normalizeRole } = require("../middleware/authMiddleware");
const { getJwtSecret } = require("../config/jwt");

const formatUserResponse = (u) => {
    if (!u) return null;
    const username = u.username || (u.email ? u.email.split("@")[0] : u._key);
    const { mat_khau, password, ...safeUser } = u;
    const role = normalizeRole(u);

    return {
        ...safeUser,
        id: u._key || u.id,
        _key: u._key || u.id,
        username,
        fullName: u.ho_ten || u.fullName || username,
        ho_ten: u.ho_ten || u.fullName || username,
        email: u.email,
        so_dien_thoai: u.so_dien_thoai || "",
        role,
        vai_tro: role, // Luôn đồng bộ với role chính thức
        status: u.status || (u.trang_thai === "active" ? "active" : "locked"),
        trang_thai: u.trang_thai || (u.status === "locked" ? "inactive" : "active"),
        createdAt: u.createdAt || (u.ngay_tao || "").slice(0, 10)
    };
};

// ============================================================================
// 1. PUBLIC AUTH: LOGIN & PASSENGER REGISTER
// ============================================================================

// ĐĂNG NHẬP
const login = async (req, res) => {
    try {
        const identifier = (req.body.email || req.body.username || "").trim().toLowerCase();
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

        const officialRole = normalizeRole(user);
        const secret = getJwtSecret();
        const token = jwt.sign(
            {
                id: user._key || user.id,
                email: user.email,
                role: officialRole,
                vai_tro: officialRole
            },
            secret,
            { expiresIn: "1d" }
        );

        const formattedUser = formatUserResponse({ ...user, role: officialRole, vai_tro: officialRole });

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

// ĐĂNG KÝ CÔNG KHAI CHO HÀNH KHÁCH (Public Registration)
// Bảo mật: Người dùng tự đăng ký BẮT BUỘC nhận role 'passenger', không thể tự nâng quyền
const register = async (req, res) => {
    try {
        const ho_ten = (req.body.ho_ten || req.body.fullName || "").trim();
        const email = (req.body.email || "").trim().toLowerCase();
        const mat_khau = req.body.mat_khau || req.body.password || "";
        const so_dien_thoai = (req.body.so_dien_thoai || "").trim();
        const username = (req.body.username || (email ? email.split("@")[0] : "")).trim();

        if (!ho_ten || !email || !mat_khau) {
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
                message: "Email này đã được đăng ký tài khoản"
            });
        }

        const hashedPassword = await bcrypt.hash(mat_khau, 10);

        // BẮT BUỘC gán vai trò Passenger
        const newUser = await createUser({
            ho_ten,
            fullName: ho_ten,
            username,
            email,
            mat_khau: hashedPassword,
            so_dien_thoai,
            role: "passenger",
            vai_tro: "passenger",
            status: "active",
            trang_thai: "active",
            ngay_tao: new Date().toISOString()
        });

        const formatted = formatUserResponse(newUser);

        // Tự động cấp token đăng nhập ngay sau khi đăng ký
        const secret = getJwtSecret();
        const token = jwt.sign(
            {
                id: formatted.id,
                email: formatted.email,
                role: "passenger",
                vai_tro: "passenger"
            },
            secret,
            { expiresIn: "1d" }
        );

        return res.status(201).json({
            success: true,
            message: "Đăng ký tài khoản hành khách thành công",
            token,
            user: formatted,
            data: {
                token,
                user: formatted
            }
        });
    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi đăng ký tài khoản"
        });
    }
};

// ============================================================================
// 2. USER SELF PROFILE (CHÍNH CHỦ XEM & CẬP NHẬT - CHỐNG IDOR)
// ============================================================================

// XEM HỒ SƠ CHÍNH MÌNH
const getMe = async (req, res) => {
    try {
        const user = await findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy thông tin tài khoản"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Lấy thông tin hồ sơ thành công",
            data: formatUserResponse(user)
        });
    } catch (error) {
        console.error("GetMe error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi lấy thông tin hồ sơ"
        });
    }
};

// CẬP NHẬT HỒ SƠ CHÍNH MÌNH (Chỉ cho phép sửa họ tên, số điện thoại, email)
const updateMe = async (req, res) => {
    try {
        const updateData = {};
        if (req.body.ho_ten || req.body.fullName) {
            updateData.ho_ten = (req.body.ho_ten || req.body.fullName).trim();
            updateData.fullName = updateData.ho_ten;
        }
        if (req.body.so_dien_thoai !== undefined) {
            updateData.so_dien_thoai = String(req.body.so_dien_thoai).trim();
        }
        if (req.body.email) {
            const newEmail = req.body.email.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newEmail)) {
                return res.status(400).json({
                    success: false,
                    message: "Email không đúng định dạng"
                });
            }
            if (newEmail !== req.user.email) {
                const existing = await findUserByEmail(newEmail);
                if (existing && String(existing._key || existing._id) !== String(req.user.id)) {
                    return res.status(409).json({
                        success: false,
                        message: "Email này đã được sử dụng bởi tài khoản khác"
                    });
                }
                updateData.email = newEmail;
            }
        }

        // Tuyệt đối không cho phép tự sửa role, status hoặc password ở API này!
        const updated = await updateUserById(req.user.id, updateData);
        return res.status(200).json({
            success: true,
            message: "Cập nhật hồ sơ cá nhân thành công",
            data: formatUserResponse(updated)
        });
    } catch (error) {
        console.error("UpdateMe error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi cập nhật hồ sơ"
        });
    }
};

// ĐỔI MẬT KHẨU CHÍNH MÌNH
const changePassword = async (req, res) => {
    try {
        const currentPassword = req.body.currentPassword || req.body.oldPassword || "";
        const newPassword = req.body.newPassword || req.body.password || "";

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu mới phải có ít nhất 6 ký tự"
            });
        }

        const user = await findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy thông tin tài khoản"
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.mat_khau);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu hiện tại không chính xác"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updateUserById(req.user.id, { mat_khau: hashedPassword });

        return res.status(200).json({
            success: true,
            message: "Đổi mật khẩu thành công. Vui lòng ghi nhớ mật khẩu mới."
        });
    } catch (error) {
        console.error("ChangePassword error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi đổi mật khẩu"
        });
    }
};

// ============================================================================
// 3. ADMIN USER MANAGEMENT (CHỈ DÀNH CHO ADMIN)
// ============================================================================

// LẤY DANH SÁCH TOÀN BỘ NGƯỜI DÙNG
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

// ADMIN TẠO TÀI KHOẢN (Được quyền chọn Admin, Operator hoặc Passenger)
const createUserByAdmin = async (req, res) => {
    try {
        const ho_ten = (req.body.ho_ten || req.body.fullName || "").trim();
        const username = (req.body.username || "").trim();
        const email = (req.body.email || (username ? `${username}@busroute.vn` : "")).trim().toLowerCase();
        const mat_khau = req.body.mat_khau || req.body.password || "123456";
        const so_dien_thoai = (req.body.so_dien_thoai || "").trim();

        let requestedRole = String(req.body.role || req.body.vai_tro || "passenger").toLowerCase().trim();
        if (!["admin", "operator", "passenger"].includes(requestedRole)) {
            requestedRole = "passenger";
        }

        const status = req.body.status === "locked" || req.body.trang_thai === "inactive" ? "locked" : "active";

        if (!ho_ten || !email) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập họ tên và email"
            });
        }

        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email này đã được sử dụng"
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
            role: requestedRole,
            vai_tro: requestedRole,
            status,
            trang_thai: status === "active" ? "active" : "inactive",
            ngay_tao: new Date().toISOString()
        });

        const formatted = formatUserResponse(newUser);
        return res.status(201).json({
            success: true,
            message: `Tạo tài khoản ${requestedRole} thành công`,
            data: formatted
        });
    } catch (error) {
        console.error("CreateUserByAdmin error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi tạo tài khoản"
        });
    }
};

// ADMIN CẬP NHẬT TÀI KHOẢN BẤT KỲ
const editUser = async (req, res) => {
    try {
        const { id } = req.params;
        const targetUser = await findUserById(id);

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tài khoản cần chỉnh sửa"
            });
        }

        const updateData = {};

        if (req.body.ho_ten || req.body.fullName) {
            updateData.ho_ten = (req.body.ho_ten || req.body.fullName).trim();
            updateData.fullName = updateData.ho_ten;
        }
        if (req.body.email) {
            updateData.email = req.body.email.trim().toLowerCase();
        }
        if (req.body.so_dien_thoai !== undefined) {
            updateData.so_dien_thoai = String(req.body.so_dien_thoai).trim();
        }

        // Cập nhật vai trò
        if (req.body.role || req.body.vai_tro) {
            const newRole = String(req.body.role || req.body.vai_tro).toLowerCase().trim();
            if (["admin", "operator", "passenger"].includes(newRole)) {
                // Kiểm tra an toàn: Không cho phép hạ quyền Admin cuối cùng
                if (targetUser.role === "admin" && newRole !== "admin") {
                    const activeAdmins = await countActiveAdmins();
                    if (activeAdmins <= 1) {
                        return res.status(400).json({
                            success: false,
                            message: "Không thể hạ quyền Quản trị viên (Admin) duy nhất còn lại của hệ thống."
                        });
                    }
                }
                updateData.role = newRole;
                updateData.vai_tro = newRole;
            }
        }

        // Cập nhật trạng thái
        if (req.body.status || req.body.trang_thai) {
            const st = req.body.status || req.body.trang_thai;
            const newStatus = st === "locked" || st === "inactive" ? "locked" : "active";

            // Kiểm tra an toàn: Không cho phép khóa Admin cuối cùng
            if (targetUser.role === "admin" && newStatus === "locked") {
                const activeAdmins = await countActiveAdmins();
                if (activeAdmins <= 1) {
                    return res.status(400).json({
                        success: false,
                        message: "Không thể khóa tài khoản Quản trị viên (Admin) duy nhất còn lại của hệ thống."
                    });
                }
            }

            updateData.status = newStatus;
            updateData.trang_thai = newStatus === "active" ? "active" : "inactive";
        }

        // Reset mật khẩu mới từ Admin (nếu có nhập)
        if (req.body.password || req.body.mat_khau) {
            const pwd = req.body.password || req.body.mat_khau;
            if (pwd.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Mật khẩu đặt lại phải có ít nhất 6 ký tự"
                });
            }
            updateData.mat_khau = await bcrypt.hash(pwd, 10);
        }

        const updated = await updateUserById(id, updateData);
        return res.status(200).json({
            success: true,
            message: "Cập nhật tài khoản thành công",
            data: formatUserResponse(updated)
        });
    } catch (error) {
        console.error("EditUser error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi cập nhật tài khoản"
        });
    }
};

// ADMIN XÓA TÀI KHOẢN
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

        const targetUser = await findUserById(id);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tài khoản cần xóa"
            });
        }

        // Không cho phép xóa Admin cuối cùng
        if (targetUser.role === "admin") {
            const activeAdmins = await countActiveAdmins();
            if (activeAdmins <= 1) {
                return res.status(400).json({
                    success: false,
                    message: "Không thể xóa Quản trị viên (Admin) duy nhất còn lại của hệ thống."
                });
            }
        }

        await deleteUserById(id);
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

module.exports = {
    login,
    register,
    getMe,
    updateMe,
    changePassword,
    getUsers,
    createUserByAdmin,
    editUser,
    removeUser,
    formatUserResponse
};
