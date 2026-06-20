const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много запросов, попробуйте через 15 минут" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много попыток входа, попробуйте через 15 минут" },
  skipSuccessfulRequests: true,
});

// Раньше /api/auth/refresh не имел собственного лимита — был защищён только
// общим apiLimiter (100/15мин на ВСЕ /api эндпоинты разом). Отдельный лимит
// нужен, чтобы скомпрометированный refresh-токен не позволял злоумышленнику
// генерировать access-токены безостановочно, не выделяясь на фоне обычного
// трафика пользователя.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много попыток обновления токена. Попробуйте позже." },
});

// Лимит для AI: 10 запросов в минуту на пользователя
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Превышен лимит запросов к AI. Попробуйте через минуту." },
});

module.exports = { apiLimiter, authLimiter, refreshLimiter, aiLimiter };
