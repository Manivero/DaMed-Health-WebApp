const { MemoryStore } = require("express-rate-limit");
const RedisStore = require("rate-limit-redis").default;
const { getRedisClient, isRedisReady } = require("../config/redis");

// КРИТИЧНО (см. также config/redis.js): задача этого класса — сделать переход
// между Redis и in-memory счётчиком ПРОЗРАЧНЫМ и БЕЗОПАСНЫМ для самого факта
// запуска приложения.
//
// Почему не просто "new RedisStore(...)" напрямую в module scope:
// конструктор RedisStore синхронно запускает SCRIPT LOAD по сети (см.
// node_modules/rate-limit-redis) — если на этот момент Redis-клиент ещё не
// прошёл .connect() (а в Node соединение асинхронное и rateLimiter.js
// требуется СИНХРОННО при импорте routes/*.js, до того как успевает
// отработать await connectRedis() в index.js), вызов улетает в
// ClientClosedError и превращается в necaught rejection при самом старте
// процесса. HybridRateLimitStore решает это, конструируя внутренний
// RedisStore ЛЕНИВО — только в момент первого increment(), и только если
// isRedisReady() уже true на этот момент. До тех пор (и в любой момент, когда
// Redis недоступен — отвалился, ещё не переподключился) используется
// MemoryStore.
//
// ИЗВЕСТНЫЙ TRADE-OFF (намеренно не устраняется, задокументировано явно):
// при переключении Redis → Memory → Redis (например, кратковременная сетевая
// проблема) счётчик конкретного ключа НЕ переносится между сторами — пользователь
// может временно получить "лишнее" окно лимита. Для rate limiting (best-effort
// защита, а не граница безопасности с ACID-гарантиями) это приемлемо: худший
// сценарий — на несколько секунд во время сбоя Redis лимит чуть мягче, а не
// то, что весь API падает или лимиты перестают работать насовсем.
class HybridRateLimitStore {
  constructor({ prefix }) {
    this.prefix = prefix;
    this.memoryStore = new MemoryStore();
    this.redisStore = null;
    this.windowMs = undefined;
    this.usingRedis = false; // для логирования факта переключения один раз, не на каждый запрос
  }

  init(options) {
    this.windowMs = options.windowMs;
    this.memoryStore.init(options);
    if (this.redisStore) this.redisStore.init(options);
  }

  _activeStore() {
    if (isRedisReady()) {
      if (!this.redisStore) {
        const client = getRedisClient();
        this.redisStore = new RedisStore({
          sendCommand: (...args) => client.sendCommand(args),
          prefix: this.prefix,
        });
        if (this.windowMs) this.redisStore.init({ windowMs: this.windowMs });
      }
      if (!this.usingRedis) {
        this.usingRedis = true;
        console.log(`[RateLimiter:${this.prefix}] переключение на Redis store`);
      }
      return this.redisStore;
    }
    if (this.usingRedis) {
      this.usingRedis = false;
      console.warn(`[RateLimiter:${this.prefix}] Redis недоступен — откат на in-memory store`);
    }
    return this.memoryStore;
  }

  async increment(key) {
    const store = this._activeStore();
    try {
      return await store.increment(key);
    } catch (err) {
      if (store === this.memoryStore) throw err;
      console.error(`[RateLimiter:${this.prefix}] Redis increment failed, fallback to memory for this request:`, err.message);
      return this.memoryStore.increment(key);
    }
  }

  async decrement(key) {
    const store = this._activeStore();
    try {
      await store.decrement(key);
    } catch (err) {
      if (store === this.memoryStore) throw err;
      await this.memoryStore.decrement(key).catch(() => {});
    }
  }

  async resetKey(key) {
    // Сбрасываем в обоих сторах: если переключение произошло между increment
    // и resetKey, ключ может быть "грязным" в неактивном сторе.
    await Promise.allSettled([
      this.redisStore?.resetKey(key),
      this.memoryStore.resetKey(key),
    ]);
  }
}

module.exports = HybridRateLimitStore;
