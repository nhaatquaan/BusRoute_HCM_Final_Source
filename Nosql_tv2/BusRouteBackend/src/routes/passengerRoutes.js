const express = require("express");
const router = express.Router();

const {
    recordSearch,
    getHistory,
    deleteHistoryItem,
    clearHistory,
    syncHistory,
    getPlaces,
    addPlace,
    updatePlace,
    deletePlace,
    getFavorites,
    addFavorite,
    removeFavorite,
    getPreferences,
    updatePreferences,
    getRecommendations
} = require("../controllers/passengerController");

const { protect } = require("../middleware/authMiddleware");

// Mọi endpoint trong Passenger Portal đều yêu cầu đã xác thực qua JWT (Chống IDOR qua req.user.id)
router.use(protect);

// 1. Lịch sử tìm kiếm
router.post("/history", recordSearch);
router.get("/history", getHistory);
router.delete("/history/:id", deleteHistoryItem);
router.delete("/history", clearHistory);
router.post("/history/sync", syncHistory);

// 2. Địa điểm đã lưu (Nhà, Nơi làm việc, Trường học, ...)
router.get("/places", getPlaces);
router.post("/places", addPlace);
router.put("/places/:id", updatePlace);
router.delete("/places/:id", deletePlace);

// 3. Tuyến xe yêu thích
router.get("/favorites", getFavorites);
router.post("/favorites", addFavorite);
router.delete("/favorites/:routeId", removeFavorite);

// 4. Sở thích tìm đường
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

// 5. Đề xuất lộ trình thông minh
router.get("/recommendations", getRecommendations);

module.exports = router;
