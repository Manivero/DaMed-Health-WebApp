require("dotenv").config();
const validateEnv = require("./config/env");
validateEnv();

const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB  = require("./config/db");
const errorHandler = require("./middleware/errorMiddleware");
const { apiLimiter } = require("./middleware/rateLimiter");

const authRoutes    = require("./routes/auth");
const doctorRoutes  = require("./routes/doctor");
const bookingRoutes = require("./routes/booking");
const reviewRoutes  = require("./routes/review");
const adminRoutes   = require("./routes/admin");
const profileRoutes = require("./routes/profile");
const webhookRoutes = require("./routes/webhook");

const app = express();
connectDB();

// Stripe webhook needs raw body — must be before express.json()
app.use("/api/webhook", webhookRoutes);

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10kb" }));
app.use(mongoSanitize());

if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

app.use("/api", apiLimiter);

app.use("/api/auth",    authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin",   adminRoutes);
app.use("/api/profile", profileRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", env: process.env.NODE_ENV }));

app.use((req, res) => res.status(404).json({ message: `Маршрут ${req.originalUrl} не найден` }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`SERVER on port ${PORT} [${process.env.NODE_ENV}] 🚀`)
);
process.on("SIGTERM", () => server.close(() => process.exit(0)));

module.exports = app;
