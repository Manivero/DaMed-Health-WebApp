const REQUIRED = [
  "MONGO_URI",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
];

const validateEnv = () => {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Отсутствуют переменные окружения: ${missing.join(", ")}`);
    console.error("Скопируй .env.example в .env и заполни значения.");
    process.exit(1);
  }
};

module.exports = validateEnv;
