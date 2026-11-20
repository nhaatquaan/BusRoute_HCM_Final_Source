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

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Tra cứu công khai (người dân & khách truy cập)
router.get("/", getRoutes);
router.get("/:id", getRoute);
router.get("/:id/stops", getRouteDetailWithStops);

// Quản trị dữ liệu (Yêu cầu quyền Quản trị viên - Admin Only)
router.post("/", protect, adminOnly, addRoute);
router.put("/:id", protect, adminOnly, editRoute);
router.delete("/:id", protect, adminOnly, removeRoute);
router.put("/:id/stops", protect, adminOnly, assignStops);

module.exports = router;
