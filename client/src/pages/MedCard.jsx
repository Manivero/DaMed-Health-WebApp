import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";

const CATEGORIES = ["Все","Анализы","Снимки","Рецепты","Справки","Выписки"];

const DEMO_FILES = [
  { id:1, name:"ОАК — Общий анализ крови", category:"Анализы", date:"2024-03-15", size:"245 KB", type:"pdf", status:"norm" },
  { id:2, name:"Флюорография 2024", category:"Снимки", date:"2024-02-20", size:"1.2 MB", type:"img", status:"norm" },
  { id:3, name:"Рецепт — Амоксициллин", category:"Рецепты", date:"2024-01-10", size:"89 KB", type:"pdf", status:"active" },
  { id:4, name:"УЗИ брюшной полости", category:"Снимки", date:"2023-12-05", size:"2.1 MB", type:"img", status:"norm" },
  { id:5, name:"Справка от терапевта", category:"Справки", date:"2023-11-22", size:"120 KB", type:"pdf", status:"expired" },
  { id:6, name:"Биохимический анализ крови", category:"Анализы", date:"2023-10-30", size:"310 KB", type:"pdf", status:"attention" },
];

const STATUS_STYLE = {
  norm:      { label:"В норме",       bg:"#e6fdf5", color:"#0a7c55" },
  active:    { label:"Активный",      bg:"#e6f0ff", color:"#1d4ed8" },
  expired:   { label:"Истёк",         bg:"var(--surface2)", color:"var(--muted)" },
  attention: { label:"Требует вниманя",bg:"#fff8e6", color:"#a3650a" },
};

const TYPE_ICON = { pdf:"📄", img:"🖼️" };

export default function MedCard() {
  const [category, setCategory] = useState("Все");
  const [files, setFiles] = useState(DEMO_FILES);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState(null);
  const { showToast } = useToast();
  const inputRef = useRef();

  const filtered = category==="Все" ? files : files.filter(f=>f.category===category);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const dropped = [...e.dataTransfer.files];
    dropped.forEach(f => {
      const newFile = {
        id: Date.now() + Math.random(),
        name: f.name.replace(/\.[^.]+$/, ""),
        category: "Анализы",
        date: new Date().toISOString().split("T")[0],
        size: `${(f.size/1024).toFixed(0)} KB`,
        type: f.type.includes("image") ? "img" : "pdf",
        status: "norm",
      };
      setFiles(prev => [newFile, ...prev]);
    });
    showToast(`Загружено файлов: ${dropped.length} ✅`);
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}>
      <div className="page-header" style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          <h1>Медицинская карта</h1>
          <p>Все ваши документы и анализы в одном месте</p>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <input ref={inputRef} type="file" multiple accept=".pdf,image/*" style={{display:"none"}}
            onChange={e=>{
              [...e.target.files].forEach(f=>{
                setFiles(prev=>[{id:Date.now()+Math.random(),name:f.name.replace(/\.[^.]+$/,""),category:"Анализы",date:new Date().toISOString().split("T")[0],size:`${(f.size/1024).toFixed(0)} KB`,type:f.type.includes("image")?"img":"pdf",status:"norm"},...prev]);
              });
              showToast("Файлы загружены ✅");
            }}
          />
          <button className="btn btn-primary" onClick={()=>inputRef.current.click()}>+ Загрузить документ</button>
        </div>
      </div>

      <div style={{ padding:"0 48px 48px" }}>
        {/* Stats */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:28 }}>
          {[
            { label:"Всего файлов",    value:files.length,                                        icon:"📁" },
            { label:"Анализы",         value:files.filter(f=>f.category==="Анализы").length,      icon:"🔬" },
            { label:"Снимки",          value:files.filter(f=>f.category==="Снимки").length,       icon:"🩻" },
            { label:"Требуют вниманя", value:files.filter(f=>f.status==="attention").length,      icon:"⚠️" },
          ].map(s=>(
            <div key={s.label} style={{background:"var(--surface)",border:"1.5px solid var(--border2)",borderRadius:"var(--r-lg)",padding:"16px",textAlign:"center"}}>
              <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div>
              <div style={{fontFamily:"var(--font-head)",fontSize:28,color:"var(--teal)",lineHeight:1,marginBottom:4}}>{s.value}</div>
              <div style={{fontSize:12,color:"var(--muted)",fontWeight:300}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={handleDrop}
          onClick={()=>inputRef.current.click()}
          style={{
            border:`2px dashed ${dragging?"var(--teal)":"var(--border2)"}`,
            borderRadius:"var(--r-xl)", padding:"28px", textAlign:"center",
            background:dragging?"var(--teal-l)":"var(--surface2)",
            cursor:"pointer", marginBottom:24, transition:"all .2s",
          }}
        >
          <div style={{fontSize:36,marginBottom:8}}>{dragging?"📥":"📎"}</div>
          <div style={{fontWeight:700,color:"var(--navy)",marginBottom:4}}>
            {dragging?"Отпустите файл":"Перетащите файл сюда или нажмите"}
          </div>
          <div style={{fontSize:13,color:"var(--muted)"}}>PDF, JPG, PNG — до 10 MB</div>
        </div>

        {/* Filter chips */}
        <div style={{ display:"flex",gap:8,marginBottom:20,flexWrap:"wrap" }}>
          {CATEGORIES.map(c=>(
            <button key={c} className={"chip"+(category===c?" active":"")} onClick={()=>setCategory(c)}>{c}</button>
          ))}
        </div>

        {/* File list */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <AnimatePresence>
            {filtered.map((f,i)=>{
              const st = STATUS_STYLE[f.status]||STATUS_STYLE.norm;
              return (
                <motion.div key={f.id}
                  initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,x:40}}
                  transition={{delay:i*.03}}
                  onClick={()=>setSelected(selected?.id===f.id?null:f)}
                  style={{
                    background:"var(--surface)", border:`1.5px solid ${selected?.id===f.id?"var(--teal)":"var(--border2)"}`,
                    borderRadius:"var(--r-lg)", padding:"14px 18px",
                    display:"flex", alignItems:"center", gap:14, cursor:"pointer",
                    transition:"all .18s", boxShadow:selected?.id===f.id?"var(--sh-teal)":"var(--sh-sm)",
                  }}
                >
                  <div style={{width:44,height:44,borderRadius:"var(--r-sm)",background:"var(--surface2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                    {TYPE_ICON[f.type]||"📄"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:"var(--navy)",marginBottom:3}}>{f.name}</div>
                    <div style={{fontSize:12,color:"var(--muted)",display:"flex",gap:12}}>
                      <span>📅 {new Date(f.date).toLocaleDateString("ru-RU")}</span>
                      <span>💾 {f.size}</span>
                      <span>{f.category}</span>
                    </div>
                  </div>
                  <span style={{padding:"3px 10px",borderRadius:"var(--r-full)",fontSize:11,fontWeight:700,background:st.bg,color:st.color,flexShrink:0}}>
                    {st.label}
                  </span>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    <button className="btn btn-ghost btn-xs" onClick={e=>{e.stopPropagation();showToast("Файл скачан")}}>⬇</button>
                    <button className="btn btn-xs" style={{background:"#fff5f5",color:"var(--danger)",border:"1px solid #fecaca"}}
                      onClick={e=>{e.stopPropagation();setFiles(prev=>prev.filter(x=>x.id!==f.id));showToast("Файл удалён")}}>✕</button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filtered.length===0&&(
            <div style={{textAlign:"center",padding:"48px 0",color:"var(--muted)"}}>
              <div style={{fontSize:40,marginBottom:12}}>🗂️</div>
              <p>Документов в категории «{category}» нет</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
