const { test, expect } = require("@playwright/test");

// Минимальный smoke-тест, доказывающий работоспособность E2E-инфраструктуры (T005).
// Не подменяет собой обязательные сценарии из AI_INSTRUCTIONS.md §12 (booking/admin/payment) —
// те реализуются отдельными задачами T006–T008 поверх этого же harness.

test.describe("Smoke: приложение собирается и рендерится", () => {
  test("главная страница загружается с корректным заголовком и hero-контентом", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/DaMed/);

    // Проверяем не просто "страница не пустая", а конкретный, узнаваемый контент —
    // иначе тест не поймал бы регрессию вида "рендерится белый экран с посторонним текстом".
    await expect(page.getByRole("heading", { level: 1 })).toContainText("здоровье");
    await expect(page.getByRole("link", { name: /Найти врача/i })).toBeVisible();
  });

  test("переход по навигации на /doctors действительно меняет маршрут", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Найти врача/i }).click();

    await expect(page).toHaveURL(/\/doctors$/);
    // Строка поиска — минимальный признак того, что смонтировалась именно страница каталога,
    // а не пустой экран/ошибка роутинга.
    await expect(page.getByPlaceholder(/имени|специальност/i)).toBeVisible({ timeout: 10_000 });
  });
});
