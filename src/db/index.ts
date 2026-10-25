import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "../config/env";

export const queryClient = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Neon requires TLS; the Docker PostgreSQL used for local development does not.
  ssl: env.DATABASE_URL.includes("localhost") ? false : "require",
});

export const db = drizzle(queryClient, { schema });
export { schema };

/** Execute a lightweight query so health checks can verify the real database connection. */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await queryClient`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}
