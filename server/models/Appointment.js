const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true, // быстрый запрос GET /api/booking/my
    },
    doctorId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Doctor",
      required: true,
    },
    date: {
      type:     Date,
      required: [true, "Дата обязательна"],
    },
    status: {
      type:    String,
      enum:    ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    // Сохраняем ID Stripe-сессии для идемпотентности webhook:
    // если Stripe пришлёт одно событие дважды — дубликат не создастся
    stripeSessionId: {
      type:   String,
      sparse: true,  // null-значения не попадают в индекс
      unique: true,
    },
  },
  { timestamps: true }
);

// Составной уникальный индекс: один врач — один активный слот в одно время.
// Partial filter исключает отменённые записи — они не блокируют слот.
appointmentSchema.index(
  { doctorId: 1, date: 1 },
  {
    unique:                true,
    partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
    name:                  "unique_active_slot",
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
