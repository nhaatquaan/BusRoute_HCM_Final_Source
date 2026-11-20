/**
 * Quản lý cấu hình JWT Secret an toàn
 * Trong môi trường production: BẮT BUỘC có JWT_SECRET an toàn, từ chối khởi động nếu thiếu hoặc dùng secret mặc định
 */
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
        if (
            !secret ||
            secret.trim() === "" ||
            secret.includes("default") ||
            secret.includes("placeholder") ||
            secret.includes("dev_only") ||
            secret.length < 32
        ) {
            throw new Error(
                "LỖI BẢO MẬT: Biến môi trường JWT_SECRET chưa được cấu hình hoặc không đủ an toàn cho môi trường Production (yêu cầu tối thiểu 32 ký tự ngẫu nhiên). Hãy tạo khóa ngẫu nhiên an toàn bằng lệnh: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
            );
        }
    }

    return secret || "busroute_dev_insecure_secret_only_for_local_development";
};

module.exports = { getJwtSecret };
