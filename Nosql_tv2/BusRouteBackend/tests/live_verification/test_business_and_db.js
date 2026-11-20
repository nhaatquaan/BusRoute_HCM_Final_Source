const http = require('http');
const { MongoClient } = require('mongodb');

async function apiRequest(path, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path,
            method,
            headers
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log("==================================================================");
    console.log("BẮT ĐẦU KIỂM THỬ CHỨC NĂNG NGHIỆP VỤ & DATABASE MANAGEMENT THỰC TẾ");
    console.log("==================================================================");

    // Get Admin Token
    const loginRes = await apiRequest('/api/users/login', 'POST', {
        username: 'admin@busroute.vn',
        password: '123456'
    });
    const token = loginRes.body?.token;
    console.log(`[AUTH] Admin JWT Token: ${token ? 'Đã lấy thành công' : 'Thất bại'}`);

    const client = new MongoClient('mongodb://127.0.0.1:27017');
    await client.connect();
    const db = client.db('BusRouteDB');

    // 1. Quản lý Tuyến xe: Thêm -> Sửa -> Xóa -> Kiểm tra MongoDB
    console.log("\n--- 1. KIỂM THỬ QUẢN LÝ TUYẾN XE (CRUD) ---");
    const testRouteData = {
        ma_tuyen: "999",
        ten_tuyen: "Tuyến thử nghiệm QA Chợ Lớn - Suối Tiên",
        diem_dau: "Bến xe Chợ Lớn",
        diem_cuoi: "Khu du lịch Suối Tiên",
        gia_ve: 8000,
        trang_thai: "active"
    };
    
    // Add Route
    const addRouteRes = await apiRequest('/api/routes', 'POST', testRouteData, token);
    console.log(`+ Thêm tuyến [POST /api/routes]: HTTP ${addRouteRes.status} | ma_tuyen: ${addRouteRes.body?.data?.ma_tuyen || addRouteRes.body?.ma_tuyen}`);
    const inDbAdd = await db.collection('TuyenXe').findOne({ ma_tuyen: "999" });
    console.log(`  -> LIVE VERIFIED trong MongoDB: ${inDbAdd ? 'Tồn tại (' + inDbAdd._id + ')' : 'KHÔNG tìm thấy'}`);

    // Update Route
    const updateRes = await apiRequest(`/api/routes/${inDbAdd._key || 'TX_999'}`, 'PUT', {
        ten_tuyen: "Tuyến thử nghiệm QA (Đã đổi tên)",
        gia_ve: 9000
    }, token);
    console.log(`+ Sửa tuyến [PUT /api/routes/:id]: HTTP ${updateRes.status}`);
    const inDbUpdate = await db.collection('TuyenXe').findOne({ ma_tuyen: "999" });
    console.log(`  -> LIVE VERIFIED trong MongoDB: Tên mới: "${inDbUpdate?.ten_tuyen}" | Giá mới: ${inDbUpdate?.gia_ve}`);

    // Delete Route
    const delRes = await apiRequest(`/api/routes/${inDbAdd._key || 'TX_999'}`, 'DELETE', null, token);
    console.log(`+ Xóa tuyến [DELETE /api/routes/:id]: HTTP ${delRes.status}`);
    const inDbDel = await db.collection('TuyenXe').findOne({ ma_tuyen: "999" });
    console.log(`  -> LIVE VERIFIED trong MongoDB: ${inDbDel === null ? 'Đã xóa hoàn toàn sạch sẽ khỏi MongoDB' : 'Vẫn còn tồn tại!'}`);

    // 2. Quản lý Trạm dừng: Thêm -> Sửa -> Xóa -> Kiểm tra MongoDB
    console.log("\n--- 2. KIỂM THỬ QUẢN LÝ TRẠM DỪNG (CRUD) ---");
    const testStopData = {
        ma_tram: "TR_TEST",
        ten_tram: "Trạm thử nghiệm QA Quận 1",
        dia_chi: "123 Lê Duẩn, Quận 1, TP.HCM",
        kinh_do: 106.7001,
        vi_do: 10.7789,
        trang_thai: "active"
    };

    // Add Stop
    const addStopRes = await apiRequest('/api/stops', 'POST', testStopData, token);
    console.log(`+ Thêm trạm [POST /api/stops]: HTTP ${addStopRes.status}`);
    const inDbStopAdd = await db.collection('TramDung').findOne({ ma_tram: "TR_TEST" });
    console.log(`  -> LIVE VERIFIED trong MongoDB: ${inDbStopAdd ? 'Tồn tại (' + inDbStopAdd._id + ', GPS: ' + inDbStopAdd.kinh_do + ', ' + inDbStopAdd.vi_do + ')' : 'KHÔNG tìm thấy'}`);

    // Update Stop
    const updateStopRes = await apiRequest(`/api/stops/${inDbStopAdd._key || 'TR_TEST'}`, 'PUT', {
        ten_tram: "Trạm thử nghiệm QA (Đã cập nhật)",
        dia_chi: "456 Lê Duẩn, Quận 1, TP.HCM"
    }, token);
    console.log(`+ Sửa trạm [PUT /api/stops/:id]: HTTP ${updateStopRes.status}`);
    const inDbStopUpdate = await db.collection('TramDung').findOne({ ma_tram: "TR_TEST" });
    console.log(`  -> LIVE VERIFIED trong MongoDB: Tên mới: "${inDbStopUpdate?.ten_tram}"`);

    // Delete Stop
    const delStopRes = await apiRequest(`/api/stops/${inDbStopAdd._key || 'TR_TEST'}`, 'DELETE', null, token);
    console.log(`+ Xóa trạm [DELETE /api/stops/:id]: HTTP ${delStopRes.status}`);
    const inDbStopDel = await db.collection('TramDung').findOne({ ma_tram: "TR_TEST" });
    console.log(`  -> LIVE VERIFIED trong MongoDB: ${inDbStopDel === null ? 'Đã xóa sạch sẽ khỏi MongoDB' : 'Vẫn còn tồn tại!'}`);

    // 3. Tìm đường thực tế (Route Planner)
    console.log("\n--- 3. KIỂM THỬ THUẬT TOÁN TÌM LỘ TRÌNH VỚI MONGODB ---");
    // Case 1: Cùng tuyến (TR_01 Bến Thành -> TR_04 Chợ Cũ trên Tuyến 01)
    const directRes = await apiRequest('/api/path?from=TR_01&to=TR_04');
    console.log(`+ Kịch bản 1: Hai trạm cùng tuyến (TR_01 -> TR_04): HTTP ${directRes.status}`);
    console.log(`  - Nguồn dữ liệu: ${directRes.body?.source} | Thuật toán: ${directRes.body?.traversalMode}`);
    console.log(`  - Số phương án tìm được: ${directRes.body?.data?.paths?.length}`);

    // Case 2: Chuyển tuyến (TR_01 Bến Thành -> TR_14 ĐH Bách Khoa)
    const transferRes = await apiRequest('/api/path?from=TR_01&to=TR_14');
    console.log(`+ Kịch bản 2: Lộ trình qua mạng lưới (TR_01 -> TR_14): HTTP ${transferRes.status}`);
    console.log(`  - Số phương án tìm được: ${transferRes.body?.data?.paths?.length}`);

    // Case 3: Trạm không tồn tại
    const invalidRes = await apiRequest('/api/path?from=TR_01&to=TR_NOT_EXIST');
    console.log(`+ Kịch bản 3: Trạm không tồn tại (TR_01 -> TR_NOT_EXIST): HTTP ${invalidRes.status}`);
    console.log(`  - Phản hồi an toàn: "${invalidRes.body?.error?.message || invalidRes.body?.message || 'Không tìm thấy trạm'}"`);

    // 4. Chạy trực tiếp MongoDB Aggregation Pipelines chuyên sâu
    console.log("\n--- 4. KIỂM THỬ TRUY VẤN NÂNG CAO TRÊN MONGODB ($lookup, $graphLookup) ---");
    
    // Pipeline A: $lookup nối Tuyến -> Trạm qua CO_TRAM
    const lookupTest = await db.collection('TuyenXe').aggregate([
        { $match: { ma_tuyen: "01" } },
        {
            $lookup: {
                from: "CO_TRAM",
                localField: "_id",
                foreignField: "_from",
                as: "route_stops"
            }
        },
        {
            $project: {
                ma_tuyen: 1,
                ten_tuyen: 1,
                so_luong_tram: { $size: "$route_stops" }
            }
        }
    ]).toArray();
    console.log(`+ Pipeline $lookup kết nối TuyenXe và CO_TRAM: Tuyến ${lookupTest[0]?.ma_tuyen} có ${lookupTest[0]?.so_luong_tram} trạm phục vụ.`);

    // Pipeline B: $graphLookup duyệt đồ thị mạng lưới xe buýt
    const graphLookupTest = await db.collection('TramDung').aggregate([
        { $match: { ma_tram: "TR_01" } },
        {
            $graphLookup: {
                from: "KE_TIEP",
                startWith: "$_id",
                connectFromField: "_to",
                connectToField: "_from",
                as: "reachable_stops",
                maxDepth: 3,
                depthField: "num_hops"
            }
        },
        {
            $project: {
                ma_tram: 1,
                ten_tram: 1,
                tong_tram_co_the_den: { $size: "$reachable_stops" },
                cac_trang_thiet_bi: {
                    $slice: [
                        {
                            $map: {
                                input: "$reachable_stops",
                                as: "stop",
                                in: { to: "$$stop._to", hop: "$$stop.num_hops", route: "$$stop.ma_tuyen" }
                            }
                        },
                        5
                    ]
                }
            }
        }
    ]).toArray();
    console.log(`+ Pipeline $graphLookup từ đỉnh [TR_01]: Duyệt sâu maxDepth 3 tới ${graphLookupTest[0]?.tong_tram_co_the_den} trạm kế tiếp!`);
    console.log(`  - 5 trạm mẫu tiếp cận:`, graphLookupTest[0]?.cac_trang_thiet_bi);

    // 5. Database Management: Preset Playground Query & Backup
    console.log("\n--- 5. KIỂM THỬ DATABASE MANAGEMENT API ---");
    
    // Preset queries list
    const playgroundQueries = await apiRequest('/api/database/playground/queries', 'GET', null, token);
    console.log(`+ Danh sách Query Playground: HTTP ${playgroundQueries.status} | Số preset có sẵn: ${playgroundQueries.body?.queries?.length}`);

    // Run Preset Query (Query ID 1)
    const runPlayground = await apiRequest('/api/database/playground/run', 'POST', { queryId: 1 }, token);
    console.log(`+ Chạy preset query 1 [POST /api/database/playground/run]: HTTP ${runPlayground.status} | Thời gian thực thi: ${runPlayground.body?.executionTimeMs} ms | Số kết quả: ${runPlayground.body?.result?.length}`);

    // Backup Generation
    const backupRes = await apiRequest('/api/database/backup', 'POST', {}, token);
    console.log(`+ Tạo bản Backup [POST /api/database/backup]: HTTP ${backupRes.status} | File backup: ${backupRes.body?.filename}`);

    // Backup List
    const backupList = await apiRequest('/api/database/backup/list', 'GET', null, token);
    console.log(`+ Danh sách Backup [GET /api/database/backup/list]: HTTP ${backupList.status} | Số bản backup: ${backupList.body?.backups?.length}`);

    await client.close();
    console.log("\n==================================================================");
    console.log("HOÀN TẤT KIỂM THỬ THỰC TẾ TRÊN MONGODB 9.0.8 THẬT!");
    console.log("==================================================================");
}

run().catch(console.error);
