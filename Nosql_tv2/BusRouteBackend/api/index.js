const app = require("../src/app");
const { connectDB } = require("../src/config/database");

/**
 * Vercel Serverless Function entry point for BusRoute HCM Express Backend
 * Tự động đảm bảo kết nối MongoDB trước khi xử lý request
 */
module.exports = async (req, res) => {
    try {
        await connectDB();
    } catch (err) {
        console.error("Vercel Serverless MongoDB connection error:", err.message);
    }
    return app(req, res);
};
