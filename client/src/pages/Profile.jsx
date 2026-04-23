import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getMyProfile, updateProfile, changePassword, getMyStats } from "../services/profileService";
import { useToast } from "../context/ToastContext";
import { logout, getUser, saveAuth } from "../utils/auth";
import Loader from "../components/Loader";

const BLOOD_TYPES = ["","A+","A-","B+","B-","AB+","AB-","O+","O-"];
const TABS = ["Профиль","Здоровье","Безопасность"];

export default function Profile() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const localUser = getUser();
  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", phone:"", birthDate:"", bloodType:"", allergies:"" });
  const [pwForm, setPwForm] = useState({ currentPassword:"", newPassword:"", confirm:"" });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    Promise.all([getMyProfile(), getMyStats()])
      .then(([p, s]) => {
        setProfile(p.data);
        setStats(s.data);
        setForm({
          name: p.data.name || "",
          phone: p.data.phone || "",
          birthDate: p.data.birthDate ? p.data.birthDate.split("T")[0] : "",
          bloodType: p.data.bloodType || "",
          allergies: p.data.allergies || "",
        });
      })
      .catch(() => showToast("Ошибка загрузки профиля"))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfile(form);
      setProfile(res.data);
      showToast("Профиль обновлён ✅");
    } catch (err) { showToast(err.response?.data?.message || "Ошибка"); }
    finally { setSaving(false); }
  };

  const savePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return showToast("Пароли не совпадают");
    setPwLoading(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword:"", newPassword:"", confirm:"" });
      showToast("Пароль обновлён ✅");
    } catch (err) { showToast(err.response?.data?.message || "Ошибка"); }
    finally { setPwLoading(false); }
  };

  const initial = (profile?.name || profile?.email || "?")[0].toUpperCase();

  if (loading) return <Loader text="Загружаем профиль…"/>;

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
      {/* Banner */}
      <div className="profile-banner">
        <div className="profile-av">{initial}</div>
        <div className="profile-greeting">
          <div className="profile-name">{profile?.name || profile?.email}</div>
          <div className="profile-joined">
            {localUser?.role==="admin" ? "👑 Администратор" : "👤 Пациент DamuMed"}
          </div>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,padding:"0 48px 24px" }}>
          {[
            { label:"Всего записей",   value:stats.total,     icon:"📋" },
            { label:"Предстоящих",     value:stats.upcoming,  icon:"📅" },
            { label:"Завершённых",     value:stats.completed, icon:"✅" },
            { label:"Отменённых",      value:stats.cancelled, icon:"❌" },
          ].map(s => (
            <div key={s.label} style={{ background:"var(--surface)",border:"1.5px solid var(--border2)",borderRadius:"var(--r-lg)",padding:"18px 16px",textAlign:"center" }}>
              <div style={{ fontSize:22,marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontFamily:"var(--font-head)",fontSize:28,color:"var(--teal)",lineHeight:1,marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:12,color:"var(--muted)",fontWeight:300 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding:"0 48px 48px" }}>
        {/* Tabs */}
        <div className="appt-tabs" style={{ marginBottom:24,width:"fit-content" }}>
          {TABS.map((t,i) => (
            <div key={t} className={"appt-tab"+(tab===i?" active":"")} onClick={()=>setTab(i)}>{t}</div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Tab 0: Профиль */}
          {tab===0 && (
            <motion.div key="profile" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              <form className="form-card" onSubmit={saveProfile} style={{ maxWidth:520 }}>
                <div className="form-card-title">Личные данные</div>
                <p className="form-card-sub">Эти данные используются для записей к врачу</p>
                <div className="field">
                  <label>Имя и фамилия</label>
                  <input placeholder="Иван Иванов" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
                </div>
                <div className="field">
                  <label>Телефон</label>
                  <input placeholder="+7 (777) 000-00-00" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} />
                </div>
                <div className="field">
                  <label>Email (нельзя изменить)</label>
                  <input value={profile?.email || ""} disabled style={{ opacity:.55,cursor:"not-allowed" }} />
                </div>
                <div className="field">
                  <label>Дата рождения</label>
                  <input type="date" value={form.birthDate} onChange={e=>setForm(p=>({...p,birthDate:e.target.value}))} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop:4 }} disabled={saving}>
                  {saving ? "Сохраняем…" : "Сохранить изменения"}
                </button>
              </form>
            </motion.div>
          )}

          {/* Tab 1: Здоровье */}
          {tab===1 && (
            <motion.div key="health" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              <form className="form-card" onSubmit={saveProfile} style={{ maxWidth:520 }}>
                <div className="form-card-title">Медицинские данные</div>
                <p className="form-card-sub">Помогает врачам быстрее подготовиться к приёму</p>
                <div className="field">
                  <label>Группа крови</label>
                  <select value={form.bloodType} onChange={e=>setForm(p=>({...p,bloodType:e.target.value}))}>
                    {BLOOD_TYPES.map(b => <option key={b} value={b}>{b||"Не указана"}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Аллергии и непереносимости</label>
                  <textarea placeholder="Например: пенициллин, аспирин, пыльца…"
                    value={form.allergies} onChange={e=>setForm(p=>({...p,allergies:e.target.value}))} rows={3} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop:4 }} disabled={saving}>
                  {saving ? "Сохраняем…" : "Сохранить"}
                </button>
              </form>
            </motion.div>
          )}

          {/* Tab 2: Безопасность */}
          {tab===2 && (
            <motion.div key="security" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              <form className="form-card" onSubmit={savePw} style={{ maxWidth:520 }}>
                <div className="form-card-title">Смена пароля</div>
                <p className="form-card-sub">Используйте надёжный пароль — минимум 6 символов</p>
                <div className="field">
                  <label>Текущий пароль</label>
                  <input type="password" placeholder="••••••••" value={pwForm.currentPassword}
                    onChange={e=>setPwForm(p=>({...p,currentPassword:e.target.value}))} required />
                </div>
                <div className="field">
                  <label>Новый пароль</label>
                  <input type="password" placeholder="Минимум 6 символов" value={pwForm.newPassword}
                    onChange={e=>setPwForm(p=>({...p,newPassword:e.target.value}))} required />
                </div>
                <div className="field">
                  <label>Подтвердите новый пароль</label>
                  <input type="password" placeholder="Повторите пароль" value={pwForm.confirm}
                    onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop:4 }} disabled={pwLoading}>
                  {pwLoading ? "Меняем…" : "Сменить пароль"}
                </button>
              </form>

              <div className="form-card" style={{ maxWidth:520,marginTop:20,borderColor:"#fecaca" }}>
                <div className="form-card-title" style={{ fontSize:18,color:"var(--danger)" }}>Выход из аккаунта</div>
                <p className="form-card-sub" style={{ marginBottom:16 }}>Вы выйдете со всех устройств</p>
                <button className="btn btn-danger" onClick={() => { logout(); navigate("/login"); }}>
                  Выйти из аккаунта
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick links */}
        <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginTop:24 }}>
          <Link to="/appointments" className="btn btn-ghost">📋 Мои записи</Link>
          <Link to="/doctors"      className="btn btn-ghost">👨‍⚕️ Найти врача</Link>
          {localUser?.role==="admin" && <Link to="/admin" className="btn btn-ghost">⚙️ Администрирование</Link>}
        </div>
      </div>
    </motion.div>
  );
}
