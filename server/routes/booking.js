const router = require("express").Router();
const { body } = require("express-validator");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const sendMail = require("../utils/mailer");

// Длительность слота в минутах — слоты короче этого считаются конфликтующими
const SLOT_DURATION_MIN = 30;

const bookRules = [
  body("doctorId").isMongoId().withMessage("Некорректный ID врача"),
  body("date").isISO8601().toDate().withMessage("Некорректная дата"),
];

/**
 * Проверяет, занят ли слот у врача на указанное время.
 * Считает конфликтом любую активную запись в окне ±SLOT_DURATION_MIN минут.
 * Возвращает true если слот занят.
 */
async function isSlotTaken(doctorId, date, excludeId = null) {
  const slotMs = SLOT_DURATION_MIN * 60 * 1000;
  const from = new Date(date.getTime() - slotMs);
  const to   = new Date(date.getTime() + slotMs);

  const query = {
    doctorId,
    date: { $gt: from, $lt: to },
    status: { $in: ["pending", "confirmed"] },
  };

  // При редактировании исключаем саму запись
  if (excludeId) query._id = { $ne: excludeId };

  const conflict = await Appointment.findOne(query).lean();
  return conflict !== null;
}

// ─── POST /api/booking/pay — Stripe Checkout ────────────────────────────────
router.post("/pay", protect, bookRules, validate, async (req, res, next) => {
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET);
    const { doctorId, date } = req.body;
    const slotDate = new Date(date);

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Врач не найден" });

    // Проверяем слот ДО создания Stripe-сессии — нет смысла брать деньги за занятое время
    if (await isSlotTaken(doctorId, slotDate)) {
      return res.status(409).json({
        message: "Этот слот уже занят. Пожалуйста, выберите другое время.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      metadata: {
        doctorId: doctorId.toString(),
        date: slotDate.toISOString(),
        userId: req.user._id.toString(),
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Приём: ${doctor.name} — ${doctor.specialty}` },
            unit_amount: doctor.price || 5000,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url:  `${process.env.CLIENT_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/booking/confirm — прямая запись ───────────────────────────────
router.post("/confirm", protect, bookRules, validate, async (req, res, next) => {
  try {
    const { doctorId, date } = req.body;
    const slotDate = new Date(date);

    // Шаг 1: оптимистичная проверка через findOne
    if (await isSlotTaken(doctorId, slotDate)) {
      return res.status(409).json({
        message: "Этот слот уже занят. Пожалуйста, выберите другое время.",
      });
    }

    // Шаг 2: создаём запись
    // Если два запроса прошли проверку одновременно — уникальный индекс
    // в модели поймает дубликат и выбросит ошибку с кодом 11000
    const appt = await Appointment.create({
      userId:   req.user._id,
      doctorId,
      date:     slotDate,
    });

    // Отправляем письмо асинхронно, не блокируем ответ
    sendMail(
      req.user.email,
      "Запись подтверждена ✅",
      `Вы записаны на ${slotDate.toLocaleDateString("ru-RU", {
        weekday: "long", day: "numeric", month: "long",
      })}`
    ).catch(console.error);

    res.status(201).json(appt);
  } catch (err) {
    // Шаг 3: перехватываем ошибку дубликата от MongoDB (страховой уровень)
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Этот слот уже занят. Пожалуйста, выберите другое время.",
      });
    }
    next(err);
  }
});

// ─── GET /api/booking/my ─────────────────────────────────────────────────────
router.get("/my", protect, async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ userId: req.user._id })
      .populate("doctorId", "name specialty photo")
      .sort({ date: 1 });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/booking/slots/:doctorId — свободные слоты для фронта ───────────
// Фронт может показывать какие слоты уже заняты (серые/недоступные)
router.get("/slots/:doctorId", async (req, res, next) => {
  try {
    const { date } = req.query; // ?date=2024-12-01
    if (!date) return res.status(400).json({ message: "Укажите дату (?date=YYYY-MM-DD)" });

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const taken = await Appointment.find({
      doctorId: req.params.doctorId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ["pending", "confirmed"] },
    }).select("date -_id").lean();

    res.json({ takenSlots: taken.map(a => a.date) });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/booking/:id — отмена записи ────────────────────────────────
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const appt = await Appointment.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    });
    if (!appt) return res.status(404).json({ message: "Запись не найдена" });
    if (appt.status === "cancelled") {
      return res.status(400).json({ message: "Запись уже отменена" });
    }

    appt.status = "cancelled";
    await appt.save();
    res.json(appt);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
