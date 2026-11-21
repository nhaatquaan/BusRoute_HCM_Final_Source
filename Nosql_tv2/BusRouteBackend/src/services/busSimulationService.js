const { db } = require("../config/database");

const SIMULATION_TIMEZONE = "Asia/Ho_Chi_Minh";
const DEFAULT_HEADWAY_MIN = 12;
const DEFAULT_EDGE_DURATION_MIN = 3;

let cachedTopology = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60000; // 60 seconds TTL

/**
 * Lấy số phút trôi qua từ 00:00 tính theo múi giờ Asia/Ho_Chi_Minh (UTC+7)
 */
function getVietnamMinutes(dateInput = new Date()) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const validDate = isNaN(d.getTime()) ? new Date() : d;

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: SIMULATION_TIMEZONE,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    const parts = formatter.formatToParts(validDate);
    const map = {};
    for (const p of parts) {
        if (p.type !== "literal") map[p.type] = p.value;
    }

    const h = parseInt(map.hour, 10);
    const m = parseInt(map.minute, 10);
    const s = parseInt(map.second, 10);

    return {
        minutesFromMidnight: h * 60 + m + s / 60,
        hour: h,
        minute: m,
        second: s,
        isoString: validDate.toISOString(),
    };
}

/**
 * Chuyển đổi định dạng "HH:mm" thành số phút từ 00:00
 */
function parseTimeToMinutes(str, defaultMin = 300) {
    if (!str || typeof str !== "string") return defaultMin;
    const match = str.match(/(\d{1,2}):(\d{2})/);
    if (!match) return defaultMin;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/**
 * Trích xuất tần suất trung bình (headway tính bằng phút)
 */
function parseHeadway(str, defaultHeadway = DEFAULT_HEADWAY_MIN) {
    if (!str) return defaultHeadway;
    const nums = String(str).match(/\d+/g);
    if (!nums || nums.length === 0) return defaultHeadway;
    if (nums.length === 1) return Math.max(5, parseInt(nums[0], 10));
    const firstTwo = nums.slice(0, 2).map((n) => parseInt(n, 10));
    return Math.max(5, Math.round((firstTwo[0] + firstTwo[1]) / 2));
}

/**
 * Chuẩn hóa mã trạm
 */
function cleanStopKey(id) {
    if (!id) return "";
    const s = String(id).trim();
    return s.includes("/") ? s.split("/")[1] : s;
}

/**
 * Chuẩn hóa chiều tuyến
 */
function normalizeDirection(dir) {
    if (!dir) return "luot_di";
    const d = String(dir).toLowerCase().trim();
    if (d === "di" || d === "luot_di" || d === "forward") return "luot_di";
    if (d === "ve" || d === "luot_ve" || d === "backward" || d === "return") return "luot_ve";
    return d;
}

/**
 * Xây dựng cấu trúc topology mạng lưới phục vụ mô phỏng
 */
function buildTopology(routes = [], stops = [], coTrams = [], keTieps = []) {
    const stopMap = new Map();

    for (const s of stops) {
        const lat = Number(s.vi_do ?? s.latitude ?? s.lat);
        const lng = Number(s.kinh_do ?? s.longitude ?? s.lng);
        const stopId = cleanStopKey(s.ma_tram || s._key || s.id);
        const fullId = s._id || `TramDung/${stopId}`;

        const stopData = {
            id: stopId,
            _id: fullId,
            name: s.ten_tram || s.name || stopId,
            address: s.dia_chi || s.address || "",
            latitude: lat,
            longitude: lng,
            isValidCoords: !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0,
        };

        if (stopId) stopMap.set(stopId, stopData);
        if (fullId) stopMap.set(fullId, stopData);
        if (s._key) stopMap.set(s._key, stopData);
    }

    const routeList = [];

    for (const r of routes) {
        const routeCode = String(r.ma_tuyen || r.code || r._key || "").replace(/^TX_/, "");
        const routeId = r._id || `TuyenXe/${r._key || routeCode}`;
        const routeKey = r._key || routeCode;
        const routeName = r.ten_tuyen || r.name || `Tuyến số ${routeCode}`;
        const routeColor = r.mau_sac || r.color || "#2563eb";

        const startMin = parseTimeToMinutes(r.thoi_gian_hoat_dong?.bat_dau, 300); // Mặc định 05:00
        const endMin = parseTimeToMinutes(r.thoi_gian_hoat_dong?.ket_thuc, 1230); // Mặc định 20:30
        const headway = parseHeadway(r.frequency || r.gian_cach_chay_xe, DEFAULT_HEADWAY_MIN);

        const directions = {};

        for (const dir of ["luot_di", "luot_ve"]) {
            // Lấy danh sách trạm qua CO_TRAM
            const routeStops = coTrams
                .filter(
                    (ct) =>
                        (ct.ma_tuyen === routeCode ||
                            ct._from === routeId ||
                            cleanStopKey(ct._from) === routeKey ||
                            cleanStopKey(ct._from) === `TX_${routeCode}`) &&
                        normalizeDirection(ct.ma_chieu || ct.chieuDi) === dir
                )
                .sort((a, b) => (a.thu_tu || a.thuTu || 0) - (b.thu_tu || b.thuTu || 0));

            // Lấy danh sách cạnh qua KE_TIEP
            const routeEdges = keTieps
                .filter(
                    (kt) =>
                        (kt.ma_tuyen === routeCode || cleanStopKey(kt.ma_tuyen) === routeCode) &&
                        normalizeDirection(kt.ma_chieu || kt.chieuDi) === dir
                )
                .sort((a, b) => (a.thu_tu || a.thuTu || 0) - (b.thu_tu || b.thuTu || 0));

            if (routeStops.length < 2 && routeEdges.length < 1) {
                continue;
            }

            // Xây dựng danh sách trạm chuẩn
            const stopsInOrder = [];
            for (const item of routeStops) {
                const targetKey = cleanStopKey(item._to || item.ma_tram);
                const stopObj = stopMap.get(targetKey) || stopMap.get(item._to);
                if (stopObj) {
                    stopsInOrder.push(stopObj);
                }
            }

            // Nếu CO_TRAM không đủ nhưng KE_TIEP có, dựng lại chuỗi trạm từ KE_TIEP
            if (stopsInOrder.length < 2 && routeEdges.length > 0) {
                const firstFrom = cleanStopKey(routeEdges[0]._from);
                const s0 = stopMap.get(firstFrom) || stopMap.get(routeEdges[0]._from);
                if (s0) stopsInOrder.push(s0);
                for (const e of routeEdges) {
                    const toKey = cleanStopKey(e._to);
                    const st = stopMap.get(toKey) || stopMap.get(e._to);
                    if (st) stopsInOrder.push(st);
                }
            }

            // Xây dựng danh sách cạnh chuẩn kèm thời gian di chuyển
            const edgesInOrder = [];
            const cumTimes = [0];
            let accTime = 0;

            for (let i = 0; i < routeEdges.length; i++) {
                const e = routeEdges[i];
                const fromKey = cleanStopKey(e._from);
                const toKey = cleanStopKey(e._to);
                const fromStop = stopMap.get(fromKey) || stopMap.get(e._from);
                const toStop = stopMap.get(toKey) || stopMap.get(e._to);

                const dur = Number(e.thoi_gian_di_chuyen_phut ?? e.thoiGian ?? DEFAULT_EDGE_DURATION_MIN);
                const dist = Number(e.khoang_cach_km ?? (e.khoangCach ? e.khoangCach / 1000 : 1));

                accTime += Math.max(0.5, dur);
                cumTimes.push(accTime);

                edgesInOrder.push({
                    index: i,
                    fromStopId: fromStop?.id || fromKey,
                    toStopId: toStop?.id || toKey,
                    fromStop,
                    toStop,
                    durationMinutes: Math.max(0.5, dur),
                    distanceKm: Math.max(0.1, dist),
                });
            }

            const totalTripDuration = accTime > 0 ? accTime : (stopsInOrder.length - 1) * DEFAULT_EDGE_DURATION_MIN;

            directions[dir] = {
                direction: dir,
                directionLabel: dir === "luot_di" ? "Lượt đi" : "Lượt về",
                stops: stopsInOrder,
                edges: edgesInOrder,
                cumTimes,
                totalTripDuration,
                startMinutes: startMin,
                endMinutes: endMin,
                headwayMinutes: headway,
            };
        }

        routeList.push({
            routeCode,
            routeId,
            routeName,
            routeColor,
            startMinutes: startMin,
            endMinutes: endMin,
            headwayMinutes: headway,
            directions,
        });
    }

    return {
        stopMap,
        routes: routeList,
    };
}

/**
 * Tải topology từ MongoDB (có cache)
 */
async function getTopology() {
    const now = Date.now();
    if (cachedTopology && now - lastCacheTime < CACHE_TTL_MS) {
        return cachedTopology;
    }

    try {
        const [routes, stops, coTrams, keTieps] = await Promise.all([
            db.collection("TuyenXe").find({}).toArray(),
            db.collection("TramDung").find({}).toArray(),
            db.collection("CO_TRAM").find({}).toArray(),
            db.collection("KE_TIEP").find({}).toArray(),
        ]);

        cachedTopology = buildTopology(routes, stops, coTrams, keTieps);
        lastCacheTime = now;
        return cachedTopology;
    } catch (err) {
        console.warn("[busSimulationService] Lỗi nạp dữ liệu từ MongoDB:", err.message);
        if (cachedTopology) return cachedTopology;
        return { stopMap: new Map(), routes: [] };
    }
}

/**
 * Xóa cache thủ công
 */
function clearCache() {
    cachedTopology = null;
    lastCacheTime = 0;
}

/**
 * Tính toán danh sách xe đang vận hành tại một thời điểm
 */
function calculateActiveVehicles(topology, targetTime = new Date(), filterRouteId = null, filterDirection = null) {
    const timeInfo = getVietnamMinutes(targetTime);
    const nowMinutes = timeInfo.minutesFromMidnight;
    const generatedAt = timeInfo.isoString;

    const vehicles = [];
    const cleanRouteFilter = filterRouteId ? String(filterRouteId).trim().replace(/^TX_/, "") : null;
    const cleanDirFilter = filterDirection ? normalizeDirection(filterDirection) : null;

    for (const route of topology.routes) {
        if (cleanRouteFilter && route.routeCode !== cleanRouteFilter) {
            continue;
        }

        for (const [dirKey, dirData] of Object.entries(route.directions)) {
            if (cleanDirFilter && dirKey !== cleanDirFilter) {
                continue;
            }

            const {
                direction,
                directionLabel,
                stops,
                edges,
                cumTimes,
                totalTripDuration,
                startMinutes,
                endMinutes,
                headwayMinutes,
            } = dirData;

            if (edges.length === 0 || stops.length < 2 || totalTripDuration <= 0) {
                continue;
            }

            const dirCode = direction === "luot_di" ? "D" : "V";

            // Sinh các chuyến xuất bến theo chu kỳ
            for (let dep = startMinutes, k = 1; dep <= endMinutes; dep += headwayMinutes, k++) {
                const elapsed = nowMinutes - dep;

                // Xe đang di chuyển trên lộ trình
                if (elapsed >= 0 && elapsed < totalTripDuration) {
                    // Xác định cạnh hiện tại
                    let edgeIdx = 0;
                    for (let i = 0; i < edges.length; i++) {
                        if (elapsed >= cumTimes[i] && elapsed < cumTimes[i + 1]) {
                            edgeIdx = i;
                            break;
                        }
                    }

                    const edge = edges[edgeIdx];
                    const edgeStart = cumTimes[edgeIdx];
                    const edgeDuration = cumTimes[edgeIdx + 1] - edgeStart;
                    const edgeElapsed = elapsed - edgeStart;

                    const rawProgress = edgeDuration > 0 ? edgeElapsed / edgeDuration : 0;
                    const progress = Math.min(1, Math.max(0, rawProgress));

                    const fromStop = edge.fromStop;
                    const toStop = edge.toStop;

                    // Kiểm tra tính hợp lệ của tọa độ hai đầu trạm
                    if (!fromStop?.isValidCoords || !toStop?.isValidCoords) {
                        continue;
                    }

                    // Nội suy GPS
                    const lat = fromStop.latitude + progress * (toStop.latitude - fromStop.latitude);
                    const lng = fromStop.longitude + progress * (toStop.longitude - fromStop.longitude);

                    const etaToNextStop = Math.max(0, Math.round((1 - progress) * edgeDuration * 10) / 10);

                    // Trạng thái xe
                    let status = "running";
                    if (progress <= 0.05) {
                        status = "at_stop";
                    } else if (progress >= 0.85 || etaToNextStop <= 0.8) {
                        status = "approaching";
                    }

                    const vehicleId = `SIM-${route.routeCode}-${dirCode}-${String(k).padStart(3, "0")}`;

                    vehicles.push({
                        vehicleId,
                        routeCode: route.routeCode,
                        routeName: route.routeName,
                        routeColor: route.routeColor,
                        direction,
                        directionLabel,
                        latitude: Number(lat.toFixed(5)),
                        longitude: Number(lng.toFixed(5)),
                        currentStopId: progress <= 0.1 ? fromStop.id : null,
                        currentStopName: progress <= 0.1 ? fromStop.name : null,
                        nextStopId: toStop.id,
                        nextStopName: toStop.name,
                        progress: Number(progress.toFixed(2)),
                        etaToNextStop,
                        status,
                        departureMinutes: dep,
                        elapsedMinutes: Number(elapsed.toFixed(1)),
                        totalTripDuration: Math.round(totalTripDuration),
                        stopsTotal: stops.length,
                        edgeIndex: edgeIdx,
                    });
                }
            }
        }
    }

    return {
        success: true,
        mode: "simulation",
        disclaimer: "MÔ PHỎNG – DỮ LIỆU MINH HỌA",
        timezone: SIMULATION_TIMEZONE,
        generatedAt,
        vehiclesCount: vehicles.length,
        vehicles,
    };
}

/**
 * Tính các xe sắp tới một trạm dừng
 */
function calculateStopArrivals(topology, stopId, targetTime = new Date(), limit = 3) {
    const timeInfo = getVietnamMinutes(targetTime);
    const nowMinutes = timeInfo.minutesFromMidnight;
    const generatedAt = timeInfo.isoString;

    const cleanId = cleanStopKey(stopId);
    const stopObj = topology.stopMap.get(cleanId);

    if (!stopObj) {
        return {
            success: false,
            mode: "simulation",
            disclaimer: "MÔ PHỎNG – DỮ LIỆU MINH HỌA",
            timezone: SIMULATION_TIMEZONE,
            generatedAt,
            message: `Không tìm thấy trạm dừng với mã ${stopId}`,
            stop: null,
            arrivals: [],
        };
    }

    const upcomingArrivals = [];
    let isWithinAnyOperatingHours = false;

    for (const route of topology.routes) {
        for (const [dirKey, dirData] of Object.entries(route.directions)) {
            const {
                direction,
                directionLabel,
                stops,
                edges,
                cumTimes,
                totalTripDuration,
                startMinutes,
                endMinutes,
                headwayMinutes,
            } = dirData;

            // Kiểm tra xem trạm có nằm trên tuyến và chiều này không
            const stopIdx = stops.findIndex((s) => s.id === cleanId || s._id === stopObj._id);
            if (stopIdx < 0) {
                continue;
            }

            if (nowMinutes >= startMinutes - 30 && nowMinutes <= endMinutes + totalTripDuration) {
                isWithinAnyOperatingHours = true;
            }

            const timeToStopFromOrigin = cumTimes[stopIdx];
            const dirCode = direction === "luot_di" ? "D" : "V";

            // Duyệt từng chuyến xuất bến
            for (let dep = startMinutes, k = 1; dep <= endMinutes; dep += headwayMinutes, k++) {
                const arrivalTime = dep + timeToStopFromOrigin;
                const etaMinutes = arrivalTime - nowMinutes;

                // Chỉ lấy các chuyến sắp tới trong khoảng 0 đến 120 phút
                if (etaMinutes >= 0 && etaMinutes <= 120) {
                    const elapsed = nowMinutes - dep;
                    const vehicleId = `SIM-${route.routeCode}-${dirCode}-${String(k).padStart(3, "0")}`;

                    let status = "running";
                    let stopsAway = stopIdx;

                    if (elapsed < 0) {
                        status = "scheduled";
                        stopsAway = stopIdx;
                    } else if (elapsed > timeToStopFromOrigin) {
                        // Xe đã đi qua trạm này trong chuyến hiện tại, không đưa vào danh sách sắp tới
                        continue;
                    } else {
                        // Xác định vị trí xe hiện tại
                        let currentEdgeIdx = 0;
                        for (let i = 0; i < edges.length; i++) {
                            if (elapsed >= cumTimes[i] && elapsed < cumTimes[i + 1]) {
                                currentEdgeIdx = i;
                                break;
                            }
                        }

                        stopsAway = Math.max(0, stopIdx - currentEdgeIdx);
                        if (stopsAway === 0 || etaMinutes <= 0.5) {
                            status = "at_stop";
                        } else if (stopsAway === 1 && etaMinutes <= 2) {
                            status = "approaching";
                        }
                    }

                    upcomingArrivals.push({
                        vehicleId,
                        routeCode: route.routeCode,
                        routeName: route.routeName,
                        routeColor: route.routeColor,
                        direction,
                        directionLabel,
                        stopId: stopObj.id,
                        stopName: stopObj.name,
                        etaMinutes: Math.round(etaMinutes),
                        stopsAway,
                        status,
                        departureMinutes: dep,
                    });
                }
            }
        }
    }

    // Sắp xếp các xe theo thứ tự thời gian tới trạm gần nhất
    upcomingArrivals.sort((a, b) => a.etaMinutes - b.etaMinutes);

    const limitedArrivals = limit > 0 ? upcomingArrivals.slice(0, limit) : upcomingArrivals;

    return {
        success: true,
        mode: "simulation",
        disclaimer: "MÔ PHỎNG – THỜI GIAN ĐẾN ƯỚC TÍNH",
        timezone: SIMULATION_TIMEZONE,
        generatedAt,
        stop: {
            id: stopObj.id,
            name: stopObj.name,
            address: stopObj.address,
            latitude: stopObj.latitude,
            longitude: stopObj.longitude,
        },
        status:
            limitedArrivals.length > 0
                ? "active"
                : isWithinAnyOperatingHours
                ? "no_active_vehicle"
                : "outside_service_hours",
        arrivals: limitedArrivals,
    };
}

/**
 * Tra cứu thời gian chờ xe phục vụ Route Planner
 */
function calculateRouteWaitTime(topology, routeCode, direction, startStopId, targetTime = new Date()) {
    const cleanRoute = String(routeCode).trim().replace(/^TX_/, "");
    const cleanDir = normalizeDirection(direction);
    const cleanStop = cleanStopKey(startStopId);

    const arrivalsResult = calculateStopArrivals(topology, cleanStop, targetTime, 10);
    if (!arrivalsResult.success || arrivalsResult.arrivals.length === 0) {
        return null;
    }

    const match = arrivalsResult.arrivals.find(
        (a) => a.routeCode === cleanRoute && a.direction === cleanDir
    );

    return match || arrivalsResult.arrivals[0] || null;
}

// Public API
module.exports = {
    SIMULATION_TIMEZONE,
    buildTopology,
    getTopology,
    clearCache,
    calculateActiveVehicles,
    calculateStopArrivals,
    calculateRouteWaitTime,
    getVietnamMinutes,
    parseTimeToMinutes,
    parseHeadway,

    // High level async methods
    async getSimulationVehicles({ targetTime = new Date(), routeId = null, direction = null, customTopology = null } = {}) {
        const topology = customTopology || (await getTopology());
        return calculateActiveVehicles(topology, targetTime, routeId, direction);
    },

    async getStopArrivals({ stopId, targetTime = new Date(), limit = 3, customTopology = null } = {}) {
        const topology = customTopology || (await getTopology());
        return calculateStopArrivals(topology, stopId, targetTime, limit);
    },

    async getRouteWaitTime({ routeCode, direction, startStopId, targetTime = new Date(), customTopology = null } = {}) {
        const topology = customTopology || (await getTopology());
        return calculateRouteWaitTime(topology, routeCode, direction, startStopId, targetTime);
    },
};
