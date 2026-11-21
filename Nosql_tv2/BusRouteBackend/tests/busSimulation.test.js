const test = require("node:test");
const assert = require("node:assert");
const {
    buildTopology,
    calculateActiveVehicles,
    calculateStopArrivals,
    calculateRouteWaitTime,
} = require("../src/services/busSimulationService");

// Dữ liệu mẫu chuẩn phục vụ unit test độc lập với database
const mockStops = [
    { ma_tram: "TR_01", ten_tram: "Trạm Bến Thành", vi_do: 10.770, kinh_do: 106.690 },
    { ma_tram: "TR_02", ten_tram: "Trạm Cao Thắng", vi_do: 10.772, kinh_do: 106.700 },
    { ma_tram: "TR_03", ten_tram: "Trạm Mê Linh", vi_do: 10.775, kinh_do: 106.705 },
    { ma_tram: "TR_04", ten_tram: "Trạm Chợ Lớn", vi_do: 10.750, kinh_do: 106.650 },
];

const mockRoutes = [
    {
        ma_tuyen: "01",
        ten_tuyen: "Bến Thành - Chợ Lớn",
        mau_sac: "#2563eb",
        thoi_gian_hoat_dong: { bat_dau: "06:00", ket_thuc: "20:00" }, // 360 -> 1200
        frequency: "15 phút/chuyến",
    },
];

const mockCoTrams = [
    // Lượt đi: TR_01 -> TR_02 -> TR_03 -> TR_04
    { ma_tuyen: "01", ma_chieu: "luot_di", _to: "TR_01", thu_tu: 1 },
    { ma_tuyen: "01", ma_chieu: "luot_di", _to: "TR_02", thu_tu: 2 },
    { ma_tuyen: "01", ma_chieu: "luot_di", _to: "TR_03", thu_tu: 3 },
    { ma_tuyen: "01", ma_chieu: "luot_di", _to: "TR_04", thu_tu: 4 },

    // Lượt về: TR_04 -> TR_03 -> TR_02 -> TR_01
    { ma_tuyen: "01", ma_chieu: "luot_ve", _to: "TR_04", thu_tu: 1 },
    { ma_tuyen: "01", ma_chieu: "luot_ve", _to: "TR_03", thu_tu: 2 },
    { ma_tuyen: "01", ma_chieu: "luot_ve", _to: "TR_02", thu_tu: 3 },
    { ma_tuyen: "01", ma_chieu: "luot_ve", _to: "TR_01", thu_tu: 4 },
];

const mockKeTieps = [
    // Lượt đi: 3 cạnh (5m, 10m, 15m) -> Tổng 30 phút
    { ma_tuyen: "01", ma_chieu: "luot_di", _from: "TR_01", _to: "TR_02", thu_tu: 1, thoi_gian_di_chuyen_phut: 5, khoang_cach_km: 1.0 },
    { ma_tuyen: "01", ma_chieu: "luot_di", _from: "TR_02", _to: "TR_03", thu_tu: 2, thoi_gian_di_chuyen_phut: 10, khoang_cach_km: 2.0 },
    { ma_tuyen: "01", ma_chieu: "luot_di", _from: "TR_03", _to: "TR_04", thu_tu: 3, thoi_gian_di_chuyen_phut: 15, khoang_cach_km: 3.0 },

    // Lượt về: 3 cạnh (15m, 10m, 5m) -> Tổng 30 phút
    { ma_tuyen: "01", ma_chieu: "luot_ve", _from: "TR_04", _to: "TR_03", thu_tu: 1, thoi_gian_di_chuyen_phut: 15, khoang_cach_km: 3.0 },
    { ma_tuyen: "01", ma_chieu: "luot_ve", _from: "TR_03", _to: "TR_02", thu_tu: 2, thoi_gian_di_chuyen_phut: 10, khoang_cach_km: 2.0 },
    { ma_tuyen: "01", ma_chieu: "luot_ve", _from: "TR_02", _to: "TR_01", thu_tu: 3, thoi_gian_di_chuyen_phut: 5, khoang_cach_km: 1.0 },
];

const standardTopology = buildTopology(mockRoutes, mockStops, mockCoTrams, mockKeTieps);

// Helper tạo Date theo giờ Việt Nam (UTC+7)
function makeVNTime(hours, minutes, seconds = 0) {
    // 06:00 VN = 23:00 UTC hôm trước
    const utcHours = (hours - 7 + 24) % 24;
    const d = new Date(Date.UTC(2026, 10, 21, utcHours, minutes, seconds));
    return d;
}

test("Mô phỏng xe buýt: 1. Xe vừa xuất bến (elapsed = 0, progress = 0, vị trí ở trạm xuất phát)", () => {
    // 06:00:00 sáng
    const t = makeVNTime(6, 0, 0);
    const res = calculateActiveVehicles(standardTopology, t, "01", "luot_di");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.vehicles.length, 1);

    const bus = res.vehicles[0];
    assert.strictEqual(bus.vehicleId, "SIM-01-D-001");
    assert.strictEqual(bus.progress, 0);
    assert.strictEqual(bus.status, "at_stop");
    assert.strictEqual(bus.currentStopId, "TR_01");
    assert.strictEqual(bus.nextStopId, "TR_02");
    assert.strictEqual(bus.latitude, 10.770);
    assert.strictEqual(bus.longitude, 106.690);
    assert.strictEqual(bus.etaToNextStop, 5);
});

test("Mô phỏng xe buýt: 2. Xe đang ở giữa hai trạm (0 < progress < 1, tọa độ nội suy chính xác)", () => {
    // 06:02:30 sáng (2.5 phút sau xuất bến, cạnh 1 có duration = 5 phút -> progress = 0.5)
    const t = makeVNTime(6, 2, 30);
    const res = calculateActiveVehicles(standardTopology, t, "01", "luot_di");
    assert.strictEqual(res.vehicles.length, 1);

    const bus = res.vehicles[0];
    assert.strictEqual(bus.progress, 0.5);
    assert.strictEqual(bus.status, "running");
    assert.strictEqual(bus.currentStopId, null);
    assert.strictEqual(bus.nextStopId, "TR_02");
    // Tọa độ giữa TR_01(10.770, 106.690) và TR_02(10.772, 106.700) -> 10.771, 106.695
    assert.strictEqual(bus.latitude, 10.771);
    assert.strictEqual(bus.longitude, 106.695);
    assert.strictEqual(bus.etaToNextStop, 2.5);
});

test("Mô phỏng xe buýt: 3. Xe vừa tới trạm (progress = 1 hoặc vừa chuyển sang trạm kế tiếp)", () => {
    // 06:05:00 sáng (đúng 5 phút, xe vừa tới TR_02 và bắt đầu chặng TR_02 -> TR_03)
    const t = makeVNTime(6, 5, 0);
    const res = calculateActiveVehicles(standardTopology, t, "01", "luot_di");
    assert.strictEqual(res.vehicles.length, 1);

    const bus = res.vehicles[0];
    assert.strictEqual(bus.edgeIndex, 1);
    assert.strictEqual(bus.nextStopId, "TR_03");
    assert.strictEqual(bus.currentStopId, "TR_02");
    assert.strictEqual(bus.status, "at_stop");
    assert.strictEqual(bus.latitude, 10.772);
    assert.strictEqual(bus.longitude, 106.700);
});

test("Mô phỏng xe buýt: 4. Xe đang ở chặng cuối (cạnh cuối cùng của lộ trình)", () => {
    // Tổng hành trình 30 phút. Chặng 3 bắt đầu từ phút 15 (TR_03 -> TR_04).
    // Lúc 06:20 (elapsed = 20 phút), xe đang trên chặng 3
    const t = makeVNTime(6, 20, 0);
    const res = calculateActiveVehicles(standardTopology, t, "01", "luot_di");
    // Lúc 06:20, chuyến 1 (06:00) ở chặng 3 (elapsed=20), chuyến 2 (06:15) ở chặng 1 (elapsed=5)
    const bus1 = res.vehicles.find((v) => v.vehicleId === "SIM-01-D-001");
    assert.ok(bus1);
    assert.strictEqual(bus1.edgeIndex, 2);
    assert.strictEqual(bus1.nextStopId, "TR_04");
    assert.strictEqual(bus1.elapsedMinutes, 20);
});

test("Mô phỏng xe buýt: 5. Xe đã hoàn thành chuyến (elapsed >= totalTripDuration, không còn trên đường)", () => {
    // Lúc 06:31, chuyến 1 (06:00, tổng 30p) đã hoàn thành lúc 06:30.
    // Chuyến 2 (06:15, tổng 30p) vẫn còn trên đường (elapsed 16).
    const t = makeVNTime(6, 31, 0);
    const res = calculateActiveVehicles(standardTopology, t, "01", "luot_di");
    const bus1 = res.vehicles.find((v) => v.vehicleId === "SIM-01-D-001");
    assert.strictEqual(bus1, undefined, "Chuyến 1 đã kết thúc và không còn trong danh sách xe đang chạy");
    const bus2 = res.vehicles.find((v) => v.vehicleId === "SIM-01-D-002");
    assert.ok(bus2, "Chuyến 2 vẫn đang chạy");
});

test("Mô phỏng xe buýt: 6. Ngoài giờ hoạt động (trước giờ mở bến hoặc sau giờ đóng bến)", () => {
    // Giờ hoạt động 06:00 - 20:00. Thử lúc 04:30 sáng và 22:00 tối
    const early = makeVNTime(4, 30, 0);
    const late = makeVNTime(22, 0, 0);

    const resEarly = calculateActiveVehicles(standardTopology, early, "01", "luot_di");
    const resLate = calculateActiveVehicles(standardTopology, late, "01", "luot_di");

    assert.strictEqual(resEarly.vehicles.length, 0);
    assert.strictEqual(resLate.vehicles.length, 0);
});

test("Mô phỏng xe buýt: 7. Tìm ETA tại trạm nằm phía trước xe (ETA > 0, stopsAway > 0)", () => {
    // Lúc 06:02, xe chuyến 1 đang ở giữa TR_01 và TR_02 (elapsed = 2)
    // Trạm TR_03 cách TR_01 là 5 + 10 = 15 phút. ETA đến TR_03 phải là 15 - 2 = 13 phút
    const t = makeVNTime(6, 2, 0);
    const arr = calculateStopArrivals(standardTopology, "TR_03", t);

    assert.strictEqual(arr.success, true);
    assert.ok(arr.arrivals.length > 0);
    const firstBus = arr.arrivals[0];
    assert.strictEqual(firstBus.vehicleId, "SIM-01-D-001");
    assert.strictEqual(firstBus.etaMinutes, 13);
    assert.strictEqual(firstBus.stopsAway, 2);
});

test("Mô phỏng xe buýt: 8. Trạm nằm phía sau xe không được tính thành xe sắp tới trong cùng chiều chuyến", () => {
    // Lúc 06:10, chuyến 1 đã tới TR_02 (5m) và đang đi TR_02 -> TR_03 (elapsed = 10)
    // Trạm TR_01 nằm phía sau chuyến 1. Trạm TR_01 chỉ nhận chuyến 2 (xuất bến 06:15)
    const t = makeVNTime(6, 10, 0);
    const arr = calculateStopArrivals(standardTopology, "TR_01", t);

    const hasBus1 = arr.arrivals.some((a) => a.vehicleId === "SIM-01-D-001");
    assert.strictEqual(hasBus1, false, "Chuyến 1 đã đi qua TR_01 nên không được tính là xe sắp tới");

    const nextBus = arr.arrivals[0];
    assert.strictEqual(nextBus.vehicleId, "SIM-01-D-002");
    assert.strictEqual(nextBus.etaMinutes, 5); // Chuyến 2 xuất bến lúc 06:15, tức 5 phút nữa
});

test("Mô phỏng xe buýt: 9. Lượt đi và lượt về hoạt động độc lập và chính xác", () => {
    // Lúc 06:05 sáng:
    // Lượt đi: Xe chuyến 1 đang ở TR_02
    // Lượt về: Xe chuyến 1 xuất bến từ TR_04 lúc 06:00, cạnh 1 duration 15p, lúc 06:05 đang trên chặng TR_04 -> TR_03
    const t = makeVNTime(6, 5, 0);
    const resDi = calculateActiveVehicles(standardTopology, t, "01", "luot_di");
    const resVe = calculateActiveVehicles(standardTopology, t, "01", "luot_ve");

    assert.strictEqual(resDi.vehicles[0].vehicleId, "SIM-01-D-001");
    assert.strictEqual(resDi.vehicles[0].direction, "luot_di");
    assert.strictEqual(resDi.vehicles[0].nextStopId, "TR_03");

    assert.strictEqual(resVe.vehicles[0].vehicleId, "SIM-01-V-001");
    assert.strictEqual(resVe.vehicles[0].direction, "luot_ve");
    assert.strictEqual(resVe.vehicles[0].nextStopId, "TR_03");
});

test("Mô phỏng xe buýt: 10. Hai người dùng gọi API ở cùng thời điểm nhận trạng thái nhất quán 100%", () => {
    const t = makeVNTime(8, 25, 45);
    const user1 = calculateActiveVehicles(standardTopology, t);
    const user2 = calculateActiveVehicles(standardTopology, t);

    assert.deepStrictEqual(user1, user2, "Dữ liệu trả về cho 2 người dùng tại cùng thời điểm phải hoàn toàn giống nhau");
});

test("Mô phỏng xe buýt: 11. Tuyến thiếu tọa độ trạm được xử lý an toàn không gây crash", () => {
    const corruptStops = [
        { ma_tram: "TR_A", ten_tram: "Trạm A", vi_do: null, kinh_do: null }, // Thiếu tọa độ
        { ma_tram: "TR_B", ten_tram: "Trạm B", vi_do: 10.77, kinh_do: 106.69 },
    ];
    const corruptCoTrams = [
        { ma_tuyen: "99", ma_chieu: "luot_di", _to: "TR_A", thu_tu: 1 },
        { ma_tuyen: "99", ma_chieu: "luot_di", _to: "TR_B", thu_tu: 2 },
    ];
    const corruptKeTieps = [
        { ma_tuyen: "99", ma_chieu: "luot_di", _from: "TR_A", _to: "TR_B", thu_tu: 1, thoi_gian_di_chuyen_phut: 5 },
    ];
    const corruptRoutes = [
        { ma_tuyen: "99", ten_tuyen: "Tuyến lỗi tọa độ", thoi_gian_hoat_dong: { bat_dau: "05:00", ket_thuc: "20:00" } },
    ];

    const corruptTopology = buildTopology(corruptRoutes, corruptStops, corruptCoTrams, corruptKeTieps);
    const t = makeVNTime(7, 0, 0);

    // Phải không throw lỗi và bỏ qua marker xe không đủ tọa độ
    assert.doesNotThrow(() => {
        const res = calculateActiveVehicles(corruptTopology, t, "99");
        assert.strictEqual(res.vehicles.length, 0);
    });
});

test("Mô phỏng xe buýt: 12. Tuyến thiếu thời gian cạnh sử dụng fallback an toàn", () => {
    const corruptKeTieps = [
        { ma_tuyen: "01", ma_chieu: "luot_di", _from: "TR_01", _to: "TR_02", thu_tu: 1, thoi_gian_di_chuyen_phut: null },
        { ma_tuyen: "01", ma_chieu: "luot_di", _from: "TR_02", _to: "TR_03", thu_tu: 2 },
    ];
    const topo = buildTopology(mockRoutes, mockStops, mockCoTrams, corruptKeTieps);
    const t = makeVNTime(6, 1, 0);

    assert.doesNotThrow(() => {
        const res = calculateActiveVehicles(topo, t, "01", "luot_di");
        assert.ok(res.success);
    });
});

test("Mô phỏng xe buýt: 13. Không có xe phù hợp tại trạm trả về danh sách rỗng và trạng thái rõ ràng", () => {
    // Kiểm tra lúc nửa đêm 01:00 sáng
    const nightTime = makeVNTime(1, 0, 0);
    const arr = calculateStopArrivals(standardTopology, "TR_01", nightTime);

    assert.strictEqual(arr.success, true);
    assert.strictEqual(arr.arrivals.length, 0);
    assert.strictEqual(arr.status, "outside_service_hours");
});

test("Mô phỏng xe buýt: 14. Route Planner nhận được thông tin thời gian chờ xe từ simulation service", () => {
    // Tuyến 01, lượt đi, đón tại TR_02 lúc 06:02
    const t = makeVNTime(6, 2, 0);
    const waitInfo = calculateRouteWaitTime(standardTopology, "01", "luot_di", "TR_02", t);

    assert.ok(waitInfo !== null);
    assert.strictEqual(waitInfo.routeCode, "01");
    assert.strictEqual(waitInfo.direction, "luot_di");
    assert.strictEqual(waitInfo.stopId, "TR_02");
    // TR_02 cách điểm xuất phát 5 phút. Xe xuất bến lúc 06:00 đến lúc 06:05.
    // Tại 06:02, thời gian chờ là 06:05 - 06:02 = 3 phút
    assert.strictEqual(waitInfo.etaMinutes, 3);
    assert.strictEqual(waitInfo.stopsAway, 1);
});
