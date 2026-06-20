const router      = require("express").Router();
const Appointment = require("../models/Appointment");
const sendMail    = require("../utils/mailer");
const User        = require("../models/User");

router.post(
  "/",
  require("express").raw({ type: "application/json" }),
  async (req, res) => {
    // Singleton-клиент Stripe, как и везде в приложении.
    // ВАЖНО: STRIPE_SECRET опционален (см. server/config/env.js) — config/stripe.js
    // синхронно бросает исключение при require, если ключ не задан. Без этого
    // try/catch необработанный throw внутри async-хендлера превращается в
    // unhandled promise rejection и крашит весь процесс на каждом POST сюда.
    let stripe;
    try {
      stripe = require("../config/stripe");
    } catch {
      console.error("Webhook called but Stripe is not configured (STRIPE_SECRET missing)");
      return res.status(503).json({ message: "Платёжный сервис недоступен" });
    }
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
      const { userId, appointmentId } = session.metadata;

      try {
        // Идемпотентность: если уже обработали этот session.id ранее — выходим.
        const already = await Appointment.findOne({
          stripeSessionId: session.id,
          status:          "confirmed",
        });
        if (already) {
          console.log("Webhook duplicate skipped:", session.id);
          return res.json({ received: true });
        }

        // Hold был создан АТОМАРНО в /pay до оплаты — здесь мы его просто подтверждаем.
        const appt = await Appointment.findOneAndUpdate(
          { _id: appointmentId, stripeSessionId: session.id, status: "pending_payment" },
          { status: "confirmed", $unset: { holdExpiresAt: 1 } },
          { new: true }
        );

        if (!appt) {
          // Hold не найден (например, протух и был удалён TTL раньше, чем пришёл вебхук,
          // либо id в metadata не совпал) — оплата прошла, но слот не закреплён.
          // Money-safe path: возвращаем деньги, а не теряем их и не молчим об ошибке.
          console.warn("Webhook: hold not found for session, refunding:", session.id);
          await stripe.refunds.create({ payment_intent: session.payment_intent });

          const user = await User.findById(userId);
          if (user) {
            sendMail(
              user.email,
              "Возврат средств — слот недоступен",
              "К сожалению, время ожидания оплаты истекло и слот был освобождён. Средства будут возвращены в течение 5-10 рабочих дней. Пожалуйста, выберите время снова."
            ).catch(console.error);
          }
          return res.json({ received: true });
        }

        const user = await User.findById(userId);
        if (user) {
          sendMail(
            user.email,
            "Оплата прошла — запись подтверждена ✅",
            `Ваша запись на ${new Date(appt.date).toLocaleDateString("ru-RU")} успешно оплачена и подтверждена!`
          ).catch(console.error);
        }

        console.log("Appointment confirmed via webhook:", appt._id);
      } catch (err) {
        console.error("Webhook DB error:", err.message);
        return res.status(500).json({ error: "DB error" });
      }
    }

    // Stripe должен быть настроен на отправку этого события (Dashboard → Webhooks).
    // Без него зависшие holds живут до истечения TTL (см. модель Appointment),
    // что приемлемо, но это +30 минут задержки в освобождении слота.
    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const { appointmentId } = session.metadata || {};
      if (appointmentId) {
        await Appointment.deleteOne({
          _id: appointmentId,
          stripeSessionId: session.id,
          status: "pending_payment",
        }).catch((err) => console.error("Failed to clear expired hold:", err.message));
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;
