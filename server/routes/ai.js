const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimiter");

const ALLOWED_ROLES = new Set(["user", "assistant"]);
const AI_TIMEOUT_MS = 30_000; // 30 секунд максимум
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;
const MAX_TOTAL_CHARS = 20_000; // защита от огромных history

router.post("/chat", protect, aiLimiter, async (req, res, next) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages обязательны" });
    }

    const history = messages
      .slice(-MAX_MESSAGES)
      .filter((m) => ALLOWED_ROLES.has(m?.role) && typeof m?.content === "string")
      .map((m) => ({
        role:    m.role,
        content: String(m.content).slice(0, MAX_CONTENT_LENGTH),
      }));

    if (history.length === 0) {
      return res.status(400).json({ message: "Некорректный формат сообщений" });
    }

    // Проверка суммарного размера
    const totalChars = history.reduce((acc, m) => acc + m.content.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return res.status(400).json({ message: "Слишком большой объём сообщений" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ message: "AI-сервис не настроен" });
    }

    // AbortController для timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model:      "claude-sonnet-4-6",
          max_tokens: 1000,
          system:
            "Ты AI-ассистент медицинского сервиса DamuMed (Казахстан). " +
            "Отвечай по-русски, кратко и по делу. Помогай пациентам выбрать специалиста, " +
            "объясняй медицинские термины, давай общие рекомендации. " +
            "Всегда рекомендуй обратиться к врачу для постановки диагноза. " +
            "Никогда не ставь диагнозы и не назначай лечение.",
          messages: history,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Anthropic API error:", err);
      return res.status(502).json({ message: "Ошибка AI-сервиса. Попробуйте позже." });
    }

    const data = await response.json();
    const reply =
      data.content?.find((b) => b.type === "text")?.text ||
      "Не удалось получить ответ.";

    res.json({ reply });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ message: "AI-сервис не отвечает. Попробуйте позже." });
    }
    next(err);
  }
});

module.exports = router;
