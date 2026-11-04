import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { env } from "../config/env";
import { authenticateAccount, resolveAccount } from "../auth/accounts";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(jwt({ name: "jwt", secret: env.JWT_SECRET }))
  .use(bearer())
  .onError(({ code, error, set }) => {
    if (code === "UNKNOWN" || code === "INTERNAL_SERVER_ERROR") {
      console.error("Authentication unavailable:", error.name);
      set.status = 503;
      return {
        success: false,
        message: "Layanan login belum tersedia. Silakan coba lagi.",
      };
    }
  })
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      const account = await authenticateAccount(
        body.email,
        body.password,
        body.title,
      );
      if (!account) {
        set.status = 401;
        return {
          success: false,
          message: "Email/username, password, atau jenis akun tidak sesuai.",
        };
      }
      if (account === "inactive") {
        set.status = 403;
        return {
          success: false,
          message: "Akun admin sedang dinonaktifkan. Hubungi Super Admin.",
        };
      }
      const token = await jwt.sign({
        sub: account.id,
        email: account.email,
        role: account.role,
        accountType: account.accountType,
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
      });
      return { success: true, message: "Login berhasil", token, user: account };
    },
    {
      body: t.Object({
        email: t.String({ minLength: 1, maxLength: 254 }),
        password: t.String({ minLength: 1, maxLength: 1024 }),
        title: t.Optional(
          t.Union([t.Literal("Super Admin"), t.Literal("Admin")], {
            description:
              "Jenis akun: Super Admin atau Admin. Jika kosong, dideteksi dari database.",
          }),
        ),
      }),
      detail: { tags: ["Auth"], summary: "Login Super Admin atau Admin biasa" },
    },
  )
  .get(
    "/me",
    async ({ bearer, jwt, set }) => {
      const denied = () => {
        set.status = 401;
        return {
          success: false,
          message: "Sesi tidak valid atau telah berakhir.",
        };
      };
      if (!bearer) return denied();
      let payload;
      try {
        payload = await jwt.verify(bearer);
      } catch {
        return denied();
      }
      if (!payload) return denied();
      const account = await resolveAccount(payload);
      if (!account) return denied();
      return { success: true, user: account };
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Data dan jenis akun admin yang sedang login",
      },
    },
  );
