const http = require('http');

async function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path,
            method: options.method || 'GET',
            headers: options.headers || {}
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, headers: res.headers, body: parsed });
                } catch {
                    resolve({ status: res.statusCode, headers: res.headers, raw: data });
                }
            });
        });
        req.on('error', reject);
        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
}

async function runLiveApiTests() {
    console.log("=== BẮT ĐẦU KIỂM THỬ HTTP API VỚI MONGODB THẬT ===");
    
    // 1. Health
    const health = await request('/api/health');
    console.log(`1. Health Check [GET /api/health]: HTTP ${health.status} | DB Connected: ${health.body?.database?.connected} | MongoDB: ${health.body?.database?.service || 'OK'}`);

    // 2. Login
    const login = await request('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { username: 'admin@busroute.vn', password: 'password123' }
    });
    let token = login.body?.token;
    if (!token) {
        const login2 = await request('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { username: 'admin@busroute.vn', password: '123456' }
        });
        token = login2.body?.token;
        console.log(`2. Login Admin [POST /api/users/login]: HTTP ${login2.status} | Token: ${Boolean(token)} | Role: ${login2.body?.user?.vai_tro || login2.body?.user?.role}`);
    } else {
        console.log(`2. Login Admin [POST /api/users/login]: HTTP ${login.status} | Token: ${Boolean(token)} | Role: ${login.body?.user?.vai_tro || login.body?.user?.role}`);
    }

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 3. Get Routes
    const routesRes = await request('/api/routes');
    console.log(`3. Danh sách tuyến [GET /api/routes]: HTTP ${routesRes.status} | Tổng số tuyến từ MongoDB: ${routesRes.body?.total || routesRes.body?.data?.length}`);

    // 4. Get Stops
    const stopsRes = await request('/api/stops');
    console.log(`4. Danh sách trạm [GET /api/stops]: HTTP ${stopsRes.status} | Tổng số trạm từ MongoDB: ${stopsRes.body?.total || stopsRes.body?.data?.length}`);

    // 5. Get Route Detail
    const routeDetail = await request('/api/routes/TX_01');
    console.log(`5. Chi tiết tuyến [GET /api/routes/TX_01]: HTTP ${routeDetail.status} | Tuyến: [${routeDetail.body?.ma_tuyen || routeDetail.body?.data?.ma_tuyen}] ${routeDetail.body?.ten_tuyen || routeDetail.body?.data?.ten_tuyen} | Số trạm gán: ${routeDetail.body?.stops?.length || routeDetail.body?.data?.stops?.length}`);

    // 6. Get Users (Protected Admin)
    const usersRes = await request('/api/users', { headers: authHeaders });
    console.log(`6. Danh sách người dùng [GET /api/users]: HTTP ${usersRes.status} | Tổng users từ MongoDB: ${usersRes.body?.total || usersRes.body?.data?.length}`);

    // 7. Route Planner (GET /api/path?from=TR_01&to=TR_04)
    const planRes = await request('/api/path?from=TR_01&to=TR_04');
    console.log(`7. Tìm kiếm lộ trình [GET /api/path?from=TR_01&to=TR_04]: HTTP ${planRes.status} | Phương án tìm thấy: ${planRes.body?.data?.paths?.length} | Chế độ: ${planRes.body?.data?.routeInfo?.source || planRes.body?.source} | Điểm đi: ${planRes.body?.data?.paths?.[0]?.origin?.name} -> Điểm đến: ${planRes.body?.data?.paths?.[0]?.destination?.name}`);

    // 8. Search Routes by Stop
    const byStop = await request('/api/search/by-stop/TR_01');
    console.log(`8. Tuyến qua trạm [GET /api/search/by-stop/TR_01]: HTTP ${byStop.status} | Trạm: ${byStop.body?.data?.stop?.name} | Tuyến qua trạm: ${byStop.body?.data?.totalRoutes}`);

    // 9. Graph Data
    const graphRes = await request('/api/graph');
    console.log(`9. Dữ liệu đồ thị [GET /api/graph]: HTTP ${graphRes.status} | Nodes: ${graphRes.body?.data?.nodes?.length} | Edges: ${graphRes.body?.data?.edges?.length}`);

    // 10. Analytics
    const analytics = await request('/api/analytics/network');
    console.log(`10. Thống kê mạng lưới [GET /api/analytics/network]: HTTP ${analytics.status} | KPIs: Routes=${analytics.body?.summary?.totalRoutes}, Stops=${analytics.body?.summary?.totalStops}, CO_TRAM=${analytics.body?.summary?.totalCoTram}, KE_TIEP=${analytics.body?.summary?.totalKeTiep}`);

    // 11. Database Explorer
    const dbCols = await request('/api/database/collections', { headers: authHeaders });
    const colList = (dbCols.body?.collections || dbCols.body?.data || []).map(c => `${c.name}(${c.count})`).join(', ');
    console.log(`11. Database Explorer [GET /api/database/collections]: HTTP ${dbCols.status} | Collections: ${colList}`);

    // 12. Database Integrity (GET /api/database/integrity)
    const auditRes = await request('/api/database/integrity', { headers: authHeaders });
    const orphanCount = (auditRes.body?.metrics?.orphanCoTram || 0) + (auditRes.body?.metrics?.orphanKeTiep || 0);
    console.log(`12. Database Integrity [GET /api/database/integrity]: HTTP ${auditRes.status} | Trạng thái: ${auditRes.body?.status || auditRes.body?.data?.status} | Cạnh mồ côi: ${orphanCount} | Tọa độ sai: ${auditRes.body?.metrics?.invalidCoordinates || 0}`);
}

runLiveApiTests().catch(console.error);
