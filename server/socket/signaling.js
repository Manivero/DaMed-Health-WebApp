const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");

// Сценарий консультации всегда 1:1 (пациент + врач) — решение против SFU/MCU,
// см. IMPLEMENTATION_LOG.md, TASK T015 — BASELINE.
const MAX_ROOM_SIZE = 2;

/**
 * Инициализирует Socket.io поверх уже существующего HTTP-сервера (не отдельный порт —
 * см. решение T015: переиспользуем тот же Express-сервер).
 */
function initSignaling(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // Аутентификация на этапе handshake — тот же паттерн JWT-проверки, что и protect()
  // в middleware/auth.js, но адаптированный под Socket.io (не Express req/res/next).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Нет токена авторизации"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("Пользователь не найден"));

      socket.user = user;
      next();
    } catch {
      next(new Error("Недействительный или истёкший токен"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join-room", async ({ appointmentId }, callback) => {
      try {
        const appt = await Appointment.findById(appointmentId);
        if (!appt) return callback?.({ error: "Запись не найдена" });

        // Проверка владения: пациент — напрямую по userId записи; врач — через связанный
        // каталожный профиль (Doctor.userId === текущий пользователь), т.к. в самой записи
        // указан id каталожного врача (doctorId), а не id учётной записи.
        const isPatient = String(appt.userId) === String(socket.user._id);
        let isDoctorForAppt = false;
        if (!isPatient && socket.user.role === "doctor") {
          const doctor = await Doctor.findOne({ userId: socket.user._id });
          isDoctorForAppt = !!doctor && String(appt.doctorId) === String(doctor._id);
        }
        if (!isPatient && !isDoctorForAppt) {
          return callback?.({ error: "Нет доступа к этой консультации" });
        }

        const roomId = String(appointmentId);
        const room = io.sockets.adapter.rooms.get(roomId);
        if (room && room.size >= MAX_ROOM_SIZE) {
          return callback?.({ error: "В консультации уже два участника" });
        }

        socket.join(roomId);
        socket.roomId = roomId;
        socket.to(roomId).emit("peer-joined");
        callback?.({ ok: true });
      } catch {
        callback?.({ error: "Не удалось подключиться к консультации" });
      }
    });

    // Чистый релей — сервер не разбирает содержимое SDP/ICE, только пересылает второму
    // участнику той же комнаты (ровно один адресат, т.к. комната максимум из двух).
    ["offer", "answer", "ice-candidate"].forEach((event) => {
      socket.on(event, (payload) => {
        if (socket.roomId) socket.to(socket.roomId).emit(event, payload);
      });
    });

    socket.on("disconnect", () => {
      if (socket.roomId) socket.to(socket.roomId).emit("peer-left");
    });
  });

  return io;
}

module.exports = initSignaling;
