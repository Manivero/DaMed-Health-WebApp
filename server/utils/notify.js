const Notification = require("../models/Notification");

// Best-effort создание уведомления — по тому же принципу, что и sendMail() по всему проекту
// (fire-and-forget с логированием ошибки): генерация уведомления — вторичный побочный эффект
// брони/отмены, и не должна ронять или блокировать основной запрос, если сама запись в БД
// по какой-то причине не удалась.
async function notify({ userId, type, title, body, relatedAppointment }) {
  try {
    await Notification.create({ userId, type, title, body, relatedAppointment });
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
}

module.exports = notify;
