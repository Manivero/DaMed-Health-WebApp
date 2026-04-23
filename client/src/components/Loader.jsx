export default function Loader({ text = "Загружаем данные…" }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"64px 0",gap:14 }}>
      <div className="loader-ring" />
      <p style={{ color:"var(--muted)",fontSize:14 }}>{text}</p>
    </div>
  );
}
