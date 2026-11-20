require("dotenv").config();

const app = require("./src/app");
const { connectDB } = require("./src/config/database");
const { getJwtSecret } = require("./src/config/jwt");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    // 1. Kiểm tra an toàn bảo mật JWT_SECRET trong môi trường Production
    if (process.env.NODE_ENV === "production") {
        try {
            getJwtSecret();
        } catch (jwtErr) {
            console.error("\n❌ " + jwtErr.message + "\n");
            process.exit(1);
        }
    }

    // 2. Kiểm tra kết nối MongoDB
    const connected = await connectDB();

    if (!connected) {
        console.warn("\n==================================================================");
        console.warn("⚠️ CẢNH BÁO: Chưa kết nối được MongoDB tại localhost:27017.");
        console.warn("Backend API vẫn khởi động để phục vụ các yêu cầu kiểm thử và giao diện.");
        console.warn("Vui lòng khởi động MongoDB Community Server để kích hoạt đầy đủ 100% tính năng NoSQL.");
        console.warn("==================================================================\n");
    }

    app.listen(PORT, () => {
        console.log(`\n==================================================================`);
        console.log(`🚀 BUSROUTE HCM Backend Server is running at: http://localhost:${PORT}`);
        console.log(`   Health Check: http://localhost:${PORT}/api/health`);
        console.log(`   API Documentation / Index: http://localhost:${PORT}/`);
        console.log(`==================================================================\n`);
    });
};

startServer();
