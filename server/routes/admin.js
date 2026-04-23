const router = require("express").Router();
const { body } = require("express-validator");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { protect, adminOnly } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.use(protect, adminOnly);

const doctorRules = [
  body("name").trim().notEmpty().withMessage("Имя обязательно"),
  body("specialty").trim().notEmpty().withMessage("Специальность обязательна"),
  body("experience").optional().isInt({ min: 0 }).toInt(),
  body("price").optional().isInt({ min: 0 }).toInt(),
  body("photo").optional().trim().isURL().withMessage("Фото должно быть URL"),
];

router.post("/doctors", doctorRules, validate, async (req, res, next) => {
  try {
    const { name, specialty, experience, price, photo } = req.body;
    const doctor = await Doctor.create({ name, specialty, experience, price, photo });
    res.status(201).json(doctor);
  } catch (err) { next(err); }
});

router.put("/doctors/:id", doctorRules, validate, async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!doctor) return res.status(404).json({ message: "Врач не найден" });
    res.json(doctor);
  } catch (err) { next(err); }
});

router.delete("/doctors/:id", async (req, res, next) => {
  try {
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ message: "Врач удалён" });
  } catch (err) { next(err); }
});

router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { next(err); }
});

router.get("/appointments", async (req, res, next) => {
  try {
    const appointments = await Appointment.find()
      .populate("userId", "email")
      .populate("doctorId", "name specialty")
      .sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) { next(err); }
});

// PATCH /api/admin/appointments/:id/status
router.patch("/appointments/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Недопустимый статус" });
    }
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    ).populate("userId", "email").populate("doctorId", "name");
    if (!appt) return res.status(404).json({ message: "Запись не найдена" });
    res.json(appt);
  } catch (err) { next(err); }
});

module.exports = router;
