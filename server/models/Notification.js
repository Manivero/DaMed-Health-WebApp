const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    // Тип уведомления для иконки/цвета на клиенте
    type: {
      type: String,
      enum: ["confirm", "reminder", "review", "promo", "cancel", "system"],
      required: true,
    },
    title: {
      type:     String,
      required: true,
      trim:     true,
      maxlength: 200,
    },
    body: {
      type:     String,
      required: true,
      trim:     true,
      maxlength: 1000,
    },
    read: {
      type:    Boolean,
      default: false,
      index:   true, // для быстрого подсчёта unread
    },
    // Необязательная ссылка на объект (например, appointmentId для review-нотификации)
    refId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    refModel: {
      type: String,
      enum: ["Appointment", "Doctor", null],
    },
  },
  { timestamps: true }
);

// TTL: уведомления удаляются MongoDB автоматически через 30 дней после создания.
// Предотвращает неограниченный рост коллекции без необходимости job-очистки.
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, name: "ttl_30d" }
);

// Составной индекс: основные запросы всегда scope по userId и сортируют по дате
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
