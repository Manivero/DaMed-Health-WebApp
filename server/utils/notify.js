const Notification = require("../models/Notification");

// Создаём уведомление "в фоне": ошибки логируем, но не проваливаем
// основной запрос — создание уведомления никогда не должно быть причиной
// отказа в бронировании или другой основной операции.
async function createNotification({ userId, type, title, body, refId, refModel }) {
  try {
    await Notification.create({ userId, type, title, body, refId, refModel });
  } catch (err) {
    console.error("[Notify] failed to create notification:", err.message);
  }
}

module.exports = { createNotification };
