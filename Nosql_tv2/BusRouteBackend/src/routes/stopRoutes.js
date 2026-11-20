const express = require("express");
const router = express.Router();

const {
    getStops,
    getStop,
    addStop,
    editStop,
    removeStop
} = require("../controllers/stopController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Tra cứu công khai (dành cho người dùng và bản đồ)
router.get("/", getStops);
router.get("/:id", getStop);

// Quản trị trạm dừng (Yêu cầu quyền Quản trị viên - Admin Only)
router.post("/", protect, adminOnly, addStop);
router.put("/:id", protect, adminOnly, editStop);
router.delete("/:id", protect, adminOnly, removeStop);

module.exports = router;
