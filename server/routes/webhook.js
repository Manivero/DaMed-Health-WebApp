const router = require("express").Router();
const Appointment = require("../models/Appointment");
const sendMail = require("../utils/mailer");
const User = require("../models/User");

// Stripe требует raw body для проверки подписи
router.post(
  "/",
  require("express").raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = require("stripe")(process.env.STRIPE_SECRET);
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { userId, doctorId, date } = session.metadata;

      try {
        const appt = await Appointment.create({
          userId,
          doctorId,
          date: new Date(date),
          status: "confirmed",
        });

        const user = await User.findById(userId);
        if (user) {
          sendMail(
            user.email,
            "Оплата прошла — запись подтверждена ✅",
            `Ваша запись на ${new Date(date).toLocaleDateString("ru-RU")} успешно оплачена и подтверждена!`
          ).catch(console.error);
        }

        console.log("Appointment created via webhook:", appt._id);
      } catch (err) {
        console.error("Webhook DB error:", err.message);
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;
