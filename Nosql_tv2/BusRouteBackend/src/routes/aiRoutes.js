const express = require("express");
const router = express.Router();

const { chatWithAssistant, getAIStatus } = require("../controllers/aiController");

// Trạng thái AI service (Ollama local)
router.get("/status", getAIStatus);

// Tương tác ngôn ngữ tự nhiên với Trợ lý AI
router.post("/chat", chatWithAssistant);

module.exports = router;
