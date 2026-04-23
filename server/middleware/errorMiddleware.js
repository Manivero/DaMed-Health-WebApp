const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} —`, err.message);

  const statusCode = res.statusCode && res.statusCode !== 200
    ? res.statusCode
    : 500;

  res.status(statusCode).json({
    message: err.message || "Внутренняя ошибка сервера",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
