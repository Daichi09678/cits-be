import { Elysia, t } from "elysia";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db";
import { getCache, setCache, invalidateCache } from "../redis";

const CACHE_KEY_CLIENTS = "cache:clients:all";

export const clientRoutes = new Elysia({ prefix: "/api/clients" })
  // GET /api/clients (Daftar mitra & logo instansi)
  .get(
    "/",
    async () => {
      const cached = await getCache(CACHE_KEY_CLIENTS);
      if (cached) {
        return { success: true, source: "cache", data: cached };
      }

      const list = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.isActive, true))
        .orderBy(desc(schema.clients.createdAt));

      await setCache(CACHE_KEY_CLIENTS, list, 600);
      return { success: true, source: "database", data: list };
    },
    {
      detail: {
        tags: ["Clients"],
        summary: "Daftar mitra dan logo klien",
      },
    }
  )

  // POST /api/clients (Tambah mitra baru)
  .post(
    "/",
    async ({ body, set }) => {
      const id = body.id || `client-${Date.now()}`;
      const inserted = await db
        .insert(schema.clients)
        .values({
          id,
          name: body.name,
          logo: body.logo,
          category: body.category,
          isActive: body.isActive ?? true,
        })
        .returning();

      await invalidateCache("cache:clients:*");

      set.status = 201;
      return {
        success: true,
        message: "Mitra berhasil ditambahkan",
        data: inserted[0],
      };
    },
    {
      body: t.Object({
        id: t.Optional(t.String()),
        name: t.String(),
        logo: t.String(),
        category: t.String(),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ["Clients"],
        summary: "Tambah mitra baru (Admin)",
      },
    }
  )

  // PUT /api/clients/:id
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const updated = await db
        .update(schema.clients)
        .set(body)
        .where(eq(schema.clients.id, params.id))
        .returning();

      if (!updated || updated.length === 0) {
        set.status = 404;
        return { success: false, message: "Data mitra tidak ditemukan." };
      }

      await invalidateCache("cache:clients:*");

      return {
        success: true,
        message: "Data mitra berhasil diperbarui",
        data: updated[0],
      };
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String(),
          logo: t.String(),
          category: t.String(),
          isActive: t.Boolean(),
        })
      ),
      detail: {
        tags: ["Clients"],
        summary: "Perbarui data mitra (Admin)",
      },
    }
  )

  // DELETE /api/clients/:id
  .delete(
    "/:id",
    async ({ params, set }) => {
      const deleted = await db
        .delete(schema.clients)
        .where(eq(schema.clients.id, params.id))
        .returning();

      if (!deleted || deleted.length === 0) {
        set.status = 404;
        return { success: false, message: "Data mitra tidak ditemukan." };
      }

      await invalidateCache("cache:clients:*");

      return { success: true, message: "Mitra berhasil dihapus." };
    },
    {
      detail: {
        tags: ["Clients"],
        summary: "Hapus data mitra (Admin)",
      },
    }
  );
