const {
    COLLECTIONS,
    getCollectionsOverview,
    getDocuments,
    insertDocument,
    updateDocument,
    deleteDocument,
    getIndexes,
    createCustomIndex,
    getPlaygroundPresets,
    runPlaygroundQuery,
    auditDatabaseIntegrity,
    listBackups,
    createFullBackup,
    restoreFromBackup,
    getFullBackupData,
    restoreFromUploadData,
    exportCollection,
    importCollection
} = require("../services/databaseService");

// 1. Tổng quan các Collections
const getOverview = async (req, res) => {
    try {
        const collections = await getCollectionsOverview();
        return res.status(200).json({
            success: true,
            database: "BusRouteDB",
            totalCollections: collections.length,
            data: collections
        });
    } catch (error) {
        console.error("Get overview error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Lấy danh sách documents
const getCollectionDocuments = async (req, res) => {
    try {
        const { name } = req.params;
        const { page = 1, limit = 20, search = "", sort = "_id", order = 1 } = req.query;
        const result = await getDocuments(name, {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            search,
            sort,
            order: parseInt(order, 10)
        });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("Get documents error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 3. Thêm document mới
const addDocument = async (req, res) => {
    try {
        const { name } = req.params;
        const doc = await insertDocument(name, req.body);
        return res.status(201).json({
            success: true,
            message: "Thêm document thành công",
            data: doc
        });
    } catch (error) {
        console.error("Insert document error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 4. Sửa document
const editDocument = async (req, res) => {
    try {
        const { name, id } = req.params;
        const updated = await updateDocument(name, id, req.body);
        if (!updated) {
            return res.status(404).json({ success: false, message: "Không tìm thấy document" });
        }
        return res.status(200).json({
            success: true,
            message: "Cập nhật document thành công",
            data: updated
        });
    } catch (error) {
        console.error("Update document error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 5. Xóa document
const removeDocument = async (req, res) => {
    try {
        const { name, id } = req.params;
        const deleted = await deleteDocument(name, id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Không tìm thấy document" });
        }
        return res.status(200).json({ success: true, message: "Xóa document thành công" });
    } catch (error) {
        console.error("Delete document error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 6. Lấy indexes
const getCollectionIndexes = async (req, res) => {
    try {
        const { name } = req.params;
        const indexes = await getIndexes(name);
        return res.status(200).json({ success: true, data: indexes });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 7. Tạo index
const createIndex = async (req, res) => {
    try {
        const { name } = req.params;
        const { field, unique = false } = req.body;
        if (!field) {
            return res.status(400).json({ success: false, message: "Vui lòng chọn trường để tạo index" });
        }
        const indexName = await createCustomIndex(name, field, unique);
        return res.status(201).json({
            success: true,
            message: `Tạo index "${indexName}" thành công trên collection ${name}`,
            indexName
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 8. Playground - Danh sách mẫu truy vấn
const getPlaygroundList = (req, res) => {
    const list = getPlaygroundPresets();
    return res.status(200).json({ success: true, total: list.length, data: list });
};

// 9. Playground - Chạy mẫu truy vấn an toàn
const executePlayground = async (req, res) => {
    try {
        const { queryId } = req.body;
        if (!queryId) {
            return res.status(400).json({ success: false, message: "Thiếu mã truy vấn (queryId)" });
        }
        const executionResult = await runPlaygroundQuery(queryId);
        return res.status(200).json({
            success: true,
            message: "Thực thi truy vấn MongoDB thành công",
            ...executionResult
        });
    } catch (error) {
        console.error("Execute playground query error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 10. Audit tính toàn vẹn Database
const getIntegrityReport = async (req, res) => {
    try {
        const report = await auditDatabaseIntegrity();
        return res.status(200).json({ success: true, data: report });
    } catch (error) {
        console.error("Audit integrity error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 11. Backup - Danh sách
const getBackups = (req, res) => {
    const backups = listBackups();
    return res.status(200).json({ success: true, total: backups.length, data: backups });
};

// 12. Backup - Tạo bản mới
const makeBackup = async (req, res) => {
    try {
        const backup = await createFullBackup();
        return res.status(201).json({
            success: true,
            message: "Tạo bản sao lưu Database thành công",
            data: backup
        });
    } catch (error) {
        console.error("Create backup error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 13. Restore - Khôi phục từ bản sao lưu
const restoreBackup = async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            return res.status(400).json({ success: false, message: "Vui lòng chọn file backup cần khôi phục" });
        }
        const result = await restoreFromBackup(filename);
        return res.status(200).json({
            success: true,
            message: "Khôi phục dữ liệu Database thành công",
            data: result
        });
    } catch (error) {
        console.error("Restore backup error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 14. Export dữ liệu
const exportData = async (req, res) => {
    try {
        const { name } = req.params;
        const { format = "json" } = req.query;
        const data = await exportCollection(name, format);

        if (format === "csv") {
            res.header("Content-Type", "text/csv; charset=utf-8");
            res.attachment(`${name}.csv`);
            return res.send(data);
        }

        return res.status(200).json({
            success: true,
            collection: name,
            count: data.length,
            data
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 15. Import dữ liệu
const importData = async (req, res) => {
    try {
        const { name } = req.params;
        const { items, mode = "insert" } = req.body;
        const result = await importCollection(name, items, mode);
        return res.status(200).json({
            success: true,
            message: "Import dữ liệu hoàn tất",
            data: result
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 16. Browser Download toàn bộ Database dưới dạng file JSON (phục vụ Cloud / Vercel demo)
const downloadFullBackup = async (req, res) => {
    try {
        const data = await getFullBackupData();
        const filename = `BusRouteDB_CloudBackup_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(200).send(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Download full backup error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 17. Browser Upload khôi phục Database từ file JSON (phục vụ Cloud / Vercel demo)
const restoreUploadedBackup = async (req, res) => {
    try {
        const backupData = req.body;
        const result = await restoreFromUploadData(backupData);
        return res.status(200).json({
            success: true,
            message: "Khôi phục dữ liệu từ file JSON tải lên thành công",
            data: result
        });
    } catch (error) {
        console.error("Restore uploaded backup error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
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
    downloadFullBackup,
    restoreUploadedBackup,
    exportData,
    importData
};
