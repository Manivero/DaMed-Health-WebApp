const router = require("express").Router();
const { query } = require("express-validator");
const Doctor = require("../models/Doctor");
const validate = require("../middleware/validate");

// GET /api/doctors?page=1&limit=10&specialty=Кардиолог&search=Иван
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.specialty) filter.specialty = req.query.specialty;
      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: "i" } },
          { specialty: { $regex: req.query.search, $options: "i" } },
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
