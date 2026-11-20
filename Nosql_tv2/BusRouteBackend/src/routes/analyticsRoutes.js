const express = require("express");
const router = express.Router();

const { getNetworkAnalytics } = require("../controllers/analyticsController");

// Thống kê phân tích mạng lưới xe buýt (Dùng chung cho Dashboard và Network Analytics)
router.get("/network", getNetworkAnalytics);

module.exports = router;
