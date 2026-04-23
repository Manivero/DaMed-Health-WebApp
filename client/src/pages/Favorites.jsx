import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useFavorites } from "../context/FavoritesContext";
import { getDoctors } from "../services/doctorService";
import DoctorCard from "../components/DoctorCard";
import Loader from "../components/Loader";

export default function Favorites() {
  const { ids, toggle, isFav } = useFavorites();
  const [allDocs, setAllDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoctors({ limit: 100 })
      .then(r => setAllDocs(r.data.doctors || []))
      .finally(() => setLoading(false));
  }, []);

  const favDocs = allDocs.filter(d => isFav(d._id));

  if (loading) return <Loader text="Загружаем избранных врачей…" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h1>Избранные врачи</h1>
        <p>{favDocs.length > 0 ? `${favDocs.length} врач${favDocs.length === 1 ? "" : favDocs.length < 5 ? "а" : "ей"} в избранном` : "Список избранного пуст"}</p>
      </div>

      {favDocs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 48px" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🤍</div>
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: 24, color: "var(--navy)", fontWeight: 400, marginBottom: 12 }}>
            Нет избранных врачей
          </h2>
          <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 15 }}>
            Нажмите ❤️ на карточке врача, чтобы добавить его в избранное
          </p>
          <Link to="/doctors" className="btn btn-primary btn-lg">Найти врача</Link>
        </div>
      ) : (
        <div className="docs-grid">
          <AnimatePresence>
            {favDocs.map((doc, i) => (
              <motion.div key={doc._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                style={{ position: "relative" }}
              >
                <button
                  onClick={() => toggle(doc._id)}
                  style={{
                    position: "absolute", top: 12, right: 12, zIndex: 10,
                    background: "rgba(255,255,255,.9)", border: "none",
                    borderRadius: "50%", width: 34, height: 34,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 18, backdropFilter: "blur(8px)",
                    boxShadow: "0 2px 8px rgba(0,0,0,.12)",
                  }}
                  title="Убрать из избранного"
                >❤️</button>
                <Link to={`/doctors/${doc._id}`} style={{ textDecoration: "none", display: "block" }}>
                  <DoctorCard doctor={doc} />
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
