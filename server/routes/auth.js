const router = require("express").Router();
const crypto = require("crypto");
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
const sendMail = require("../utils/mailer");

const authRules = [
  body("email").isEmail().normalizeEmail().withMessage("Некорректный email"),
  body("password").isLength({ min: 6 }).withMessage("Пароль минимум 6 символов"),
];

// КРИТИЧНО: в БД храним не сам refresh-токен, а его SHA-256 хеш.
// Раньше токен лежал в коллекции открытым текстом — утечка бэкапа/дампа
// БД сразу давала готовые к использованию 7-дневные сессии всех
// пользователей. Хеш необратим, но детерминирован, поэтому поиск
// по точному совпадению (findOne) продолжает работать как раньше.
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Выдаёт access-токен в JSON и refresh-токен ТОЛЬКО через httpOnly cookie —
// раньше refreshToken возвращался в теле ответа и хранился клиентом в
// localStorage, что давало XSS 7-дневный доступ к аккаунту. Теперь токен
// недоступен JS-коду на странице.
async function issueTokens(userId, res) {
  const accessToken  = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  const decoded = jwt.decode(refreshToken);
  await RefreshToken.create({
    token:     hashToken(refreshToken),
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

    const stored = await RefreshToken.findOne({ token: hashToken(refreshToken) });
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
      await RefreshToken.deleteOne({ token: hashToken(refreshToken), userId: req.user._id });
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

// POST /api/auth/forgot-password
// Ранее resetToken/resetTokenExpiry существовали в схеме User, но не было ни
// одного роута, который бы их выставлял — функция "забыл пароль" фактически
// отсутствовала. Токен генерируется криптографически случайным (32 байта),
// в БД хранится только его SHA-256 хеш (тот же принцип, что и для refresh-
// токенов): утечка БД не должна давать готовый токен для смены пароля.
// Ответ всегда одинаковый, независимо от того, существует email или нет —
// иначе эндпоинт можно использовать для перебора зарегистрированных адресов.
router.post(
  "/forgot-password",
  authLimiter,
  [body("email").isEmail().normalizeEmail().withMessage("Некорректный email")],
  validate,
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (user) {
        const rawToken = crypto.randomBytes(32).toString("hex");
        user.resetToken = hashToken(rawToken);
        user.resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 минут
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
        sendMail(
          email,
          "Восстановление пароля — Health App",
          `Чтобы сбросить пароль, перейдите по ссылке (действует 30 минут): ${resetUrl}\n\nЕсли вы не запрашивали сброс пароля, просто игнорируйте это письмо.`
        ).catch((err) => console.error("[MAIL] forgot-password send failed:", err.message));
      }

      res.json({ message: "Если такой email зарегистрирован, на него отправлена ссылка для восстановления пароля" });
    } catch {
      // Тот же ответ и при ошибке — чтобы не давать сигнал о существовании email
      res.json({ message: "Если такой email зарегистрирован, на него отправлена ссылка для восстановления пароля" });
    }
  }
);

// POST /api/auth/reset-password
// После успешной смены пароля отзываем ВСЕ refresh-токены пользователя —
// если пароль менялся из-за компрометации аккаунта, старые сессии не должны
// оставаться валидными.
router.post(
  "/reset-password",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail().withMessage("Некорректный email"),
    body("token").isString().notEmpty().withMessage("Токен обязателен"),
    body("password").isLength({ min: 6 }).withMessage("Пароль минимум 6 символов"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, token, password } = req.body;
      const user = await User.findOne({ email }).select("+resetToken +resetTokenExpiry");

      const providedHash = Buffer.from(hashToken(token));
      const storedHash = user?.resetToken ? Buffer.from(user.resetToken) : null;
      const tokenMatches =
        storedHash && storedHash.length === providedHash.length &&
        crypto.timingSafeEqual(storedHash, providedHash);

      const invalid =
        !user ||
        !user.resetToken ||
        !user.resetTokenExpiry ||
        user.resetTokenExpiry < new Date() ||
        !tokenMatches;

      if (invalid) {
        return res.status(400).json({ message: "Токен недействителен или истёк" });
      }

      user.password = await bcrypt.hash(password, 12);
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();

      await RefreshToken.deleteMany({ userId: user._id });

      res.json({ message: "Пароль успешно изменён, выполните вход" });
    } catch (err) { next(err); }
  }
);

module.exports = router;
