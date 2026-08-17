const router = require("express").Router();
const { body, query, param } = require("express-validator");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { protect, adminOnly } = require("../middleware/auth");
const validate = require("../middleware/validate");
const notify = require("../utils/notify");

router.use(protect, adminOnly);

const idParamRule = param("id").isMongoId().withMessage("Некорректный ID");

const doctorRules = [
  body("name").trim().notEmpty().withMessage("Имя обязательно"),
  body("specialty").trim().notEmpty().withMessage("Специальность обязательна"),
  body("experience").optional().isInt({ min: 0 }).toInt(),
  body("price").optional().isInt({ min: 0 }).toInt(),
  body("photo").optional().trim().isURL().withMessage("Фото должно быть URL"),
];

// GET /api/admin/doctors?page=&limit=&activeOnly=
// В отличие от публичного GET /api/doctors (который фильтрует isActive:{$ne:false}),
// этот эндпоинт по умолчанию показывает ВСЕХ врачей, включая мягко удалённых —
// без этого администратор не может увидеть/восстановить скрытого врача (см. T010).
router.get(
  "/doctors",
  [
    query("page").optional().isInt({ min: 1 }).toInt().default(1),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt().default(50),
    query("activeOnly").optional().isBoolean().toBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const page  = req.query.page  || 1;
      const limit = req.query.limit || 50;
      const skip  = (page - 1) * limit;
      const filter = req.query.activeOnly ? { isActive: { $ne: false } } : {};

      const [doctors, total] = await Promise.all([
        Doctor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Doctor.countDocuments(filter),
      ]);

      res.json({ doctors, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/doctors", doctorRules, validate, async (req, res, next) => {
  try {
    const { name, specialty, experience, price, photo } = req.body;
    const doctor = await Doctor.create({ name, specialty, experience, price, photo });
    res.status(201).json(doctor);
  } catch (err) {
    next(err);
  }
});

router.put("/doctors/:id", idParamRule, doctorRules, validate, async (req, res, next) => {
  try {
    const allowedFields = ["name", "specialty", "experience", "price", "photo", "bio", "clinic", "address", "languages", "isOnline"];
    const update = {};
    allowedFields.forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });

    const doctor = await Doctor.findByIdAndUpdate(req.params.id, update, {
      new:           true,
      runValidators: true,
    });
    if (!doctor) return res.status(404).json({ message: "Врач не найден" });
    res.json(doctor);
  } catch (err) {
    next(err);
  }
});

// Мягкое удаление: для медицинского сервиса физическое удаление врача
// разрывает ссылки в уже существующих Appointment/Review (осиротевшие
// doctorId → null после populate, история приёмов пациента "обнуляется").
// isActive:false скрывает врача из публичного каталога, но сохраняет
// целостность исторических данных.
router.delete("/doctors/:id", idParamRule, validate, async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!doctor) return res.status(404).json({ message: "Врач не найден" });
    res.json({ message: "Врач скрыт из каталога", doctor });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/doctors/:id/active — точечное включение/выключение видимости врача
// в публичном каталоге. Тот же паттерн, что и у PATCH /appointments/:id/status ниже —
// узкое, однозначное действие вместо перегрузки общего PUT (который и так уже валидирует
// name/specialty как обязательные — усложнять его условной валидацией не требуется).
router.patch(
  "/doctors/:id/active",
  idParamRule,
  body("isActive").isBoolean().withMessage("isActive должно быть true/false").toBoolean(),
  validate,
  async (req, res, next) => {
    try {
      const doctor = await Doctor.findByIdAndUpdate(
        req.params.id,
        { isActive: req.body.isActive },
        { new: true }
      );
      if (!doctor) return res.status(404).json({ message: "Врач не найден" });
      res.json(doctor);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/users?page=1&limit=50
router.get(
  "/users",
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

      const [users, total] = await Promise.all([
        User.find().select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(),
      ]);

      res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/appointments?page=1&limit=50
router.get(
  "/appointments",
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

      const [appointments, total] = await Promise.all([
        Appointment.find({ status: { $ne: "pending_payment" } }) // незавершённые попытки оплаты не показываем админу как "записи"
          .populate("userId", "email")
          .populate("doctorId", "name specialty")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Appointment.countDocuments({ status: { $ne: "pending_payment" } }),
      ]);

      res.json({
        appointments,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/appointments/:id/status
router.patch(
  "/appointments/:id/status",
  idParamRule,
  body("status").isIn(["pending", "confirmed", "cancelled"]).withMessage("Недопустимый статус"),
  validate,
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const appt = await Appointment.findOneAndUpdate(
        { _id: req.params.id, status: { $ne: "pending_payment" } },
        { status },
        { new: true }
      )
        .populate("userId", "email")
        .populate("doctorId", "name");
      if (!appt) return res.status(404).json({ message: "Запись не найдена" });

      // Уведомляем пациента, если админ подтвердил или отменил запись (те же 2 типа
      // событий, что и при действиях самого пациента — см. T013).
      if (status === "confirmed" || status === "cancelled") {
        notify({
          userId: appt.userId._id,
          type:   status === "confirmed" ? "booking_confirmed" : "booking_cancelled",
          title:  status === "confirmed" ? "Запись подтверждена" : "Запись отменена",
          body:   status === "confirmed"
            ? `Администратор подтвердил вашу запись к ${appt.doctorId?.name || "врачу"}`
            : `Администратор отменил вашу запись к ${appt.doctorId?.name || "врачу"}`,
          relatedAppointment: appt._id,
        });
      }

      res.json(appt);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
