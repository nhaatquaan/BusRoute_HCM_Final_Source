const {
    getAllRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
    assignStopsToRoute,
    getRouteWithStops,
    isRouteCodeExists
} = require("../services/routeService");
const { formatStopResponse } = require("./stopController");

const parseOperatingTime = (rawTime) => {
    if (
        rawTime &&
        typeof rawTime === "object" &&
        rawTime.bat_dau &&
        rawTime.ket_thuc
    ) {
        return rawTime;
    }
    if (typeof rawTime === "string" && rawTime.includes("-")) {
        const [start, end] = rawTime.split("-").map((s) => s.trim());
        return {
            bat_dau: start || "05:00",
            ket_thuc: end || "20:30"
        };
    }
    return {
        bat_dau: "05:00",
        ket_thuc: "20:30"
    };
};

const formatRouteResponse = (r, extraStops = null) => {
    if (!r) return null;
    const ma_tuyen = r.ma_tuyen || r.maTuyen || r.code || r._key;
    const ten_tuyen = r.ten_tuyen || r.tenTuyen || r.name || `Tuyến ${ma_tuyen}`;
    const diem_dau = r.diem_dau || r.startPoint || "";
    const diem_cuoi = r.diem_cuoi || r.endPoint || "";
    const gia_ve = Number(r.gia_ve ?? r.giaVe ?? r.ticketPrice ?? 6000);
    const cu_ly_km = Number(r.cu_ly_km ?? parseFloat(r.cuLy) ?? 15);
    const thoi_gian_hoat_dong = parseOperatingTime(
        r.thoi_gian_hoat_dong || r.operatingHours || r.thoiGianHoatDong
    );
    const opStr = `${thoi_gian_hoat_dong.bat_dau} - ${thoi_gian_hoat_dong.ket_thuc}`;
    const trang_thai = r.trang_thai || r.status || "active";

    const result = {
        ...r,
        id: r._key || ma_tuyen,
        ma_tuyen,
        maTuyen: ma_tuyen,
        code: ma_tuyen,
        ten_tuyen,
        tenTuyen: ten_tuyen,
        name: ten_tuyen,
        diem_dau,
        startPoint: diem_dau,
        diem_cuoi,
        endPoint: diem_cuoi,
        cu_ly_km,
        cuLy: `${cu_ly_km} km`,
        thoi_gian_hoat_dong,
        operatingHours: opStr,
        thoiGianHoatDong: opStr,
        gia_ve,
        giaVe: gia_ve,
        ticketPrice: gia_ve,
        frequency: r.frequency || r.gianCachChuyen || "10 - 15 phút/chuyến",
        gianCachChuyen:
            r.gianCachChuyen || r.frequency || "10 - 15 phút/chuyến",
        trang_thai,
        status: trang_thai,
        stopIds: r.stopIds || []
    };

    if (Array.isArray(extraStops)) {
        result.stops = extraStops;
        result.stopIds = extraStops.map((s) => s.id);
    }

    return result;
};

// 1. Lấy danh sách tuyến xe
const getRoutes = async (req, res) => {
    try {
        const routes = await getAllRoutes();
        const formatted = routes.map((r) => formatRouteResponse(r));

        return res.status(200).json({
            success: true,
            source: "mongodb",
            message: "Lấy danh sách tuyến xe thành công",
            data: formatted
        });
    } catch (error) {
        console.error("Get routes error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách tuyến xe"
        });
    }
};

// 2. Lấy chi tiết tuyến xe (kèm danh sách trạm tương thích đa nền tảng)
const getRoute = async (req, res) => {
    try {
        const detail = await getRouteWithStops(req.params.id);

        if (!detail || !detail.tuyen_xe) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tuyến xe"
            });
        }

        const allAssigned = detail.danh_sach_tram || [];
        const luotDiList = allAssigned.filter((item) => item.ma_chieu === "luot_di");
        const activeList = luotDiList.length > 0 ? luotDiList : allAssigned;

        const orderedStops = activeList.map((item, idx) => ({
            ...formatStopResponse(item.tram),
            order: item.thu_tu || idx + 1,
            thu_tu: item.thu_tu || idx + 1,
            khoang_cach_km: item.khoang_cach_den_tram_tiep_theo ?? null,
            thoi_gian_di_chuyen_phut: item.thoi_gian_den_tram_tiep_theo ?? null,
            khoang_cach_den_tram_tiep_theo: item.khoang_cach_den_tram_tiep_theo ?? null,
            thoi_gian_den_tram_tiep_theo: item.thoi_gian_den_tram_tiep_theo ?? null
        }));

        const formattedRoute = formatRouteResponse(detail.tuyen_xe, orderedStops);

        return res.status(200).json({
            success: true,
            source: "mongodb",
            message: "Lấy thông tin tuyến xe thành công",
            ...formattedRoute,
            data: formattedRoute
        });
    } catch (error) {
        console.error("Get route error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy thông tin tuyến xe"
        });
    }
};

// 3. Thêm tuyến xe (hỗ trợ cả chuẩn camelCase và snake_case)
const addRoute = async (req, res) => {
    try {
        const ma_tuyen = (
            req.body.ma_tuyen ||
            req.body.maTuyen ||
            req.body.code ||
            ""
        ).trim();
        const ten_tuyen = (
            req.body.ten_tuyen ||
            req.body.tenTuyen ||
            req.body.name ||
            ""
        ).trim();
        const diem_dau = (
            req.body.diem_dau ||
            req.body.startPoint ||
            "Điểm đầu"
        ).trim();
        const diem_cuoi = (
            req.body.diem_cuoi ||
            req.body.endPoint ||
            "Điểm cuối"
        ).trim();
        const cu_ly_km = Number(req.body.cu_ly_km ?? 15);
        const thoi_gian_hoat_dong = parseOperatingTime(
            req.body.thoi_gian_hoat_dong || req.body.operatingHours
        );
        const gia_ve = Number(
            req.body.gia_ve ?? req.body.giaVe ?? req.body.ticketPrice ?? 6000
        );
        const trang_thai = req.body.trang_thai || req.body.status || "active";
        const frequency =
            req.body.frequency ||
            req.body.gianCachChuyen ||
            "10 - 15 phút/chuyến";

        if (!ma_tuyen || !ten_tuyen) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập đầy đủ thông tin tuyến xe"
            });
        }

        const isExists = await isRouteCodeExists(ma_tuyen);
        if (isExists) {
            return res.status(409).json({
                success: false,
                message: "Mã tuyến xe đã tồn tại"
            });
        }

        const key = `TX_${ma_tuyen}`;
        const opStr = `${thoi_gian_hoat_dong.bat_dau} - ${thoi_gian_hoat_dong.ket_thuc}`;

        const newRoute = await createRoute({
            _key: key,
            _id: `TuyenXe/${key}`,
            id: key,
            ma_tuyen,
            maTuyen: ma_tuyen,
            code: ma_tuyen,
            ten_tuyen,
            tenTuyen: ten_tuyen,
            name: ten_tuyen,
            diem_dau,
            startPoint: diem_dau,
            diem_cuoi,
            endPoint: diem_cuoi,
            cu_ly_km,
            cuLy: `${cu_ly_km} km`,
            thoi_gian_hoat_dong,
            operatingHours: opStr,
            thoiGianHoatDong: opStr,
            gia_ve,
            giaVe: gia_ve,
            ticketPrice: gia_ve,
            frequency,
            gianCachChuyen: frequency,
            loaiTuyen: "Phổ thông - có trợ giá",
            mauSac: req.body.mauSac || "#2563eb",
            trang_thai,
            status: trang_thai,
            stopIds: [],
            updatedAt: new Date().toISOString().slice(0, 10)
        });

        const formatted = formatRouteResponse(newRoute);
        return res.status(201).json({
            success: true,
            message: "Thêm tuyến xe thành công",
            ...formatted,
            data: formatted
        });
    } catch (error) {
        console.error("Create route error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi khi thêm tuyến xe"
        });
    }
};

// 4. Cập nhật tuyến xe
const editRoute = async (req, res) => {
    try {
        const routeId = req.params.id;
        const existingRoute = await getRouteById(routeId);

        if (!existingRoute) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tuyến xe"
            });
        }

        const updateData = {};

        if (req.body.ma_tuyen || req.body.code) {
            updateData.ma_tuyen = (req.body.ma_tuyen || req.body.code).trim();
            updateData.maTuyen = updateData.ma_tuyen;
            updateData.code = updateData.ma_tuyen;
        }
        if (req.body.ten_tuyen || req.body.name) {
            updateData.ten_tuyen = (req.body.ten_tuyen || req.body.name).trim();
            updateData.tenTuyen = updateData.ten_tuyen;
            updateData.name = updateData.ten_tuyen;
        }
        if (req.body.diem_dau || req.body.startPoint) {
            updateData.diem_dau = (
                req.body.diem_dau || req.body.startPoint
            ).trim();
            updateData.startPoint = updateData.diem_dau;
        }
        if (req.body.diem_cuoi || req.body.endPoint) {
            updateData.diem_cuoi = (
                req.body.diem_cuoi || req.body.endPoint
            ).trim();
            updateData.endPoint = updateData.diem_cuoi;
        }
        if (req.body.cu_ly_km !== undefined) {
            updateData.cu_ly_km = Number(req.body.cu_ly_km);
            updateData.cuLy = `${updateData.cu_ly_km} km`;
        }
        if (
            req.body.thoi_gian_hoat_dong !== undefined ||
            req.body.operatingHours !== undefined
        ) {
            const parsedTime = parseOperatingTime(
                req.body.thoi_gian_hoat_dong || req.body.operatingHours
            );
            const opStr = `${parsedTime.bat_dau} - ${parsedTime.ket_thuc}`;
            updateData.thoi_gian_hoat_dong = parsedTime;
            updateData.operatingHours = opStr;
            updateData.thoiGianHoatDong = opStr;
        }
        if (
            req.body.gia_ve !== undefined ||
            req.body.ticketPrice !== undefined
        ) {
            const price = Number(req.body.gia_ve ?? req.body.ticketPrice);
            updateData.gia_ve = price;
            updateData.giaVe = price;
            updateData.ticketPrice = price;
        }
        if (req.body.frequency) {
            updateData.frequency = req.body.frequency;
            updateData.gianCachChuyen = req.body.frequency;
        }
        if (req.body.trang_thai || req.body.status) {
            const st = req.body.trang_thai || req.body.status;
            updateData.trang_thai = st;
            updateData.status = st;
        }

        if (updateData.ma_tuyen) {
            const isExists = await isRouteCodeExists(
                updateData.ma_tuyen,
                routeId
            );
            if (isExists) {
                return res.status(409).json({
                    success: false,
                    message: "Mã tuyến xe đã tồn tại"
                });
            }
        }

        const updatedRoute = await updateRoute(routeId, updateData);
        const formatted = formatRouteResponse(updatedRoute);

        return res.status(200).json({
            success: true,
            message: "Cập nhật tuyến xe thành công",
            ...formatted,
            data: formatted
        });
    } catch (error) {
        console.error("Update route error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật tuyến xe"
        });
    }
};

// 5. Xóa tuyến xe
const removeRoute = async (req, res) => {
    try {
        const routeId = req.params.id;
        const existingRoute = await getRouteById(routeId);

        if (!existingRoute) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tuyến xe"
            });
        }

        await deleteRoute(routeId);

        return res.status(200).json({
            success: true,
            message: "Xóa tuyến xe thành công"
        });
    } catch (error) {
        console.error("Delete route error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi khi xóa tuyến xe"
        });
    }
};

// 6. Gán danh sách trạm cho tuyến xe (hỗ trợ cả { ma_chieu, stops } và { stopIds })
const assignStops = async (req, res) => {
    try {
        const routeId = req.params.id;
        let ma_chieu = req.body.ma_chieu || "luot_di";
        let stops = req.body.stops;

        // Nếu client gửi { stopIds: ["TR_01", "TR_02", ...] }
        if (!Array.isArray(stops) && Array.isArray(req.body.stopIds)) {
            stops = req.body.stopIds.map((stopId, idx) => ({
                id: String(stopId),
                khoang_cach_km: idx === 0 ? 0 : 1.5,
                thoi_gian_di_chuyen_phut: idx === 0 ? 0 : 5
            }));
        }

        if (!ma_chieu || !Array.isArray(stops)) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp ma_chieu và danh sách stops"
            });
        }

        const result = await assignStopsToRoute(routeId, ma_chieu, stops);

        // Đồng bộ trường stopIds trên document TuyenXe
        if (ma_chieu === "luot_di") {
            await updateRoute(routeId, {
                stopIds: stops.map((s) => s.id)
            });
        }

        return res.status(200).json({
            success: true,
            message: "Gán trạm cho tuyến xe thành công",
            data: result
        });
    } catch (error) {
        console.error("Assign stops error:", error);

        const statusCode =
            error.message === "Không tìm thấy tuyến xe" ? 404 : 400;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

// 7. Lấy chi tiết tuyến xe kèm danh sách trạm
const getRouteDetailWithStops = async (req, res) => {
    try {
        const { id } = req.params;
        const { ma_chieu } = req.query;

        if (ma_chieu && !["luot_di", "luot_ve"].includes(ma_chieu)) {
            return res.status(400).json({
                success: false,
                message: "Chiều tuyến không hợp lệ"
            });
        }

        const result = await getRouteWithStops(id, ma_chieu || null);

        if (!result || !result.tuyen_xe) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tuyến xe"
            });
        }

        const formattedRoute = formatRouteResponse(result.tuyen_xe);
        const stopsList = (result.danh_sach_tram || []).map((item, idx) => ({
            ...formatStopResponse(item.tram),
            order: item.thu_tu || idx + 1,
            thu_tu: item.thu_tu || idx + 1,
            khoang_cach_km: item.khoang_cach_den_tram_tiep_theo ?? null,
            thoi_gian_di_chuyen_phut: item.thoi_gian_den_tram_tiep_theo ?? null,
            khoang_cach_den_tram_tiep_theo: item.khoang_cach_den_tram_tiep_theo ?? null,
            thoi_gian_den_tram_tiep_theo: item.thoi_gian_den_tram_tiep_theo ?? null
        }));

        const responsePayload = {
            ...formattedRoute,
            stops: stopsList,
            stopIds: stopsList.map((s) => s.id),
            danh_sach_tram: result.danh_sach_tram,
            tuyen_xe: formattedRoute
        };

        return res.status(200).json({
            success: true,
            source: "mongodb",
            message: "Lấy chi tiết tuyến xe thành công",
            data: responsePayload,
            ...responsePayload
        });
    } catch (error) {
        console.error("Get route detail error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy chi tiết tuyến xe"
        });
    }
};

module.exports = {
    getRoutes,
    getRoute,
    addRoute,
    editRoute,
    removeRoute,
    assignStops,
    getRouteDetailWithStops
};
