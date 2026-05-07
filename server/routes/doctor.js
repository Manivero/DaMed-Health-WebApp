const router = require("express").Router();
const { query } = require("express-validator");
const Doctor = require("../models/Doctor");
const validate = require("../middleware/validate");

// Экранирует спецсимволы regex — защита от ReDoS атаки
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/doctors?page=1&limit=10&specialty=Кардиолог&search=Иван
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
    query("search").optional().isString().trim().isLength({ max: 100 }),
    query("specialty").optional().isString().trim().isLength({ max: 100 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const page  = req.query.page  || 1;
      const limit = req.query.limit || 20;
      const skip  = (page - 1) * limit;

      const filter = {};

      if (req.query.specialty) {
        filter.specialty = { $regex: escapeRegex(req.query.specialty), $options: "i" };
      }

      if (req.query.search) {
        const safe = escapeRegex(req.query.search);
        filter.$or = [
          { name:      { $regex: safe, $options: "i" } },
          { specialty: { $regex: safe, $options: "i" } },
        ];
      }

      const [doctors, total] = await Promise.all([
        Doctor.find(filter).sort({ rating: -1 }).skip(skip).limit(limit),
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

// GET /api/doctors/:id
router.get("/:id", async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Врач не найден" });
    res.json(doctor);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
