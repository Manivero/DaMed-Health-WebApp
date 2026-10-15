import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWebRTC } from "../hooks/useWebRTC";

const pad = (n) => String(n).padStart(2, "0");
const formatTime = (s) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

// Реальная видеоконсультация: P2P WebRTC через useWebRTC (T019) и сигнальный сервер (T018).
// Заменяет прежний STUB: фиктивную «загрузку», заскриптованный чат, захардкоженный таймер.
export default function ConsultationRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { localStream, remoteStream, connectionState, error, endCall } = useWebRTC(appointmentId);

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [seconds, setSeconds] = useState(0);

  // <video> всегда в DOM (поверх — плейсхолдеры), чтобы ref существовал в момент назначения srcObject.
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    // Новый поток всегда создаётся с включёнными дорожками — сбрасываем переключатели, чтобы
    // интерфейс не расходился с реальным состоянием (например, при повторном запуске хука).
    setMicOn(true);
    setCamOn(true);
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // Реальный таймер — идёт только пока соединение установлено.
  useEffect(() => {
    if (connectionState !== "connected") return undefined;
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [connectionState]);

  const toggleMic = () => {
    const next = !micOn;
    localStream?.getAudioTracks().forEach((t) => { t.enabled = next; });
    setMicOn(next);
  };
  const toggleCam = () => {
    const next = !camOn;
    localStream?.getVideoTracks().forEach((t) => { t.enabled = next; });
    setCamOn(next);
  };
  const handleEnd = () => {
    endCall();
    navigate("/consultation");
  };

  const failed = connectionState === "failed" || !!error;
  const waiting = !failed && connectionState !== "connected" && connectionState !== "peer-left";
  const peerLeft = connectionState === "peer-left";

  const statusText = failed
    ? (error || "Не удалось установить соединение")
    : peerLeft
      ? "Собеседник отключился"
      : connectionState === "connected"
        ? "Соединение установлено"
        : "Ожидаем собеседника…";

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 26, color: "var(--navy)", fontWeight: 400, marginBottom: 2 }}>
            Видеоконсультация
          </h1>
          <div data-testid="call-status" style={{ fontSize: 13, color: failed ? "var(--danger)" : "var(--muted)" }}>
            {statusText}
          </div>
        </div>
        <div data-testid="call-timer" style={{ fontFamily: "monospace", fontSize: 18, color: "var(--navy)" }}>
          {formatTime(seconds)}
        </div>
      </div>

      <div style={{ position: "relative", background: "#050d1a", borderRadius: "var(--r-xl)", overflow: "hidden", aspectRatio: "16 / 9" }}>
        <video data-testid="remote-video" ref={remoteVideoRef} autoPlay playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", display: remoteStream ? "block" : "none" }} />

        {!remoteStream && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#cbd5e1", gap: 10, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 48 }}>{failed ? "⚠️" : peerLeft ? "👋" : "⏳"}</div>
            <div>{statusText}</div>
            {waiting && <div style={{ fontSize: 12, opacity: 0.7 }}>Разрешите доступ к камере и микрофону, если браузер спросит</div>}
          </div>
        )}

        {/* Превью себя; muted обязателен — иначе собственный звук вернётся в динамики */}
        <video data-testid="local-video" ref={localVideoRef} autoPlay playsInline muted
          style={{ position: "absolute", right: 16, bottom: 16, width: 180, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "var(--r-md)", border: "2px solid rgba(255,255,255,.25)", background: "#0b1d33", display: localStream ? "block" : "none" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <button data-testid="toggle-mic" className="btn btn-ghost" onClick={toggleMic} disabled={!localStream}>
          {micOn ? "🎤 Микрофон включён" : "🔇 Микрофон выключен"}
        </button>
        <button data-testid="toggle-cam" className="btn btn-ghost" onClick={toggleCam} disabled={!localStream}>
          {camOn ? "📷 Камера включена" : "🚫 Камера выключена"}
        </button>
        <button data-testid="end-call" className="btn btn-danger" onClick={handleEnd}>
          Завершить
        </button>
      </div>

      {failed && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/consultation" className="btn btn-primary">Вернуться к списку записей</Link>
        </div>
      )}
    </div>
  );
}
