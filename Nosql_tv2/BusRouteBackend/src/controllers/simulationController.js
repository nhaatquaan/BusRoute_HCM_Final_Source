const busSimulationService = require("../services/busSimulationService");

/**
 * Controller điều khiển các API mô phỏng xe buýt đang vận hành
 */
class SimulationController {
    /**
     * GET /api/simulation/vehicles
     * Lấy danh sách xe đang di chuyển trên mạng lưới
     */
    async getActiveVehicles(req, res) {
        try {
            const { routeId, direction, simTime } = req.query;
            const targetTime = simTime ? new Date(simTime) : new Date();

            const result = await busSimulationService.getSimulationVehicles({
                targetTime,
                routeId,
                direction,
            });

            return res.status(200).json(result);
        } catch (error) {
            console.error("[SimulationController] Lỗi getActiveVehicles:", error);
            return res.status(500).json({
                success: false,
                mode: "simulation",
                message: "Không thể tính toán dữ liệu mô phỏng phương tiện",
                error: error.message,
            });
        }
    }

    /**
     * GET /api/simulation/stops/:stopId/arrivals
     * Lấy danh sách xe sắp đến một trạm dừng
     */
    async getStopArrivals(req, res) {
        try {
            const { stopId } = req.params;
            const { limit, simTime } = req.query;
            const targetTime = simTime ? new Date(simTime) : new Date();

            if (!stopId) {
                return res.status(400).json({
                    success: false,
                    message: "Thiếu mã trạm dừng (stopId)",
                });
            }

            const result = await busSimulationService.getStopArrivals({
                stopId,
                targetTime,
                limit: limit ? parseInt(limit, 10) : 3,
            });

            return res.status(200).json(result);
        } catch (error) {
            console.error("[SimulationController] Lỗi getStopArrivals:", error);
            return res.status(500).json({
                success: false,
                mode: "simulation",
                message: "Không thể tính toán thời gian xe đến trạm",
                error: error.message,
            });
        }
    }

    /**
     * GET /api/simulation/route-wait
     * Lấy thời gian chờ xe cho một tuyến tại trạm xuất phát
     */
    async getRouteWait(req, res) {
        try {
            const { routeCode, direction, stopId, simTime } = req.query;
            const targetTime = simTime ? new Date(simTime) : new Date();

            if (!routeCode || !stopId) {
                return res.status(400).json({
                    success: false,
                    message: "Cần cung cấp mã tuyến (routeCode) và mã trạm (stopId)",
                });
            }

            const match = await busSimulationService.getRouteWaitTime({
                routeCode,
                direction: direction || "luot_di",
                startStopId: stopId,
                targetTime,
            });

            return res.status(200).json({
                success: true,
                mode: "simulation",
                disclaimer: "MÔ PHỎNG – THỜI GIAN ĐẾN ƯỚC TÍNH",
                timezone: busSimulationService.SIMULATION_TIMEZONE,
                generatedAt: targetTime.toISOString(),
                waitInfo: match,
            });
        } catch (error) {
            console.error("[SimulationController] Lỗi getRouteWait:", error);
            return res.status(500).json({
                success: false,
                mode: "simulation",
                message: "Không thể tính toán thời gian chờ xe",
                error: error.message,
            });
        }
    }
}

module.exports = new SimulationController();
