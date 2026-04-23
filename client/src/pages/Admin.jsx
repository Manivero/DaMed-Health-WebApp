import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../services/apiClient";
import { isAdmin } from "../utils/auth";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../context/ToastContext";
import Loader from "../components/Loader";

const STATUS_OPTS = ["pending","confirmed","cancelled"];
const STATUS_LBL  = { pending:"Ожидает",confirmed:"Подтверждено",cancelled:"Отменено" };
const TABS = ["Дашборд","Врачи","Пользователи","Записи"];
const GRADIENTS = ["linear-gradient(135deg,#00C9A7,#00E5C0)","linear-gradient(135deg,#3B82F6,#60a5fa)","linear-gradient(135deg,#8B5CF6,#a78bfa)","linear-gradient(135deg,#EC4899,#f472b6)","linear-gradient(135deg,#F59E0B,#fbbf24)"];
function getGrad(name="") { let h=0; for(const c of name) h=(h*31+c.charCodeAt(0))&0xffff; return GRADIENTS[h%GRADIENTS.length]; }

// Fix: useEffect-based guard instead of early return before hooks
function AdminInner() {
  const { showToast } = useToast();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ name:"",specialty:"",experience:"",price:"",bio:"",clinic:"" });
  const [editDoctor, setEditDoctor] = useState(null);
  const [dSearch, setDSearch] = useState("");

  const fetchDocs  = useCallback(() => apiClient.get("/doctors?limit=100"), []);
  const fetchUsers = useCallback(() => apiClient.get("/admin/users"), []);
  const fetchAppts = useCallback(() => apiClient.get("/admin/appointments"), []);

  const { data: dRes,  loading: ld, refetch: reD } = useFetch(fetchDocs);
  const { data: users, loading: lu }               = useFetch(fetchUsers);
  const { data: appts, loading: la, refetch: reA } = useFetch(fetchAppts);

  const doctors = (dRes?.doctors || []).filter(d =>
    !dSearch || d.name.toLowerCase().includes(dSearch.toLowerCase()) || d.specialty.toLowerCase().includes(dSearch.toLowerCase())
  );

  const addDoctor = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/admin/doctors", {
        ...form, experience:Number(form.experience)||0, price:Number(form.price)*100||5000
      });
      setForm({name:"",specialty:"",experience:"",price:"",bio:"",clinic:""});
      reD(); showToast("Врач добавлен ✅");
    } catch(err) { showToast("❌ "+(err.response?.data?.message||"Ошибка")); }
  };

  const delDoctor = async (id) => {
    if(!confirm("Удалить врача? Это необратимо.")) return;
    await apiClient.delete(`/admin/doctors/${id}`); reD(); showToast("Врач удалён");
  };

  const changeStatus = async (id, status) => {
    await apiClient.patch(`/admin/appointments/${id}/status`,{status}); reA();
    showToast(`Статус изменён: ${STATUS_LBL[status]}`);
  };

  if (ld||lu||la) return <Loader text="Загружаем данные…"/>;

  const confirmedCount = (appts||[]).filter(a=>a.status==="confirmed").length;
  const pendingCount   = (appts||[]).filter(a=>a.status==="pending").length;

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}>
      {/* Header */}
      <div className="page-header" style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          <h1>Панель администратора</h1>
          <p>Управление DamuMed · {new Date().toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</p>
        </div>
        <Link to="/" className="btn btn-ghost btn-sm">← На сайт</Link>
      </div>

      {/* Tabs */}
      <div style={{ padding:"0 48px" }}>
        <div className="appt-tabs" style={{ marginBottom:24,width:"fit-content" }}>
          {TABS.map((t,i) => <div key={t} className={"appt-tab"+(tab===i?" active":"")} onClick={()=>setTab(i)}>{t}</div>)}
        </div>

        <AnimatePresence mode="wait">

          {/* TAB 0: Dashboard */}
          {tab===0 && (
            <motion.div key="dash" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:32 }}>
                {[
                  { icon:"👨‍⚕️",val:(dRes?.doctors||[]).length, lbl:"Врачей",    color:"var(--teal)" },
                  { icon:"👥",val:(users||[]).length,          lbl:"Пользователей",color:"#3B82F6"  },
                  { icon:"📋",val:(appts||[]).length,          lbl:"Всего записей",color:"#8B5CF6"  },
                  { icon:"✅",val:confirmedCount,              lbl:"Подтверждено", color:"#22c55e"  },
                ].map(s=>(
                  <div key={s.lbl} style={{ background:"var(--surface)",border:"1.5px solid var(--border2)",borderRadius:"var(--r-xl)",padding:"22px 18px",textAlign:"center" }}>
                    <div style={{fontSize:26,marginBottom:8}}>{s.icon}</div>
                    <div style={{fontFamily:"var(--font-head)",fontSize:36,color:s.color,lineHeight:1,marginBottom:5}}>{s.val}</div>
                    <div style={{fontSize:12,color:"var(--muted)",fontWeight:300}}>{s.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Pending appointments */}
              {pendingCount > 0 && (
                <div style={{ background:"#fff8e6",border:"1px solid #fde68a",borderRadius:"var(--r-lg)",padding:"16px 20px",marginBottom:24,display:"flex",alignItems:"center",gap:12 }}>
                  <span style={{fontSize:20}}>⏳</span>
                  <div>
                    <div style={{fontWeight:700,color:"#92400e"}}>Ожидают подтверждения: {pendingCount}</div>
                    <div style={{fontSize:13,color:"#a3650a"}}>Перейдите во вкладку «Записи» для обработки</div>
                  </div>
                  <button className="btn btn-sm" style={{marginLeft:"auto",background:"#f59e0b",color:"#fff",border:"none"}} onClick={()=>setTab(3)}>
                    Обработать →
                  </button>
                </div>
              )}

              {/* Recent appointments */}
              <div className="form-card">
                <div className="form-card-title" style={{fontSize:18}}>Последние записи</div>
                <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:8}}>
                  {(appts||[]).slice(0,5).map(a=>(
                    <div key={a._id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#00C9A7,#00E5C0)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:800,flexShrink:0}}>
                        {(a.userId?.email||"?")[0].toUpperCase()}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--navy)"}}>{a.userId?.email}</div>
                        <div style={{fontSize:12,color:"var(--muted)"}}>→ {a.doctorId?.name} · {new Date(a.date).toLocaleDateString("ru-RU")}</div>
                      </div>
                      <span className={"badge badge-"+a.status}>{STATUS_LBL[a.status]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 1: Doctors */}
          {tab===1 && (
            <motion.div key="docs" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:24,alignItems:"start"}}>
              <div className="form-card" style={{position:"sticky",top:"calc(var(--nav-h) + 20px)"}}>
                <div className="form-card-title" style={{fontSize:18}}>Добавить врача</div>
                <form onSubmit={addDoctor} style={{marginTop:12}}>
                  {[
                    {k:"name",ph:"Имя врача *",req:true},
                    {k:"specialty",ph:"Специальность *",req:true},
                    {k:"experience",ph:"Опыт (лет)",type:"number"},
                    {k:"price",ph:"Цена ($)",type:"number"},
                    {k:"clinic",ph:"Клиника"},
                    {k:"bio",ph:"О враче (краткое)"},
                  ].map(({k,ph,req,type="text"})=>(
                    <div className="field" key={k} style={{marginBottom:14}}>
                      <label style={{fontSize:11,textTransform:"uppercase",letterSpacing:".5px",color:"var(--muted)"}}>{ph}</label>
                      {k==="bio"
                        ? <textarea placeholder={ph} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} rows={2}/>
                        : <input type={type} placeholder={ph} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} required={req} min={type==="number"?0:undefined}/>
                      }
                    </div>
                  ))}
                  <button type="submit" className="btn btn-primary" style={{width:"100%",justifyContent:"center"}}>+ Добавить врача</button>
                </form>
              </div>
              <div>
                <div className="search-wrap" style={{marginBottom:16,flex:"none",maxWidth:"100%"}}>
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input placeholder="Поиск врача…" value={dSearch} onChange={e=>setDSearch(e.target.value)}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {doctors.map(d=>(
                    <div key={d._id} style={{background:"var(--surface)",border:"1.5px solid var(--border2)",borderRadius:"var(--r-lg)",padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:42,height:42,borderRadius:"50%",background:getGrad(d.name),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:14,flexShrink:0}}>
                        {d.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:14,color:"var(--navy)"}}>{d.name}</div>
                        <div style={{fontSize:12,color:"var(--muted)"}}>{d.specialty} · {d.experience||0} лет · ⭐{d.rating?.toFixed(1)||"—"}</div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <Link to={`/doctors/${d._id}`} className="btn btn-ghost btn-xs">Смотреть</Link>
                        <button className="btn btn-xs" style={{background:"#fff5f5",color:"var(--danger)",border:"1px solid #fecaca"}} onClick={()=>delDoctor(d._id)}>Удалить</button>
                      </div>
                    </div>
                  ))}
                  {doctors.length===0&&<div style={{padding:"32px 0",textAlign:"center",color:"var(--muted)"}}>Врачи не найдены</div>}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Users */}
          {tab===2 && (
            <motion.div key="users" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {(users||[]).map((u,i)=>(
                  <div key={u._id} style={{background:"var(--surface)",border:"1.5px solid var(--border2)",borderRadius:"var(--r-lg)",padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:GRADIENTS[i%GRADIENTS.length],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13,flexShrink:0}}>
                      {u.email[0].toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,color:"var(--navy)"}}>{u.name||u.email}</div>
                      <div style={{fontSize:12,color:"var(--muted)"}}>{u.email} · {new Date(u.createdAt).toLocaleDateString("ru-RU")}</div>
                    </div>
                    <span className={"badge "+(u.role==="admin"?"badge-confirmed":"badge-pending")} style={{fontSize:11}}>{u.role}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: Appointments */}
          {tab===3 && (
            <motion.div key="appts" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {(appts||[]).map(a=>(
                  <div key={a._id} style={{background:"var(--surface)",border:"1.5px solid var(--border2)",borderRadius:"var(--r-lg)",padding:"14px 18px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                    <div style={{display:"flex",flexDirection:"column",gap:2,flex:1,minWidth:200}}>
                      <div style={{fontWeight:700,fontSize:13,color:"var(--navy)"}}>{a.userId?.email}</div>
                      <div style={{fontSize:12,color:"var(--muted)"}}>→ {a.doctorId?.name} · {a.doctorId?.specialty}</div>
                      <div style={{fontSize:11,color:"var(--muted)"}}>📅 {new Date(a.date).toLocaleString("ru-RU",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})}</div>
                    </div>
                    <select className="sort-select" value={a.status} onChange={e=>changeStatus(a._id,e.target.value)}>
                      {STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_LBL[s]}</option>)}
                    </select>
                  </div>
                ))}
                {(appts||[]).length===0 && <div style={{padding:"48px 0",textAlign:"center",color:"var(--muted)"}}>Записей нет</div>}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Wrapper that handles the admin check properly (no hook before guard)
export default function Admin() {
  const navigate = useNavigate();
  const admin = isAdmin();
  if (!admin) {
    // Safe to navigate here since hooks are not called conditionally
    setTimeout(() => navigate("/"), 0);
    return <Loader text="Нет доступа, перенаправляем…"/>;
  }
  return <AdminInner />;
}
