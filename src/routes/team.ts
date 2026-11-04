import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../config/env";
import { parseTeamMember, sortTeamMembers } from "../types/team";
import {
  resolveAccount,
  canManageTeam,
  type PermissionAction,
} from "../auth/accounts";

const memberBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  position: t.String({ minLength: 1, maxLength: 160 }),
  teamName: t.Optional(t.String({ maxLength: 100 })),
  photoUrl: t.Optional(t.Nullable(t.String())),
  displayOrder: t.Optional(t.Integer({ minimum: 0, maximum: 9999 })),
  isActive: t.Optional(t.Boolean()),
  showOnHomepage: t.Optional(t.Boolean()),
  isDemo: t.Optional(t.Boolean()),
});
const memberParams = t.Object({
  id: t.String({ minLength: 1, maxLength: 200 }),
});
const detail = (summary: string) => ({ tags: ["Team"], summary });

export const teamRoutes = new Elysia({ prefix: "/api/team" })
  .use(jwt({ name: "teamJwt", secret: env.JWT_SECRET }))
  .use(bearer())
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION" || code === "PARSE") {
      set.status = code === "VALIDATION" ? 422 : 400;
      return {
        success: false,
        message: "Data anggota tim tidak valid. Periksa body JSON.",
      };
    }
    if (code === "UNKNOWN" || code === "INTERNAL_SERVER_ERROR") {
      console.error("Team API failed:", error.name);
      set.status = 503;
      return {
        success: false,
        message: "Data tim belum dapat diproses. Silakan coba lagi.",
      };
    }
  })
  .onBeforeHandle(async ({ request, path, query, bearer, teamJwt, set }) => {
    const publicList =
      request.method === "GET" &&
      path.replace(/\/$/, "") === "/api/team" &&
      query.admin !== "1";
    if (publicList) return;
    const denied = () => {
      set.status = 401;
      return {
        success: false,
        message: "Akses ditolak. Gunakan token login admin yang valid.",
      };
    };
    if (!bearer) return denied();
    let payload;
    try {
      payload = await teamJwt.verify(bearer);
    } catch {
      return denied();
    }
    if (!payload || typeof payload.sub !== "string") return denied();
    const admin = await resolveAccount(payload);
    if (!admin) return denied();
    const action: PermissionAction =
      request.method === "POST"
        ? "create"
        : request.method === "PUT"
          ? "edit"
          : request.method === "DELETE"
            ? "delete"
            : "view";
    if (!canManageTeam(admin, action)) {
      set.status = 403;
      return {
        success: false,
        message: "Anda tidak memiliki izin untuk tindakan pada modul tim ini.",
      };
    }
  })
  .get(
    "/",
    async ({ query, set }) => {
      const rows = await db
        .select({ id: schema.teamMembers.id, data: schema.teamMembers.data })
        .from(schema.teamMembers);
      const members = sortTeamMembers(
        rows.map((row) => ({ ...row.data, id: row.id })),
      );
      set.headers["Cache-Control"] = "no-store";
      return {
        success: true,
        data:
          query.admin === "1"
            ? members
            : members.filter(
                (member) =>
                  member.isActive !== false && member.showOnHomepage !== false,
              ),
      };
    },
    {
      query: t.Object({ admin: t.Optional(t.Literal("1")) }),
      detail: detail(
        "Daftar tim publik; gunakan ?admin=1 dan token untuk semua anggota",
      ),
    },
  )
  .get(
    "/:id",
    async ({ params, set }) => {
      const [row] = await db
        .select()
        .from(schema.teamMembers)
        .where(eq(schema.teamMembers.id, params.id))
        .limit(1);
      if (!row) {
        set.status = 404;
        return { success: false, message: "Anggota tim tidak ditemukan." };
      }
      return { success: true, data: { ...row.data, id: row.id } };
    },
    { params: memberParams, detail: detail("Detail anggota tim (Admin)") },
  )
  .post(
    "/",
    async ({ body, set }) => {
      const parsed = parseTeamMember(body);
      if (!parsed.ok) {
        set.status = 400;
        return { success: false, message: parsed.message };
      }
      // Persist a new member without accepting a caller-supplied identity.
      const [row] = await db
        .insert(schema.teamMembers)
        .values({
          id: `team-${crypto.randomUUID()}`,
          data: parsed.value,
        })
        .returning();
      if (!row) throw new Error("Team member was not inserted");
      set.status = 201;
      return {
        success: true,
        message: "Anggota tim berhasil ditambahkan.",
        data: { ...row.data, id: row.id },
      };
    },
    { body: memberBody, detail: detail("Tambah anggota tim (Admin)") },
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const parsed = parseTeamMember(body);
      if (!parsed.ok) {
        set.status = 400;
        return { success: false, message: parsed.message };
      }
      // PUT replaces all member fields; omitted optional fields return to defaults.
      const [row] = await db
        .update(schema.teamMembers)
        .set({ data: parsed.value, updatedAt: new Date() })
        .where(eq(schema.teamMembers.id, params.id))
        .returning();
      if (!row) {
        set.status = 404;
        return { success: false, message: "Anggota tim tidak ditemukan." };
      }
      return {
        success: true,
        message: "Anggota tim berhasil diperbarui.",
        data: { ...row.data, id: row.id },
      };
    },
    {
      params: memberParams,
      body: memberBody,
      detail: detail("Ganti data anggota tim (Admin)"),
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      // Delete only the member identified by this request.
      const [row] = await db
        .delete(schema.teamMembers)
        .where(eq(schema.teamMembers.id, params.id))
        .returning({ id: schema.teamMembers.id });
      if (!row) {
        set.status = 404;
        return { success: false, message: "Anggota tim tidak ditemukan." };
      }
      return { success: true, message: "Anggota tim berhasil dihapus." };
    },
    { params: memberParams, detail: detail("Hapus anggota tim (Admin)") },
  );
