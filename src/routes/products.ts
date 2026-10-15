import { Elysia, t } from "elysia";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db";
import { getCache, setCache, invalidateCache } from "../redis";

const CACHE_KEY_ACTIVE = "cache:products:active";

export const productRoutes = new Elysia({ prefix: "/api/products" })
  // GET /api/products (Hanya produk aktif, untuk halaman publik frontend)
  .get(
    "/",
    async () => {
      // 1. Cek cache Redis
      const cached = await getCache(CACHE_KEY_ACTIVE);
      if (cached) {
        return { success: true, source: "cache", data: cached };
      }

      // 2. Query Database PostgreSQL
      const list = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.isActive, true))
        .orderBy(desc(schema.products.updatedAt));

      // 3. Simpan ke Redis (TTL 10 menit)
      await setCache(CACHE_KEY_ACTIVE, list, 600);

      return { success: true, source: "database", data: list };
    },
    {
      detail: {
        tags: ["Products"],
        summary: "Katalog produk aktif untuk publik",
      },
    }
  )

  // GET /api/products/all (Semua produk, untuk admin panel)
  .get(
    "/all",
    async () => {
      const list = await db
        .select()
        .from(schema.products)
        .orderBy(desc(schema.products.updatedAt));

      return { success: true, data: list };
    },
    {
      detail: {
        tags: ["Products"],
        summary: "Semua produk untuk admin back office",
      },
    }
  )

  // GET /api/products/:id
  .get(
    "/:id",
    async ({ params, set }) => {
      const item = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, params.id))
        .limit(1);

      if (!item || item.length === 0) {
        set.status = 404;
        return { success: false, message: "Produk tidak ditemukan." };
      }

      return { success: true, data: item[0] };
    },
    {
      detail: {
        tags: ["Products"],
        summary: "Detail produk berdasarkan ID",
      },
    }
  )

  // POST /api/products (Tambah produk baru)
  .post(
    "/",
    async ({ body, set }) => {
      const id = body.id || `prod-${Date.now()}`;

      const inserted = await db
        .insert(schema.products)
        .values({
          id,
          name: body.name,
          category: body.category,
          description: body.description,
          features: body.features || [],
          tags: body.tags || [],
          icon: body.icon || "Package",
          image: body.image || null,
          isActive: body.isActive ?? true,
          updatedAt: new Date(),
        })
        .returning();

      // Invalidate cache
      await invalidateCache("cache:products:*");

      set.status = 201;
      return { success: true, message: "Produk berhasil ditambahkan", data: inserted[0] };
    },
    {
      body: t.Object({
        id: t.Optional(t.String()),
        name: t.String(),
        category: t.String(),
        description: t.String(),
        features: t.Optional(t.Array(t.String())),
        tags: t.Optional(t.Array(t.String())),
        icon: t.Optional(t.String()),
        image: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ["Products"],
        summary: "Tambah produk baru (Admin)",
      },
    }
  )

  // PUT /api/products/:id (Update produk)
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const updated = await db
        .update(schema.products)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, params.id))
        .returning();

      if (!updated || updated.length === 0) {
        set.status = 404;
        return { success: false, message: "Produk tidak ditemukan." };
      }

      // Invalidate cache
      await invalidateCache("cache:products:*");

      return { success: true, message: "Produk berhasil diperbarui", data: updated[0] };
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String(),
          category: t.String(),
          description: t.String(),
          features: t.Array(t.String()),
          tags: t.Array(t.String()),
          icon: t.String(),
          image: t.String(),
          isActive: t.Boolean(),
        })
      ),
      detail: {
        tags: ["Products"],
        summary: "Perbarui data produk (Admin)",
      },
    }
  )

  // DELETE /api/products/:id
  .delete(
    "/:id",
    async ({ params, set }) => {
      const deleted = await db
        .delete(schema.products)
        .where(eq(schema.products.id, params.id))
        .returning();

      if (!deleted || deleted.length === 0) {
        set.status = 404;
        return { success: false, message: "Produk tidak ditemukan." };
      }

      // Invalidate cache
      await invalidateCache("cache:products:*");

      return { success: true, message: "Produk berhasil dihapus" };
    },
    {
      detail: {
        tags: ["Products"],
        summary: "Hapus produk (Admin)",
      },
    }
  );
