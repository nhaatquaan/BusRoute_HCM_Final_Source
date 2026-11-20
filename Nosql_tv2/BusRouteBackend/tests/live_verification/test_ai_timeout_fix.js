const http = require('http');

async function sendAiChat(message, timeoutMs = 180000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const data = JSON.stringify({ message });
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/ai/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            },
            timeout: timeoutMs
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                const elapsed = Date.now() - start;
                try {
                    resolve({ status: res.statusCode, elapsed, body: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, elapsed, raw: body });
                }
            });
        });

        req.on('timeout', () => {
            req.destroy(new Error(`timeout of ${timeoutMs}ms exceeded`));
        });

        req.on('error', err => {
            const elapsed = Date.now() - start;
            reject({ error: err.message, elapsed });
        });

        req.write(data);
        req.end();
    });
}

async function run() {
    console.log("==================================================================");
    console.log("KIỂM THỬ XÁC MINH FIX TIMEOUT AI ASSISTANT VỚI OLLAMA VÀ MONGODB");
    console.log("==================================================================");

    // Test 1: Bến Thành -> Chợ Lớn
    console.log("\n[TEST 1] Tìm đường Bến Thành -> Chợ Lớn");
    try {
        const t1 = await sendAiChat("Tôi muốn đi từ Bến Thành đến Chợ Lớn, ưu tiên ít chuyển tuyến.", 180000);
        console.log(`- Trạng thái HTTP: ${t1.status} | Thời gian phản hồi: ${t1.elapsed} ms`);
        console.log(`- Thành công: ${t1.body?.success} | Số phương án: ${t1.body?.data?.paths?.length}`);
        console.log(`- Phản hồi từ AI:\n${t1.body?.reply?.substring(0, 350)}...`);
    } catch (err) {
        console.error("- Lỗi:", err);
    }

    // Test 2: Trạm qua Bến Thành
    console.log("\n[TEST 2] Tra cứu thông tin tuyến qua trạm Bến Thành");
    try {
        const t2 = await sendAiChat("Cho tôi biết những tuyến xe buýt đi qua trạm Bến Thành?", 180000);
        console.log(`- Trạng thái HTTP: ${t2.status} | Thời gian phản hồi: ${t2.elapsed} ms`);
        console.log(`- Tổng tuyến qua trạm: ${t2.body?.data?.totalRoutes}`);
        console.log(`- Phản hồi từ AI:\n${t2.body?.reply?.substring(0, 350)}...`);
    } catch (err) {
        console.error("- Lỗi:", err);
    }

    // Test 3: Trạm không tồn tại
    console.log("\n[TEST 3] Trạm không tồn tại (Sân bay Sao Hỏa)");
    try {
        const t3 = await sendAiChat("Từ Bến Thành đi Sân bay Sao Hỏa đi xe nào?", 180000);
        console.log(`- Trạng thái HTTP: ${t3.status} | Thời gian: ${t3.elapsed} ms`);
        console.log(`- Phản hồi an toàn:\n${t3.body?.reply}`);
    } catch (err) {
        console.error("- Lỗi:", err);
    }

    // Test 4: Mô phỏng Client Abort (Hủy request khi đang xử lý sau 500ms)
    console.log("\n[TEST 4] Mô phỏng người dùng nhấn nút 'Hủy yêu cầu' sau 500ms");
    try {
        const abortPromise = new Promise((resolve, reject) => {
            const start = Date.now();
            const data = JSON.stringify({ message: "Từ Bến xe Quận 8 đi Suối Tiên" });
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/ai/chat',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, res => {
                resolve({ status: res.statusCode, elapsed: Date.now() - start });
            });
            req.on('error', err => {
                resolve({ aborted: true, message: err.message, elapsed: Date.now() - start });
            });
            req.write(data);
            req.end();

            // Hủy sau 500ms
            setTimeout(() => {
                req.destroy(new Error("Request canceled by user"));
            }, 500);
        });
        const t4 = await abortPromise;
        console.log(`- Đã hủy request thành công sau: ${t4.elapsed} ms | Lý do: ${t4.message || 'Aborted'}`);
    } catch (err) {
        console.error("- Lỗi hủy:", err);
    }

    console.log("\n==================================================================");
    console.log("HOÀN TẤT BÀI KIỂM THỬ XÁC MINH FIX TIMEOUT!");
    console.log("==================================================================");
}

run().catch(console.error);
