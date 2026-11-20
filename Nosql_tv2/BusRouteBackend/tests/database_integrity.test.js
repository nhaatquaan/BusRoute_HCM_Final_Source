const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const DATA_JSON_DIR = path.resolve(__dirname, "../../../Nosql_tv1_Database/data/json");

test("Dữ liệu MongoDB Chuẩn: Kiểm tra số lượng và tính toàn vẹn 5 bộ dữ liệu JSON", () => {
    const tuyenXe = JSON.parse(fs.readFileSync(path.join(DATA_JSON_DIR, "TuyenXe.json"), "utf8"));
    const tramDung = JSON.parse(fs.readFileSync(path.join(DATA_JSON_DIR, "TramDung.json"), "utf8"));
    const nguoiDung = JSON.parse(fs.readFileSync(path.join(DATA_JSON_DIR, "NguoiDung.json"), "utf8"));
    const coTram = JSON.parse(fs.readFileSync(path.join(DATA_JSON_DIR, "CO_TRAM.json"), "utf8"));
    const keTiep = JSON.parse(fs.readFileSync(path.join(DATA_JSON_DIR, "KE_TIEP.json"), "utf8"));

    assert.strictEqual(tuyenXe.length, 6, "Phải có đúng 6 tuyến xe mẫu");
    assert.strictEqual(tramDung.length, 25, "Phải có đúng 25 trạm dừng");
    assert.strictEqual(nguoiDung.length, 3, "Phải có đúng 3 tài khoản người dùng");
    assert.strictEqual(coTram.length, 92, "Phải có đúng 92 quan hệ CO_TRAM");
    assert.strictEqual(keTiep.length, 80, "Phải có đúng 80 quan hệ KE_TIEP");
});

test("Đồ thị: Đảm bảo 100% quan hệ CO_TRAM tham chiếu đến Đỉnh Vertex hợp lệ", () => {
    const tuyenXe = JSON.parse(fs.readFileSync(path.join(DATA_JSON_DIR, "TuyenXe.json"), "utf8"));
    const tramDung = JSON.parse(fs.readFileSync(path.join(DATA_JSON_DIR, "TramDung.json"), "utf8"));
    const coTram = JSON.parse(fs.readFileSync(path.join(DATA_JSON_DIR, "CO_TRAM.json"), "utf8"));

    const routeIds = new Set(tuyenXe.map((r) => r._id));
    const stopIds = new Set(tramDung.map((s) => s._id));

    let invalidEdges = 0;
    coTram.forEach((edge) => {
        if (!routeIds.has(edge._from) || !stopIds.has(edge._to)) {
            invalidEdges++;
        }
    });

    assert.strictEqual(invalidEdges, 0, "Không được có bất kỳ cạnh CO_TRAM nào tham chiếu đỉnh mồ côi");
});

test("Đồ thị: Đảm bảo 100% quan hệ KE_TIEP kết nối giữa 2 trạm hợp lệ", () => {
    const tramDung = JSON.parse(fs.readFileSync(path.join(DATA_JSON_DIR, "TramDung.json"), "utf8"));
    const keTiep = JSON.parse(fs.readFileSync(path.join(DATA_JSON_DIR, "KE_TIEP.json"), "utf8"));

    const stopIds = new Set(tramDung.map((s) => s._id));

    let invalidEdges = 0;
    keTiep.forEach((edge) => {
        if (!stopIds.has(edge._from) || !stopIds.has(edge._to)) {
            invalidEdges++;
        }
    });

    assert.strictEqual(invalidEdges, 0, "Không được có bất kỳ cạnh KE_TIEP nào nối trạm không tồn tại");
});
