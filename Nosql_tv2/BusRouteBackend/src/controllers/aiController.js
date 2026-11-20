const { db } = require("../config/database");
const { defaultService: routePlannerService } = require("../modules/route-planner/routePlanner.service");
const {
    getProviderStatus,
    generateAIResponse,
    CURRENT_PROVIDER
} = require("../services/aiProviderService");

// Chuẩn hóa chuỗi tìm kiếm tiếng Việt không dấu
const removeVietnameseTones = (str) => {
    if (!str) return "";
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase().trim();
};

// Tìm trạm phù hợp nhất trong MongoDB từ chuỗi người dùng nhập
const findMatchingStopInDB = async (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return null;
    const clean = searchTerm.trim();
    const cleanNorm = removeVietnameseTones(clean);

    const allStops = await db.collection("TramDung").find({}).toArray();

    // 1. Khớp chính xác theo mã hoặc tên
    const exactMatch = allStops.find(
        (s) =>
            (s.ma_tram && s.ma_tram.toLowerCase() === clean.toLowerCase()) ||
            (s.ten_tram && s.ten_tram.toLowerCase() === clean.toLowerCase())
    );
    if (exactMatch) return exactMatch;

    // 2. Khớp chuỗi con có dấu
    const substringMatch = allStops.find(
        (s) => s.ten_tram && s.ten_tram.toLowerCase().includes(clean.toLowerCase())
    );
    if (substringMatch) return substringMatch;

    // 3. Khớp không dấu
    const toneFreeMatch = allStops.find((s) => {
        const nameNorm = removeVietnameseTones(s.ten_tram || "");
        const addrNorm = removeVietnameseTones(s.dia_chi || "");
        return nameNorm.includes(cleanNorm) || addrNorm.includes(cleanNorm);
    });
    if (toneFreeMatch) return toneFreeMatch;

    return null;
};

/**
 * Controller xử lý tin nhắn của Trợ lý AI
 */
const chatWithAssistant = async (req, res) => {
    const { message } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({
            success: false,
            message: "Vui lòng nhập nội dung câu hỏi."
        });
    }

    // 1. Kiểm tra trạng thái AI Provider (Ollama / Gemini / Fallback)
    const providerStatus = await getProviderStatus();

    try {
        // 2. Trích xuất Intent và Thực thể (Heuristic Pattern siêu tốc + Fallback AI)
        let extractedJson = null;

        const lowerMsg = message.toLowerCase();
        const routeMatch = lowerMsg.match(/(?:từ|tu)\s+([^,]+?)\s+(?:đến|den|đi|di|về|ve|tới|toi)\s+([^?.,]+)/i);
        if (routeMatch) {
            let orig = routeMatch[1].trim();
            let dest = routeMatch[2].trim();
            // Lọc bỏ các từ hỏi ở cuối câu như "đi xe nào", "đi xe buýt nào", "có xe gì", "mất bao lâu"
            dest = dest.replace(/\s*(?:đi|co|tuyen|xe|bang|nhu)\s+(?:xe\s+nào|xe\s+gi|xe\s+buýt\s+nào|gì|nào|bao\s+lâu|the\s+nao|thế\s+nào).*/i, "").trim();
            dest = dest.replace(/\s+(?:đi\s+xe\s+nào|đi\s+gì|như\s+thế\s+nào|mất\s+bao\s+lâu).*/i, "").trim();

            extractedJson = {
                intent: "plan_route",
                origin: orig,
                destination: dest
            };
        } else if (lowerMsg.match(/(?:tuyến|tuyen|xe)\s*(?:số|so)?\s*(\d+)/i)) {
            const m = lowerMsg.match(/(?:tuyến|tuyen|xe)\s*(?:số|so)?\s*(\d+)/i);
            extractedJson = {
                intent: "route_info",
                route: m[1]
            };
        } else if (lowerMsg.includes("trạm") || lowerMsg.includes("tram")) {
            const m = lowerMsg.replace(/.*(?:trạm|tram)\s*/i, "").split(/[?.,]/)[0];
            extractedJson = {
                intent: "stop_info",
                stop: m.trim()
            };
        }

        if (!extractedJson) {
            const extractionSystemPrompt = `Bạn là bộ phân tích ý định cho hệ thống xe buýt TP.HCM (BUSROUTE HCM).
Nhiệm vụ của bạn là nhận câu nói của người dùng và trả về DUY NHẤT một chuỗi JSON hợp lệ không có markdown bọc ngoài theo mẫu:
{
  "intent": "plan_route" | "stop_info" | "nearby_stops" | "general_qa",
  "origin": "tên trạm đi hoặc null",
  "destination": "tên trạm đến hoặc null",
  "stop": "tên trạm cần xem tuyến đi qua hoặc null",
  "preference": "ít chuyển tuyến" | "nhanh nhất" | null
}`;
            if (providerStatus.online) {
                try {
                    const rawExtraction = await generateAIResponse(
                        `Phân tích câu sau: "${message}"`,
                        extractionSystemPrompt,
                        0.1
                    );
                    const jsonText = rawExtraction.substring(
                        rawExtraction.indexOf("{"),
                        rawExtraction.lastIndexOf("}") + 1
                    );
                    extractedJson = JSON.parse(jsonText);
                } catch (_) {
                    extractedJson = { intent: "general_qa" };
                }
            } else {
                extractedJson = { intent: "general_qa" };
            }
        }

        // 3. Xử lý theo từng Intent với dữ liệu MongoDB THỰC TẾ
        let resultData = null;
        let contextForAI = "";

        if (extractedJson.intent === "plan_route" && extractedJson.origin && extractedJson.destination) {
            const originStop = await findMatchingStopInDB(extractedJson.origin);
            const destStop = await findMatchingStopInDB(extractedJson.destination);

            if (!originStop || !destStop) {
                const missing = !originStop ? `không tìm thấy trạm xuất phát "${extractedJson.origin}"` : `không tìm thấy trạm đích "${extractedJson.destination}"`;
                return res.status(200).json({
                    success: true,
                    available: true,
                    reply: `Hệ thống ${missing} trong cơ sở dữ liệu MongoDB. Bạn có thể thử tìm theo các trạm lớn như: Bến Thành, Chợ Lớn, Hàng Xanh, Suối Tiên, ĐH Bách Khoa...`,
                    extracted: extractedJson
                });
            }

            // Gọi Route Planner Service của MongoDB
            const pathResult = await routePlannerService.planRoute(originStop._id, destStop._id, { limit: 3 });
            resultData = pathResult;

            contextForAI = `DỮ LIỆU TÌM ĐƯỜNG THỰC TẾ TỪ MONGODB:
Trạm xuất phát: ${originStop.ten_tram || originStop.tenTram} (${originStop.ma_tram || originStop.maTram})
Trạm đích: ${destStop.ten_tram || destStop.tenTram} (${destStop.ma_tram || destStop.maTram})
Số phương án tìm thấy: ${pathResult.paths ? pathResult.paths.length : 0}
${(pathResult.paths || []).map((p, idx) => `
Phương án ${idx + 1}:
- Tuyến xe: ${p.routes.join(", ")}
- Số lần chuyển tuyến: ${p.transfers === null ? "Đang xác thực" : p.transfers}
- Tổng số trạm: ${p.totalStops}
- Các trạm đi qua: ${p.stops.map((s) => s.name).join(" -> ")}
`).join("\n")}`;

        } else if ((extractedJson.intent === "stop_info" || extractedJson.stop) && (extractedJson.stop || extractedJson.origin)) {
            const stopName = extractedJson.stop || extractedJson.origin;
            const targetStop = await findMatchingStopInDB(stopName);

            if (!targetStop) {
                return res.status(200).json({
                    success: true,
                    available: true,
                    reply: `Hệ thống không tìm thấy trạm dừng nào có tên "${stopName}" trong cơ sở dữ liệu MongoDB.`,
                    extracted: extractedJson
                });
            }

            const stopRoutes = await routePlannerService.findRoutesByStop(targetStop._id);
            resultData = stopRoutes;

            contextForAI = `DỮ LIỆU TRẠM THỰC TẾ TỪ MONGODB:
Trạm: ${targetStop.ten_tram || targetStop.tenTram} (${targetStop.ma_tram || targetStop.maTram})
Địa chỉ: ${targetStop.dia_chi || targetStop.diaChi}
Tổng số tuyến phục vụ: ${stopRoutes.totalRoutes}
Các tuyến: ${stopRoutes.routes.map((r) => `${r.maTuyen} (${r.tenTuyen}) - Giá vé: ${r.giaVe}đ`).join("; ")}`;
        } else {
            // Câu hỏi chung: Lấy thống kê mạng lưới
            const routeCount = await db.collection("TuyenXe").countDocuments();
            const stopCount = await db.collection("TramDung").countDocuments();
            contextForAI = `Hệ thống BusRoute HCM quản lý trên MongoDB hiện có ${routeCount} tuyến xe buýt và ${stopCount} trạm dừng tại TP.HCM. Giá vé phổ thông từ 5.000đ đến 7.000đ/lượt.`;
        }

        // 4. Cho AI diễn giải kết quả bằng Tiếng Việt thân thiện dựa TRÊN DỮ LIỆU ĐÃ CUNG CẤP
        const explainSystemPrompt = `Bạn là Trợ lý Xe buýt TP.HCM (BUSROUTE HCM) thông minh, tận tâm và chuyên nghiệp.
QUY TẮC CỐT LÕI:
1. Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, có cấu trúc rõ ràng (dùng bullet points khi phù hợp).
2. TUYỆT ĐỐI KHÔNG tự bịa ra tuyến xe buýt, mã trạm hay giá vé không có trong dữ liệu được cung cấp bên dưới.
3. Chỉ hướng dẫn và giải thích dựa trên các phương án thực tế được cung cấp.`;

        const finalPrompt = `Dữ liệu hệ thống cung cấp:
${contextForAI}

Câu hỏi của người dùng: "${message}"

Hãy trả lời và hướng dẫn người dùng một cách chu đáo, dễ hiểu nhất.`;

        let aiResponse;
        if (providerStatus.online) {
            try {
                aiResponse = await generateAIResponse(finalPrompt, explainSystemPrompt, 0.4);
            } catch (aiErr) {
                console.warn("AI synthesis warning (sử dụng fallback trực tiếp từ MongoDB):", aiErr.message);
                aiResponse = `Dựa trên cơ sở dữ liệu MongoDB thực tế:\n\n${contextForAI}\n\n*(Thông báo: Mô hình AI phản hồi chậm hoặc đang bận; hệ thống đã tự động trích xuất kết quả chính xác trực tiếp từ MongoDB để đảm bảo thông tin thông suốt).*`;
            }
        } else {
            aiResponse = `Dựa trên cơ sở dữ liệu MongoDB thực tế:\n\n${contextForAI}\n\n*(Chế độ tra cứu dữ liệu thực tế MongoDB - Không phụ thuộc Cloud AI).*`;
        }

        return res.status(200).json({
            success: true,
            available: providerStatus.online,
            provider: providerStatus.provider,
            mode: providerStatus.mode,
            reply: aiResponse,
            extracted: extractedJson,
            data: resultData
        });
    } catch (error) {
        console.error("AI assistant error:", error);
        return res.status(200).json({
            success: true,
            available: false,
            reply: "Hệ thống tra cứu đang hoạt động dựa trên MongoDB. Bạn có thể sử dụng tính năng Tra cứu lộ trình trực tiếp.",
            message: error.message
        });
    }
};

// Lấy thông tin trạng thái dịch vụ AI
const getAIStatus = async (req, res) => {
    const status = await getProviderStatus();
    return res.status(200).json({
        success: true,
        ...status
    });
};

module.exports = {
    chatWithAssistant,
    getAIStatus
};
