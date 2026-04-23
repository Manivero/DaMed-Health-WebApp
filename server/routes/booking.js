const router = require("express").Router();
const { body } = require("express-validator");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const sendMail = require("../utils/mailer");

const bookRules = [
  body("doctorId").isMongoId().withMessage("Некорректный ID врача"),
  body("date").isISO8601().toDate().withMessage("Некорректная дата"),
];

// POST /api/booking/pay — Stripe Checkout
router.post("/pay", protect, bookRules, validate, async (req, res, next) => {
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET);
    const { doctorId, date } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Врач не найден" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      metadata: {
        doctorId: doctorId.toString(),
        date: new Date(date).toISOString(),
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
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/booking/confirm — прямая запись
router.post("/confirm", protect, bookRules, validate, async (req, res, next) => {
  try {
    const { doctorId, date } = req.body;

    const appt = await Appointment.create({
      userId: req.user._id,
      doctorId,
      date: new Date(date),
    });

    sendMail(
      req.user.email,
      "Запись подтверждена ✅",
      `Вы записаны на ${new Date(date).toLocaleDateString("ru-RU", {
        weekday: "long", day: "numeric", month: "long",
      })}`
    ).catch(console.error);

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
      .sort({ date: 1 });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/booking/:id — отмена записи
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const appt = await Appointment.findOne({
      _id: req.params.id,
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
