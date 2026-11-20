const { defaultService } = require("./routePlanner.service");

class RoutePlannerController {
    constructor(service = defaultService) {
        this.service = service;
    }

    findPath = async (req, res) => {
        try {
            const { from, to, maxDepth, limit, criteria, preference } = req.query;
            const selectedCriteria = criteria || preference || "least_transfers";

            if (!from || typeof from !== "string" || !from.trim()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 400,
                        message:
                            "Thiếu tham số trạm xuất phát (from) hoặc giá trị không hợp lệ."
                    }
                });
            }

            if (!to || typeof to !== "string" || !to.trim()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 400,
                        message:
                            "Thiếu tham số trạm đích (to) hoặc giá trị không hợp lệ."
                    }
                });
            }

            if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 400,
                        message:
                            "Trạm xuất phát và trạm đích không được trùng nhau."
                    }
                });
            }

            let parsedMaxDepth = 15;
            if (maxDepth !== undefined) {
                const num = Number(maxDepth);
                if (!Number.isInteger(num) || num < 1 || num > 30) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 400,
                            message:
                                "Tham số maxDepth không hợp lệ. maxDepth phải là số nguyên dương từ 1 đến 30."
                        }
                    });
                }
                parsedMaxDepth = num;
            }

            let parsedLimit = 5;
            if (limit !== undefined) {
                const num = Number(limit);
                if (!Number.isInteger(num) || num < 1 || num > 20) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 400,
                            message:
                                "Tham số limit không hợp lệ. limit phải là số nguyên dương từ 1 đến 20."
                        }
                    });
                }
                parsedLimit = num;
            }

            const result = await this.service.planRoute(from, to, {
                maxDepth: parsedMaxDepth,
                limit: parsedLimit,
                criteria: selectedCriteria
            });

            return res.status(200).json({
                success: true,
                source: result.source || "mongodb",
                traversalMode: result.traversalMode || "graph_lookup",
                criteria: result.criteria || selectedCriteria,
                criteriaLabel: result.criteriaLabel,
                data: {
                    from: result.from,
                    to: result.to,
                    paths: result.paths,
                    criteria: result.criteria || selectedCriteria
                },
                message: result.message || "Tìm lộ trình thành công."
            });
        } catch (err) {
            const statusCode = err.statusCode || 500;
            return res.status(statusCode).json({
                success: false,
                error: {
                    code: statusCode,
                    message:
                        err.message || "Lỗi máy chủ khi xử lý tìm đường."
                }
            });
        }
    };

    searchByStop = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id || typeof id !== "string" || !id.trim()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 400,
                        message: "Thiếu mã trạm dừng (:id) hợp lệ."
                    }
                });
            }

            const result = await this.service.findRoutesByStop(id);

            return res.status(200).json({
                success: true,
                source: result.source || "mongodb",
                data: {
                    stop: result.stop,
                    totalRoutes: result.totalRoutes,
                    routes: result.routes
                }
            });
        } catch (err) {
            const statusCode = err.statusCode || 500;
            return res.status(statusCode).json({
                success: false,
                error: {
                    code: statusCode,
                    message:
                        err.message || "Lỗi khi tra cứu tuyến xe qua trạm."
                }
            });
        }
    };

    getGraph = async (req, res) => {
        try {
            const { route, stop, limit } = req.query;
            const parsedLimit = limit ? parseInt(limit, 10) : 50;

            const result = await this.service.getGraphData({
                route,
                stop,
                limit: isNaN(parsedLimit)
                    ? 50
                    : Math.min(Math.max(parsedLimit, 5), 150)
            });

            return res.status(200).json({
                success: true,
                source: result.source || "mongodb",
                data: result.data
            });
        } catch (err) {
            console.error("[RoutePlannerController] getGraph error:", err.message);
            return res.status(500).json({
                success: false,
                error: {
                    code: 500,
                    message:
                        err.message ||
                        "Lỗi khi truy vấn dữ liệu đồ thị Cytoscape."
                }
            });
        }
    };
}

const defaultController = new RoutePlannerController();

module.exports = {
    RoutePlannerController,
    defaultController
};
