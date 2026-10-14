import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { env } from "../config/env";

export const authMiddleware = new Elysia({ name: "auth-guard" })
  .use(
    jwt({
      name: "jwt",
      secret: env.JWT_SECRET,
    })
  )
  .use(bearer())
  .derive(async ({ bearer, jwt, set }) => {
    if (!bearer) {
      return { user: null };
    }

    try {
      const payload = await jwt.verify(bearer);
      if (!payload || typeof payload !== "object") {
        return { user: null };
      }
      return {
        user: payload as { sub: string; email: string; role: string },
      };
    } catch {
      return { user: null };
    }
  });
