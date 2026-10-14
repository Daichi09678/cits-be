import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { getCache, setCache, invalidateCache } from "../redis";

const CACHE_KEY_ABOUT = "cache:about:data";

export const aboutRoutes = new Elysia({ prefix: "/api/about" })
  // GET /api/about (Profil perusahaan & visi misi)
  .get(
    "/",
    async () => {
      const cached = await getCache(CACHE_KEY_ABOUT);
      if (cached) {
        return { success: true, source: "cache", data: cached };
      }

      const rows = await db
        .select()
        .from(schema.aboutData)
        .where(eq(schema.aboutData.id, "default"))
        .limit(1);

      const data = rows[0] || null;
      if (data) {
        await setCache(CACHE_KEY_ABOUT, data, 600);
      }

      return { success: true, source: "database", data };
    },
    {
      detail: {
        tags: ["About"],
        summary: "Mendapatkan profil perusahaan, visi, misi, dan statistik",
      },
    }
  )

  // PUT /api/about (Perbarui data profil perusahaan)
  .put(
    "/",
    async ({ body, set }) => {
      const updated = await db
        .update(schema.aboutData)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(schema.aboutData.id, "default"))
        .returning();

      if (!updated || updated.length === 0) {
        set.status = 404;
        return { success: false, message: "Data profil belum diinisialisasi." };
      }

      await invalidateCache("cache:about:*");

      return {
        success: true,
        message: "Profil perusahaan berhasil diperbarui",
        data: updated[0],
      };
    },
    {
      body: t.Partial(
        t.Object({
          title: t.String(),
          subtitle: t.String(),
          story: t.String(),
          vision: t.String(),
          mission: t.Array(t.String()),
          coreValues: t.Array(
            t.Object({
              title: t.String(),
              description: t.String(),
            })
          ),
          stats: t.Array(
            t.Object({
              label: t.String(),
              value: t.String(),
              description: t.String(),
            })
          ),
        })
      ),
      detail: {
        tags: ["About"],
        summary: "Perbarui profil perusahaan (Admin)",
      },
    }
  );
