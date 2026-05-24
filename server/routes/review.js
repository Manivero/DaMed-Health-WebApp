const router = require("express").Router();
const { body } = require("express-validator");
const Review = require("../models/Review");
const Doctor = require("../models/Doctor");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");

const reviewRules = [
  body("doctorId").isMongoId().withMessage("Некорректный ID врача"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Рейтинг от 1 до 5"),
  body("text").optional().trim().isLength({ max: 500 }),
];

// POST /api/reviews
router.post("/", protect, reviewRules, validate, async (req, res, next) => {
  try {
    const { doctorId, rating, text } = req.body;

    const existing = await Review.findOne({ doctorId, userId: req.user._id });
    if (existing) {
      return res.status(409).json({ message: "Вы уже оставили отзыв этому врачу" });
    }

    const review = await Review.create({
      doctorId,
      userId: req.user._id,
      rating,
      text,
    });

    // Атомарная агрегация — нет race condition при одновременных отзывах
    const [agg] = await Review.aggregate([
      { $match: { doctorId: review.doctorId } },
      {
        $group: {
          _id:   "$doctorId",
          avg:   { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (agg) {
      await Doctor.findByIdAndUpdate(doctorId, {
        rating:      +agg.avg.toFixed(2),
        reviewCount: agg.count,
      });
    }

    const populated = await review.populate("userId", "email name");
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/:doctorId
router.get("/:doctorId", async (req, res, next) => {
  try {
    const reviews = await Review.find({ doctorId: req.params.doctorId })
      .populate("userId", "email name")
      .sort({ createdAt: -1 })
      .limit(50); // защита от dump всех отзывов
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
