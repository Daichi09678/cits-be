# CITS Backend API (`cits-be`)

Backend service untuk portal CITS Indonesia berbasis Bun, Elysia.js, PostgreSQL, Redis, dan Drizzle ORM.

## Prasyarat
- [Bun](https://bun.com) runtime (v1.2+)
- [Docker & Docker Compose](https://www.docker.com/)

## Cara Menjalankan

1. **Jalankan Database (PostgreSQL & Redis) dengan Docker**:
   ```bash
   bun run docker:up
   # Atau langsung via docker compose:
   docker compose up -d
   ```

2. **Install dependensi**:
   ```bash
   bun install
   ```

3. **Konfigurasi Environment**:
   Salin `.env.example` ke `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Jalankan Server Backend (Development)**:
   ```bash
   bun run dev
   ```
   Backend akan aktif di `http://localhost:3001` dengan dokumentasi Swagger di `http://localhost:3001/swagger`.

5. **Perintah Berguna Lainnya**:
   - `bun run docker:down` : Menghentikan container database
   - `bun run docker:logs` : Melihat log PostgreSQL & Redis
   - `bun run db:studio`   : Membuka Drizzle Studio GUI database
