export const env = {
  PORT: Number(process.env.PORT) || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "cits-indonesia-secret-key-super-secure-2026",
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://cits_user:cits_password_2026@localhost:5433/cits_db",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
};
