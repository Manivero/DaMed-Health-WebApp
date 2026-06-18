// Инициализируем Stripe один раз при старте сервера
// Если ключ не задан — приложение упадёт сразу, не при первом запросе
if (!process.env.STRIPE_SECRET) {
  throw new Error("STRIPE_SECRET is not defined. Set it in .env");
}

module.exports = require("stripe")(process.env.STRIPE_SECRET);
