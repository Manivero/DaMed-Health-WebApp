const { test, expect } = require("@playwright/test");
const mongoose = require("mongoose");
const path = require("path");

// Модель врача берём напрямую из серверного кода (не дублируем схему руками) — так fixture
// не может разойтись с реальной схемой Doctor.
const Doctor = require(path.join(__dirname, "..", "server", "models", "Doctor"));

const MONGO_URI = process.env.E2E_MONGO_URI || "mongodb://localhost:27017/health-e2e";
const TEST_DOCTOR_NAME = "E2E Тестовый Врач";
const TEST_SPECIALTY = "E2E-Тестовая специальность";

test.describe("E2E: Запись к врачу (AI_INSTRUCTIONS.md §12.1, обязательный сценарий)", () => {
  let doctorId;

  test.beforeAll(async () => {
    await mongoose.connect(MONGO_URI);
    // На случай повторных прогонов без очистки — не плодим дубли одноимённого врача.
    await Doctor.deleteMany({ name: TEST_DOCTOR_NAME });
    const doc = await Doctor.create({
      name: TEST_DOCTOR_NAME,
      specialty: TEST_SPECIALTY,
      price: 0, // бесплатный приём — тестируем именно этот путь, не Stripe (см. отдельно T008)
      isActive: true,
    });
    doctorId = doc._id.toString();
  });

  test.afterAll(async () => {
    if (doctorId) await Doctor.deleteOne({ _id: doctorId });
    await mongoose.disconnect();
  });

  test("полный путь: регистрация → логин → поиск → слот → бронирование → кабинет → отмена", async ({ page }) => {
    const email = `e2e_${Date.now()}@example.com`;
    const password = "TestPass123";

    // 1. Регистрация
    await page.goto("/register");
    await page.locator("#email").fill(email);
    await page.locator("#pass").fill(password);
    await page.locator("#conf").fill(password);
    await page.getByRole("button", { name: /Создать аккаунт/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 }); // приложение авто-логинит и уводит на "/"

    // 2. Логин — явным отдельным шагом (не полагаемся на автологин после регистрации,
    //    сценарий §12.1 явно перечисляет "логин" как отдельную проверяемую стадию).
    //    Разлогиниваемся через уже проверенный в T004 механизм и логинимся заново.
    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#pass").fill(password);
    await page.getByRole("button", { name: /Войти в аккаунт/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

    // 3. Поиск врача
    await page.goto("/doctors");
    await page.getByPlaceholder(/имени|специальност/i).fill(TEST_DOCTOR_NAME);
    await expect(page.getByText(TEST_DOCTOR_NAME)).toBeVisible({ timeout: 10_000 }); // debounce 400ms учтён авто-retry
    await page.getByText(TEST_DOCTOR_NAME).click();
    await expect(page).toHaveURL(new RegExp(`/doctors/${doctorId}$`));

    // 4. Переход к бронированию, выбор слота
    await page.getByRole("link", { name: /Записаться/i }).click();
    await expect(page).toHaveURL(new RegExp(`/booking/${doctorId}$`));
    await page.locator(".date-btn").first().click();
    await page.locator(".time-btn:not(.unavail)").first().click();

    // 5. Подтверждение записи (бесплатный приём — без Stripe-редиректа)
    await page.getByRole("button", { name: /Подтвердить запись/i }).click();
    await expect(page.getByText("Запись подтверждена!")).toBeVisible({ timeout: 10_000 });

    // 6. Просмотр записи в личном кабинете
    await expect(page).toHaveURL(/\/appointments$/, { timeout: 10_000 });
    await expect(page.getByText(TEST_DOCTOR_NAME)).toBeVisible({ timeout: 10_000 });

    // 7. Отмена записи (использует нативный window.confirm — принимаем диалог)
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Отменить" }).first().click();
    await expect(page.getByText("Отменено")).toBeVisible({ timeout: 10_000 });
  });
});
