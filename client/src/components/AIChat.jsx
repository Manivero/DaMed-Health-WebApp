import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { currentLang } from "../i18n/i18n";
import apiClient from "../services/apiClient";

export default function AIChat() {
  const { t } = useTranslation();
  const [open,     setOpen]     = useState(false);
  // Приветствие — метка, а не строка в состоянии: текст берётся из словаря при отрисовке и отправке,
  // поэтому он меняет язык вместе с интерфейсом. В историю для сервера оно попадает как и раньше.
  const [messages, setMessages] = useState([{ role: "assistant", welcome: true }]);
  const suggestions = t("chat.suggestions", { returnObjects: true });
  const textOf = (m) => (m.welcome ? t("chat.welcome") : m.content);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const history = [...messages, { role: "user", content: msg }];
    setMessages(history);
    setLoading(true);
    try {
      // Запрос идёт через наш сервер — ключ Anthropic API остаётся на бэкенде
      const res = await apiClient.post("/ai/chat", {
        messages: history.map((m) => ({ role: m.role, content: textOf(m) })),
        lang: currentLang(), // язык ответа ассистента = язык интерфейса (сервер принимает только значения из белого списка)
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.reply },
      ]);
    } catch (err) {
      const errMsg =
        err.response?.data?.message || t("chat.connectionError");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errMsg },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-fab-wrap">
      <div className={"chat-bubble" + (open ? "" : " hidden")}>
        <div className="chat-head">
          <div className="chat-head-av">
            <svg viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1 .78-4.88A2.51 2.51 0 0 1 9 14.62V8.5A2.5 2.5 0 0 1 6.54 5 2.5 2.5 0 0 1 9.5 2zm4.5 0h1v1.54A2.5 2.5 0 1 1 14.5 8.5v7.12a2.51 2.51 0 0 1 1 .38 2.5 2.5 0 1 1-3.04 3.54A2.5 2.5 0 0 1 12 19.5v-15A2.5 2.5 0 0 1 14 2z"/></svg>
          </div>
          <div className="chat-head-info">
            <div className="chat-head-name">DamuMed AI</div>
            <div className="chat-online">{t("chat.online")}</div>
          </div>
          <button className="chat-x" onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className="chat-msgs">
          {messages.map((m, i) => (
            <div key={i} className={"msg " + m.role}>
              <div className={"m-av " + m.role}>{m.role === "assistant" ? "AI" : t("chat.you")}</div>
              <div className="m-bub">{textOf(m)}</div>
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
            {(Array.isArray(suggestions) ? suggestions : []).map((s) => (
              <button key={s} className="c-chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        <div className="chat-input-area">
          <textarea
            className="chat-ta"
            placeholder={t("chat.placeholder")}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
          />
          <button
            className="chat-send"
            onClick={() => send()}
            disabled={!input.trim() || loading}
          >
            <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>

      <button className="fab-btn" onClick={() => setOpen((o) => !o)} aria-label={t("chat.ariaLabel")}>
        <svg viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1 .78-4.88A2.51 2.51 0 0 1 9 14.62V8.5A2.5 2.5 0 0 1 6.54 5 2.5 2.5 0 0 1 9.5 2zm4.5 0h1v1.54A2.5 2.5 0 1 1 14.5 8.5v7.12a2.51 2.51 0 0 1 1 .38 2.5 2.5 0 1 1-3.04 3.54A2.5 2.5 0 0 1 12 19.5v-15A2.5 2.5 0 0 1 14 2z"/></svg>
        <span className="fab-pulse"/>
      </button>
    </div>
  );
}
