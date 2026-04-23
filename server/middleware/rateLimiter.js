const rateLimit = require("express-rate-limit");

// Общий лимит для всего API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много запросов, попробуйте через 15 минут" },
});

// Жёсткий лимит для auth эндпоинтов
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много попыток входа, попробуйте через 15 минут" },
  skipSuccessfulRequests: true,
});

module.exports = { apiLimiter, authLimiter };
