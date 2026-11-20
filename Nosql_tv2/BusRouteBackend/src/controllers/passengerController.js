const passengerService = require("../services/passengerService");

// 1. LỊCH SỬ TÌM KIẾM
const recordSearch = async (req, res) => {
    try {
        const { fromStopId, toStopId, fromStopName, toStopName, criteria, summaryResult } = req.body;
        const result = await passengerService.recordSearchHistory({
            userId: req.user.id,
            fromStopId,
            toStopId,
            fromStopName,
            toStopName,
            criteria,
            summaryResult
        });
        return res.status(201).json({
            success: true,
            message: "Đã lưu lịch sử tìm kiếm lộ trình",
            data: result
        });
    } catch (error) {
        console.error("recordSearch error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

const getHistory = async (req, res) => {
    try {
        const { limit, page } = req.query;
        const result = await passengerService.getSearchHistory(req.user.id, { limit, page });
        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error("getHistory error:", error);
        return res.status(500).json({ success: false, message: "Lỗi lấy lịch sử tìm kiếm" });
    }
};

const deleteHistoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await passengerService.deleteSearchHistoryItem(req.user.id, id);
        if (!success) {
            return res.status(404).json({ success: false, message: "Mục lịch sử không tồn tại hoặc không có quyền xóa" });
        }
        return res.status(200).json({ success: true, message: "Đã xóa mục lịch sử tìm kiếm" });
    } catch (error) {
        console.error("deleteHistoryItem error:", error);
        return res.status(500).json({ success: false, message: "Lỗi xóa mục lịch sử" });
    }
};

const clearHistory = async (req, res) => {
    try {
        const count = await passengerService.clearAllSearchHistory(req.user.id);
        return res.status(200).json({ success: true, message: `Đã xóa ${count} mục lịch sử tìm kiếm của bạn` });
    } catch (error) {
        console.error("clearHistory error:", error);
        return res.status(500).json({ success: false, message: "Lỗi xóa toàn bộ lịch sử" });
    }
};

const syncHistory = async (req, res) => {
    try {
        const { guestSearches } = req.body;
        const result = await passengerService.syncGuestHistory(req.user.id, guestSearches);
        return res.status(200).json({
            success: true,
            message: `Đã đồng bộ ${result.syncedCount} lượt tìm kiếm từ trình duyệt vào tài khoản`,
            data: result
        });
    } catch (error) {
        console.error("syncHistory error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 2. ĐỊA ĐIỂM ĐÃ LƯU
const getPlaces = async (req, res) => {
    try {
        const places = await passengerService.getSavedPlaces(req.user.id);
        return res.status(200).json({ success: true, data: places });
    } catch (error) {
        console.error("getPlaces error:", error);
        return res.status(500).json({ success: false, message: "Lỗi lấy danh sách địa điểm đã lưu" });
    }
};

const addPlace = async (req, res) => {
    try {
        const { type, name, address, latitude, longitude, nearestStopId, nearestStopName } = req.body;
        const place = await passengerService.addSavedPlace(req.user.id, {
            type,
            name,
            address,
            latitude,
            longitude,
            nearestStopId,
            nearestStopName
        });
        return res.status(201).json({
            success: true,
            message: `Đã lưu địa điểm "${place.name}" thành công`,
            data: place
        });
    } catch (error) {
        console.error("addPlace error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

const updatePlace = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await passengerService.updateSavedPlace(req.user.id, id, req.body);
        if (!updated) {
            return res.status(404).json({ success: false, message: "Không tìm thấy địa điểm hoặc bạn không có quyền sửa" });
        }
        return res.status(200).json({ success: true, message: "Cập nhật địa điểm thành công", data: updated });
    } catch (error) {
        console.error("updatePlace error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

const deletePlace = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await passengerService.deleteSavedPlace(req.user.id, id);
        if (!success) {
            return res.status(404).json({ success: false, message: "Không tìm thấy địa điểm hoặc bạn không có quyền xóa" });
        }
        return res.status(200).json({ success: true, message: "Đã xóa địa điểm thành công" });
    } catch (error) {
        console.error("deletePlace error:", error);
        return res.status(500).json({ success: false, message: "Lỗi xóa địa điểm" });
    }
};

// 3. TUYẾN YÊU THÍCH
const getFavorites = async (req, res) => {
    try {
        const favorites = await passengerService.getFavoriteRoutes(req.user.id);
        return res.status(200).json({ success: true, data: favorites });
    } catch (error) {
        console.error("getFavorites error:", error);
        return res.status(500).json({ success: false, message: "Lỗi lấy danh sách tuyến yêu thích" });
    }
};

const addFavorite = async (req, res) => {
    try {
        const { routeId, routeCode, routeName } = req.body;
        const result = await passengerService.addFavoriteRoute(req.user.id, { routeId, routeCode, routeName });
        return res.status(200).json({ success: true, message: "Đã thêm vào danh sách tuyến yêu thích", data: result });
    } catch (error) {
        console.error("addFavorite error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

const removeFavorite = async (req, res) => {
    try {
        const { routeId } = req.params;
        const success = await passengerService.removeFavoriteRoute(req.user.id, routeId);
        return res.status(200).json({ success: true, message: "Đã xóa tuyến khỏi danh sách yêu thích" });
    } catch (error) {
        console.error("removeFavorite error:", error);
        return res.status(500).json({ success: false, message: "Lỗi xóa tuyến yêu thích" });
    }
};

// 4. SỞ THÍCH TÌM ĐƯỜNG (Preferences)
const getPreferences = async (req, res) => {
    try {
        const prefs = await passengerService.getUserPreferences(req.user.id);
        return res.status(200).json({ success: true, data: prefs });
    } catch (error) {
        console.error("getPreferences error:", error);
        return res.status(500).json({ success: false, message: "Lỗi lấy sở thích tìm đường" });
    }
};

const updatePreferences = async (req, res) => {
    try {
        const updated = await passengerService.updateUserPreferences(req.user.id, req.body);
        return res.status(200).json({ success: true, message: "Đã cập nhật sở thích tìm đường", data: updated });
    } catch (error) {
        console.error("updatePreferences error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 5. ĐỀ XUẤT THÔNG MINH
const getRecommendations = async (req, res) => {
    try {
        const recommendations = await passengerService.getPersonalizedRecommendations(req.user.id);
        return res.status(200).json({ success: true, data: recommendations });
    } catch (error) {
        console.error("getRecommendations error:", error);
        return res.status(500).json({ success: false, message: "Lỗi tạo đề xuất lộ trình" });
    }
};

module.exports = {
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
};
