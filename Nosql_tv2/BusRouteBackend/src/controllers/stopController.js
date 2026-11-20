const {
    getAllStops,
    getStopById,
    createStop,
    updateStop,
    deleteStop,
    isStopCodeExists
} = require("../services/stopService");

const extractDistrict = (address, explicitDistrict) => {
    if (explicitDistrict && explicitDistrict.trim()) {
        return explicitDistrict.trim();
    }
    if (!address) return "TP.HCM";
    const parts = address.split(",").map((s) => s.trim());
    return (
        parts.find((p) => /^(Quận|Huyện|TP\.)/i.test(p)) ||
        parts[parts.length - 2] ||
        "TP.HCM"
    );
};

const formatStopResponse = (s) => {
    if (!s) return null;
    const ma_tram = s.ma_tram || s.maTram || s.code || s._key;
    const ten_tram = s.ten_tram || s.tenTram || s.name || ma_tram;
    const dia_chi = s.dia_chi || s.diaChi || s.address || "";
    const vi_do = Number(s.vi_do ?? s.latitude ?? s.lat ?? 0);
    const kinh_do = Number(s.kinh_do ?? s.longitude ?? s.lng ?? 0);
    const district = extractDistrict(dia_chi, s.district || s.khuVuc);
    return {
        ...s,
        id: s._key || ma_tram,
        ma_tram,
        maTram: ma_tram,
        code: ma_tram,
        ten_tram,
        tenTram: ten_tram,
        name: ten_tram,
        dia_chi,
        diaChi: dia_chi,
        address: dia_chi,
        district,
        khuVuc: district,
        vi_do,
        kinh_do,
        latitude: vi_do,
        longitude: kinh_do,
        lat: vi_do,
        lng: kinh_do,
        trang_thai: s.trang_thai || s.status || "active",
        status: s.trang_thai || s.status || "active"
    };
};

// 1. Lấy danh sách trạm (hỗ trợ cả tìm kiếm từ khóa ?q=)
const getStops = async (req, res) => {
    try {
        const stops = await getAllStops();
        let formatted = stops.map(formatStopResponse);

        if (req.query.q) {
            const q = String(req.query.q).trim().toLowerCase();
            formatted = formatted.filter(
                (s) =>
                    s.tenTram.toLowerCase().includes(q) ||
                    s.maTram.toLowerCase().includes(q) ||
                    s.diaChi.toLowerCase().includes(q)
            );
        }

        return res.status(200).json({
            success: true,
            source: "mongodb",
            total: formatted.length,
            message: "Lấy danh sách trạm dừng thành công",
            data: formatted
        });
    } catch (error) {
        console.error("Get stops error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách trạm dừng"
        });
    }
};

// 2. Lấy chi tiết trạm
const getStop = async (req, res) => {
    try {
        const stop = await getStopById(req.params.id);

        if (!stop) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy trạm dừng"
            });
        }

        const formatted = formatStopResponse(stop);
        return res.status(200).json({
            success: true,
            message: "Lấy thông tin trạm dừng thành công",
            ...formatted,
            data: formatted
        });
    } catch (error) {
        console.error("Get stop error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy thông tin trạm dừng"
        });
    }
};

// 3. Thêm trạm (hỗ trợ cả chuẩn snake_case và camelCase)
const addStop = async (req, res) => {
    try {
        const ma_tram = (
            req.body.ma_tram ||
            req.body.maTram ||
            req.body.code ||
            ""
        ).trim();
        const ten_tram = (
            req.body.ten_tram ||
            req.body.tenTram ||
            req.body.name ||
            ""
        ).trim();
        const rawAddress = (
            req.body.dia_chi ||
            req.body.diaChi ||
            req.body.address ||
            "TP.HCM"
        ).trim();
        const district = extractDistrict(rawAddress, req.body.district);
        const dia_chi =
            req.body.district && !rawAddress.includes(req.body.district)
                ? `${rawAddress}, ${req.body.district}`
                : rawAddress;

        const vi_do = Number(
            req.body.vi_do ?? req.body.latitude ?? req.body.lat ?? 10.77
        );
        const kinh_do = Number(
            req.body.kinh_do ?? req.body.longitude ?? req.body.lng ?? 106.7
        );
        const trang_thai = req.body.trang_thai || req.body.status || "active";

        if (!ma_tram || !ten_tram) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập đầy đủ thông tin trạm"
            });
        }

        if (
            !Number.isFinite(vi_do) ||
            !Number.isFinite(kinh_do) ||
            vi_do < -90 ||
            vi_do > 90 ||
            kinh_do < -180 ||
            kinh_do > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Tọa độ trạm không hợp lệ"
            });
        }

        const isExists = await isStopCodeExists(ma_tram);
        if (isExists) {
            return res.status(409).json({
                success: false,
                message: "Mã trạm dừng đã tồn tại"
            });
        }

        const newStop = await createStop({
            _key: ma_tram,
            _id: `TramDung/${ma_tram}`,
            id: ma_tram,
            ma_tram,
            maTram: ma_tram,
            code: ma_tram,
            ten_tram,
            tenTram: ten_tram,
            name: ten_tram,
            dia_chi,
            diaChi: dia_chi,
            address: dia_chi,
            district,
            khuVuc: district,
            vi_do,
            kinh_do,
            latitude: vi_do,
            longitude: kinh_do,
            lat: vi_do,
            lng: kinh_do,
            trang_thai
        });

        const formatted = formatStopResponse(newStop);
        return res.status(201).json({
            success: true,
            message: "Thêm trạm dừng thành công",
            ...formatted,
            data: formatted
        });
    } catch (error) {
        console.error("Create stop error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi khi thêm trạm dừng"
        });
    }
};

// 4. Cập nhật trạm
const editStop = async (req, res) => {
    try {
        const stopId = req.params.id;
        const existingStop = await getStopById(stopId);

        if (!existingStop) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy trạm dừng"
            });
        }

        const updateData = {};
        if (req.body.ma_tram || req.body.code) {
            updateData.ma_tram = (req.body.ma_tram || req.body.code).trim();
            updateData.maTram = updateData.ma_tram;
            updateData.code = updateData.ma_tram;
        }
        if (req.body.ten_tram || req.body.name) {
            updateData.ten_tram = (req.body.ten_tram || req.body.name).trim();
            updateData.tenTram = updateData.ten_tram;
            updateData.name = updateData.ten_tram;
        }
        if (req.body.dia_chi || req.body.address) {
            updateData.dia_chi = (req.body.dia_chi || req.body.address).trim();
            updateData.diaChi = updateData.dia_chi;
            updateData.address = updateData.dia_chi;
        }
        if (req.body.district) {
            updateData.district = req.body.district.trim();
            updateData.khuVuc = updateData.district;
        }
        if (req.body.vi_do !== undefined || req.body.lat !== undefined) {
            const lat = Number(req.body.vi_do ?? req.body.lat);
            updateData.vi_do = lat;
            updateData.latitude = lat;
            updateData.lat = lat;
        }
        if (req.body.kinh_do !== undefined || req.body.lng !== undefined) {
            const lng = Number(req.body.kinh_do ?? req.body.lng);
            updateData.kinh_do = lng;
            updateData.longitude = lng;
            updateData.lng = lng;
        }
        if (req.body.trang_thai || req.body.status) {
            updateData.trang_thai = req.body.trang_thai || req.body.status;
            updateData.status = updateData.trang_thai;
        }

        if (updateData.ma_tram) {
            const isExists = await isStopCodeExists(updateData.ma_tram, stopId);
            if (isExists) {
                return res.status(409).json({
                    success: false,
                    message: "Mã trạm dừng đã tồn tại"
                });
            }
        }

        const updatedStop = await updateStop(stopId, updateData);
        const formatted = formatStopResponse(updatedStop);

        return res.status(200).json({
            success: true,
            message: "Cập nhật trạm dừng thành công",
            ...formatted,
            data: formatted
        });
    } catch (error) {
        console.error("Update stop error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi khi cập nhật trạm dừng"
        });
    }
};

// 5. Xóa trạm
const removeStop = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteStop(id);

        if (result.notFound) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy trạm dừng"
            });
        }

        if (result.inUse) {
            return res.status(409).json({
                success: false,
                message: "Không thể xóa trạm đang được sử dụng bởi tuyến xe",
                data: result.usage
            });
        }

        return res.status(200).json({
            success: true,
            message: "Xóa trạm dừng thành công"
        });
    } catch (error) {
        console.error("Delete stop error:", error);

        return res.status(500).json({
            success: false,
            message: "Lỗi khi xóa trạm dừng"
        });
    }
};

module.exports = {
    getStops,
    getStop,
    addStop,
    editStop,
    removeStop,
    formatStopResponse
};
