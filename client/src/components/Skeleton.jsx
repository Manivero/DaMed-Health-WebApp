// Базовая анимированная полоска
function Bone({ w = "100%", h = 16, r = 8, style = {} }) {
  return (
    <div
      className="skeleton-bone"
      style={{ width: w, height: h, borderRadius: r, ...style }}
    />
  );
}

// Скелетон карточки врача
export function DoctorCardSkeleton() {
  return (
    <div className="doc-card skeleton-card">
      <div className="dc-top" style={{ borderBottom: "1px solid var(--border-l)" }}>
        <div className="skeleton-bone" style={{ width: 54, height: 54, borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Bone w="60%" h={14} />
          <Bone w="40%" h={12} />
        </div>
        <Bone w={52} h={22} r={999} />
      </div>
      <div className="dc-body">
        <div className="dc-stats">
          {[0,1,2].map(i => (
            <div key={i} className="dc-stat" style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
              <Bone w={32} h={14} />
              <Bone w={40} h={10} />
            </div>
          ))}
        </div>
        <Bone h={38} r={8} style={{ marginTop: 4 }} />
      </div>
    </div>
  );
}

// Скелетон карточки записи
export function AppointmentSkeleton() {
  return (
    <div className="appt-card" style={{ pointerEvents:"none" }}>
      <div className="skeleton-bone" style={{ width:58,height:64,borderRadius:8,flexShrink:0 }} />
      <div style={{ flex:1,display:"flex",flexDirection:"column",gap:8 }}>
        <Bone w="50%" h={15} />
        <Bone w="70%" h={12} />
      </div>
      <Bone w={80} h={24} r={999} />
    </div>
  );
}

// Скелетон страницы врача
export function DoctorPageSkeleton() {
  return (
    <div style={{ padding:"40px 48px" }}>
      <div style={{ display:"flex",gap:28,marginBottom:32,alignItems:"flex-start" }}>
        <Bone w={120} h={120} r="50%" />
        <div style={{ flex:1,display:"flex",flexDirection:"column",gap:12 }}>
          <Bone w="45%" h={28} />
          <Bone w="30%" h={16} />
          <Bone w="55%" h={14} />
        </div>
      </div>
      <Bone h={80} r={12} style={{ marginBottom:20 }} />
      <Bone h={200} r={12} />
    </div>
  );
}

export default Bone;
