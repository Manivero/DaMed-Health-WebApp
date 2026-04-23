import { NavLink } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";
import { isLoggedIn } from "../utils/auth";

export default function BottomNav() {
  const logged   = isLoggedIn();
  const { unread } = useNotifications();

  const links = [
    { to:"/",            end:true,  icon:"🏠", label:"Главная" },
    { to:"/doctors",     end:false, icon:"👨‍⚕️", label:"Врачи"   },
    { to:"/consultation",end:false, icon:"🎥", label:"Онлайн"  },
    ...(logged ? [{ to:"/appointments",end:false,icon:"📋",label:"Записи" }] : []),
    {
      to: logged ? "/profile" : "/login",
      end: false,
      icon: logged ? "👤" : "🔑",
      label: logged ? "Профиль" : "Войти",
      badge: logged && unread > 0 ? unread : 0,
    },
  ];

  return (
    <div className="bottom-nav">
      {links.map(({ to, end, icon, label, badge }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) => "bn-item"+(isActive?" active":"")}>
          <div style={{ position:"relative", lineHeight:1 }}>
            <svg style={{ display:"none" }} viewBox="0 0 0 0"/>
            <span style={{ fontSize:20 }}>{icon}</span>
            {badge > 0 && (
              <span style={{ position:"absolute",top:-4,right:-8,width:16,height:16,borderRadius:"50%",background:"var(--danger)",color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center" }}>
                {badge}
              </span>
            )}
          </div>
          <span className="bn-label">{label}</span>
        </NavLink>
      ))}
    </div>
  );
}
