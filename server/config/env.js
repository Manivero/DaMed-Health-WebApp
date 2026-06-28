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

// Раньше проверялось только наличие JWT_SECRET/JWT_REFRESH_SECRET, но не их
// длина — короткий или дефолтный из .env.example секрет ("change_me...")
// проходил бы валидацию и резко облегчал bruteforce/подбор подписи токенов.
const MIN_SECRET_LENGTH = 32;
const SECRET_KEYS = ["JWT_SECRET", "JWT_REFRESH_SECRET"];
const PLACEHOLDER_VALUES = [
  "change_me_to_a_long_random_string_min_32_chars",
  "another_long_random_string_for_refresh_tokens",
];

const validateEnv = () => {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Отсутствуют обязательные переменные: ${missing.join(", ")}`);
    console.error("Скопируй .env.example в .env и заполни значения.");
    process.exit(1);
  }

  const weakSecrets = SECRET_KEYS.filter((k) => {
    const value = process.env[k];
    return value.length < MIN_SECRET_LENGTH || PLACEHOLDER_VALUES.includes(value);
  });
  if (weakSecrets.length) {
    console.error(
      `❌ Слишком слабый секрет (мин. ${MIN_SECRET_LENGTH} символов, не placeholder из .env.example): ${weakSecrets.join(", ")}`
    );
    console.error("Сгенерируй случайное значение, например: openssl rand -hex 32");
    process.exit(1);
  }

  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    console.error("❌ JWT_SECRET и JWT_REFRESH_SECRET должны быть РАЗНЫМИ значениями.");
    process.exit(1);
  }

  const missingRec = RECOMMENDED.filter((k) => !process.env[k]);
  if (missingRec.length) {
    console.warn(`⚠️  Рекомендуемые переменные не заданы: ${missingRec.join(", ")}`);
    console.warn("   Stripe/Email/AI функции будут недоступны.");
  }
};

module.exports = validateEnv;
