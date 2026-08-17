const mongoose = require("mongoose");

// Только реально событийно-управляемые типы (см. IMPLEMENTATION_LOG.md, TASK T013 — BASELINE,
// про сознательное исключение time-based типов вроде "reminder"/"review" из этой задачи).
const TYPES = ["booking_confirmed", "booking_cancelled"];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    type: {
      type:     String,
      enum:     TYPES,
      required: true,
    },
    title: {
      type:     String,
      required: true,
    },
    body: {
      type:     String,
      required: true,
    },
    read: {
      type:    Boolean,
      default: false,
    },
    // Необязательная ссылка на связанную запись — задел на будущее (например, клик по
    // уведомлению мог бы вести на конкретную запись), не используется в T013 напрямую.
    relatedAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Appointment",
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
Notification.TYPES = TYPES;

module.exports = Notification;
