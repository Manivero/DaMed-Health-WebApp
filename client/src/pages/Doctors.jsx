import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DoctorCard from "../components/DoctorCard";
import { DoctorCardSkeleton } from "../components/Skeleton";
import { getDoctors } from "../services/doctorService";
import { useDebounce } from "../hooks/useDebounce";
import { SPECIALTIES, specialtyLabel } from "../utils/specialties";

// ALL — языконезависимый маркер «без фильтра». Раньше роль маркера играла русская подпись «Все»,
// из-за чего перевод подписи сломал бы логику (filter !== ALL). Значения специальностей — русские
// строки из БД и уходят в API как есть; переводится только подпись (см. utils/specialties.js).
const ALL = "all";
const SPEC_CHIPS = [ALL, ...SPECIALTIES.map((x) => x.value)];
const SORTS = [
  { value: "rating", labelKey: "catalog.sort.rating" },
  { value: "price_asc", labelKey: "catalog.sort.price_asc" },
  { value: "price_desc", labelKey: "catalog.sort.price_desc" },
  { value: "experience", labelKey: "catalog.sort.experience" },
];

export default function Doctors() {
  const { t } = useTranslation();
  const [doctors,    setDoctors]    = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false); // флаг, не текст: сообщение переводится при показе
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState(ALL);
  const [sort,       setSort]       = useState("rating");
  const [minRating,  setMinRating]  = useState(0);
  const [page,       setPage]       = useState(1);
  const [showFilter, setShowFilter] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // Сортировка, фильтр по рейтингу, поиск и пагинация — всё применяется на
  // сервере, на полном наборе врачей, а не только на уже загрученной странице.
  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const params = { page, limit: 12, sort };
      if (filter !== ALL) params.specialty = filter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (minRating > 0) params.minRating = minRating;
      const res = await getDoctors(params);
      setDoctors(res.data.doctors);
      setPagination(res.data.pagination);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [page, filter, sort, minRating, debouncedSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter, sort, minRating, debouncedSearch]);

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <div className="page-header">
        <h1>{t("catalog.title")}</h1>
        <p>{t("catalog.subtitle")}</p>
      </div>

      {/* Controls */}
      <div className="controls">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            placeholder={t("catalog.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={()=>setSearch("")} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:16,lineHeight:1,padding:0}}>✕</button>
          )}
        </div>
        <div className="chips">
          {SPEC_CHIPS.map(s => (
            <button key={s} className={"chip"+(filter===s?" active":"")} onClick={()=>setFilter(s)}>{s === ALL ? t("catalog.all") : specialtyLabel(s, t)}</button>
          ))}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          <select className="sort-select" value={sort} onChange={e=>setSort(e.target.value)}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
          </select>
          <button
            className={"btn btn-ghost btn-sm"+(showFilter?" active":"")}
            onClick={()=>setShowFilter(f=>!f)}
            style={showFilter?{borderColor:"var(--teal)",color:"var(--teal)",background:"var(--teal-l)"}:{}}
          >
            ⚙️ {t("catalog.filter")}
          </button>
        </div>
      </div>

      {/* Extended filter */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ height:0, opacity:0 }}
            animate={{ height:"auto", opacity:1 }}
            exit={{ height:0, opacity:0 }}
            style={{ overflow:"hidden", borderBottom:"1px solid var(--border-l)", background:"var(--surface2)" }}
          >
            <div style={{ padding:"16px 48px", display:"flex", gap:32, alignItems:"center", flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:12,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8 }}>
                  {t("catalog.minRating", { value: minRating > 0 ? `${minRating}★` : t("catalog.anyRating") })}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {[0,3,4,4.5].map(v => (
                    <button
                      key={v}
                      className={"chip"+(minRating===v?" active":"")}
                      onClick={()=>setMinRating(v)}
                      style={{ fontSize:12 }}
                    >
                      {v === 0 ? t("catalog.all") : `${v}★+`}
                    </button>
                  ))}
                </div>
              </div>
              {(filter !== ALL || debouncedSearch || minRating > 0) && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setFilter(ALL); setSearch(""); setMinRating(0); setSort("rating"); }}
                  style={{ marginLeft:"auto" }}
                >
                  {t("catalog.resetFilters")}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filters badge */}
      {(filter !== ALL || debouncedSearch || minRating > 0) && !loading && (
        <div style={{ padding:"10px 48px", display:"flex", gap:8, alignItems:"center", background:"var(--teal-l)", borderBottom:"1px solid var(--teal-mid)" }}>
          <span style={{ fontSize:13, color:"var(--teal)", fontWeight:500 }}>
            {t("catalog.found", { total: pagination?.total ?? doctors.length })}
          </span>
          {filter !== ALL && <span className="chip chip-active" style={{fontSize:12}}>{specialtyLabel(filter, t)} ✕</span>}
          {debouncedSearch && <span className="chip chip-active" style={{fontSize:12}}>"{debouncedSearch}" ✕</span>}
          {minRating > 0 && <span className="chip chip-active" style={{fontSize:12}}>{minRating}★+ ✕</span>}
        </div>
      )}

      {error && (
        <div style={{ padding:"24px 48px" }}>
          <div className="alert alert-error">{t("catalog.loadError")}</div>
        </div>
      )}

      {/* Grid */}
      <div className="docs-grid">
        {loading
          ? Array(6).fill(0).map((_,i) => <DoctorCardSkeleton key={i} />)
          : doctors.length === 0
            ? (
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"64px 0", color:"var(--muted)" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
                <p style={{ fontSize:15, marginBottom:16 }}>{t("catalog.notFound")}</p>
                <button className="btn btn-ghost" onClick={()=>{ setFilter(ALL); setSearch(""); setMinRating(0); }}>
                  {t("catalog.resetFilters")}
                </button>
              </div>
            )
            : (
              <AnimatePresence>
                {doctors.map((d,i) => (
                  <motion.div key={d._id}
                    initial={{ opacity:0, y:16 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link to={`/doctors/${d._id}`} style={{ textDecoration:"none", display:"block" }}>
                      <DoctorCard doctor={d} />
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            )
        }
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"24px 48px 40px" }}>
          <button className="btn btn-ghost btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>{t("catalog.prev")}</button>
          {Array.from({length: pagination.pages}, (_,i) => i+1).map(p => (
            <button key={p}
              className={"btn btn-sm"+(page===p?" btn-primary":" btn-ghost")}
              onClick={()=>setPage(p)}
              style={{ minWidth:36 }}
            >{p}</button>
          ))}
          <button className="btn btn-ghost btn-sm" disabled={page===pagination.pages} onClick={()=>setPage(p=>p+1)}>{t("catalog.next")}</button>
        </div>
      )}
    </motion.div>
  );
}
