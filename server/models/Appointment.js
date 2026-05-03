const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    date: {
      type: Date,
      required: [true, "Дата обязательна"],
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Составной индекс: один врач — один активный слот в одно время.
// Гарантирует уникальность на уровне БД даже при race condition.
// Отменённые записи (cancelled) не блокируют слот — partial filter это учитывает.
appointmentSchema.index(
  { doctorId: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
    name: "unique_active_slot",
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
