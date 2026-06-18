const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true, index: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
