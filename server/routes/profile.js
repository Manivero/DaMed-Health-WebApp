const router = require("express").Router();
const { body } = require("express-validator");
const bcrypt = require("bcrypt");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const User = require("../models/User");
const Appointment = require("../models/Appointment");

// GET /api/profile/me
router.get("/me", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password -resetToken -resetTokenExpiry");
    res.json(user);
  } catch (err) { next(err); }
});

// PUT /api/profile/me
router.put("/me", protect, [
  body("name").optional().trim().isLength({ max: 80 }),
  body("phone").optional().trim(),
  body("bloodType").optional().isIn(["A+","A-","B+","B-","AB+","AB-","O+","O-",""]),
  body("allergies").optional().trim().isLength({ max: 300 }),
], validate, async (req, res, next) => {
  try {
    const allowed = ["name","phone","birthDate","bloodType","allergies"];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true }).select("-password");
    res.json(user);
  } catch (err) { next(err); }
});

// PUT /api/profile/password
router.put("/password", protect, [
  body("currentPassword").notEmpty().withMessage("Введите текущий пароль"),
  body("newPassword").isLength({ min: 6 }).withMessage("Новый пароль минимум 6 символов"),
], validate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    const ok = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: "Неверный текущий пароль" });
    user.password = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();
    res.json({ message: "Пароль обновлён" });
  } catch (err) { next(err); }
});

// GET /api/profile/stats
router.get("/stats", protect, async (req, res, next) => {
  try {
    const [total, upcoming, cancelled] = await Promise.all([
      Appointment.countDocuments({ userId: req.user._id }),
      Appointment.countDocuments({ userId: req.user._id, date: { $gte: new Date() }, status: { $ne: "cancelled" } }),
      Appointment.countDocuments({ userId: req.user._id, status: "cancelled" }),
    ]);
    res.json({ total, upcoming, cancelled, completed: total - upcoming - cancelled });
  } catch (err) { next(err); }
});

module.exports = router;
