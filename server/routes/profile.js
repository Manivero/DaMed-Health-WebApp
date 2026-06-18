const router = require("express").Router();
const { body } = require("express-validator");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const User = require("../models/User");
const Appointment = require("../models/Appointment");

// GET /api/profile/me
router.get("/me", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -resetToken -resetTokenExpiry"
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile/me
router.put(
  "/me",
  protect,
  [
    body("name").optional().trim().isLength({ max: 80 }),
    body("phone")
      .optional()
      .trim()
      .matches(/^[\+\d\s\-\(\)]{7,20}$/)
      .withMessage("Некорректный номер телефона"),
    body("bloodType").optional().isIn(["A+","A-","B+","B-","AB+","AB-","O+","O-",""]),
    body("allergies").optional().trim().isLength({ max: 300 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const allowed = ["name", "phone", "birthDate", "bloodType", "allergies"];
      const update = {};
      allowed.forEach((k) => {
        if (req.body[k] !== undefined) update[k] = req.body[k];
      });
      const user = await User.findByIdAndUpdate(req.user._id, update, {
        new: true,
        runValidators: true,
      }).select("-password");
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/profile/password — ИСПРАВЛЕНО: инвалидируем все сессии при смене пароля
router.put(
  "/password",
  protect,
  [
    body("currentPassword").notEmpty().withMessage("Введите текущий пароль"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("Новый пароль минимум 6 символов"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select("+password");
      const ok = await bcrypt.compare(req.body.currentPassword, user.password);
      if (!ok) {
        return res.status(400).json({ message: "Неверный текущий пароль" });
      }
      user.password = await bcrypt.hash(req.body.newPassword, 12);
      await user.save();

      // КРИТИЧНО: инвалидируем все refresh-токены — злоумышленник теряет доступ
      const RefreshToken = require("../models/RefreshToken");
      await RefreshToken.deleteMany({ userId: req.user._id });

      res.json({ message: "Пароль обновлён. Необходимо войти заново." });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/profile/stats  — одна агрегация вместо трёх запросов
router.get("/stats", protect, async (req, res, next) => {
  try {
    const now = new Date();
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const [result] = await Appointment.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id:       null,
          total:     { $sum: 1 },
          upcoming:  {
            $sum: {
              $cond: [
                { $and: [{ $gte: ["$date", now] }, { $ne: ["$status", "cancelled"] }] },
                1, 0,
              ],
            },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = result
      ? {
          total:     result.total,
          upcoming:  result.upcoming,
          cancelled: result.cancelled,
          completed: result.total - result.upcoming - result.cancelled,
        }
      : { total: 0, upcoming: 0, cancelled: 0, completed: 0 };

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
