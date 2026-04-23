import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import DoctorCard from "../components/DoctorCard";
import { DoctorCardSkeleton } from "../components/Skeleton";
import { getDoctors } from "../services/doctorService";
import { useDebounce } from "../hooks/useDebounce";

const SPECS = ["Все","Терапевт","Кардиолог","Хирург","Невролог","Педиатр","Стоматолог","Дерматолог","Офтальмолог"];
const SORTS = [
  { value: "rating", label: "По рейтингу" },
  { value: "price_asc", label: "Цена ↑" },
  { value: "price_desc", label: "Цена ↓" },
  { value: "experience", label: "По опыту" },
];

function sortDoctors(doctors, sort) {
  const arr = [...doctors];
  if (sort === "rating")     return arr.sort((a,b) => (b.rating||0) - (a.rating||0));
  if (sort === "price_asc")  return arr.sort((a,b) => (a.price||0) - (b.price||0));
  if (sort === "price_desc") return arr.sort((a,b) => (b.price||0) - (a.price||0));
  if (sort === "experience") return arr.sort((a,b) => (b.experience||0) - (a.experience||0));
  return arr;
}

export default function Doctors() {
  const [allDocs,    setAllDocs]    = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("Все");
  const [sort,       setSort]       = useState("rating");
  const [minRating,  setMinRating]  = useState(0);
  const [page,       setPage]       = useState(1);
  const [showFilter, setShowFilter] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { page, limit: 12 };
      if (filter !== "Все") params.specialty = filter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const res = await getDoctors(params);
      setAllDocs(res.data.doctors);
      setPagination(res.data.pagination);
    } catch { setError("Не удалось загрузить список врачей"); }
    finally { setLoading(false); }
  }, [page, filter, debouncedSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter, debouncedSearch]);

  const doctors = sortDoctors(
    allDocs.filter(d => (d.rating || 0) >= minRating),
    sort
  );

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <div className="page-header">
        <h1>Наши врачи</h1>
        <p>Выберите специалиста и запишитесь онлайн — без очередей</p>
      </div>

      {/* Controls */}
      <div className="controls">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            placeholder="Поиск по имени или специальности…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={()=>setSearch("")} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:16,lineHeight:1,padding:0}}>✕</button>
          )}
        </div>
        <div className="chips">
          {SPECS.map(s => (
            <button key={s} className={"chip"+(filter===s?" active":"")} onClick={()=>setFilter(s)}>{s}</button>
          ))}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          <select className="sort-select" value={sort} onChange={e=>setSort(e.target.value)}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button
            className={"btn btn-ghost btn-sm"+(showFilter?" active":"")}
            onClick={()=>setShowFilter(f=>!f)}
            style={showFilter?{borderColor:"var(--teal)",color:"var(--teal)",background:"var(--teal-l)"}:{}}
          >
            ⚙️ Фильтр
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
                  Минимальный рейтинг: {minRating > 0 ? `${minRating}★` : "Любой"}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {[0,3,4,4.5].map(v => (
                    <button
                      key={v}
                      className={"chip"+(minRating===v?" active":"")}
                      onClick={()=>setMinRating(v)}
                      style={{ fontSize:12 }}
                    >
                      {v === 0 ? "Все" : `${v}★+`}
                    </button>
                  ))}
                </div>
              </div>
              {(filter !== "Все" || debouncedSearch || minRating > 0) && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setFilter("Все"); setSearch(""); setMinRating(0); setSort("rating"); }}
                  style={{ marginLeft:"auto" }}
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filters badge */}
      {(filter !== "Все" || debouncedSearch || minRating > 0) && !loading && (
        <div style={{ padding:"10px 48px", display:"flex", gap:8, alignItems:"center", background:"var(--teal-l)", borderBottom:"1px solid var(--teal-mid)" }}>
          <span style={{ fontSize:13, color:"var(--teal)", fontWeight:500 }}>
            Найдено: {doctors.length}
          </span>
          {filter !== "Все" && <span className="chip chip-active" style={{fontSize:12}}>{filter} ✕</span>}
          {debouncedSearch && <span className="chip chip-active" style={{fontSize:12}}>"{debouncedSearch}" ✕</span>}
          {minRating > 0 && <span className="chip chip-active" style={{fontSize:12}}>{minRating}★+ ✕</span>}
        </div>
      )}

      {error && (
        <div style={{ padding:"24px 48px" }}>
          <div className="alert alert-error">{error}</div>
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
                <p style={{ fontSize:15, marginBottom:16 }}>Врачи не найдены по вашему запросу</p>
                <button className="btn btn-ghost" onClick={()=>{ setFilter("Все"); setSearch(""); setMinRating(0); }}>
                  Сбросить фильтры
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
          <button className="btn btn-ghost btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Назад</button>
          {Array.from({length: pagination.pages}, (_,i) => i+1).map(p => (
            <button key={p}
              className={"btn btn-sm"+(page===p?" btn-primary":" btn-ghost")}
              onClick={()=>setPage(p)}
              style={{ minWidth:36 }}
            >{p}</button>
          ))}
          <button className="btn btn-ghost btn-sm" disabled={page===pagination.pages} onClick={()=>setPage(p=>p+1)}>Вперёд →</button>
        </div>
      )}
    </motion.div>
  );
}
