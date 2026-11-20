const { db, ensureDocumentKeys, buildIdFilter } = require("../config/database");

const userCollection = db.collection("NguoiDung");

// 1. Tìm người dùng theo email hoặc username
const findUserByEmail = async (emailOrUsername) => {
    const clean = String(emailOrUsername).trim();
    return await userCollection.findOne({
        $or: [
            { email: clean },
            { username: clean },
            { email: `${clean}@busroute.vn` },
            { _key: clean }
        ]
    });
};

// 2. Tạo người dùng mới
const createUser = async (userData) => {
    const doc = ensureDocumentKeys("NguoiDung", userData);
    await userCollection.insertOne(doc);
    return doc;
};

// 3. Tìm người dùng theo ID (_key hoặc _id)
const findUserById = async (userId) => {
    return await userCollection.findOne(buildIdFilter("NguoiDung", userId));
};

// 4. Lấy danh sách toàn bộ người dùng (ẩn mật khẩu)
const getAllUsers = async () => {
    return await userCollection
        .find({}, { projection: { mat_khau: 0 } })
        .sort({ ngay_tao: -1 })
        .toArray();
};

// 5. Cập nhật người dùng
const updateUserById = async (userId, updateData) => {
    const existing = await findUserById(userId);
    if (!existing) return null;
    await userCollection.updateOne({ _id: existing._id }, { $set: updateData });
    return await userCollection.findOne(
        { _id: existing._id },
        { projection: { mat_khau: 0 } }
    );
};

// 6. Xóa người dùng
const deleteUserById = async (userId) => {
    const existing = await findUserById(userId);
    if (!existing) return false;
    await userCollection.deleteOne({ _id: existing._id });
    return true;
};

// 7. Đếm số lượng tài khoản Quản trị viên đang hoạt động
const countActiveAdmins = async () => {
    return await userCollection.countDocuments({
        role: "admin",
        status: { $ne: "locked" },
        trang_thai: { $ne: "inactive" }
    });
};

module.exports = {
    findUserByEmail,
    createUser,
    findUserById,
    getAllUsers,
    updateUserById,
    deleteUserById,
    countActiveAdmins
};
