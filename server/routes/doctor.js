const router = require("express").Router();
const { query } = require("express-validator");
const { isValidObjectId } = require("mongoose");
const Doctor = require("../models/Doctor");
const validate = require("../middleware/validate");

const SORT_MAP = {
  rating:      { rating: -1 },
  price_asc:   { price: 1 },
  price_desc:  { price: -1 },
  experience:  { experience: -1 },
};

router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
    query("search").optional().isString().trim().isLength({ max: 100 }),
    query("specialty").optional().isString().trim().isLength({ max: 100 }),
    query("sort").optional().isIn(Object.keys(SORT_MAP)).withMessage("Некорректный параметр sort"),
    query("minRating").optional().isFloat({ min: 0, max: 5 }).toFloat(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const page  = req.query.page  || 1;
      const limit = req.query.limit || 20;
      const skip  = (page - 1) * limit;
      const sort  = SORT_MAP[req.query.sort] || SORT_MAP.rating;

      const filter = { isActive: { $ne: false } };

      if (req.query.specialty) {
        filter.specialty = req.query.specialty;
      }

      if (req.query.search) {
        filter.$text = { $search: req.query.search };
      }

      if (req.query.minRating) {
        filter.rating = { $gte: req.query.minRating };
      }

      const [doctors, total] = await Promise.all([
        Doctor.find(filter).sort(sort).skip(skip).limit(limit),
        Doctor.countDocuments(filter),
      ]);

      res.json({
        doctors,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/:id", async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Некорректный ID врача" });
    }
    const doctor = await Doctor.findOne({ _id: req.params.id, isActive: { $ne: false } });
    if (!doctor) return res.status(404).json({ message: "Врач не найден" });
    res.json(doctor);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
