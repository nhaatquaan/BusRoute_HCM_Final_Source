/**
 * ============================================================================
 * BUSROUTE HCM - AI PROVIDER ABSTRACTION SERVICE
 * Hỗ trợ 3 chế độ:
 * 1. "ollama": Chạy model cục bộ (qwen3.5:4b) trên máy dev / local
 * 2. "gemini": Gọi Google Gemini API qua Cloud REST API (khi cấu hình GEMINI_API_KEY)
 * 3. "disabled" / "fallback": Heuristic Intent & MongoDB Deterministic Formatter
 * ============================================================================
 */

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3.5:4b";
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 180000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const CURRENT_PROVIDER = (process.env.AI_PROVIDER || "ollama").toLowerCase();

/**
 * Kiểm tra trạng thái khả dụng của Provider hiện hành
 */
async function getProviderStatus() {
    if (CURRENT_PROVIDER === "disabled") {
        return {
            provider: "disabled",
            online: false,
            mode: "deterministic_fallback",
            message: "Trợ lý AI đang chạy ở chế độ dự phòng xác thực (Heuristic Offline)."
        };
    }

    if (CURRENT_PROVIDER === "gemini") {
        if (!GEMINI_API_KEY) {
            return {
                provider: "gemini",
                online: false,
                mode: "missing_api_key",
                message: "Chưa cấu hình GEMINI_API_KEY. Hệ thống tự động chuyển sang chế độ dự phòng."
            };
        }
        return {
            provider: "gemini",
            online: true,
            model: GEMINI_MODEL,
            mode: "cloud"
        };
    }

    // Mặc định Ollama
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
            const data = await res.json();
            const hasModel = (data.models || []).some((m) => m.name.includes(OLLAMA_MODEL.split(":")[0]));
            return {
                provider: "ollama",
                online: true,
                model: OLLAMA_MODEL,
                modelFound: hasModel,
                mode: "local"
            };
        }
        return { provider: "ollama", online: false, mode: "deterministic_fallback" };
    } catch (_) {
        return { provider: "ollama", online: false, mode: "deterministic_fallback" };
    }
}

/**
 * Gọi Ollama cục bộ
 */
async function callOllama(prompt, systemPrompt = "", temperature = 0.3) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt,
                system: systemPrompt,
                stream: false,
                keep_alive: "10m",
                think: false,
                options: { temperature, num_predict: 384 }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error(`Ollama HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        return data.response;
    } catch (err) {
        clearTimeout(timeout);
        throw err;
    }
}

/**
 * Gọi Google Gemini API (Cloud)
 */
async function callGemini(prompt, systemPrompt = "") {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY chưa được thiết lập.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
        const payload = {
            contents: [
                {
                    parts: [
                        { text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 500
            }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error(`Gemini API HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || "";
    } catch (err) {
        clearTimeout(timeout);
        throw err;
    }
}

/**
 * Unified Generate function: Tự động phân phối theo provider đang kích hoạt
 */
async function generateAIResponse(prompt, systemPrompt = "", temperature = 0.3) {
    if (CURRENT_PROVIDER === "gemini" && GEMINI_API_KEY) {
        return await callGemini(prompt, systemPrompt);
    }
    if (CURRENT_PROVIDER === "ollama") {
        return await callOllama(prompt, systemPrompt, temperature);
    }
    throw new Error("Không có AI Provider nào khả dụng.");
}

module.exports = {
    getProviderStatus,
    generateAIResponse,
    CURRENT_PROVIDER
};
