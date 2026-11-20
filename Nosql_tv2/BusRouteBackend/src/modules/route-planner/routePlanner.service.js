const { defaultRepository } = require("./routePlanner.repository");

class RoutePlannerService {
    constructor(repository = defaultRepository) {
        this.repository = repository;
    }

    async planRoute(fromId, toId, options = {}) {
        if (!fromId || !toId) {
            const error = new Error(
                "Thiếu tham số trạm xuất phát (from) hoặc trạm đích (to)."
            );
            error.statusCode = 400;
            throw error;
        }

        const cleanFrom = String(fromId).trim();
        const cleanTo = String(toId).trim();

        if (cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
            const error = new Error(
                "Trạm xuất phát và trạm đích không được trùng nhau."
            );
            error.statusCode = 400;
            throw error;
        }

        const [fromStop, toStop] = await Promise.all([
            this.repository.getStopById(cleanFrom),
            this.repository.getStopById(cleanTo)
        ]);

        if (!fromStop) {
            const error = new Error(
                `Trạm xuất phát không tồn tại trong hệ thống: ${cleanFrom}`
            );
            error.statusCode = 404;
            throw error;
        }

        if (!toStop) {
            const error = new Error(
                `Trạm đích không tồn tại trong hệ thống: ${cleanTo}`
            );
            error.statusCode = 404;
            throw error;
        }

        const maxDepth = options.maxDepth || 15;
        const limit = options.limit || 5;

        const { source, traversalMode, results } =
            await this.repository.findPaths(
                fromStop._id,
                toStop._id,
                maxDepth,
                limit
            );

        if (!results || results.length === 0) {
            return {
                source,
                traversalMode,
                from: {
                    id: fromStop.maTram || fromStop._key,
                    _id: fromStop._id,
                    name: fromStop.tenTram,
                    address: fromStop.diaChi,
                    latitude: fromStop.latitude,
                    longitude: fromStop.longitude
                },
                to: {
                    id: toStop.maTram || toStop._key,
                    _id: toStop._id,
                    name: toStop.tenTram,
                    address: toStop.diaChi,
                    latitude: toStop.latitude,
                    longitude: toStop.longitude
                },
                paths: [],
                message:
                    "Không tìm thấy lộ trình xe buýt phù hợp giữa hai trạm này theo chiều di chuyển."
            };
        }

        const routesRes = await this.repository.getAllRoutes();
        const allRoutes = routesRes.data || routesRes;
        const routeMap = new Map(allRoutes.map((r) => [r.maTuyen, r]));

        const uniqueCandidates = [];
        const seenSignatures = new Set();

        for (const rawPath of results) {
            const stopSeq = (rawPath.vertices || [])
                .map((v) => v._id)
                .join("->");
            const routeSeq = (rawPath.edges || [])
                .map(
                    (e) =>
                        e.maTuyen ||
                        e.tuyenId ||
                        e.ma_tuyen ||
                        e.routeCode ||
                        "?"
                )
                .join("->");
            const pathSig = `${stopSeq}|${routeSeq}`;

            if (!seenSignatures.has(pathSig)) {
                seenSignatures.add(pathSig);
                uniqueCandidates.push(rawPath);
            }
        }

        const formattedPaths = uniqueCandidates.map((rawPath, pathIndex) => {
            const vertices = rawPath.vertices || [];
            const edges = rawPath.edges || [];

            let totalDistance = 0;
            let totalDuration = 0;
            let transfers = 0;
            let hasUnidentifiedRoute = false;
            const usedRouteKeys = [];
            const segments = [];

            let currentSegment = null;

            edges.forEach((edge, idx) => {
                const dist = edge.khoangCach || 0;
                const dur = edge.thoiGian || 0;
                totalDistance += dist;
                totalDuration += dur;

                const rawRouteCode =
                    edge.maTuyen ||
                    edge.tuyenId ||
                    edge.ma_tuyen ||
                    edge.routeCode;

                if (!rawRouteCode) {
                    hasUnidentifiedRoute = true;
                }

                const routeCode = rawRouteCode || "CHUA_XAC_DINH";

                if (
                    !currentSegment ||
                    currentSegment.routeCode !== routeCode
                ) {
                    if (currentSegment) {
                        transfers += 1;
                        segments.push(currentSegment);
                    }
                    if (
                        rawRouteCode &&
                        !usedRouteKeys.includes(rawRouteCode)
                    ) {
                        usedRouteKeys.push(rawRouteCode);
                    }

                    const routeInfo = routeMap.get(routeCode) || null;

                    currentSegment = {
                        segmentIndex: segments.length + 1,
                        routeCode,
                        routeName: routeInfo
                            ? routeInfo.tenTuyen
                            : rawRouteCode
                            ? `Tuyến ${rawRouteCode}`
                            : "Tuyến chưa xác định",
                        isConfirmedRoute: Boolean(rawRouteCode),
                        color: routeInfo?.mauSac || "#2563eb",
                        fare: routeInfo?.giaVe ?? null,
                        fromStop: vertices[idx],
                        toStop: vertices[idx + 1],
                        stopsCount: 1,
                        distance: dist,
                        duration: dur,
                        intermediateStops: [vertices[idx], vertices[idx + 1]]
                    };
                } else {
                    currentSegment.stopsCount += 1;
                    currentSegment.distance += dist;
                    currentSegment.duration += dur;
                    currentSegment.toStop = vertices[idx + 1];
                    currentSegment.intermediateStops.push(vertices[idx + 1]);
                }
            });

            if (currentSegment) {
                segments.push(currentSegment);
            }

            const verifiedTransfers = hasUnidentifiedRoute ? null : transfers;

            const routeDetails = usedRouteKeys.map((code) => {
                const found = routeMap.get(code);
                return {
                    maTuyen: code,
                    tenTuyen: found ? found.tenTuyen : `Tuyến ${code}`,
                    mauSac: found ? found.mauSac : "#2563eb",
                    giaVe: found?.giaVe ?? null,
                    loaiTuyen: found ? found.loaiTuyen : "Chưa cập nhật"
                };
            });

            return {
                pathIndex: pathIndex + 1,
                totalStops: vertices.length,
                transfers: verifiedTransfers,
                hasUnidentifiedRoute,
                totalDistance,
                totalDuration,
                routes: usedRouteKeys,
                routeDetails,
                segments,
                stops: vertices.map((v, i) => ({
                    order: i + 1,
                    id: v.maTram || v._key,
                    _id: v._id,
                    name: v.tenTram,
                    address: v.diaChi,
                    latitude: v.latitude,
                    longitude: v.longitude,
                    khuVuc: v.khuVuc
                })),
                edges: edges.map((e) => ({
                    from: e._from,
                    to: e._to,
                    routeCode:
                        e.maTuyen ||
                        e.tuyenId ||
                        e.ma_tuyen ||
                        e.routeCode ||
                        null,
                    distance: e.khoangCach,
                    duration: e.thoiGian
                }))
            };
        });

        formattedPaths.sort((a, b) => {
            if (a.transfers !== null && b.transfers !== null) {
                if (a.transfers !== b.transfers)
                    return a.transfers - b.transfers;
            }
            if (a.totalStops !== b.totalStops)
                return a.totalStops - b.totalStops;
            return a.totalDuration - b.totalDuration;
        });

        const finalPaths = formattedPaths.slice(0, limit);
        finalPaths.forEach((p, idx) => {
            p.pathIndex = idx + 1;
        });

        return {
            source,
            traversalMode,
            from: {
                id: fromStop.maTram || fromStop._key,
                _id: fromStop._id,
                name: fromStop.tenTram,
                address: fromStop.diaChi,
                latitude: fromStop.latitude,
                longitude: fromStop.longitude
            },
            to: {
                id: toStop.maTram || toStop._key,
                _id: toStop._id,
                name: toStop.tenTram,
                address: toStop.diaChi,
                latitude: toStop.latitude,
                longitude: toStop.longitude
            },
            paths: finalPaths
        };
    }

    async findRoutesByStop(stopId) {
        if (!stopId) {
            const error = new Error("Vui lòng cung cấp mã trạm dừng (:id).");
            error.statusCode = 400;
            throw error;
        }

        const cleanStopId = String(stopId).trim();
        const stop = await this.repository.getStopById(cleanStopId);
        if (!stop) {
            const error = new Error(`Trạm dừng không tồn tại: ${cleanStopId}`);
            error.statusCode = 404;
            throw error;
        }

        const { source, routes } =
            await this.repository.findRoutesByStop(cleanStopId);

        return {
            source,
            stop: {
                id: stop.maTram || stop._key,
                _id: stop._id,
                name: stop.tenTram,
                address: stop.diaChi,
                latitude: stop.latitude,
                longitude: stop.longitude,
                khuVuc: stop.khuVuc
            },
            totalRoutes: routes.length,
            routes: routes.map((r) => ({
                maTuyen: r.route.maTuyen,
                tenTuyen: r.route.tenTuyen,
                loaiTuyen: r.route.loaiTuyen,
                giaVe: r.route.giaVe ?? null,
                thoiGianHoatDong: r.route.thoiGianHoatDong,
                gianCachChuyen: r.route.gianCachChuyen,
                mauSac: r.route.mauSac,
                cuLy: r.route.cuLy,
                orderAtStop: r.thuTu,
                direction: r.chieuDi || "di"
            }))
        };
    }

    async getAllStops(searchQuery = "") {
        const res = await this.repository.getAllStops();
        const stops = res.data || res;
        const source = res.source || "mongodb";

        if (!searchQuery) return { source, data: stops };

        const q = searchQuery.toLowerCase().trim();
        const filtered = stops.filter(
            (s) =>
                (s.tenTram && s.tenTram.toLowerCase().includes(q)) ||
                (s.maTram && s.maTram.toLowerCase().includes(q)) ||
                (s._key && s._key.toLowerCase().includes(q)) ||
                (s.diaChi && s.diaChi.toLowerCase().includes(q))
        );

        return { source, data: filtered };
    }

    async getRouteDetails(routeId) {
        if (!routeId) {
            const error = new Error("Thiếu mã tuyến xe.");
            error.statusCode = 400;
            throw error;
        }
        const result = await this.repository.getRouteWithStops(routeId);
        if (!result) {
            const error = new Error(
                `Không tìm thấy thông tin tuyến xe: ${routeId}`
            );
            error.statusCode = 404;
            throw error;
        }
        return result;
    }

    async getGraphData(options = {}) {
        return this.repository.getGraphData(options);
    }
}

const defaultService = new RoutePlannerService();

module.exports = {
    RoutePlannerService,
    defaultService
};
