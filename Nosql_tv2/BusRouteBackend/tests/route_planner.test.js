const test = require("node:test");
const assert = require("node:assert");

test("Route Planner: Thuật toán phân đoạn hành trình và tính số lần chuyển tuyến", () => {
    // Giả lập 1 đường đi gồm 3 cạnh: 2 cạnh đầu tuyến 01, cạnh thứ 3 tuyến 08
    const mockEdges = [
        { _from: "TramDung/TR_01", _to: "TramDung/TR_02", maTuyen: "01", khoangCach: 1200, thoiGian: 4 },
        { _from: "TramDung/TR_02", _to: "TramDung/TR_03", maTuyen: "01", khoangCach: 1500, thoiGian: 5 },
        { _from: "TramDung/TR_03", _to: "TramDung/TR_09", maTuyen: "08", khoangCach: 2100, thoiGian: 7 }
    ];

    let transfers = 0;
    const segments = [];
    let currentSegment = null;

    mockEdges.forEach((edge) => {
        if (!currentSegment || currentSegment.routeCode !== edge.maTuyen) {
            if (currentSegment) {
                transfers += 1;
                segments.push(currentSegment);
            }
            currentSegment = {
                routeCode: edge.maTuyen,
                distance: edge.khoangCach,
                duration: edge.thoiGian,
                stopsCount: 1
            };
        } else {
            currentSegment.distance += edge.khoangCach;
            currentSegment.duration += edge.thoiGian;
            currentSegment.stopsCount += 1;
        }
    });
    if (currentSegment) segments.push(currentSegment);

    assert.strictEqual(transfers, 1, "Chuyển từ tuyến 01 sang tuyến 08 tính là 1 lần chuyển tuyến");
    assert.strictEqual(segments.length, 2, "Hành trình phải chia thành 2 chặng xe");
    assert.strictEqual(segments[0].routeCode, "01");
    assert.strictEqual(segments[0].stopsCount, 2);
    assert.strictEqual(segments[1].routeCode, "08");
    assert.strictEqual(segments[1].stopsCount, 1);
});

test("Route Planner: Ưu tiên xếp hạng phương án theo số lần chuyển tuyến và thời gian", () => {
    const candidates = [
        { pathIndex: 1, transfers: 2, totalStops: 8, totalDuration: 25 },
        { pathIndex: 2, transfers: 0, totalStops: 12, totalDuration: 35 },
        { pathIndex: 3, transfers: 1, totalStops: 7, totalDuration: 20 }
    ];

    candidates.sort((a, b) => {
        if (a.transfers !== b.transfers) return a.transfers - b.transfers;
        if (a.totalStops !== b.totalStops) return a.totalStops - b.totalStops;
        return a.totalDuration - b.totalDuration;
    });

    assert.strictEqual(candidates[0].transfers, 0, "Phương án đi thẳng (0 chuyển tuyến) luôn xếp đầu tiên");
    assert.strictEqual(candidates[1].transfers, 1, "Phương án 1 chuyển tuyến xếp thứ nhì");
    assert.strictEqual(candidates[2].transfers, 2, "Phương án 2 chuyển tuyến xếp cuối");
});
