const router = require("express").Router();
const { body, query, param } = require("express-validator");
const { isValidObjectId } = require("mongoose");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const sendMail = require("../utils/mailer");

let stripe;
try {
  stripe = require("../config/stripe");
} catch {
  console.warn("⚠️  Stripe not configured. Payment routes will be unavailable.");
}

const SLOT_DURATION_MIN = 30;
const PAYMENT_WINDOW_MIN = 30;        // должно совпадать с expires_at у Stripe Checkout
const HOLD_BUFFER_MIN = 5;            // запас, чтобы TTL не удалил hold раньше, чем Stripe пометит сессию expired

// КРИТИЧНО: требуем явное смещение зоны (Z или +HH:MM) в дате приёма.
// ISO8601 date-time БЕЗ зоны (например "2026-06-30T09:00:00") JS Date парсит как
// ЛОКАЛЬНОЕ время процесса (зависит от process.env.TZ сервера) — это давало
// рассинхрон до 5 часов между выбранным пациентом временем (Asia/Almaty) и
// фактически сохранённым UTC-моментом при деплое на сервер с другим TZ.
// strictMode: true у express-validator включает RFC3339, который требует зону.
const bookRules = [
  body("doctorId").isMongoId().withMessage("Некорректный ID врача"),
  body("date")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("Некорректная дата")
    .custom((value) => {
      if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) {
        throw new Error("Дата должна содержать явное смещение часового пояса (например +05:00)");
      }
      return true;
    })
    .toDate(),
];

async function isSlotTaken(doctorId, date, excludeId = null) {
  const slotMs = SLOT_DURATION_MIN * 60 * 1000;
  const from = new Date(date.getTime() - slotMs);
  const to   = new Date(date.getTime() + slotMs);

  const query = {
    doctorId,
    date: { $gt: from, $lt: to },
    status: { $in: ["pending_payment", "pending", "confirmed"] },
  };

  if (excludeId) query._id = { $ne: excludeId };

  const conflict = await Appointment.findOne(query).lean();
  return conflict !== null;
}

// POST /api/booking/pay — Stripe Checkout
// Слот резервируется АТОМАРНО (через уникальный индекс) ДО создания Stripe-сессии.
// Это устраняет окно гонки между проверкой доступности и фактической оплатой:
// если два пользователя одновременно пытаются занять слот, второй получит 409
// мгновенно, не успев даже дойти до экрана оплаты Stripe.
router.post("/pay", protect, bookRules, validate, async (req, res, next) => {
  if (!stripe) {
    return res.status(503).json({ message: "Платёжный сервис недоступен" });
  }

  try {
    const { doctorId, date } = req.body;
    const slotDate = new Date(date);

    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) return res.status(404).json({ message: "Врач не найден" });

    if (!doctor.price) {
      return res.status(400).json({
        message: "Приём этого врача бесплатный — используйте /api/booking/confirm",
      });
    }

    // Доп. проверка по окну ±30 мин (индекс защищает только точное совпадение даты,
    // эта проверка — defense in depth для случая пересекающихся, но не идентичных слотов)
    if (await isSlotTaken(doctorId, slotDate)) {
      return res.status(409).json({
        message: "Этот слот уже занят. Пожалуйста, выберите другое время.",
      });
    }

    const holdExpiresAt = new Date(
      Date.now() + (PAYMENT_WINDOW_MIN + HOLD_BUFFER_MIN) * 60 * 1000
    );

    // Атомарная резервация слота: если кто-то успел создать запись на этот же
    // doctorId+date за миллисекунды до нас — здесь вылетит код 11000.
    let hold;
    try {
      hold = await Appointment.create({
        userId:   req.user._id,
        doctorId,
        date:     slotDate,
        status:   "pending_payment",
        holdExpiresAt,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          message: "Этот слот уже занят. Пожалуйста, выберите другое время.",
        });
      }
      throw err;
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        metadata: {
          appointmentId: hold._id.toString(),
          doctorId:      doctorId.toString(),
          date:          slotDate.toISOString(),
          userId:        req.user._id.toString(),
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `Приём: ${doctor.name} — ${doctor.specialty}` },
              unit_amount: doctor.price,
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${process.env.CLIENT_URL}/cancel`,
        expires_at: Math.floor(Date.now() / 1000) + PAYMENT_WINDOW_MIN * 60,
      });
    } catch (stripeErr) {
      // Stripe не смог создать сессию — освобождаем удержанный слот, чтобы он не "сгорал"
      // впустую до истечения TTL.
      await Appointment.deleteOne({ _id: hold._id }).catch(() => {});
      throw stripeErr;
    }

    hold.stripeSessionId = session.id;
    await hold.save();

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/booking/confirm — прямая запись без оплаты.
// Разрешена ТОЛЬКО для врачей с price = 0/undefined (благотворительные/промо-приёмы).
// Платных врачей через этот эндпоинт забронировать нельзя — это не "обход оплаты",
// а единственный путь для записи в принципе.
router.post("/confirm", protect, bookRules, validate, async (req, res, next) => {
  try {
    const { doctorId, date } = req.body;
    const slotDate = new Date(date);

    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) return res.status(404).json({ message: "Врач не найден" });

    if (doctor.price) {
      return res.status(400).json({
        message: "Приём этого врача платный — используйте /api/booking/pay",
      });
    }

    let appt;
    try {
      appt = await Appointment.create({
        userId:   req.user._id,
        doctorId,
        date:     slotDate,
        status:   "pending",
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          message: "Этот слот уже занят. Пожалуйста, выберите другое время.",
        });
      }
      throw err;
    }

    sendMail(
      req.user.email,
      "Запись подтверждена ✅",
      `Вы записаны на ${slotDate.toLocaleDateString("ru-RU", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
        timeZone: "Asia/Almaty",
      })}`
    ).catch((mailErr) => {
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
    const appointments = await Appointment.find({
      userId: req.user._id,
      status: { $ne: "pending_payment" }, // не показываем незавершённые попытки оплаты
    })
      .populate("doctorId", "name specialty photo")
      .sort({ date: 1 })
      .lean();
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

// GET /api/booking/verify/:sessionId — для экрана /success: можно сразу сказать
// пользователю, подтвердилась ли запись, не дожидаясь письма от вебхука.
router.get(
  "/verify/:sessionId",
  protect,
  async (req, res, next) => {
    try {
      const appt = await Appointment.findOne({
        stripeSessionId: req.params.sessionId,
        userId:          req.user._id,
      })
        .populate("doctorId", "name specialty")
        .lean();

      if (!appt) return res.json({ status: "not_found" });
      res.json({ status: appt.status, appointment: appt });
    } catch (err) {
      next(err);
    }
  }
);

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
        status: { $in: ["pending_payment", "pending", "confirmed"] },
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
    appt.holdExpiresAt = undefined;
    await appt.save();
    res.json(appt);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
