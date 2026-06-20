const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    doctorId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Doctor",
      required: true,
      index:    true,
    },
    date: {
      type:     Date,
      required: [true, "Дата обязательна"],
    },
    timezone: {
      type:    String,
      default: "Asia/Almaty",
    },
    // pending_payment — слот удержан, ожидается оплата (создаётся в /pay ДО редиректа на Stripe)
    // pending          — бесплатная запись (доктор с price = 0), не требует оплаты
    // confirmed        — оплата подтверждена вебхуком, либо админом
    // cancelled        — отменена пользователем/админом
    status: {
      type:    String,
      enum:    ["pending_payment", "pending", "confirmed", "cancelled"],
      default: "pending",
    },
    stripeSessionId: {
      type:   String,
      sparse: true,
      unique: true,
    },
    // Только для status = "pending_payment": когда удерживаемый слот считается протухшим
    // и должен быть удалён (TTL-индекс ниже). Для confirmed/pending/cancelled поле не используется.
    holdExpiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Уникальный активный слот: блокирует одновременное резервирование одного времени
// у одного врача в статусах pending_payment / pending / confirmed.
appointmentSchema.index(
  { doctorId: 1, date: 1 },
  {
    unique:                  true,
    partialFilterExpression: { status: { $in: ["pending_payment", "pending", "confirmed"] } },
    name:                    "unique_active_slot",
  }
);

// TTL: документы с holdExpiresAt в прошлом автоматически удаляются MongoDB.
// Документы без поля holdExpiresAt (confirmed/pending/cancelled) не затрагиваются.
appointmentSchema.index(
  { holdExpiresAt: 1 },
  { expireAfterSeconds: 0, name: "ttl_payment_hold" }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
