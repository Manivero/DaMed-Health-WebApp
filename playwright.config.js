// Конфигурация E2E-тестов (Playwright).
// Стандартная, портируемая настройка — без специфики какой-либо конкретной машины/CI.
// На обычной машине с доступом в интернет: `npm install && npx playwright install chromium`,
// затем `npm run test:e2e`.
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },

  // Автоматически поднимает клиентский dev-сервер и бэкенд перед прогоном тестов.
  // Тестовое окружение сервера передаётся через env — так же, как это уже сделано в
  // server/__tests__/auth.test.js для jest (тот же набор переменных, тот же принцип).
  // MONGO_URI указывает на отдельную БД health-e2e, чтобы не пересекаться с dev-данными.
  webServer: [
    {
      command: "npm run dev --prefix client",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "npm run dev --prefix server",
      url: "http://localhost:5000/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        MONGO_URI:           process.env.E2E_MONGO_URI || "mongodb://localhost:27017/health-e2e",
        JWT_SECRET:          "e2e_test_secret_32_characters_minimum_ok",
        JWT_REFRESH_SECRET:  "e2e_test_refresh_secret_32_chars_ok_ok",
        JWT_EXPIRES_IN:      "15m",
        JWT_REFRESH_EXPIRES_IN: "7d",
        CLIENT_URL:          "http://localhost:5173",
        NODE_ENV:            "test",
      },
    },
  ],

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
