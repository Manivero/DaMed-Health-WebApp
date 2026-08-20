const router = require("express").Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { body, query, param } = require("express-validator");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { protect, adminOnly } = require("../middleware/auth");
const validate = require("../middleware/validate");
const notify = require("../utils/notify");
const sendMail = require("../utils/mailer");

// Тот же паттерн хеширования токена, что в routes/auth.js (forgot-password) — не экспортирован
// оттуда как общая утилита, поэтому локальная копия здесь (маленькая, самодостаточная функция;
// выносить в shared-модуль ради одной строки — было бы рефакторингом сверх нужд этой задачи).
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

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

// POST /api/admin/doctors/:id/account — создать учётную запись (User, role: "doctor") и
// связать её с каталожным врачом (см. T016). Пароль — криптослучайный и никому не сообщается;
// врач получает письмо со ссылкой на уже существующий flow сброса пароля (T009), где сам задаёт
// пароль — переиспользуем готовый, уже проверенный механизм вместо изобретения нового.
router.post(
  "/doctors/:id/account",
  idParamRule,
  body("email").isEmail().withMessage("Некорректный email").normalizeEmail(),
  validate,
  async (req, res, next) => {
    try {
      const doctor = await Doctor.findById(req.params.id);
      if (!doctor) return res.status(404).json({ message: "Врач не найден" });
      if (doctor.userId) {
        return res.status(400).json({ message: "У этого врача уже есть учётная запись" });
      }

      const { email } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: "Пользователь с таким email уже существует" });
      }

      // Криптослучайный пароль — заведомо неизвестен никому, вход по нему невозможен на
      // практике; единственный путь входа для врача — задать свой пароль по ссылке ниже.
      const unusablePassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(unusablePassword, 12);

      const rawToken = crypto.randomBytes(32).toString("hex");

      const user = await User.create({
        email,
        password:         hashedPassword,
        role:              "doctor",
        resetToken:        hashToken(rawToken),
        // 24 часа, не 30 минут как в обычном forgot-password — это первичная выдача доступа,
        // не срочный сброс скомпрометированного пароля, разумно дать врачу больше времени.
        resetTokenExpiry:  new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      doctor.userId = user._id;
      await doctor.save();

      const setPasswordUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
      sendMail(
        email,
        "Учётная запись врача создана — DaMed",
        `Администратор создал для вас учётную запись врача на DaMed (профиль: ${doctor.name}). ` +
          `Чтобы задать пароль и войти, перейдите по ссылке (действует 24 часа): ${setPasswordUrl}`
      ).catch((mailErr) => {
        console.error("Failed to send doctor account creation email:", mailErr.message);
      });

      res.status(201).json({ message: "Учётная запись создана, письмо отправлено", doctor });
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
