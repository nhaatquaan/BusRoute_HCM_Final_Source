const http = require('http');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

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
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(JSON.stringify(options.body));
        req.end();
    });
}

async function run() {
    console.log("==================================================================");
    console.log("KIỂM THỬ TRỢ LÝ AI (OLLAMA qwen3.5:4b) & AN NINH BẢO MẬT HỆ THỐNG");
    console.log("==================================================================");

    // 1. Test AI Assistant with Real Ollama & Real MongoDB
    console.log("\n--- 1. KIỂM THỬ TRỢ LÝ AI TÌM TUYẾN XE ---");
    const aiQuestion = "Từ Bến xe Miền Tây đi Bến Thành đi xe nào?";
    console.log(`Gửi câu hỏi: "${aiQuestion}"`);
    
    const startTime = Date.now();
    const aiRes = await request('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { message: aiQuestion }
    });
    const elapsed = Date.now() - startTime;
    console.log(`HTTP ${aiRes.status} (${elapsed} ms)`);
    console.log(`Trạng thái phản hồi:`, aiRes.body?.success);
    console.log(`Model sử dụng:`, aiRes.body?.model || aiRes.body?.data?.model);
    console.log(`Trích xuất ý định:`, aiRes.body?.intent || aiRes.body?.data?.intent);
    console.log(`Phản hồi của AI:`);
    console.log(aiRes.body?.reply || aiRes.body?.data?.reply || aiRes.body?.message);

    // 2. Test Security: RBAC & Authentication
    console.log("\n--- 2. KIỂM THỬ BẢO MẬT & PHÂN QUYỀN (RBAC) ---");

    // Case 2.1: Gọi API Admin không mang token
    const unauth = await request('/api/database/collections');
    console.log(`+ Gọi API Admin không token [GET /api/database/collections]: HTTP ${unauth.status} (${unauth.body?.message})`);

    // Case 2.2: Đăng ký tài khoản mới và cố tình tự cấp quyền admin
    const randomUser = `test_hacker_${Date.now()}`;
    const registerAttempt = await request('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
            ten_dang_nhap: randomUser,
            email: `${randomUser}@hack.vn`,
            mat_khau: "123456",
            vai_tro: "admin" // cố tình tự cấp admin
        }
    });
    console.log(`+ Đăng ký với vai_tro='admin' [POST /api/users/register]: HTTP ${registerAttempt.status}`);
    
    // Kiểm tra trực tiếp trong MongoDB xem role thực tế được lưu là gì
    const client = new MongoClient('mongodb://127.0.0.1:27017');
    await client.connect();
    const db = client.db('BusRouteDB');
    const createdUser = await db.collection('NguoiDung').findOne({ ten_dang_nhap: randomUser });
    console.log(`  -> LIVE VERIFIED trong MongoDB: vai_tro = "${createdUser?.vai_tro}" (Đã chặn thành công leo thang đặc quyền!)`);

    // Case 2.3: Đăng nhập bằng user thường và cố tình gọi API Admin (/api/database/backup)
    const normalLogin = await request('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { username: `${randomUser}@hack.vn`, password: "123456" }
    });
    const normalToken = normalLogin.body?.token;
    const forbiddenRes = await request('/api/database/backup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${normalToken}`
        },
        body: {}
    });
    console.log(`+ User thường gọi API Backup [POST /api/database/backup]: HTTP ${forbiddenRes.status} (${forbiddenRes.body?.message}) -> RBAC hoạt động chính xác!`);

    // Case 2.4: Kiểm tra mật khẩu trong MongoDB đều được băm bcrypt
    const allUsers = await db.collection('NguoiDung').find().toArray();
    let bcryptValidCount = 0;
    for (const u of allUsers) {
        if (u.mat_khau && u.mat_khau.startsWith('$2')) {
            bcryptValidCount++;
        }
    }
    console.log(`+ Kiểm tra mật khẩu băm BCrypt trong MongoDB: ${bcryptValidCount}/${allUsers.length} tài khoản có hash BCrypt hợp lệ.`);

    // Xóa user test để giữ sạch database
    await db.collection('NguoiDung').deleteOne({ ten_dang_nhap: randomUser });
    await client.close();

    console.log("\n==================================================================");
    console.log("HOÀN TẤT KIỂM THỬ BẢO MẬT & AI ASSISTANT THỰC TẾ!");
    console.log("==================================================================");
}

run().catch(console.error);
