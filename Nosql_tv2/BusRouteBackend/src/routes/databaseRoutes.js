const express = require("express");
const router = express.Router();

const {
    getOverview,
    getCollectionDocuments,
    addDocument,
    editDocument,
    removeDocument,
    getCollectionIndexes,
    createIndex,
    getPlaygroundList,
    executePlayground,
    getIntegrityReport,
    getBackups,
    makeBackup,
    restoreBackup,
    exportData,
    importData
} = require("../controllers/databaseController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// 1. Tổng quan Collections & Indexes (Admin Only)
router.get("/collections", protect, adminOnly, getOverview);

// 2. Documents Explorer (Admin Only)
router.get("/collections/:name/documents", protect, adminOnly, getCollectionDocuments);
router.post("/collections/:name/documents", protect, adminOnly, addDocument);
router.put("/collections/:name/documents/:id", protect, adminOnly, editDocument);
router.delete("/collections/:name/documents/:id", protect, adminOnly, removeDocument);

// 3. Index Management (Admin Only)
router.get("/collections/:name/indexes", protect, adminOnly, getCollectionIndexes);
router.post("/collections/:name/indexes", protect, adminOnly, createIndex);

// 4. MongoDB Playground (Admin Only hoặc tra cứu học thuật an toàn)
router.get("/playground/queries", protect, adminOnly, getPlaygroundList);
router.post("/playground/run", protect, adminOnly, executePlayground);

// 5. Database Integrity Audit (Admin Only)
router.get("/integrity", protect, adminOnly, getIntegrityReport);

// 6. Backup & Restore (Admin Only)
router.get("/backup/list", protect, adminOnly, getBackups);
router.post("/backup", protect, adminOnly, makeBackup);
router.post("/restore", protect, adminOnly, restoreBackup);

// 7. Import / Export (Admin Only)
router.get("/export/:name", protect, adminOnly, exportData);
router.post("/import/:name", protect, adminOnly, importData);

module.exports = router;
