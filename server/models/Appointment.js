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
      index:    true, // ДОБАВЛЕНО: нужен для isSlotTaken() и webhook
    },
    date: {
      type:     Date,
      required: [true, "Дата обязательна"],
    },
    timezone: {
      type:    String,
      default: "Asia/Almaty", // ДОБАВЛЕНО: для корректного отображения времени
    },
    status: {
      type:    String,
      enum:    ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    stripeSessionId: {
      type:   String,
      sparse: true,
      unique: true,
    },
  },
  { timestamps: true }
);

appointmentSchema.index(
  { doctorId: 1, date: 1 },
  {
    unique:                  true,
    partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
    name:                    "unique_active_slot",
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
