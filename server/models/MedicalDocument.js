const mongoose = require("mongoose");

const CATEGORIES = ["Анализы", "Снимки", "Рецепты", "Справки", "Выписки", "Другое"];

const medicalDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    // Имя файла, как его назвал пользователь при загрузке — только для отображения.
    originalName: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 255,
    },
    // Имя файла НА ДИСКЕ — случайное (см. routes/document.js), не совпадает с originalName.
    // Уникальность защищает от неожиданной перезаписи при коллизии (крайне маловероятной,
    // но дешёвой в проверке на уровне БД).
    storedName: {
      type:     String,
      required: true,
      unique:   true,
    },
    mimeType: {
      type:     String,
      required: true,
    },
    size: {
      type:     Number, // байты
      required: true,
    },
    category: {
      type:    String,
      enum:    CATEGORIES,
      default: "Другое",
    },
  },
  { timestamps: true }
);

// Индекс для GET /api/documents (список документов пользователя, новые сверху)
medicalDocumentSchema.index({ userId: 1, createdAt: -1 });

const MedicalDocument = mongoose.model("MedicalDocument", medicalDocumentSchema);
MedicalDocument.CATEGORIES = CATEGORIES;

module.exports = MedicalDocument;
