import { useState, useRef, useEffect } from "react";

const SUGGESTIONS = [
  "Какой врач нужен при болях в спине?",
  "Как записаться на приём?",
  "Расшифруй мои анализы",
  "Симптомы гриппа vs ОРВИ",
];

export default function AIChat() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Здравствуйте! Я AI-ассистент DamuMed. Помогу выбрать врача, расшифрую анализы или отвечу на вопросы о здоровье. 💊" },
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const taRef     = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading, open]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const history = [...messages, { role:"user", content:msg }];
    setMessages(history);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:1000,
          system:"Ты AI-ассистент медицинского сервиса DamuMed (Казахстан). Отвечай по-русски, кратко и по делу. Помогай пациентам выбрать специалиста, объясняй медицинские термины, давай общие рекомендации. Всегда рекомендуй обратиться к врачу для постановки диагноза.",
          messages: history.map(m => ({ role:m.role, content:m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.find(b=>b.type==="text")?.text || "Не удалось получить ответ.";
      setMessages(prev => [...prev, { role:"assistant", content:reply }]);
    } catch {
      setMessages(prev => [...prev, { role:"assistant", content:"Ошибка соединения. Попробуйте позже." }]);
    } finally { setLoading(false); }
  };

  const onKey = (e) => {
    if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="chat-fab-wrap">
      <div className={"chat-bubble"+(open?"":" hidden")}>
        <div className="chat-head">
          <div className="chat-head-av">
            <svg viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1 .78-4.88A2.51 2.51 0 0 1 9 14.62V8.5A2.5 2.5 0 0 1 6.54 5 2.5 2.5 0 0 1 9.5 2zm4.5 0h1v1.54A2.5 2.5 0 1 1 14.5 8.5v7.12a2.51 2.51 0 0 1 1 .38 2.5 2.5 0 1 1-3.04 3.54A2.5 2.5 0 0 1 12 19.5v-15A2.5 2.5 0 0 1 14 2z"/></svg>
          </div>
          <div className="chat-head-info">
            <div className="chat-head-name">DamuMed AI</div>
            <div className="chat-online">Онлайн</div>
          </div>
          <button className="chat-x" onClick={()=>setOpen(false)}>✕</button>
        </div>
        <div className="chat-msgs">
          {messages.map((m,i) => (
            <div key={i} className={"msg "+m.role}>
              <div className={"m-av "+m.role}>{m.role==="assistant"?"AI":"Вы"}</div>
              <div className="m-bub">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="msg assistant">
              <div className="m-av assistant">AI</div>
              <div className="m-bub typing">
                <span className="t-dot"/><span className="t-dot"/><span className="t-dot"/>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        {messages.length <= 1 && (
          <div className="chat-chips">
            {SUGGESTIONS.map(s => (
              <button key={s} className="c-chip" onClick={()=>send(s)}>{s}</button>
            ))}
          </div>
        )}
        <div className="chat-input-area">
          <textarea ref={taRef} className="chat-ta" placeholder="Напишите вопрос…"
            rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey}/>
          <button className="chat-send" onClick={()=>send()} disabled={!input.trim()||loading}>
            <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
      <button className="fab-btn" onClick={()=>setOpen(o=>!o)} aria-label="AI чат">
        <svg viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1 .78-4.88A2.51 2.51 0 0 1 9 14.62V8.5A2.5 2.5 0 0 1 6.54 5 2.5 2.5 0 0 1 9.5 2zm4.5 0h1v1.54A2.5 2.5 0 1 1 14.5 8.5v7.12a2.51 2.51 0 0 1 1 .38 2.5 2.5 0 1 1-3.04 3.54A2.5 2.5 0 0 1 12 19.5v-15A2.5 2.5 0 0 1 14 2z"/></svg>
        <span className="fab-pulse"/>
      </button>
    </div>
  );
}
