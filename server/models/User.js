const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email обязателен"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Пароль обязателен"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // Profile fields
    name: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    birthDate: { type: Date },
    bloodType: { type: String, enum: ["A+","A-","B+","B-","AB+","AB-","O+","O-",""], default: "" },
    allergies: { type: String, default: "" },
    // Reset password
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
