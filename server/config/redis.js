const { createClient } = require("redis");

// КРИТИЧНО: express-rate-limit с дефолтным MemoryStore хранит счётчики В ПАМЯТИ
// ОДНОГО процесса. При горизонтальном масштабировании (что обязательно для
// 100k+ пользователей — несколько инстансов Node за балансировщиком, или
// просто рестарт процесса в PM2/Docker) у каждого инстанса СВОЙ независимый
// счётчик: лимит "10 попыток логина / 15 минут" на деле превращается в
// "10 × число_инстансов" на пользователя, а после рестарта любого процесса
// счётчики обнуляются полностью. Это делает rate limiting декоративным для
// продакшена и оставляет /api/auth/login открытым для распределённого
// brute-force. Redis даёт единый источник истины для всех инстансов.
//
// REDIS_URL опционален: если не задан или Redis недоступен при старте,
// приложение продолжает работать на MemoryStore (с предупреждением в логах) —
// это осознанный fallback для локальной разработки и для случая полного
// отказа Redis (rate limiting в degraded-режиме лучше, чем падение всего API).
// В production переменная должна быть обязательной (см. config/env.js).

let client = null;
let connectPromise = null;

function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;

  client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      // Экспоненциальный backoff с потолком в 10с между попытками переподключения.
      // Без ограничения reconnectStrategy по умолчанию тоже растёт, но явное
      // значение фиксирует контракт и не даёт паузам стать неограниченно большими.
      reconnectStrategy: (retries) => Math.min(retries * 200, 10_000),
    },
  });

  client.on("error", (err) => {
    // Логируем, но не валим процесс — middleware/rateLimiter.js откатывается
    // на MemoryStore при недоступном Redis (см. isRedisReady()).
    console.error("[Redis] connection error:", err.message);
  });
  client.on("connect", () => console.log("[Redis] connecting..."));
  client.on("ready", () => console.log("[Redis] ready ✅"));
  client.on("reconnecting", () => console.warn("[Redis] reconnecting..."));

  return client;
}

// Сколько ждём ПЕРВУЮ попытку подключения при старте процесса, прежде чем
// продолжить инициализацию приложения на MemoryStore. ВАЖНО: reconnectStrategy
// выше никогда не "сдаётся" (всегда возвращает число) — это значит, что сам
// client.connect() при недоступном Redis не реджектится и не резолвится,
// а виснет, бесконечно повторяя попытки внутри. Без явного таймаута здесь
// await connectRedis() в index.js заблокировал бы старт ВСЕГО HTTP-сервера
// навсегда при недоступном на момент деплоя Redis — это превратило бы
// "опциональную деградацию до MemoryStore" в "сервис не поднимается вообще".
// Таймаут отвязывает старт приложения от результата подключения: если Redis
// не успел подняться за CONNECT_TIMEOUT_MS, работаем на MemoryStore, а
// client.connect() продолжает попытки в фоне — как только Redis станет
// доступен, HybridRateLimitStore (middleware/rateLimitStore.js) подхватит
// это автоматически на следующем запросе, без рестарта процесса.
const CONNECT_TIMEOUT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 5_000;

// Подключение выполняется один раз при старте сервера (см. index.js).
// Возвращает true/false — удалось ли подключиться в пределах таймаута, чтобы
// index.js мог залогировать, в каком режиме (Redis/Memory) стартует rate limiter.
async function connectRedis() {
  const c = getRedisClient();
  if (!c) return false;
  if (c.isOpen) return true;

  if (!connectPromise) {
    connectPromise = c.connect().catch((err) => {
      // Ловим здесь, чтобы не получить unhandled rejection после того, как
      // ниже мы "уходим" от этого промиса по таймауту, не дожидаясь его исхода.
      console.error("[Redis] connect() promise rejected:", err.message);
      return null;
    });
  }

  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve("timeout"), CONNECT_TIMEOUT_MS);
  });

  const result = await Promise.race([connectPromise, timeout]);

  if (result === "timeout") {
    console.warn(
      `[Redis] не подключился за ${CONNECT_TIMEOUT_MS}мс — стартуем на MemoryStore, ` +
      `подключение Redis продолжается в фоне и будет подхвачено автоматически`
    );
    return false;
  }

  return c.isOpen;
}

function isRedisReady() {
  // КРИТИЧНО: isOpen в node-redis v6 устанавливается в true ДО попытки TCP-
  // соединения (socket.connect() → #isOpen = true немедленно) и остаётся true
  // на протяжении всего цикла reconnect, даже когда сервер физически недоступен.
  // isReady устанавливается в true ТОЛЬКО после успешного прохождения AUTH +
  // SELECT — то есть означает, что команды действительно будут выполнены.
  // Использование isOpen вместо isReady приводило к тому, что HybridRateLimitStore
  // считал Redis "готовым" во время переподключения, отправлял команды в offline
  // queue, откуда они вылетали TimeoutError через несколько секунд вместо
  // мгновенного fallback на MemoryStore.
  return !!(client && client.isReady);
}

async function disconnectRedis() {
  if (client && client.isOpen) {
    await client.quit().catch((err) => console.error("[Redis] error during quit:", err.message));
  }
}

module.exports = { getRedisClient, connectRedis, isRedisReady, disconnectRedis };
