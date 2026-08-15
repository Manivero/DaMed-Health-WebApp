import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";
import { useFetch } from "../hooks/useFetch";
import Loader from "../components/Loader";
import {
  listDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
} from "../services/documentService";

// Совпадает с allowlist на сервере (server/routes/document.js) — категории для загрузки.
const UPLOAD_CATEGORIES = ["Анализы", "Снимки", "Рецепты", "Справки", "Выписки", "Другое"];
const FILTER_CATEGORIES = ["Все", ...UPLOAD_CATEGORIES];

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — совпадает с сервером

const TYPE_ICON = { "application/pdf": "📄" };
const iconFor = (mime) => TYPE_ICON[mime] || (mime?.startsWith("image/") ? "🖼️" : "📎");

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function MedCard() {
  const { showToast } = useToast();
  const fetchDocs = useCallback(() => listDocuments({ limit: 100 }), []);
  const { data, loading, refetch } = useFetch(fetchDocs);
  const documents = data?.documents || [];

  const [category, setCategory] = useState("Все");
  const [uploadCategory, setUploadCategory] = useState("Другое");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState(null);
  const inputRef = useRef();

  const filtered = category === "Все" ? documents : documents.filter((d) => d.category === category);
  const totalSize = documents.reduce((sum, d) => sum + d.size, 0);

  const validateFile = (file) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      showToast(`«${file.name}» — недопустимый тип (нужен PDF, JPG, PNG или WEBP)`);
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast(`«${file.name}» слишком большой (максимум 10 MB)`);
      return false;
    }
    return true;
  };

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList).filter(validateFile);
    if (files.length === 0) return;

    setUploading(true);
    const results = await Promise.allSettled(files.map((f) => uploadDocument(f, uploadCategory)));
    setUploading(false);

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;

    if (ok > 0) {
      showToast(
        failed > 0
          ? `Загружено ${ok} из ${results.length} файлов`
          : `Загружено файлов: ${ok} ✅`
      );
      refetch();
    } else {
      showToast("Не удалось загрузить файл. Попробуйте ещё раз.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    uploadFiles(e.dataTransfer.files);
  };

  const handleDownload = async (doc, e) => {
    e.stopPropagation();
    try {
      const res = await downloadDocument(doc._id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Не удалось скачать файл");
    }
  };

  const handleDelete = async (doc, e) => {
    e.stopPropagation();
    if (!confirm(`Удалить «${doc.originalName}»?`)) return;
    try {
      await deleteDocument(doc._id);
      showToast("Файл удалён");
      if (selected?._id === doc._id) setSelected(null);
      refetch();
    } catch {
      showToast("Не удалось удалить документ");
    }
  };

  if (loading) return <Loader text="Загружаем документы…" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Медицинская карта</h1>
          <p>Все ваши документы и анализы в одном месте</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            title="Категория для новых файлов"
            style={{ padding: "9px 12px", borderRadius: "var(--r-md)", border: "1.5px solid var(--border2)", fontSize: 13, background: "var(--surface)", color: "var(--navy)" }}
          >
            {UPLOAD_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => { uploadFiles(e.target.files); e.target.value = ""; }}
          />
          <button className="btn btn-primary" onClick={() => inputRef.current.click()} disabled={uploading}>
            {uploading ? "Загружаем…" : "+ Загрузить документ"}
          </button>
        </div>
      </div>

      <div style={{ padding: "0 48px 48px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Всего файлов", value: documents.length, icon: "📁" },
            { label: "Анализы", value: documents.filter((d) => d.category === "Анализы").length, icon: "🔬" },
            { label: "Снимки", value: documents.filter((d) => d.category === "Снимки").length, icon: "🩻" },
            { label: "Общий размер", value: formatSize(totalSize), icon: "💾" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1.5px solid var(--border2)", borderRadius: "var(--r-lg)", padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 28, color: "var(--teal)", lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 300 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
          style={{
            border: `2px dashed ${dragging ? "var(--teal)" : "var(--border2)"}`,
            borderRadius: "var(--r-xl)", padding: "28px", textAlign: "center",
            background: dragging ? "var(--teal-l)" : "var(--surface2)",
            cursor: "pointer", marginBottom: 24, transition: "all .2s",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>{dragging ? "📥" : "📎"}</div>
          <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 4 }}>
            {dragging ? "Отпустите файл" : "Перетащите файл сюда или нажмите"}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            PDF, JPG, PNG — до 10 MB · загрузится в категорию «{uploadCategory}»
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {FILTER_CATEGORIES.map((c) => (
            <button key={c} className={"chip" + (category === c ? " active" : "")} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>

        {/* File list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AnimatePresence>
            {filtered.map((d, i) => (
              <motion.div key={d._id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelected(selected?._id === d._id ? null : d)}
                style={{
                  background: "var(--surface)", border: `1.5px solid ${selected?._id === d._id ? "var(--teal)" : "var(--border2)"}`,
                  borderRadius: "var(--r-lg)", padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
                  transition: "all .18s", boxShadow: selected?._id === d._id ? "var(--sh-teal)" : "var(--sh-sm)",
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: "var(--r-sm)", background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {iconFor(d.mimeType)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.originalName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>📅 {new Date(d.createdAt).toLocaleDateString("ru-RU")}</span>
                    <span>💾 {formatSize(d.size)}</span>
                    <span>{d.category}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-xs" onClick={(e) => handleDownload(d, e)}>⬇</button>
                  <button className="btn btn-xs" style={{ background: "#fff5f5", color: "var(--danger)", border: "1px solid #fecaca" }}
                    onClick={(e) => handleDelete(d, e)}>✕</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
              <p>{documents.length === 0 ? "Пока нет загруженных документов" : `Документов в категории «${category}» нет`}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
