const router = require("express").Router();
const { body, query, param } = require("express-validator");
const { isValidObjectId } = require("mongoose");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const sendMail = require("../utils/mailer");

// Stripe инициализируется один раз на уровне модуля
let stripe;
try {
  stripe = require("../config/stripe");
} catch {
  console.warn("⚠️  Stripe not configured. Payment routes will be unavailable.");
}

const SLOT_DURATION_MIN = 30;

const bookRules = [
  body("doctorId").isMongoId().withMessage("Некорректный ID врача"),
  body("date").isISO8601().toDate().withMessage("Некорректная дата"),
];

async function isSlotTaken(doctorId, date, excludeId = null) {
  const slotMs = SLOT_DURATION_MIN * 60 * 1000;
  const from = new Date(date.getTime() - slotMs);
  const to   = new Date(date.getTime() + slotMs);

  const query = {
    doctorId,
    date: { $gt: from, $lt: to },
    status: { $in: ["pending", "confirmed"] },
  };

  if (excludeId) query._id = { $ne: excludeId };

  const conflict = await Appointment.findOne(query).lean();
  return conflict !== null;
}

// POST /api/booking/pay — Stripe Checkout
router.post("/pay", protect, bookRules, validate, async (req, res, next) => {
  if (!stripe) {
    return res.status(503).json({ message: "Платёжный сервис недоступен" });
  }

  try {
    const { doctorId, date } = req.body;
    const slotDate = new Date(date);

    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) return res.status(404).json({ message: "Врач не найден" });

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
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 минут на оплату
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/booking/confirm — прямая запись (без оплаты)
router.post("/confirm", protect, bookRules, validate, async (req, res, next) => {
  try {
    const { doctorId, date } = req.body;
    const slotDate = new Date(date);

    // Атомарная проверка: findOneAndUpdate с upsert через уникальный индекс
    // Не делаем check-then-create (race condition), полагаемся на уникальный индекс MongoDB
    let appt;
    try {
      appt = await Appointment.create({
        userId:   req.user._id,
        doctorId,
        date:     slotDate,
      });
    } catch (err) {
      if (err.code === 11000) {
        // Уникальный индекс поймал дублирующийся слот
        return res.status(409).json({
          message: "Этот слот уже занят. Пожалуйста, выберите другое время.",
        });
      }
      throw err;
    }

    // Email отправляется асинхронно — не блокирует ответ
    sendMail(
      req.user.email,
      "Запись подтверждена ✅",
      `Вы записаны на ${slotDate.toLocaleDateString("ru-RU", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
        timeZone: "Asia/Almaty",
      })}`
    ).catch((mailErr) => {
      // Логируем, но не фейлим запрос
      console.error("Failed to send confirmation email:", mailErr.message);
    });

    res.status(201).json(appt);
  } catch (err) {
    next(err);
  }
});

// GET /api/booking/my
router.get("/my", protect, async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ userId: req.user._id })
      .populate("doctorId", "name specialty photo")
      .sort({ date: 1 })
      .lean(); // lean() для read-only — 2-3x быстрее
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

// GET /api/booking/slots/:doctorId
router.get(
  "/slots/:doctorId",
  [
    param("doctorId").custom((v) => {
      if (!isValidObjectId(v)) throw new Error("Некорректный ID врача");
      return true;
    }),
    query("date").isISO8601().withMessage("Укажите дату в формате YYYY-MM-DD"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const dayStart = new Date(req.query.date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(req.query.date);
      dayEnd.setUTCHours(23, 59, 59, 999);

      if (isNaN(dayStart.getTime())) {
        return res.status(400).json({ message: "Некорректная дата" });
      }

      const taken = await Appointment.find({
        doctorId: req.params.doctorId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ["pending", "confirmed"] },
      })
        .select("date -_id")
        .lean();

      res.json({ takenSlots: taken.map((a) => a.date) });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/booking/:id — отмена записи
router.delete("/:id", protect, async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Некорректный ID записи" });
    }

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
