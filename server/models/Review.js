const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    doctorId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Doctor",
      required: true,
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    rating: {
      type:     Number,
      required: true,
      min:      1,
      max:      5,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Уникальный индекс: один пользователь — один отзыв врачу
reviewSchema.index(
  { doctorId: 1, userId: 1 },
  { unique: true, name: "unique_user_doctor_review" }
);

// Индекс для GET /api/reviews/:doctorId
reviewSchema.index({ doctorId: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
