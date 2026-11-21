const express = require("express");
const router = express.Router();
const simulationController = require("../controllers/simulationController");

// 1. Danh sách xe ảo đang vận hành (có hỗ trợ lọc theo routeId và direction)
router.get("/vehicles", (req, res) => simulationController.getActiveVehicles(req, res));

// 2. Danh sách xe sắp đến một trạm dừng
router.get("/stops/:stopId/arrivals", (req, res) => simulationController.getStopArrivals(req, res));

// 3. Thời gian chờ xe phục vụ Route Planner
router.get("/route-wait", (req, res) => simulationController.getRouteWait(req, res));

module.exports = router;
