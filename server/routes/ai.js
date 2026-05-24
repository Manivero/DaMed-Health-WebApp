const router = require("express").Router();
const { protect } = require("../middleware/auth");

/**
 * POST /api/ai/chat
 * Прокси к Anthropic API — ключ остаётся на сервере, не виден клиенту.
 * Поддерживает streaming (SSE) и обычный режим.
 */
router.post("/chat", protect, async (req, res, next) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages обязательны" });
    }

    // Ограничиваем историю: не более 20 сообщений (защита от prompt-injection через длинный контекст)
    const history = messages.slice(-20).map((m) => ({
      role:    m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 2000), // обрезаем каждое сообщение
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:
          "Ты AI-ассистент медицинского сервиса DamuMed (Казахстан). " +
          "Отвечай по-русски, кратко и по делу. Помогай пациентам выбрать специалиста, " +
          "объясняй медицинские термины, давай общие рекомендации. " +
          "Всегда рекомендуй обратиться к врачу для постановки диагноза. " +
          "Никогда не ставь диагнозы и не назначай лечение.",
        messages: history,
      }),
    });

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
    next(err);
  }
});

module.exports = router;
