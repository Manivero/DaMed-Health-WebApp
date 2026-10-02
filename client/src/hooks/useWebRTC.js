import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { getAccessToken } from "../utils/auth";

// STUN сейчас, TURN — отдельная задача продакшн-готовности (требует провайдера с учётными
// данными, см. решение T015). Google public STUN — бесплатно, без интеграции, достаточно для
// разработки/благоприятных сетевых условий.
const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/**
 * useWebRTC(appointmentId) — устанавливает P2P видеосвязь со второй стороной указанной записи
 * через сигнальный сервер (server/socket/signaling.js, T018).
 *
 * Схема инициации: тот, кто получает "peer-joined" (т.е. уже был в комнате, когда подключился
 * второй участник), создаёт offer. Простая схема без perfect negotiation — оправдана для строго
 * 1:1 сценария без частой renegotiation (см. решение T015).
 *
 * Возвращает { localStream, remoteStream, connectionState, error, endCall }.
 * connectionState: "idle" | "connecting" | "connected" | "peer-left" | "failed" | "ended"
 */
export function useWebRTC(appointmentId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState("idle");
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  // Освобождаем ВСЕ захваченные ресурсы — камеру/микрофон, PeerConnection, сокет.
  // Критично вызывать при размонтировании: иначе индикатор камеры в браузере останется
  // гореть после того, как пользователь ушёл со страницы консультации.
  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const endCall = useCallback(() => {
    cleanup();
    setConnectionState("ended");
  }, [cleanup]);

  useEffect(() => {
    if (!appointmentId) return undefined;
    let cancelled = false;

    async function start() {
      setConnectionState("connecting");
      setError(null);

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        if (!cancelled) {
          setError("Не удалось получить доступ к камере/микрофону");
          setConnectionState("failed");
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (!cancelled) setRemoteStream(event.streams[0]);
      };
      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        if (pc.connectionState === "connected") setConnectionState("connected");
        if (pc.connectionState === "failed") setConnectionState("failed");
      };

      const socket = io({ path: "/socket.io", auth: { token: getAccessToken() } });
      socketRef.current = socket;

      socket.on("connect_error", (err) => {
        if (!cancelled) setError(err.message || "Не удалось подключиться к серверу консультации");
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) socket.emit("ice-candidate", event.candidate);
      };

      socket.on("peer-joined", async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", offer);
        } catch (err) {
          if (!cancelled) setError("Ошибка при установке соединения: " + err.message);
        }
      });

      socket.on("offer", async (offer) => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", answer);
        } catch (err) {
          if (!cancelled) setError("Ошибка при установке соединения: " + err.message);
        }
      });

      socket.on("answer", async (answer) => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          if (!cancelled) setError("Ошибка при установке соединения: " + err.message);
        }
      });

      socket.on("ice-candidate", async (candidate) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // ICE-кандидат может прийти после закрытия соединения — не фатально, не показываем пользователю.
        }
      });

      socket.on("peer-left", () => {
        if (cancelled) return;
        setRemoteStream(null);
        setConnectionState("peer-left");
      });

      socket.emit("join-room", { appointmentId }, (res) => {
        if (res?.error && !cancelled) setError(res.error);
      });
    }

    start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [appointmentId, cleanup]);

  return { localStream, remoteStream, connectionState, error, endCall };
}
