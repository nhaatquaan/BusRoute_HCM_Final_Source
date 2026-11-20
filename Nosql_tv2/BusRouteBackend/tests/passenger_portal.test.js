const test = require("node:test");
const assert = require("node:assert");
const { client } = require("../src/config/database");

// Import passenger service functions
const {
    recordSearchHistory,
    getSearchHistory,
    deleteSearchHistoryItem,
    clearAllSearchHistory,
    syncGuestHistory,
    getSavedPlaces,
    addSavedPlace,
    updateSavedPlace,
    deleteSavedPlace,
    getFavoriteRoutes,
    addFavoriteRoute,
    removeFavoriteRoute,
    getUserPreferences,
    updateUserPreferences,
    getPersonalizedRecommendations
} = require("../src/services/passengerService");

const TEST_USER_ID = "USR_TEST_PASSENGER_SUITE";
const OTHER_USER_ID = "USR_TEST_OTHER_PASSENGER";

test("Cổng Hành khách: Ghi nhận, truy vấn và xóa lịch sử tìm kiếm có phân quyền", async () => {
    // 1. Dọn dẹp trước test
    await clearAllSearchHistory(TEST_USER_ID);
    await clearAllSearchHistory(OTHER_USER_ID);

    // 2. Ghi nhận tìm kiếm
    const search1 = await recordSearchHistory({
        userId: TEST_USER_ID,
        fromStopId: "TR_01",
        toStopId: "TR_08",
        fromStopName: "Bến Thành",
        toStopName: "BX Chợ Lớn",
        criteria: "least_transfers",
        summaryResult: { pathsCount: 2, transfers: 0, durationMinutes: 28 }
    });
    assert.ok(search1.id || search1._key);
    assert.strictEqual(search1.fromStopId, "TR_01");

    // 3. Ghi nhận tìm kiếm thứ 2
    await recordSearchHistory({
        userId: TEST_USER_ID,
        fromStopId: "TR_01",
        toStopId: "TR_20",
        fromStopName: "Bến Thành",
        toStopName: "ĐH Quốc Gia",
        criteria: "fastest"
    });

    // 4. Lấy danh sách lịch sử
    const historyRes = await getSearchHistory(TEST_USER_ID, { limit: 10, page: 1 });
    assert.strictEqual(historyRes.data.length, 2);
    assert.strictEqual(historyRes.pagination.total, 2);

    // 5. Bảo vệ IDOR: Người dùng OTHER không thể xóa lịch sử của TEST_USER_ID
    const deleteIdor = await deleteSearchHistoryItem(OTHER_USER_ID, search1.id || search1._key);
    assert.strictEqual(deleteIdor, false, "Chặn IDOR: Không được xóa lịch sử của người khác");

    // 6. Xóa chính chủ thành công
    const deleteOwn = await deleteSearchHistoryItem(TEST_USER_ID, search1.id || search1._key);
    assert.strictEqual(deleteOwn, true);

    const historyAfterDel = await getSearchHistory(TEST_USER_ID);
    assert.strictEqual(historyAfterDel.data.length, 1);

    // 7. Xóa toàn bộ
    const clearedCount = await clearAllSearchHistory(TEST_USER_ID);
    assert.strictEqual(clearedCount, 1);

    const historyEmpty = await getSearchHistory(TEST_USER_ID);
    assert.strictEqual(historyEmpty.data.length, 0);
});

test("Cổng Hành khách: Đồng bộ lịch sử từ LocalStorage của Guest vào tài khoản", async () => {
    await clearAllSearchHistory(TEST_USER_ID);

    const guestList = [
        { fromStopId: "TR_01", toStopId: "TR_03", fromStopName: "Bến Thành", toStopName: "Hàm Nghi" },
        { fromStopId: "TR_02", toStopId: "TR_04", fromStopName: "Chợ Cũ", toStopName: "Huỳnh Thúc Kháng" }
    ];

    const syncResult = await syncGuestHistory(TEST_USER_ID, guestList);
    assert.strictEqual(syncResult.syncedCount, 2);

    // Đồng bộ lại lần 2 không được duplicate
    const syncResult2 = await syncGuestHistory(TEST_USER_ID, guestList);
    assert.strictEqual(syncResult2.syncedCount, 0, "Không ghi trùng lặp lịch sử đã có");

    // Cleanup
    await clearAllSearchHistory(TEST_USER_ID);
});

test("Cổng Hành khách: Quản lý Địa điểm đã lưu (Nhà, Công ty, Trường) & Chống IDOR", async () => {
    // 1. Thêm địa điểm Nhà
    const homePlace = await addSavedPlace(TEST_USER_ID, {
        type: "home",
        name: "Nhà riêng",
        address: "123 Lê Lợi, Quận 1",
        latitude: 10.7715,
        longitude: 106.6985
    });
    assert.ok(homePlace.id || homePlace._key);
    assert.strictEqual(homePlace.type, "home");
    assert.ok(homePlace.location);

    // 2. Thêm địa điểm Nơi làm việc
    const workPlace = await addSavedPlace(TEST_USER_ID, {
        type: "work",
        name: "Văn phòng BusRoute",
        address: "Tòa nhà Bitexco, Quận 1",
        latitude: 10.7717,
        longitude: 106.7042
    });

    // 3. Lấy danh sách địa điểm đã lưu
    const places = await getSavedPlaces(TEST_USER_ID);
    assert.strictEqual(places.length, 2);

    // 4. Chặn IDOR: Người khác không sửa được
    const idorUpdate = await updateSavedPlace(OTHER_USER_ID, homePlace.id || homePlace._key, { name: "Hack Name" });
    assert.strictEqual(idorUpdate, null);

    // 5. Cập nhật chính chủ
    const updated = await updateSavedPlace(TEST_USER_ID, homePlace.id || homePlace._key, { name: "Nhà riêng Q1" });
    assert.strictEqual(updated.name, "Nhà riêng Q1");

    // 6. Xóa địa điểm
    const deletedHome = await deleteSavedPlace(TEST_USER_ID, homePlace.id || homePlace._key);
    assert.strictEqual(deletedHome, true);
    await deleteSavedPlace(TEST_USER_ID, workPlace.id || workPlace._key);
});

test("Cổng Hành khách: Quản lý Tuyến xe yêu thích và kiểm tra ràng buộc duy nhất", async () => {
    // 1. Thêm tuyến 01
    const fav1 = await addFavoriteRoute(TEST_USER_ID, {
        routeId: "TX_01",
        routeCode: "01",
        routeName: "Bến Thành - BX Chợ Lớn"
    });
    assert.strictEqual(fav1.success, true);

    // 2. Thêm lại tuyến 01 (Không crash, xử lý trùng an toàn)
    const favDup = await addFavoriteRoute(TEST_USER_ID, {
        routeId: "TX_01",
        routeCode: "01"
    });
    assert.strictEqual(favDup.success, true);

    // 3. Lấy danh sách tuyến yêu thích
    const list = await getFavoriteRoutes(TEST_USER_ID);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].routeCode, "01");

    // 4. Bỏ yêu thích
    const removed = await removeFavoriteRoute(TEST_USER_ID, "TX_01");
    assert.strictEqual(removed, true);

    const emptyList = await getFavoriteRoutes(TEST_USER_ID);
    assert.strictEqual(emptyList.length, 0);
});

test("Cổng Hành khách: Hệ thống Đề xuất lộ trình thông minh (Recommendations) dựa trên dữ liệu thật", async () => {
    await clearAllSearchHistory(TEST_USER_ID);

    // Khi người dùng mới chưa có dữ liệu
    const initialRecs = await getPersonalizedRecommendations(TEST_USER_ID);
    assert.strictEqual(initialRecs.basedOn, "empty_new_user");
    assert.strictEqual(initialRecs.recommendations.length, 0);

    // Tạo lịch sử tìm kiếm 3 lần cho cặp Bến Thành -> BX Chợ Lớn
    for (let i = 0; i < 3; i++) {
        await recordSearchHistory({
            userId: TEST_USER_ID,
            fromStopId: "TR_01",
            toStopId: "TR_08",
            fromStopName: "Bến Thành",
            toStopName: "BX Chợ Lớn",
            criteria: "least_transfers"
        });
    }

    // Đề xuất bây giờ phải gợi ý cặp trạm tìm nhiều nhất
    const recsWithHistory = await getPersonalizedRecommendations(TEST_USER_ID);
    assert.strictEqual(recsWithHistory.hasData, true);
    assert.strictEqual(recsWithHistory.basedOn, "actual_history_and_places");
    assert.ok(recsWithHistory.recommendations.length > 0);
    assert.strictEqual(recsWithHistory.recommendations[0].fromStopId, "TR_01");
    assert.strictEqual(recsWithHistory.recommendations[0].toStopId, "TR_08");
    assert.strictEqual(recsWithHistory.recommendations[0].searchCount, 3);

    // Dọn dẹp
    await clearAllSearchHistory(TEST_USER_ID);
});

test.after(async () => {
    try {
        await client.close();
    } catch (_) {}
});
