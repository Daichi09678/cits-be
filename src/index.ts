import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { staticPlugin } from "@elysiajs/static";

const PORT = Number(process.env.PORT) || 3001;

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: "CITS Indonesia API",
          version: "1.0.0",
          description: "REST API Backend dengan Elysia.js dan Bun untuk CITS Indonesia",
        },
      },
      path: "/swagger",
    })
  )
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "cits-secret-key-2026",
    })
  )
  .use(bearer())
  .use(staticPlugin({ prefix: "/uploads", assets: "uploads" }))
  .get("/", () => ({
    message: "CITS Indonesia Backend API is running",
    framework: "Elysia.js + Bun",
    status: "ok",
    docs: "/swagger",
  }))
  .get("/health", () => ({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }))
  .listen(PORT);

console.log(
  `🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`
);
console.log(
  `📚 Swagger documentation available at http://${app.server?.hostname}:${app.server?.port}/swagger`
);

export type App = typeof app;
