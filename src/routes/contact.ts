import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { getCache, setCache, invalidateCache } from "../redis";

const CACHE_KEY_CONTACT = "cache:contact:info";

export const contactRoutes = new Elysia({ prefix: "/api/contact" })
  // GET /api/contact (Info kontak kantor, alamat, jam operasional)
  .get(
    "/",
    async () => {
      const cached = await getCache(CACHE_KEY_CONTACT);
      if (cached) {
        return { success: true, source: "cache", data: cached };
      }

      const rows = await db
        .select()
        .from(schema.contactInfo)
        .where(eq(schema.contactInfo.id, "default"))
        .limit(1);

      const data = rows[0] || null;
      if (data) {
        await setCache(CACHE_KEY_CONTACT, data, 600);
      }

      return { success: true, source: "database", data };
    },
    {
      detail: {
        tags: ["Contact"],
        summary: "Informasi kontak dan kantor resmi",
      },
    }
  )

  // PUT /api/contact (Perbarui informasi kontak)
  .put(
    "/",
    async ({ body, set }) => {
      const updated = await db
        .update(schema.contactInfo)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(schema.contactInfo.id, "default"))
        .returning();

      if (!updated || updated.length === 0) {
        set.status = 404;
        return { success: false, message: "Data kontak belum diinisialisasi." };
      }

      await invalidateCache("cache:contact:*");

      return {
        success: true,
        message: "Informasi kontak berhasil diperbarui",
        data: updated[0],
      };
    },
    {
      body: t.Partial(
        t.Object({
          companyName: t.String(),
          address: t.String(),
          phone: t.String(),
          email: t.String(),
          workingHours: t.String(),
          emergencyPhone: t.String(),
          mapsUrl: t.String(),
        })
      ),
      detail: {
        tags: ["Contact"],
        summary: "Perbarui informasi kontak resmi (Admin)",
      },
    }
  );
