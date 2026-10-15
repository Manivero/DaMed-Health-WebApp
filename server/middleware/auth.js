const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Нет токена авторизации" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "Пользователь не найден" });
    next();
  } catch {
    return res.status(401).json({ message: "Недействительный или истёкший токен" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Доступ только для администратора" });
  }
  next();
};

const doctorOnly = (req, res, next) => {
  if (req.user?.role !== "doctor") {
    return res.status(403).json({ message: "Доступ только для врача" });
  }
  next();
};

module.exports = { protect, adminOnly, doctorOnly };
