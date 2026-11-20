const express = require("express");
const router = express.Router();

const {
    getRoutes,
    getRoute,
    addRoute,
    editRoute,
    removeRoute,
    assignStops,
    getRouteDetailWithStops
} = require("../controllers/routeController");

const { protect, operatorOrAdmin } = require("../middleware/authMiddleware");

// Tra cứu công khai (Guest, Passenger, Operator, Admin đều truy cập được)
router.get("/", getRoutes);
router.get("/:id", getRoute);
router.get("/:id/stops", getRouteDetailWithStops);

// Quản lý nghiệp vụ tuyến xe (Cho phép Admin và Operator)
router.post("/", protect, operatorOrAdmin, addRoute);
router.put("/:id", protect, operatorOrAdmin, editRoute);
router.delete("/:id", protect, operatorOrAdmin, removeRoute);
router.put("/:id/stops", protect, operatorOrAdmin, assignStops);

module.exports = router;
