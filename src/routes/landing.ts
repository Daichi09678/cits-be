import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { getCache, setCache, invalidateCache } from "../redis";

const CACHE_KEY_LANDING = "cache:landing:data";

export const landingRoutes = new Elysia({ prefix: "/api/landing" })
  // GET /api/landing (Pengaturan konten halaman utama web)
  .get(
    "/",
    async () => {
      const cached = await getCache(CACHE_KEY_LANDING);
      if (cached) {
        return { success: true, source: "cache", data: cached };
      }

      const rows = await db
        .select()
        .from(schema.landingPageData)
        .where(eq(schema.landingPageData.id, "default"))
        .limit(1);

      const data = rows[0] || null;
      if (data) {
        await setCache(CACHE_KEY_LANDING, data, 600);
      }

      return { success: true, source: "database", data };
    },
    {
      detail: {
        tags: ["Landing"],
        summary: "Mendapatkan data konten halaman utama (Hero, Highlights, Services, CTA)",
      },
    }
  )

  // PUT /api/landing (Perbarui konten halaman utama)
  .put(
    "/",
    async ({ body, set }) => {
      const updated = await db
        .update(schema.landingPageData)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(schema.landingPageData.id, "default"))
        .returning();

      if (!updated || updated.length === 0) {
        set.status = 404;
        return { success: false, message: "Data landing page belum diinisialisasi." };
      }

      await invalidateCache("cache:landing:*");

      return {
        success: true,
        message: "Konten landing page berhasil diperbarui",
        data: updated[0],
      };
    },
    {
      body: t.Partial(
        t.Object({
          hero: t.Any(),
          highlights: t.Any(),
          servicesIntro: t.Any(),
          cta: t.Any(),
        })
      ),
      detail: {
        tags: ["Landing"],
        summary: "Perbarui data konten halaman utama (Admin)",
      },
    }
  );
