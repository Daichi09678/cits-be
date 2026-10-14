import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { staticPlugin } from "@elysiajs/static";
import { env } from "./config/env";
import { authRoutes } from "./routes/auth";
import { productRoutes } from "./routes/products";
import { messageRoutes } from "./routes/messages";
import { aboutRoutes } from "./routes/about";
import { contactRoutes } from "./routes/contact";
import { clientRoutes } from "./routes/clients";
import { uploadRoutes } from "./routes/uploads";
import { landingRoutes } from "./routes/landing";

const app = new Elysia()
  .use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: "CITS Indonesia Central API",
          version: "1.0.0",
          description:
            "REST API Backend terpusat untuk Website dan CMS Back Office PT Cipta Integrasi Teknologi Solusi (CITS). Didukung oleh Bun, Elysia.js, Drizzle ORM, PostgreSQL 16, dan Redis 7.",
        },
        tags: [
          { name: "Auth", description: "Autentikasi Administrator Back Office" },
          { name: "Landing", description: "Pengaturan Konten Halaman Utama (Home)" },
          { name: "Products", description: "Katalog & Manajemen Produk Solusi TI" },
          { name: "Messages", description: "Pesan Masuk & Formulir Konsultasi" },
          { name: "About", description: "Profil Perusahaan, Visi, Misi & Statistik" },
          { name: "Contact", description: "Informasi Kontak & Alamat Kantor" },
          { name: "Clients", description: "Mitra & Logo Instansi" },
          { name: "Uploads", description: "Media & Berkas" },
        ],
      },
      path: "/swagger",
    })
  )
  .use(staticPlugin({ prefix: "/uploads", assets: "uploads" }))
  // Root and Health Check
  .get("/", () => ({
    message: "CITS Indonesia Central API is running smoothly",
    framework: "Elysia.js + Bun",
    database: "PostgreSQL 16 (Docker)",
    cache: "Redis 7 (Docker)",
    status: "ok",
    docs: "/swagger",
  }))
  .get("/health", () => ({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }))
  // API Modules
  .use(authRoutes)
  .use(landingRoutes)
  .use(productRoutes)
  .use(messageRoutes)
  .use(aboutRoutes)
  .use(contactRoutes)
  .use(clientRoutes)
  .use(uploadRoutes)
  .listen(env.PORT);

console.log(
  `🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`
);
console.log(
  `📚 Swagger documentation available at http://${app.server?.hostname}:${app.server?.port}/swagger`
);

export type App = typeof app;
