const express = require("express");
const router = express.Router();

const {
    getStops,
    getStop,
    addStop,
    editStop,
    removeStop
} = require("../controllers/stopController");

const { protect, operatorOrAdmin } = require("../middleware/authMiddleware");

// Tra cứu công khai (Guest, Passenger, Operator, Admin đều truy cập được)
router.get("/", getStops);
router.get("/:id", getStop);

// Quản lý nghiệp vụ trạm dừng (Cho phép Admin và Operator)
router.post("/", protect, operatorOrAdmin, addStop);
router.put("/:id", protect, operatorOrAdmin, editStop);
router.delete("/:id", protect, operatorOrAdmin, removeStop);

module.exports = router;
