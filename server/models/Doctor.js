const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Имя обязательно"], trim: true },
    specialty: { type: String, required: [true, "Специальность обязательна"], trim: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    price: { type: Number, default: 5000 },
    photo: { type: String, default: "" },
    bio: { type: String, default: "" },
    education: { type: String, default: "" },
    languages: { type: [String], default: ["Казахский", "Русский"] },
    isOnline: { type: Boolean, default: false },
    clinic: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
