const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} —`, err.message, "\n", err.stack);

  const statusCode = res.statusCode && res.statusCode !== 200
    ? res.statusCode
    : 500;

  // ВАЖНО: err.message для 5xx может содержать внутренние детали
  // (имена полей/коллекций Mongo, текст драйвера, путь до модуля и т.д.) —
  // это уже происходило здесь раньше (сообщение отдавалось в любом окружении).
  // Для 4xx сообщение — это намеренный бизнес/валидационный текст (его задают
  // сами роуты через throw new Error(...) внутри express-validator .custom()
  // или явный res.status(4xx)), поэтому его безопасно показывать клиенту.
  // Для 5xx в production отдаём общий текст, полную причину видно только в логах.
  const isServerError = statusCode >= 500;
  const safeMessage =
    isServerError && process.env.NODE_ENV === "production"
      ? "Внутренняя ошибка сервера"
      : err.message || "Внутренняя ошибка сервера";

  res.status(statusCode).json({
    message: safeMessage,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
