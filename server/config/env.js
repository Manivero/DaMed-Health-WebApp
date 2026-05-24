const REQUIRED = [
  "MONGO_URI",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "CLIENT_URL",
];

// Эти переменные нужны для платёжных и email функций.
// Если их нет — предупреждаем, но не останавливаем (dev-режим без Stripe).
const RECOMMENDED = [
  "STRIPE_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "MAIL_USER",
  "MAIL_PASS",
  "ANTHROPIC_API_KEY",
];

const validateEnv = () => {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Отсутствуют обязательные переменные: ${missing.join(", ")}`);
    console.error("Скопируй .env.example в .env и заполни значения.");
    process.exit(1);
  }

  const missingRec = RECOMMENDED.filter((k) => !process.env[k]);
  if (missingRec.length) {
    console.warn(`⚠️  Рекомендуемые переменные не заданы: ${missingRec.join(", ")}`);
    console.warn("   Stripe/Email/AI функции будут недоступны.");
  }
};

module.exports = validateEnv;
