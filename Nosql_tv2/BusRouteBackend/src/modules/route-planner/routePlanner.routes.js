const express = require("express");
const { RoutePlannerRepository, defaultRepository } = require("./routePlanner.repository");
const { RoutePlannerService, defaultService } = require("./routePlanner.service");
const { RoutePlannerController, defaultController } = require("./routePlanner.controller");

function createRoutePlannerRouter(options = {}) {
    const router = express.Router();

    let controller = options.controller;
    if (!controller) {
        let service = options.service;
        if (!service) {
            let repository = options.repository;
            if (!repository) {
                repository = options.db
                    ? new RoutePlannerRepository(options.db)
                    : defaultRepository;
            }
            service = new RoutePlannerService(repository);
        }
        controller = new RoutePlannerController(service);
    }

    // API Tìm đường giữa 2 trạm (Quy ước 3.2: GET /api/path?from=TR_A&to=TR_D)
    router.get("/path", controller.findPath);

    // API Tìm tuyến đi qua 1 trạm (Quy ước 3.2: GET /api/search/by-stop/:id)
    router.get("/search/by-stop/:id", controller.searchByStop);

    // API Trực quan hóa đồ thị Cytoscape.js (GET /api/graph)
    router.get("/graph", controller.getGraph);

    return router;
}

const routePlannerRouter = createRoutePlannerRouter();

module.exports = {
    createRoutePlannerRouter,
    routePlannerRouter
};
