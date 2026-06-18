const router      = require("express").Router();
const Appointment = require("../models/Appointment");
const sendMail    = require("../utils/mailer");
const User        = require("../models/User");

router.post(
  "/",
  require("express").raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = require("stripe")(process.env.STRIPE_SECRET);
    const sig    = req.headers["stripe-signature"];

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
        const exists = await Appointment.findOne({ stripeSessionId: session.id });
        if (exists) {
          console.log("Webhook duplicate skipped:", session.id);
          return res.json({ received: true });
        }

        const appt = await Appointment.create({
          userId,
          doctorId,
          date:            new Date(date),
          status:          "confirmed",
          stripeSessionId: session.id,
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
        if (err.code === 11000) {
          // Слот занят — возвращаем деньги
          console.warn("Webhook: slot collision, initiating refund for session:", session.id);
          try {
            await stripe.refunds.create({ payment_intent: session.payment_intent });
            console.log("Refund initiated for:", session.payment_intent);

            const user = await User.findById(userId);
            if (user) {
              sendMail(
                user.email,
                "Возврат средств — слот занят",
                "К сожалению, выбранное время уже занято другим пациентом. Средства будут возвращены в течение 5-10 рабочих дней. Пожалуйста, выберите другое время."
              ).catch(console.error);
            }
          } catch (refundErr) {
            console.error("Failed to initiate refund:", refundErr.message);
          }
          return res.json({ received: true });
        }

        console.error("Webhook DB error:", err.message);
        return res.status(500).json({ error: "DB error" });
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;
