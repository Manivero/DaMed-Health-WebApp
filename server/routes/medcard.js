const router  = require("express").Router();
const multer  = require("multer");
const mongoose = require("mongoose");
const { protect } = require("../middleware/auth");
const { uploadLimiter } = require("../middleware/rateLimiter");

// АРХИТЕКТУРНОЕ РЕШЕНИЕ: MongoDB GridFS выбран как хранилище файлов.
// Обоснование: нет необходимости в отдельной инфраструктуре (S3/MinIO) на старте
// проекта для 100k пользователей с медицинскими документами. GridFS хранит файлы
// фрагментами по 255 КБ в коллекции medcard.chunks + метаданные в medcard.files.
// GridFS TRADE-OFF: MongoDB не оптимален для хранения больших объёмов бинарных файлов
// в долгосрочной перспективе — при росте объёма (>10 ГБ) рекомендуется миграция на
// отдельный S3-совместимый сторидж. Однако для текущего горизонта (MVP → первые
// 100k пользователей) это лучший компромисс между простотой деплоя и надёжностью.
//
// БЕЗОПАСНОСТЬ: userId хранится в metadata каждого файла и ВСЕГДА проверяется при
// скачивании/удалении — IDOR (Insecure Direct Object Reference) невозможен.

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 МБ

// multer с memoryStorage: файл читается в req.file.buffer, затем стримится в GridFS.
// Временных файлов на диске нет — снижает attack surface и не требует cleanup.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Недопустимый тип файла. Разрешены: PDF, JPEG, PNG, WEBP"));
    }
  },
});

// Ленивый геттер bucket — GridFS инициализируется после подключения MongoDB.
// Нельзя создавать GridFSBucket до установки соединения (mongoose.connection.db = null).
function getBucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB не подключена");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "medcard" });
}

// POST /api/medcard/upload
// Загружает файл в GridFS. userId в metadata — основа IDOR-защиты.
router.post(
  "/upload",
  protect,
  uploadLimiter,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Файл не передан" });
      }

      const { category = "Анализы", status = "norm" } = req.body;
      const ALLOWED_CATEGORIES = ["Анализы", "Снимки", "Рецепты", "Справки", "Выписки"];
      const ALLOWED_STATUSES   = ["norm", "active", "expired", "attention"];
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: "Недопустимая категория" });
      }
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Недопустимый статус" });
      }

      const bucket = getBucket();
      const userId = req.user._id.toString();

      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: {
          userId,
          category,
          status,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });

      await new Promise((resolve, reject) => {
        uploadStream.on("finish", resolve);
        uploadStream.on("error", reject);
        uploadStream.end(req.file.buffer);
      });

      res.status(201).json({
        id:       uploadStream.id.toString(),
        name:     req.file.originalname,
        category,
        status,
        size:     `${(req.file.size / 1024).toFixed(0)} KB`,
        type:     req.file.mimetype.startsWith("image") ? "img" : "pdf",
        date:     new Date().toISOString().split("T")[0],
      });
    } catch (err) { next(err); }
  }
);

// GET /api/medcard/files
// Список файлов текущего пользователя.
router.get("/files", protect, async (req, res, next) => {
  try {
    const bucket = getBucket();
    const userId = req.user._id.toString();

    const files = await bucket
      .find({ "metadata.userId": userId })
      .sort({ uploadDate: -1 })
      .toArray();

    const result = files.map((f) => ({
      id:       f._id.toString(),
      name:     f.filename,
      category: f.metadata?.category || "Анализы",
      status:   f.metadata?.status   || "norm",
      size:     f.metadata?.size
        ? `${(f.metadata.size / 1024).toFixed(0)} KB`
        : `${(f.length / 1024).toFixed(0)} KB`,
      type:     f.metadata?.mimetype?.startsWith("image") ? "img" : "pdf",
      date:     f.uploadDate.toISOString().split("T")[0],
    }));

    res.json({ files: result });
  } catch (err) { next(err); }
});

// GET /api/medcard/files/:id/download
// Скачать конкретный файл. Проверяем userId в metadata до стриминга.
router.get("/files/:id/download", protect, async (req, res, next) => {
  try {
    const bucket = getBucket();
    const { ObjectId } = mongoose.mongo;
    const userId = req.user._id.toString();

    let fileId;
    try {
      fileId = new ObjectId(req.params.id);
    } catch {
      return res.status(400).json({ message: "Некорректный идентификатор файла" });
    }

    // IDOR check: убеждаемся, что файл принадлежит текущему пользователю
    const [fileMeta] = await bucket.find({ _id: fileId }).toArray();
    if (!fileMeta) {
      return res.status(404).json({ message: "Файл не найден" });
    }
    if (fileMeta.metadata?.userId !== userId) {
      return res.status(403).json({ message: "Доступ запрещён" });
    }

    const mimetype = fileMeta.metadata?.mimetype || "application/octet-stream";
    res.set("Content-Type", mimetype);
    res.set("Content-Disposition", `attachment; filename="${encodeURIComponent(fileMeta.filename)}"`);
    res.set("Content-Length", fileMeta.length);

    bucket.openDownloadStream(fileId).pipe(res);
  } catch (err) { next(err); }
});

// DELETE /api/medcard/files/:id
// Удалить файл. Проверяем userId перед удалением.
router.delete("/files/:id", protect, async (req, res, next) => {
  try {
    const bucket = getBucket();
    const { ObjectId } = mongoose.mongo;
    const userId = req.user._id.toString();

    let fileId;
    try {
      fileId = new ObjectId(req.params.id);
    } catch {
      return res.status(400).json({ message: "Некорректный идентификатор файла" });
    }

    // IDOR check
    const [fileMeta] = await bucket.find({ _id: fileId }).toArray();
    if (!fileMeta) {
      return res.status(404).json({ message: "Файл не найден" });
    }
    if (fileMeta.metadata?.userId !== userId) {
      return res.status(403).json({ message: "Доступ запрещён" });
    }

    await bucket.delete(fileId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
