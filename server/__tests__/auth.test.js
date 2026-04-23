const request = require("supertest");

// Подключаем .env для тестов
process.env.MONGO_URI = "mongodb://localhost:27017/health-test";
process.env.JWT_SECRET = "test_secret_32_characters_minimum_ok";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_32_chars_ok_ok";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.NODE_ENV = "test";

const app = require("../index");

describe("Auth API", () => {
  it("POST /api/auth/register — returns 422 if email invalid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "123456" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it("POST /api/auth/register — returns 422 if password too short", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "123" });
    expect(res.status).toBe(422);
  });

  it("POST /api/auth/login — returns 422 if fields empty", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({});
    expect(res.status).toBe(422);
  });

  it("GET /api/health — returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /api/unknown — returns 404", async () => {
    const res = await request(app).get("/api/unknown-route");
    expect(res.status).toBe(404);
  });
});

describe("Doctors API", () => {
  it("GET /api/doctors — returns paginated response", async () => {
    const res = await request(app).get("/api/doctors");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("doctors");
    expect(res.body).toHaveProperty("pagination");
    expect(Array.isArray(res.body.doctors)).toBe(true);
  });

  it("GET /api/doctors — accepts page/limit query params", async () => {
    const res = await request(app).get("/api/doctors?page=1&limit=5");
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(5);
  });
});

describe("Auth refresh", () => {
  it("POST /api/auth/refresh — returns 401 without token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/refresh — returns 401 with fake token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "fake.token.here" });
    expect(res.status).toBe(401);
  });
});
