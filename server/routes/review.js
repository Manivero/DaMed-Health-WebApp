const router = require("express").Router();
const { body } = require("express-validator");
const Review = require("../models/Review");
const Doctor = require("../models/Doctor");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const mongoose = require("mongoose");

const reviewRules = [
  body("doctorId").isMongoId().withMessage("Некорректный ID врача"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Рейтинг от 1 до 5"),
  body("text").optional().trim().isLength({ max: 500 }),
];

router.post("/", protect, reviewRules, validate, async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { doctorId, rating, text } = req.body;

    const [review] = await Review.create(
      [{ doctorId, userId: req.user._id, rating, text }],
      { session }
    );

    const [agg] = await Review.aggregate([
      { $match: { doctorId: review.doctorId } },
      { $group: { _id: "$doctorId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]).session(session);

    if (agg) {
      await Doctor.findByIdAndUpdate(
        doctorId,
        { rating: +agg.avg.toFixed(2), reviewCount: agg.count },
        { session }
      );
    }

    await session.commitTransaction();

    const populated = await review.populate("userId", "email name");
    res.status(201).json(populated);
  } catch (err) {
    await session.abortTransaction();
    if (err.code === 11000) {
      return res.status(409).json({ message: "Вы уже оставили отзыв этому врачу" });
    }
    next(err);
  } finally {
    session.endSession();
  }
});

router.get("/:doctorId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.doctorId)) {
      return res.status(400).json({ message: "Некорректный ID врача" });
    }
    const reviews = await Review.find({ doctorId: req.params.doctorId })
      .populate("userId", "email name")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
