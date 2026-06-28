require("dotenv").config();
const validateEnv = require("./config/env");
validateEnv();

const express       = require("express");
const cors          = require("cors");
const helmet        = require("helmet");
const morgan        = require("morgan");
const compression   = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser  = require("cookie-parser");
const connectDB     = require("./config/db");
const errorHandler  = require("./middleware/errorMiddleware");
const { apiLimiter } = require("./middleware/rateLimiter");

const authRoutes    = require("./routes/auth");
const doctorRoutes  = require("./routes/doctor");
const bookingRoutes = require("./routes/booking");
const reviewRoutes  = require("./routes/review");
const adminRoutes   = require("./routes/admin");
const profileRoutes = require("./routes/profile");
const webhookRoutes = require("./routes/webhook");
const aiRoutes      = require("./routes/ai");

const app = express();

// КРИТИЧНО: без этого req.ip и, как следствие, apiLimiter/authLimiter/refreshLimiter
// (см. middleware/rateLimiter.js) видят IP реверс-прокси/балансировщика ОДИНАКОВЫМ
// для ВСЕХ пользователей в проде — лимиты на логин/API схлопываются на весь сервис
// разом. Число хопов настраивается через TRUST_PROXY_HOPS (1 — для одного nginx/LB
// перед приложением; увеличить, если в цепочке несколько прокси).
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS) || 1);

connectDB();

// Stripe webhook needs raw body — must be before express.json()
app.use("/api/webhook", webhookRoutes);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(mongoSanitize());

if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

app.use("/api", apiLimiter);

app.use("/api/auth",    authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin",   adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/ai",      aiRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use((req, res) =>
  res.status(404).json({ message: `Маршрут ${req.originalUrl} не найден` })
);
app.use(errorHandler);

const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`SERVER on port ${PORT} [${process.env.NODE_ENV}] 🚀`)
);

// Раньше shutdown закрывал только HTTP-сервер: соединение с MongoDB оставалось
// открытым до того, как процесс просто убивали по таймауту оркестратора —
// в худшем случае это резалось посреди записи. Плюс safety-таймаут: если
// что-то (зависший запрос/соединение) не даёт закрыться штатно, процесс всё
// равно завершится принудительно, а не зависнет вечно при `docker stop`.
const shutdown = () => {
  console.log("Получен сигнал остановки, завершаем работу...");
  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown не успел за 10с — принудительный выход");
    process.exit(1);
  }, 10_000);

  server.close(async () => {
    try {
      await mongoose.connection.close();
    } catch (err) {
      console.error("Ошибка при закрытии соединения с MongoDB:", err.message);
    } finally {
      clearTimeout(forceExit);
      process.exit(0);
    }
  });
};
process.on("SIGTERM", shutdown);
process.on("SIGINT",  shutdown); // Ctrl+C в dev

module.exports = app;
