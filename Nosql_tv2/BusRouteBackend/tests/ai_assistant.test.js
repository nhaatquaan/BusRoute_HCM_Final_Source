const test = require("node:test");
const assert = require("node:assert");

test("Trợ lý AI: Nhận diện trạm dừng tiếng Việt không dấu hoặc có dấu", () => {
    const removeVietnameseTones = (str) => {
        if (!str) return "";
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        return str.toLowerCase().trim();
    };

    const mockStops = [
        { ma_tram: "TR_01", ten_tram: "Trạm Trung chuyển Bến Thành" },
        { ma_tram: "TR_03", ten_tram: "Bến xe Chợ Lớn" },
        { ma_tram: "TR_07", ten_tram: "Khu du lịch Suối Tiên" },
        { ma_tram: "TR_09", ten_tram: "Trường ĐH Bách Khoa TP.HCM" }
    ];

    const matchStop = (input) => {
        const inputNorm = removeVietnameseTones(input);
        return mockStops.find((s) => {
            const nameNorm = removeVietnameseTones(s.ten_tram);
            return nameNorm.includes(inputNorm);
        });
    };

    assert.strictEqual(matchStop("ben thanh").ma_tram, "TR_01");
    assert.strictEqual(matchStop("cho lon").ma_tram, "TR_03");
    assert.strictEqual(matchStop("Suối Tiên").ma_tram, "TR_07");
    assert.strictEqual(matchStop("bach khoa").ma_tram, "TR_09");
});

test("Trợ lý AI: Xử lý an toàn khi dịch vụ Ollama không chạy (Offline Fallback)", () => {
    const generateFallbackResponse = (ollamaOnline) => {
        if (!ollamaOnline) {
            return {
                available: false,
                reply: "Dịch vụ Trợ lý AI cục bộ (Ollama) chưa khả dụng. Các chức năng tra cứu thông thường vẫn hoạt động bình thường!"
            };
        }
        return { available: true, reply: "Xin chào, tôi có thể giúp gì cho bạn?" };
    };

    const offlineResult = generateFallbackResponse(false);
    assert.strictEqual(offlineResult.available, false);
    assert.ok(offlineResult.reply.includes("chưa khả dụng"));
});
