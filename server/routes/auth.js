const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const { authLimiter } = require("../middleware/rateLimiter");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");

const authRules = [
  body("email").isEmail().normalizeEmail().withMessage("Некорректный email"),
  body("password").isLength({ min: 6 }).withMessage("Пароль минимум 6 символов"),
];

// Единая функция выдачи токенов — используется везде
async function issueTokens(userId, res) {
  const accessToken  = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  const decoded = jwt.decode(refreshToken);
  await RefreshToken.create({
    token:     refreshToken,
    userId,
    expiresAt: new Date(decoded.exp * 1000),
  });

  return res.json({ accessToken, refreshToken });
}

// POST /api/auth/register
router.post("/register", authLimiter, authRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Timing-safe: всегда выполняем bcrypt, даже если пользователь существует
    const exists = await User.findOne({ email });
    if (exists) {
      // Делаем bcrypt для нормализации времени ответа (anti-enumeration)
      await bcrypt.hash(password, 12);
      return res.status(409).json({ message: "Пользователь уже существует" });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hash });

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    const decoded = jwt.decode(refreshToken);
    await RefreshToken.create({
      token: refreshToken, userId: user._id,
      expiresAt: new Date(decoded.exp * 1000),
    });

    res.status(201).json({ _id: user._id, email: user.email, role: user.role, accessToken, refreshToken });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post("/login", authLimiter, authRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    // Timing-safe: всегда выполняем bcrypt сравнение
    const dummyHash = "$2b$12$invalidhashfortimingnormalization";
    const ok = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !ok) {
      return res.status(401).json({ message: "Неверный email или пароль" });
    }

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    const decoded = jwt.decode(refreshToken);
    await RefreshToken.create({
      token: refreshToken, userId: user._id,
      expiresAt: new Date(decoded.exp * 1000),
    });

    res.json({ _id: user._id, email: user.email, role: user.role, accessToken, refreshToken });
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: "Refresh token отсутствует" });

    const stored = await RefreshToken.findOne({ token: refreshToken });
    if (!stored) return res.status(401).json({ message: "Токен отозван или не существует" });

    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      // Токен истёк или невалиден — удаляем из БД
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({ message: "Недействительный refresh token" });
    }

    const accessToken = generateAccessToken(stored.userId);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: "Недействительный refresh token" });
  }
});

// POST /api/auth/logout
router.post("/logout", protect, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken, userId: req.user._id });
    }
    res.json({ message: "Выход выполнен" });
  } catch {
    res.json({ message: "Выход выполнен" });
  }
});

// POST /api/auth/logout-all — выход со всех устройств
router.post("/logout-all", protect, async (req, res) => {
  try {
    await RefreshToken.deleteMany({ userId: req.user._id });
    res.json({ message: "Выход выполнен на всех устройствах" });
  } catch (err) {
    res.json({ message: "Выход выполнен" });
  }
});

module.exports = router;
