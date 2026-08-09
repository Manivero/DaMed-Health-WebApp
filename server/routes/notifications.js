const router = require("express").Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

// Все маршруты требуют авторизации. userId берётся ТОЛЬКО из req.user._id
// (проверен protect middleware) — пользователь не может запросить чужие уведомления.

// GET /api/notifications
// Возвращает последние 50 уведомлений + счётчик непрочитанных.
// Лимит 50: баланс между полнотой данных и payload-ом (при TTL 30д в среднем
// намного меньше, но защищаемся от пользователей с большим объёмом).
router.get("/", protect, async (req, res, next) => {
  try {
    const [notifs, unread] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Notification.countDocuments({ userId: req.user._id, read: false }),
    ]);
    res.json({ notifs, unread });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read — отметить одно прочитанным
router.patch("/:id/read", protect, async (req, res, next) => {
  try {
    // updateOne с userId — IDOR защита: нельзя отметить чужое уведомление
    const result = await Notification.updateOne(
      { _id: req.params.id, userId: req.user._id },
      { $set: { read: true } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Уведомление не найдено" });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all — отметить все прочитанными
router.patch("/read-all", protect, async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/:id — удалить одно уведомление
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const result = await Notification.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Уведомление не найдено" });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
