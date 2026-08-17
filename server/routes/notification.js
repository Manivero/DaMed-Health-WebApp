const express = require("express");
const router = express.Router();
const { param, query } = require("express-validator");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const Notification = require("../models/Notification");

const idParamRule = param("id").isMongoId().withMessage("Некорректный id уведомления");

// GET /api/notifications?page=&limit=
router.get(
  "/",
  protect,
  [
    query("page").optional().isInt({ min: 1 }).toInt().default(1),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt().default(50),
  ],
  validate,
  async (req, res, next) => {
    try {
      const page  = req.query.page  || 1;
      const limit = req.query.limit || 50;
      const skip  = (page - 1) * limit;
      const filter = { userId: req.user._id };

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Notification.countDocuments(filter),
        Notification.countDocuments({ ...filter, read: false }),
      ]);

      res.json({
        notifications,
        unreadCount,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/notifications/read-all
// Примечание: коллизии с /:id/read нет — у путей разное число сегментов ("read-all" против
// ":id/read"), Express их не спутает независимо от порядка объявления. Размещён здесь просто
// для читаемости — рядом с остальными "массовыми" операциями над списком.
router.patch("/read-all", protect, async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: "Все уведомления отмечены прочитанными", modifiedCount: result.modifiedCount });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", protect, idParamRule, validate, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    // Намеренно 404, а не 403 — не подтверждаем сам факт существования чужого уведомления.
    if (!notification) return res.status(404).json({ message: "Уведомление не найдено" });
    res.json(notification);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
