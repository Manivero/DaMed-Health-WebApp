const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const User = require("../models/User");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const { authLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");

const authRules = [
  body("email").isEmail().normalizeEmail().withMessage("Некорректный email"),
  body("password").isLength({ min: 6 }).withMessage("Пароль минимум 6 символов"),
];

// POST /api/auth/register
router.post("/register", authLimiter, authRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Пользователь уже существует" });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hash });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, authRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Неверный email или пароль" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Неверный email или пароль" });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      _id: user._id,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token отсутствует" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Пользователь не найден" });
    }

    res.json({ accessToken: generateAccessToken(user._id) });
  } catch (err) {
    return res.status(401).json({ message: "Недействительный refresh token" });
  }
});

module.exports = router;
