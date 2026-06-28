const router = require("express").Router();
const { body } = require("express-validator");
const Review = require("../models/Review");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const mongoose = require("mongoose");

const reviewRules = [
  body("doctorId").isMongoId().withMessage("Некорректный ID врача"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Рейтинг от 1 до 5"),
  body("text").optional().trim().isLength({ max: 500 }),
];

// Без mongoose-транзакций: standalone MongoDB (без replica set) не поддерживает
// multi-document transactions, а README явно допускает именно такую конфигурацию
// ("MongoDB локально"). Защита от дублирующегося отзыва — уникальный индекс
// {doctorId,userId} + обработка кода 11000, защита от рассинхрона рейтинга —
// пересчёт через aggregate сразу после создания отзыва (eventual consistency
// в пределах одного запроса, без ACID-гарантий, которые здесь и не требуются:
// чуть устаревший reviewCount/rating не является бизнес-критичной ошибкой).
router.post("/", protect, reviewRules, validate, async (req, res, next) => {
  try {
    const { doctorId, rating, text } = req.body;

    // КРИТИЧНО ДЛЯ ДОВЕРИЯ К РЕЙТИНГУ: раньше отзыв можно было оставить любому
    // врачу без единого подтверждённого визита — это открывало накрутку/слив
    // рейтинга ботами или конкурентами, а рейтинг напрямую влияет на платные
    // записи. Требуем хотя бы одну состоявшуюся запись (confirmed/pending-без-
    // оплаты) с датой не позже текущего момента — pending_payment (незавершённая
    // оплата) и cancelled не считаются.
    const hasAttendedAppointment = await Appointment.exists({
      userId:   req.user._id,
      doctorId,
      status:   { $in: ["confirmed", "pending"] },
      date:     { $lte: new Date() },
    });

    if (!hasAttendedAppointment) {
      return res.status(403).json({
        message: "Оставить отзыв можно только после состоявшегося приёма у этого врача",
      });
    }

    let review;
    try {
      review = await Review.create({ doctorId, userId: req.user._id, rating, text });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: "Вы уже оставили отзыв этому врачу" });
      }
      throw err;
    }

    const [agg] = await Review.aggregate([
      { $match: { doctorId: review.doctorId } },
      { $group: { _id: "$doctorId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    if (agg) {
      await Doctor.findByIdAndUpdate(doctorId, {
        rating: +agg.avg.toFixed(2),
        reviewCount: agg.count,
      });
    }

    const populated = await review.populate("userId", "name");
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

// Публичный эндпоинт — без авторизации. Отдаём только имя автора отзыва,
// НИКОГДА email: для медицинского сервиса связка "email + специализация врача"
// является чувствительными данными о здоровье пациента и не должна быть доступна
// анонимно.
router.get("/:doctorId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.doctorId)) {
      return res.status(400).json({ message: "Некорректный ID врача" });
    }
    const reviews = await Review.find({ doctorId: req.params.doctorId })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
