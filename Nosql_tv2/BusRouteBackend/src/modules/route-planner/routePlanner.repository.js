/**
 * ============================================================================
 * BUSROUTE HCM - ROUTE PLANNER REPOSITORY (CHUẨN HÓA MONGODB)
 * Thực hiện truy vấn đồ thị trên MongoDB (BusRouteDB / BusRouteGraph)
 * sử dụng $graphLookup, $lookup trên các Vertex/Edge Collections:
 * - Vertex: TuyenXe, TramDung
 * - Edge: CO_TRAM, KE_TIEP
 * ============================================================================
 */
const { db: defaultMongoDb } = require("../../config/database");

class RoutePlannerRepository {
    constructor(customDb = null, options = {}) {
        this.customDb = customDb;
        this.useNamedGraph =
            options.useNamedGraph !== undefined
                ? options.useNamedGraph
                : process.env.MONGO_USE_NAMED_GRAPH !== "false";
    }

    get database() {
        return this.customDb || defaultMongoDb;
    }

    normalizeStopId(id) {
        if (!id) return "";
        const clean = String(id).trim();
        return clean.startsWith("TramDung/") ? clean : `TramDung/${clean}`;
    }

    normalizeRouteId(id) {
        if (!id) return "";
        const clean = String(id).trim();
        return clean.startsWith("TuyenXe/") ? clean : `TuyenXe/${clean}`;
    }

    /**
     * Chuẩn hóa document TramDung tương thích đa định dạng (snake_case, camelCase và English keys)
     */
    formatStopDoc(s) {
        if (!s) return null;
        const maTram = s.maTram || s.ma_tram || s.code || s._key;
        const tenTram = s.tenTram || s.ten_tram || s.name || maTram;
        const diaChi = s.diaChi || s.dia_chi || s.address || "";
        const lat = s.latitude ?? s.vi_do ?? s.lat ?? 0;
        const lng = s.longitude ?? s.kinh_do ?? s.lng ?? 0;
        return {
            ...s,
            id: s._key || maTram,
            ma_tram: maTram,
            maTram,
            code: maTram,
            ten_tram: tenTram,
            tenTram,
            name: tenTram,
            dia_chi: diaChi,
            diaChi,
            address: diaChi,
            vi_do: lat,
            kinh_do: lng,
            latitude: lat,
            longitude: lng,
            lat,
            lng
        };
    }

    /**
     * Chuẩn hóa document TuyenXe
     */
    formatRouteDoc(r) {
        if (!r) return null;
        const maTuyen = r.maTuyen || r.ma_tuyen || r.code || r._key;
        const tenTuyen = r.tenTuyen || r.ten_tuyen || r.name || `Tuyến ${maTuyen}`;
        const giaVe = r.giaVe ?? r.gia_ve ?? r.ticketPrice ?? 6000;
        const opStr =
            r.thoiGianHoatDong ||
            r.operatingHours ||
            (r.thoi_gian_hoat_dong
                ? `${r.thoi_gian_hoat_dong.bat_dau} - ${r.thoi_gian_hoat_dong.ket_thuc}`
                : "05:00 - 20:30");
        return {
            ...r,
            id: r._key || maTuyen,
            ma_tuyen: maTuyen,
            maTuyen,
            code: maTuyen,
            ten_tuyen: tenTuyen,
            tenTuyen,
            name: tenTuyen,
            gia_ve: giaVe,
            giaVe,
            ticketPrice: giaVe,
            thoiGianHoatDong: opStr,
            operatingHours: opStr,
            mauSac: r.mauSac || "#2563eb",
            loaiTuyen: r.loaiTuyen || "Phổ thông - có trợ giá"
        };
    }

    /**
     * Chuẩn hóa cạnh KE_TIEP
     */
    formatKeTiepEdge(e) {
        if (!e) return null;
        const maTuyen = e.maTuyen || e.ma_tuyen;
        const distMeters =
            e.khoangCach !== undefined
                ? Number(e.khoangCach)
                : Math.round(Number(e.khoang_cach_km || 0) * 1000);
        const durationMin = Number(
            e.thoiGian ?? e.thoi_gian_di_chuyen_phut ?? 0
        );
        return {
            ...e,
            maTuyen,
            ma_tuyen: maTuyen,
            khoangCach: distMeters,
            thoiGian: durationMin
        };
    }

    /**
     * Tìm đường giữa 2 trạm trên đồ thị BusRouteGraph bằng MongoDB $graphLookup
     */
    async findPaths(fromId, toId, maxDepth = 15, limit = 5) {
        const startVertex = this.normalizeStopId(fromId);
        const targetVertex = this.normalizeStopId(toId);
        const candidateLimit = Math.min(Math.max(limit * 5, 25), 50);

        // 1. Sử dụng MongoDB $graphLookup để duyệt đồ thị cạnh KE_TIEP từ startVertex
        const graphDocs = await this.database
            .collection("TramDung")
            .aggregate([
                { $match: { _id: startVertex } },
                {
                    $graphLookup: {
                        from: "KE_TIEP",
                        startWith: "$_id",
                        connectFromField: "_to",
                        connectToField: "_from",
                        as: "reachable_edges",
                        maxDepth: Math.min(maxDepth, 25),
                        depthField: "depth"
                    }
                }
            ])
            .toArray();

        if (!graphDocs.length) {
            return {
                source: "mongodb",
                traversalMode: "graph_lookup",
                results: []
            };
        }

        const reachableEdges = (graphDocs[0].reachable_edges || []).map((e) =>
            this.formatKeTiepEdge(e)
        );
        const allStopsRaw = await this.database
            .collection("TramDung")
            .find({})
            .toArray();
        const stopMap = new Map(
            allStopsRaw.map((s) => [s._id, this.formatStopDoc(s)])
        );

        const startStop = stopMap.get(startVertex);
        const targetStop = stopMap.get(targetVertex);
        if (!startStop || !targetStop) {
            return {
                source: "mongodb",
                traversalMode: "graph_lookup",
                results: []
            };
        }

        // Xây dựng danh sách kề từ tập cạnh $graphLookup
        const adj = new Map();
        for (const edge of reachableEdges) {
            if (!adj.has(edge._from)) adj.set(edge._from, []);
            adj.get(edge._from).push(edge);
        }

        // Duyệt đồ thị ưu tiên chi phí (số trạm + phạt chuyển tuyến) trên tập cạnh $graphLookup
        const pathsFound = [];
        const queue = [
            {
                currentId: startVertex,
                vertices: [startStop],
                edges: [],
                visited: new Set([startVertex]),
                currentRoute: null,
                transfers: 0,
                cost: 0
            }
        ];

        const seenSignatures = new Set();

        while (queue.length > 0 && pathsFound.length < candidateLimit * 2) {
            queue.sort((a, b) => a.cost - b.cost);
            const current = queue.shift();

            if (current.currentId === targetVertex && current.edges.length > 0) {
                const stopSeq = current.vertices.map((v) => v._id).join("->");
                const routeSeq = current.edges
                    .map((e) => e.maTuyen || "?")
                    .join("->");
                const sig = `${stopSeq}|${routeSeq}`;

                if (!seenSignatures.has(sig)) {
                    seenSignatures.add(sig);
                    pathsFound.push({
                        vertices: current.vertices,
                        edges: current.edges,
                        transfers: current.transfers
                    });
                }
                if (pathsFound.length >= candidateLimit) break;
                continue;
            }

            if (current.vertices.length > maxDepth) {
                continue;
            }

            const outboundEdges = adj.get(current.currentId) || [];
            for (const edge of outboundEdges) {
                const nextId = edge._to;
                if (!current.visited.has(nextId)) {
                    const nextStop = stopMap.get(nextId);
                    if (nextStop) {
                        const isTransfer =
                            current.currentRoute !== null &&
                            current.currentRoute !== edge.maTuyen;
                        const newTransfers =
                            current.transfers + (isTransfer ? 1 : 0);

                        if (newTransfers > 2) continue;

                        const nextVisited = new Set(current.visited);
                        nextVisited.add(nextId);

                        const cost =
                            current.vertices.length + 1 + newTransfers * 4;

                        queue.push({
                            currentId: nextId,
                            vertices: [...current.vertices, nextStop],
                            edges: [...current.edges, edge],
                            visited: nextVisited,
                            currentRoute: edge.maTuyen,
                            transfers: newTransfers,
                            cost
                        });
                    }
                }
            }
        }

        return {
            source: "mongodb",
            traversalMode: "graph_lookup",
            results: pathsFound.slice(0, candidateLimit)
        };
    }

    /**
     * Lấy chi tiết 1 trạm theo ID hoặc mã trạm
     */
    async getStopById(id) {
        const normalized = this.normalizeStopId(id);
        const key = String(id).replace(/^TramDung\//, "").trim();

        const stop = await this.database.collection("TramDung").findOne({
            $or: [
                { _id: normalized },
                { _key: key },
                { ma_tram: key },
                { maTram: key }
            ]
        });

        return this.formatStopDoc(stop);
    }

    /**
     * Lấy toàn bộ danh sách trạm dừng
     */
    async getAllStops() {
        const stops = await this.database
            .collection("TramDung")
            .find({})
            .sort({ ma_tram: 1 })
            .toArray();

        return {
            source: "mongodb",
            data: stops.map((s) => this.formatStopDoc(s))
        };
    }

    /**
     * Tìm các tuyến xe đi qua 1 trạm dựa trên quan hệ CO_TRAM
     */
    async findRoutesByStop(stopId) {
        const stop = await this.getStopById(stopId);
        if (!stop) {
            return { source: "mongodb", routes: [] };
        }

        const results = await this.database
            .collection("CO_TRAM")
            .aggregate([
                { $match: { _to: stop._id } },
                { $sort: { thu_tu: 1 } },
                {
                    $lookup: {
                        from: "TuyenXe",
                        localField: "_from",
                        foreignField: "_id",
                        as: "routeArr"
                    }
                },
                { $unwind: "$routeArr" }
            ])
            .toArray();

        const routes = results.map((item) => ({
            route: this.formatRouteDoc(item.routeArr),
            thuTu: item.thuTu ?? item.thu_tu ?? 1,
            chieuDi:
                item.chieuDi ||
                (item.ma_chieu === "luot_ve" ? "ve" : "di")
        }));

        return {
            source: "mongodb",
            routes
        };
    }

    /**
     * Lấy tất cả tuyến xe
     */
    async getAllRoutes() {
        const routes = await this.database
            .collection("TuyenXe")
            .find({})
            .sort({ ma_tuyen: 1 })
            .toArray();

        return {
            source: "mongodb",
            data: routes.map((r) => this.formatRouteDoc(r))
        };
    }

    /**
     * Lấy chi tiết tuyến kèm danh sách trạm theo chiều đi & chiều về
     */
    async getRouteWithStops(routeId) {
        const normalized = this.normalizeRouteId(routeId);
        const key = String(routeId).replace(/^TuyenXe\//, "").trim();

        const routeRaw = await this.database.collection("TuyenXe").findOne({
            $or: [
                { _id: normalized },
                { _key: key },
                { ma_tuyen: key },
                { maTuyen: key }
            ]
        });

        if (!routeRaw) return null;
        const route = this.formatRouteDoc(routeRaw);

        const edges = await this.database
            .collection("CO_TRAM")
            .aggregate([
                { $match: { _from: route._id } },
                { $sort: { ma_chieu: 1, thu_tu: 1 } },
                {
                    $lookup: {
                        from: "TramDung",
                        localField: "_to",
                        foreignField: "_id",
                        as: "stopArr"
                    }
                },
                { $unwind: "$stopArr" }
            ])
            .toArray();

        const stops = edges.map((e) => ({
            stop: this.formatStopDoc(e.stopArr),
            thuTu: e.thuTu ?? e.thu_tu ?? 1,
            chieuDi: e.chieuDi || (e.ma_chieu === "luot_ve" ? "ve" : "di")
        }));

        return {
            source: "mongodb",
            route,
            chieuDi: stops.filter((s) => s.chieuDi === "di"),
            chieuVe: stops.filter((s) => s.chieuDi === "ve"),
            stops
        };
    }

    /**
     * Lấy dữ liệu đồ thị chuẩn Cytoscape.js từ MongoDB
     */
    async getGraphData(options = {}) {
        const { route, limit = 50 } = options;

        const routeFilter = route
            ? {
                  $or: [
                      { ma_tuyen: route },
                      { maTuyen: route },
                      { _key: route }
                  ]
              }
            : {};

        const routesRaw = await this.database
            .collection("TuyenXe")
            .find(routeFilter)
            .limit(20)
            .toArray();
        const routes = routesRaw.map((r) => this.formatRouteDoc(r));
        const routeIds = routes.map((r) => r._id);

        const coTramFilter =
            routeIds.length > 0 ? { _from: { $in: routeIds } } : {};
        const coTram = await this.database
            .collection("CO_TRAM")
            .find(coTramFilter)
            .limit(200)
            .toArray();

        const stopIdsFromCoTram = [
            ...new Set(coTram.map((e) => e._to).filter(Boolean))
        ];

        const stopFilter =
            stopIdsFromCoTram.length > 0
                ? { _id: { $in: stopIdsFromCoTram } }
                : {};
        const stopsRaw = await this.database
            .collection("TramDung")
            .find(stopFilter)
            .limit(Number(limit) || 50)
            .toArray();
        const stops = stopsRaw.map((s) => this.formatStopDoc(s));
        const validStopIds = stops.map((s) => s._id);

        const keTiepFilter = {
            _from: { $in: validStopIds },
            _to: { $in: validStopIds }
        };
        if (route) {
            keTiepFilter.$or = [{ ma_tuyen: route }, { maTuyen: route }];
        }

        const keTiepRaw = await this.database
            .collection("KE_TIEP")
            .find(keTiepFilter)
            .limit(200)
            .toArray();
        const keTiep = keTiepRaw.map((e) => this.formatKeTiepEdge(e));

        return {
            source: "mongodb",
            data: this._formatCytoscapeElements({
                routes,
                stops,
                coTram,
                keTiep
            })
        };
    }

    _formatCytoscapeElements(raw) {
        const nodes = [];
        const edges = [];
        const nodeSet = new Set();

        (raw.stops || []).forEach((s) => {
            if (!nodeSet.has(s._id)) {
                nodeSet.add(s._id);
                nodes.push({
                    data: {
                        id: s._id,
                        label: s.tenTram || s.maTram || s._key,
                        type: "stop",
                        maTram: s.maTram || s._key,
                        tenTram: s.tenTram,
                        address: s.diaChi || "",
                        latitude: s.latitude,
                        longitude: s.longitude
                    }
                });
            }
        });

        (raw.routes || []).forEach((r) => {
            if (!nodeSet.has(r._id)) {
                nodeSet.add(r._id);
                nodes.push({
                    data: {
                        id: r._id,
                        label: `Tuyến ${r.maTuyen}`,
                        type: "route",
                        maTuyen: r.maTuyen,
                        tenTuyen: r.tenTuyen,
                        color: r.mauSac || "#2563eb",
                        giaVe: r.giaVe
                    }
                });
            }
        });

        (raw.coTram || []).forEach((e, idx) => {
            if (nodeSet.has(e._from) && nodeSet.has(e._to)) {
                edges.push({
                    data: {
                        id: e._id || `co_tram_${idx}`,
                        source: e._from,
                        target: e._to,
                        type: "CO_TRAM",
                        label: "CO_TRAM",
                        thuTu: e.thuTu ?? e.thu_tu,
                        chieuDi:
                            e.chieuDi ||
                            (e.ma_chieu === "luot_ve" ? "ve" : "di")
                    }
                });
            }
        });

        (raw.keTiep || []).forEach((e, idx) => {
            if (nodeSet.has(e._from) && nodeSet.has(e._to)) {
                edges.push({
                    data: {
                        id: e._id || `ke_tiep_${idx}`,
                        source: e._from,
                        target: e._to,
                        type: "KE_TIEP",
                        label: e.maTuyen ? `T${e.maTuyen}` : "KE_TIEP",
                        routeCode: e.maTuyen,
                        distance: e.khoangCach,
                        duration: e.thoiGian
                    }
                });
            }
        });

        return {
            elements: { nodes, edges },
            stats: {
                stopsCount: nodes.filter((n) => n.data.type === "stop").length,
                routesCount: nodes.filter((n) => n.data.type === "route").length,
                edgesCount: edges.length
            }
        };
    }
}

const defaultRepository = new RoutePlannerRepository();

module.exports = {
    RoutePlannerRepository,
    defaultRepository
};
