const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const routeRoutes = require("./routes/routeRoutes");
const stopRoutes = require("./routes/stopRoutes");
const databaseRoutes = require("./routes/databaseRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const aiRoutes = require("./routes/aiRoutes");
const passengerRoutes = require("./routes/passengerRoutes");
const { routePlannerRouter } = require("./modules/route-planner/routePlanner.routes");

const app = express();

// Cấu hình CORS linh hoạt: hỗ trợ biến môi trường FRONTEND_URL và CORS_ORIGINS cho production
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
    : process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : "*";

app.use(cors(allowedOrigins === "*" ? {} : { origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// 1. API người dùng & xác thực
app.use("/api/users", userRoutes);
app.use("/api/auth", userRoutes);

// 2. API Cổng Hành khách & Cá nhân hóa (Lịch sử tìm kiếm, Địa điểm đã lưu, Tuyến yêu thích, Đề xuất)
app.use("/api/passenger", passengerRoutes);

// 3. API tuyến xe
app.use("/api/routes", routeRoutes);

// 3. API trạm dừng
app.use("/api/stops", stopRoutes);

// 4. API tra cứu lộ trình & đồ thị (/api/path, /api/search/by-stop/:id, /api/graph)
app.use("/api", routePlannerRouter);

// 5. API Quản trị MongoDB Explorer, Playground, Backup/Restore
app.use("/api/database", databaseRoutes);

// 6. API Thống kê & Phân tích Mạng lưới (Network Analytics)
app.use("/api/analytics", analyticsRoutes);

// 7. API Trợ lý AI (Ollama Local)
app.use("/api/ai", aiRoutes);

// API kiểm tra server
app.get("/", (req, res) => {
    res.json({
        message: "BUSROUTE HCM - Hệ thống Quản lý và Tra cứu Lộ trình Xe buýt TP.HCM (MongoDB Backend API)",
        version: "2.0.0",
        status: "success",
        author: "Senior Full-stack & NoSQL Engineer",
        endpoints: {
            auth: "/api/auth/login",
            routes: "/api/routes",
            stops: "/api/stops",
            planner: "/api/path?from=TR_01&to=TR_03",
            graph: "/api/graph",
            database: "/api/database/collections",
            analytics: "/api/analytics/network",
            ai: "/api/ai/chat"
        }
    });
});

// API kiểm tra sức khỏe
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        service: "BUSROUTE HCM Backend",
        database: "MongoDB Community Server",
        timestamp: new Date().toISOString()
    });
});

// Xử lý 404 cho route không tồn tại
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint không tồn tại: ${req.method} ${req.originalUrl}`
    });
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Lỗi máy chủ nội bộ"
    });
});

module.exports = app;
