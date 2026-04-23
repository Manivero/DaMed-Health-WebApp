import { useState } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationsContext";
import { useFavorites } from "../context/FavoritesContext";
import { isLoggedIn, isAdmin, logout, getUser } from "../utils/auth";

const MoonSvg = () => <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" stroke="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const SunSvg  = () => <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const BellSvg = () => <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;

export default function TopNav() {
  const { dark, toggle }     = useTheme();
  const { unread }           = useNotifications();
  const { count: favCount }  = useFavorites();
  const navigate             = useNavigate();
  const logged               = isLoggedIn();
  const admin                = isAdmin();
  const user                 = getUser();
  const initial              = user?.email?.[0]?.toUpperCase() || "?";
  const shortName            = user?.email?.split("@")[0] || "";
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); setShowMenu(false); };

  return (
    <nav className="topnav">
      <NavLink to="/" className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
        </div>
        <span className="logo-text">Damu<span>Med</span></span>
      </NavLink>

      <nav className="nav-links">
        <NavLink to="/"            end className={({ isActive }) => "nav-link"+(isActive?" active":"")}>Главная</NavLink>
        <NavLink to="/doctors"         className={({ isActive }) => "nav-link"+(isActive?" active":"")}>Врачи</NavLink>
        <NavLink to="/consultation"    className={({ isActive }) => "nav-link"+(isActive?" active":"")}>Онлайн-приём</NavLink>
        {logged && <NavLink to="/appointments" className={({ isActive }) => "nav-link"+(isActive?" active":"")}>Мои записи</NavLink>}
        {admin  && <NavLink to="/admin"        className={({ isActive }) => "nav-link"+(isActive?" active":"")}>Админ</NavLink>}
      </nav>

      <div className="nav-right">
        {/* Theme toggle */}
        <button className="icon-btn" onClick={toggle} aria-label="theme">
          {dark ? <SunSvg /> : <MoonSvg />}
        </button>

        {logged && (
          <>
            {/* Favorites */}
            <NavLink to="/favorites" className="icon-btn" style={{ position:"relative" }} title="Избранное">
              <span style={{ fontSize:16 }}>🤍</span>
              {favCount > 0 && (
                <span style={{ position:"absolute",top:-3,right:-3,width:16,height:16,borderRadius:"50%",background:"var(--teal)",color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {favCount}
                </span>
              )}
            </NavLink>

            {/* Notifications */}
            <NavLink to="/notifications" className="icon-btn" style={{ position:"relative" }} title="Уведомления">
              <BellSvg />
              {unread > 0 && (
                <motion.span initial={{scale:0}} animate={{scale:1}}
                  style={{ position:"absolute",top:-3,right:-3,width:16,height:16,borderRadius:"50%",background:"var(--danger)",color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {unread}
                </motion.span>
              )}
            </NavLink>

            {/* User menu */}
            <div style={{ position:"relative" }}>
              <button
                onClick={()=>setShowMenu(s=>!s)}
                style={{ display:"flex",alignItems:"center",gap:8,background:"none",border:"1.5px solid var(--border2)",borderRadius:"var(--r-full)",padding:"5px 14px 5px 5px",cursor:"pointer",transition:"all .2s" }}
              >
                <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#00C9A7,#00E5C0)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:800 }}>
                  {initial}
                </div>
                <span style={{ fontSize:13,fontWeight:600,color:"var(--text)" }}>{shortName}</span>
                <span style={{ fontSize:10,color:"var(--muted)",transition:"transform .2s",transform:showMenu?"rotate(180deg)":"none" }}>▾</span>
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity:0,y:8,scale:.97 }}
                    animate={{ opacity:1,y:0,scale:1 }}
                    exit={{ opacity:0,y:8,scale:.97 }}
                    transition={{ duration:.16 }}
                    style={{ position:"absolute",top:"calc(100% + 8px)",right:0,background:"var(--surface)",border:"1.5px solid var(--border2)",borderRadius:"var(--r-lg)",minWidth:200,boxShadow:"var(--sh-lg)",zIndex:300,overflow:"hidden" }}
                  >
                    {[
                      { to:"/profile",      icon:"👤", label:"Профиль"        },
                      { to:"/appointments", icon:"📋", label:"Мои записи"     },
                      { to:"/favorites",    icon:"🤍", label:"Избранное"      },
                      { to:"/medcard",      icon:"🗂️", label:"Медкарта"       },
                      ...(admin?[{ to:"/admin", icon:"⚙️", label:"Администрирование" }]:[]),
                    ].map(item=>(
                      <Link key={item.to} to={item.to}
                        onClick={()=>setShowMenu(false)}
                        style={{ display:"flex",alignItems:"center",gap:10,padding:"11px 16px",color:"var(--text)",fontSize:13.5,fontWeight:500,transition:"background .15s",textDecoration:"none" }}
                        onMouseEnter={e=>e.currentTarget.style.background="var(--surface2)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      >
                        <span>{item.icon}</span>{item.label}
                      </Link>
                    ))}
                    <div style={{ borderTop:"1px solid var(--border)", margin:"4px 0" }}/>
                    <button onClick={handleLogout}
                      style={{ width:"100%",textAlign:"left",padding:"11px 16px",color:"var(--danger)",fontSize:13.5,fontWeight:600,display:"flex",alignItems:"center",gap:10,transition:"background .15s",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--font-body)" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#fff5f5"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <span>🚪</span> Выйти
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {!logged && (
          <>
            <NavLink to="/login"    className="btn btn-ghost btn-sm">Войти</NavLink>
            <NavLink to="/register" className="btn btn-primary btn-sm">Регистрация</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
