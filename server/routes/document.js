const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { param, query } = require("express-validator");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const MedicalDocument = require("../models/MedicalDocument");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "medical-documents");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — соответствует заявлению UI ("PDF, JPG, PNG — до 10 MB")

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Случайное имя на диске — НЕ оригинальное. Это (а) исключает path traversal через
  // спецсимволы в оригинальном имени, (б) не даёт угадать/перечислить чужие файлы по URL,
  // даже если бы раздача когда-то стала статической по ошибке.
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(24).toString("hex");
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${randomName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error("Недопустимый тип файла. Разрешены: PDF, JPG, PNG, WEBP"));
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// Лимит на загрузку документов отдельно от общего apiLimiter — загрузка файлов расходует
// диск/IO ощутимее обычного JSON-запроса, есть смысл ограничивать её строже и по пользователю,
// а не только по IP (см. тот же принцип в middleware/rateLimiter.js для aiLimiter).
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много загрузок. Попробуйте позже." },
});

// Оборачиваем multer вручную (не как обычный middleware в цепочке), чтобы перехватить его
// ошибки (недопустимый тип, превышение размера) и вернуть понятный 400 с сообщением на русском,
// а не дать им утечь в общий errorHandler как 500 (см. middleware/errorMiddleware.js — для 5xx
// в production сообщение маскируется общим текстом, что скрыло бы причину от пользователя).
const uploadSingle = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Файл слишком большой (максимум 10MB)" });
      }
      return res.status(400).json({ message: "Ошибка загрузки файла: " + err.message });
    }
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
};

const idParamRule = param("id").isMongoId().withMessage("Некорректный id документа");

// POST /api/documents
router.post("/", protect, uploadLimiter, uploadSingle, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Файл не передан" });

    const category = MedicalDocument.CATEGORIES.includes(req.body.category)
      ? req.body.category
      : "Другое";

    const doc = await MedicalDocument.create({
      userId:       req.user._id,
      originalName: req.file.originalname,
      storedName:   req.file.filename,
      mimeType:     req.file.mimetype,
      size:         req.file.size,
      category,
    });

    res.status(201).json(doc);
  } catch (err) {
    // Запись в БД не удалась — не оставляем файл-сироту на диске.
    if (req.file) fs.unlink(path.join(UPLOAD_DIR, req.file.filename), () => {});
    next(err);
  }
});

// GET /api/documents?page=&limit=
router.get(
  "/",
  protect,
  [
    query("page").optional().isInt({ min: 1 }).toInt().default(1),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt().default(50),
  ],
  validate,
  async (req, res, next) => {
    try {
      const page  = req.query.page  || 1;
      const limit = req.query.limit || 50;
      const skip  = (page - 1) * limit;
      const filter = { userId: req.user._id };

      const [documents, total] = await Promise.all([
        MedicalDocument.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        MedicalDocument.countDocuments(filter),
      ]);

      res.json({ documents, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/documents/:id/download
router.get("/:id/download", protect, idParamRule, validate, async (req, res, next) => {
  try {
    // userId в фильтре — не отдельная проверка "владелец ли я" после чтения, а прямое условие
    // выборки: чужой документ для этого запроса как будто не существует вовсе.
    const doc = await MedicalDocument.findOne({ _id: req.params.id, userId: req.user._id });
    // Намеренно 404, а не 403 — не подтверждаем сам факт существования чужого документа.
    if (!doc) return res.status(404).json({ message: "Документ не найден" });

    const filePath = path.join(UPLOAD_DIR, doc.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Файл отсутствует на сервере" });
    }

    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`
    );
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id
router.delete("/:id", protect, idParamRule, validate, async (req, res, next) => {
  try {
    const doc = await MedicalDocument.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ message: "Документ не найден" });

    fs.unlink(path.join(UPLOAD_DIR, doc.storedName), (err) => {
      if (err) console.error("Не удалось удалить файл с диска:", doc.storedName, err.message);
    });

    res.json({ message: "Документ удалён" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
