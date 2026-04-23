import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getDoctorById } from "../services/doctorService";
import apiClient from "../services/apiClient";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../context/ToastContext";
import { isLoggedIn } from "../utils/auth";
import { DoctorPageSkeleton } from "../components/Skeleton";

const GRADIENTS = [
  "linear-gradient(135deg,#0FA58C,#4fc9b0)",
  "linear-gradient(135deg,#3B82F6,#60a5fa)",
  "linear-gradient(135deg,#8B5CF6,#a78bfa)",
  "linear-gradient(135deg,#EC4899,#f472b6)",
  "linear-gradient(135deg,#F59E0B,#fbbf24)",
];
function getGrad(name = "") {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return GRADIENTS[h % GRADIENTS.length];
}

function Stars({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          style={{
            fontSize: 26, cursor: onChange ? "pointer" : "default",
            color: n <= (hover || value) ? "#f59e0b" : "var(--border)",
            transition: "color .15s",
          }}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange && onChange(n)}
        >★</span>
      ))}
    </div>
  );
}

export default function DoctorPage() {
  const { id } = useParams();
  const { showToast } = useToast();

  const { data: doctor, loading } = useFetch(() => getDoctorById(id), [id]);
  const { data: reviews, loading: lr, refetch: reR } = useFetch(
    () => apiClient.get(`/reviews/${id}`), [id]
  );

  const [rating,  setRating]  = useState(0);
  const [text,    setText]    = useState("");
  const [sending, setSending] = useState(false);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!rating) return showToast("Поставьте оценку");
    setSending(true);
    try {
      await apiClient.post("/reviews", { doctorId: id, rating, text });
      setRating(0); setText("");
      reR();
      showToast("Отзыв отправлен ✅");
    } catch (err) {
      showToast(err.response?.data?.message || "Ошибка");
    } finally { setSending(false); }
  };

  if (loading) return <DoctorPageSkeleton />;
  if (!doctor) return (
    <div style={{ padding: "64px 48px", textAlign: "center" }}>
      <p style={{ color: "var(--muted)" }}>Врач не найден</p>
      <Link to="/doctors" className="btn btn-primary" style={{ marginTop: 16 }}>К списку врачей</Link>
    </div>
  );

  const initials = doctor.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, var(--navy) 0%, #1a3a62 100%)",
        padding: "40px 48px", display: "flex", alignItems: "center",
        gap: 28, position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", right: -80, top: -80, width: 280, height: 280,
          background: "radial-gradient(circle,rgba(15,165,140,.15),transparent 70%)",
          borderRadius: "50%",
        }} />
        <div style={{
          width: 96, height: 96, borderRadius: "50%",
          background: getGrad(doctor.name),
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 800, fontSize: 32, flexShrink: 0,
          border: "3px solid rgba(255,255,255,.2)", zIndex: 1,
          fontFamily: "var(--font-head)",
        }}>
          {doctor.photo
            ? <img src={doctor.photo} alt={doctor.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            : initials}
        </div>
        <div style={{ zIndex: 1, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: "var(--font-head)", fontSize: 30, color: "white", fontWeight: 400 }}>
              {doctor.name}
            </h1>
            <span style={{ width: 9, height: 9, background: "#22c55e", borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", flexShrink: 0 }} />
          </div>
          <p style={{ color: "rgba(255,255,255,.65)", fontSize: 15, marginBottom: 12 }}>{doctor.specialty}</p>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { label: "Рейтинг", value: `${doctor.rating?.toFixed(1) || "—"} ★` },
              { label: "Опыт", value: doctor.experience ? `${doctor.experience} лет` : "—" },
              { label: "Стоимость", value: doctor.price ? `$${(doctor.price / 100).toFixed(0)}` : "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ color: "rgba(255,255,255,.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".8px", fontWeight: 600 }}>{label}</div>
                <div style={{ color: "white", fontSize: 16, fontWeight: 700, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
        <Link to={`/booking/${id}`} className="btn btn-primary btn-lg" style={{ flexShrink: 0, zIndex: 1 }}>
          Записаться →
        </Link>
      </div>

      <div style={{ padding: "36px 48px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 32, alignItems: "start" }}>
        {/* Reviews */}
        <div>
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: 24, color: "var(--navy)", fontWeight: 400, marginBottom: 20 }}>
            Отзывы пациентов ({(reviews || []).length})
          </h2>

          {lr ? (
            <div style={{ color: "var(--muted)", padding: "24px 0" }}>Загружаем отзывы…</div>
          ) : (reviews || []).length === 0 ? (
            <div style={{ padding: "32px 0", color: "var(--muted)", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
              <p>Отзывов пока нет. Будьте первым!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <AnimatePresence>
                {(reviews || []).map((r, i) => (
                  <motion.div
                    key={r._id}
                    className="form-card"
                    style={{ padding: "20px 22px" }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: "linear-gradient(135deg,#0FA58C,#4fc9b0)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "white", fontSize: 13, fontWeight: 700,
                        }}>
                          {(r.userId?.email || "А")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>
                            {r.userId?.email?.split("@")[0] || "Пациент"}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {new Date(r.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                      <div style={{ color: "#f59e0b", fontSize: 16, letterSpacing: 2 }}>
                        {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                      </div>
                    </div>
                    {r.text && <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>{r.text}</p>}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Sidebar: write review */}
        <div style={{ position: "sticky", top: "calc(var(--nav-h) + 24px)" }}>
          {isLoggedIn() ? (
            <div className="side-card">
              <div className="side-card-title">Оставить отзыв</div>
              <form onSubmit={submitReview}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Ваша оценка</div>
                  <Stars value={rating} onChange={setRating} />
                </div>
                <div className="field">
                  <label>Комментарий (необязательно)</label>
                  <textarea
                    placeholder="Расскажите о своём визите…"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={4}
                    maxLength={500}
                    style={{ resize: "vertical" }}
                  />
                  <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right", marginTop: 4 }}>{text.length}/500</div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={sending || !rating}>
                  {sending ? "Отправляем…" : "Отправить отзыв"}
                </button>
              </form>
            </div>
          ) : (
            <div className="tip-card">
              <div className="tip-tag">Отзывы</div>
              <p className="tip-text" style={{ marginBottom: 14 }}>
                Войдите в аккаунт, чтобы оставить отзыв об этом враче.
              </p>
              <Link to="/login" className="btn btn-primary btn-sm">Войти</Link>
            </div>
          )}

          {/* Doctor stats card */}
          <div className="side-card" style={{ marginTop: 16 }}>
            <div className="side-card-title">О враче</div>
            {[
              { label: "Специальность", value: doctor.specialty },
              { label: "Опыт работы", value: doctor.experience ? `${doctor.experience} лет` : "Не указан" },
              { label: "Стоимость приёма", value: doctor.price ? `$${(doctor.price / 100).toFixed(0)}` : "По договорённости" },
              { label: "Средний рейтинг", value: `${doctor.rating?.toFixed(2) || "—"} / 5.00` },
            ].map(({ label, value }) => (
              <div key={label} className="sum-row">
                <span className="sum-lbl">{label}</span>
                <span style={{ fontWeight: 500, color: "var(--text)", fontSize: 14 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
