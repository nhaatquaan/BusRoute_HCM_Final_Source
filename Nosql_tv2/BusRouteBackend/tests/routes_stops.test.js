const test = require("node:test");
const assert = require("node:assert");
const { formatStopResponse } = require("../src/controllers/stopController");

test("Dữ liệu Trạm dừng: Chuẩn hóa đầy đủ các trường tương thích đa định dạng", () => {
    const rawStop = {
        _id: "TramDung/TR_01",
        _key: "TR_01",
        ma_tram: "TR_01",
        ten_tram: "Trạm Trung chuyển Bến Thành",
        dia_chi: "Đường Hàm Nghi, Phường Bến Nghé, Quận 1",
        vi_do: 10.7709,
        kinh_do: 106.7009,
        trang_thai: "active"
    };

    const formatted = formatStopResponse(rawStop);

    assert.strictEqual(formatted.id, "TR_01");
    assert.strictEqual(formatted.maTram, "TR_01");
    assert.strictEqual(formatted.tenTram, "Trạm Trung chuyển Bến Thành");
    assert.strictEqual(formatted.district, "Quận 1");
    assert.strictEqual(formatted.latitude, 10.7709);
    assert.strictEqual(formatted.longitude, 106.7009);
    assert.strictEqual(formatted.lat, 10.7709);
    assert.strictEqual(formatted.lng, 106.7009);
});

test("Kiểm tra Tọa độ GPS: Xác định tọa độ trong khu vực TP.HCM hợp lệ", () => {
    const isValidHCMCoordinates = (lat, lng) => {
        return (
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            lat >= 10.0 &&
            lat <= 11.5 &&
            lng >= 106.0 &&
            lng <= 107.5
        );
    };

    // Bến Thành
    assert.strictEqual(isValidHCMCoordinates(10.7709, 106.7009), true);
    // Suối Tiên
    assert.strictEqual(isValidHCMCoordinates(10.8662, 106.8031), true);
    // Tọa độ ngoài trái đất / lỗi
    assert.strictEqual(isValidHCMCoordinates(999, 106.7), false);
    assert.strictEqual(isValidHCMCoordinates(10.7, -999), false);
});
