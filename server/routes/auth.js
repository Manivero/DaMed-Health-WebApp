const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const { authLimiter, refreshLimiter } = require("../middleware/rateLimiter");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { setRefreshCookie, clearRefreshCookie } = require("../utils/cookies");

const authRules = [
  body("email").isEmail().normalizeEmail().withMessage("Некорректный email"),
  body("password").isLength({ min: 6 }).withMessage("Пароль минимум 6 символов"),
];

// Выдаёт access-токен в JSON и refresh-токен ТОЛЬКО через httpOnly cookie —
// раньше refreshToken возвращался в теле ответа и хранился клиентом в
// localStorage, что давало XSS 7-дневный доступ к аккаунту. Теперь токен
// недоступен JS-коду на странице.
async function issueTokens(userId, res) {
  const accessToken  = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  const decoded = jwt.decode(refreshToken);
  await RefreshToken.create({
    token:     refreshToken,
    userId,
    expiresAt: new Date(decoded.exp * 1000),
  });

  setRefreshCookie(res, refreshToken);
  return accessToken;
}

router.post("/register", authLimiter, authRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      await bcrypt.hash(password, 12);
      return res.status(409).json({ message: "Пользователь уже существует" });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hash });

    const accessToken = await issueTokens(user._id, res);
    res.status(201).json({ _id: user._id, email: user.email, role: user.role, accessToken });
  } catch (err) { next(err); }
});

router.post("/login", authLimiter, authRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    const dummyHash = "$2b$12$invalidhashfortimingnormalization";
    const ok = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !ok) {
      return res.status(401).json({ message: "Неверный email или пароль" });
    }

    const accessToken = await issueTokens(user._id, res);
    res.json({ _id: user._id, email: user.email, role: user.role, accessToken });
  } catch (err) { next(err); }
});

// POST /api/auth/refresh — refreshToken читается из httpOnly cookie, не из тела
// запроса. При каждом обновлении access-токена ротируем и refresh-токен
// (старый удаляется, выдаётся новый) — это даёт возможность обнаружить
// повторное использование украденного токена в будущем (если злоумышленник
// и легитимный пользователь используют один и тот же старый токен — второй
// из них получит ошибку "токен отозван", что является сигналом компрометации).
router.post("/refresh", refreshLimiter, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "Refresh token отсутствует" });

    const stored = await RefreshToken.findOne({ token: refreshToken });
    if (!stored) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Токен отозван или не существует" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      await RefreshToken.deleteOne({ _id: stored._id });
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Недействительный refresh token" });
    }

    // Rotation: удаляем старый, выдаём новый.
    await RefreshToken.deleteOne({ _id: stored._id });
    const accessToken = await issueTokens(decoded.id, res);

    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: "Недействительный refresh token" });
  }
});

router.post("/logout", protect, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken, userId: req.user._id });
    }
    clearRefreshCookie(res);
    res.json({ message: "Выход выполнен" });
  } catch {
    clearRefreshCookie(res);
    res.json({ message: "Выход выполнен" });
  }
});

router.post("/logout-all", protect, async (req, res) => {
  try {
    await RefreshToken.deleteMany({ userId: req.user._id });
    clearRefreshCookie(res);
    res.json({ message: "Выход выполнен на всех устройствах" });
  } catch {
    res.json({ message: "Выход выполнен" });
  }
});

module.exports = router;
