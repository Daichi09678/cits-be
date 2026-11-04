import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createHash, scryptSync } from "node:crypto";
import { Elysia } from "elysia";
import { eq, inArray } from "drizzle-orm";
import { authRoutes } from "../src/routes/auth";
import { teamRoutes } from "../src/routes/team";
import { verifySaltedPassword } from "../src/auth/accounts";
import { db, schema, queryClient } from "../src/db";

test("frontend password formats verify with the correct context only", () => {
  const salt = "test-salt";
  const password = "Test-Only-Password123!";
  const hash = scryptSync(
    `${salt}:${password}`,
    "cits-internal-account",
    64,
  ).toString("hex");
  expect(verifySaltedPassword(password, hash, salt, "scrypt", "internal")).toBe(
    true,
  );
  expect(verifySaltedPassword("wrong", hash, salt, "scrypt", "internal")).toBe(
    false,
  );
  expect(verifySaltedPassword(password, hash, salt, "scrypt", "admin")).toBe(
    false,
  );
  const legacy = createHash("sha256")
    .update(`${salt}:${password}`)
    .digest("hex");
  expect(
    verifySaltedPassword(password, legacy, salt, "sha256", "internal"),
  ).toBe(true);
  expect(
    verifySaltedPassword(password, "invalid", salt, "unknown", "internal"),
  ).toBe(false);
});

describe.skipIf(process.env.TEST_AUTH_API !== "1")(
  "admin login integration",
  () => {
    const app = new Elysia().use(authRoutes).use(teamRoutes);
    const suffix = crypto.randomUUID();
    const superId = `auth-${suffix}`;
    const internalId = `internal-${suffix}`;
    const legacyId = `legacy-${suffix}`;
    const email = `internal-${suffix}@example.test`;
    const superEmail = `super-${suffix}@example.test`;
    const password = "Test-Only-Password123!";
    const newPassword = "New-Test-Password123!";
    const salt = "integration-salt";
    const request = (
      path: string,
      method = "GET",
      body?: unknown,
      token?: string,
    ) => {
      const req = new Request(
        `${process.env.TEST_AUTH_BASE_URL || "http://localhost"}${path}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      );
      return process.env.TEST_AUTH_BASE_URL ? fetch(req) : app.handle(req);
    };
    const login = (email: string, password: string, title?: string) =>
      request("/api/auth/login", "POST", {
        email,
        password,
        ...(title ? { title } : {}),
      });
    const read = async (res: Response) =>
      (await res.json()) as {
        token: string;
        user: { id: string; title: string; role: string };
        success: boolean;
      };
    beforeAll(async () => {
      await db
        .insert(schema.adminUsers)
        .values({
          id: superId,
          name: "Auth Integration Super",
          email: superEmail,
          passwordHash: await Bun.password.hash(password),
          role: "Super Admin",
        });
      await db.insert(schema.internalAccounts).values([
        {
          id: internalId,
          name: "Auth Integration Internal",
          email,
          passwordHash: scryptSync(
            `${salt}:${password}`,
            "cits-internal-account",
            64,
          ).toString("hex"),
          passwordSalt: salt,
          permissions: { team: ["view"] },
          pageAccess: ["team"],
        },
        {
          id: legacyId,
          name: "Auth Integration Legacy",
          email: `legacy-${suffix}@example.test`,
          passwordHash: createHash("sha256")
            .update(`${salt}:${password}`)
            .digest("hex"),
          passwordSalt: salt,
          passwordAlgo: "sha256",
          pageAccess: ["team"],
        },
      ]);
    });
    afterAll(async () => {
      await db
        .delete(schema.adminCredentials)
        .where(eq(schema.adminCredentials.userId, superId));
      await db
        .delete(schema.adminUsers)
        .where(eq(schema.adminUsers.id, superId));
      await db
        .delete(schema.internalAccounts)
        .where(inArray(schema.internalAccounts.id, [internalId, legacyId]));
      await queryClient.end();
    });
    test("both account types, title selection, password failures and fresh team permissions", async () => {
      const superLogin = await login(superEmail, password, "Super Admin");
      expect(superLogin.status).toBe(200);
      const superSession = await read(superLogin);
      expect(superSession.user.title).toBe("Super Admin");
      expect(
        (
          await request(
            "/api/team?admin=1",
            "GET",
            undefined,
            superSession.token,
          )
        ).status,
      ).toBe(200);
      expect((await login(superEmail, password, "Admin")).status).toBe(401);
      expect((await login(superEmail, "admin", "Super Admin")).status).toBe(
        401,
      );
      expect((await login(superEmail, "admin123", "Super Admin")).status).toBe(
        401,
      );
      expect((await login(email, password, "Super Admin")).status).toBe(401);
      expect((await login(email, "wrong", "Admin")).status).toBe(401);
      expect(
        (await login(`missing-${suffix}@example.test`, password, "Admin"))
          .status,
      ).toBe(401);
      expect((await login(email, password, "invalid")).status).toBe(422);
      expect((await login(email, password)).status).toBe(200);

      const regularLogin = await login(email.toUpperCase(), password, "Admin");
      expect(regularLogin.status).toBe(200);
      const session = await read(regularLogin);
      expect(session.user.title).toBe("Admin");
      const me = await request("/api/auth/me", "GET", undefined, session.token);
      expect(me.status).toBe(200);
      expect((await read(me)).user.id).toBe(internalId);
      expect(
        (await request("/api/team?admin=1", "GET", undefined, session.token))
          .status,
      ).toBe(200);
      expect(
        (
          await request(
            "/api/team",
            "POST",
            { name: "Test", position: "Test" },
            session.token,
          )
        ).status,
      ).toBe(403);

      await db
        .update(schema.internalAccounts)
        .set({ permissions: {} })
        .where(eq(schema.internalAccounts.id, internalId));
      expect(
        (await request("/api/team?admin=1", "GET", undefined, session.token))
          .status,
      ).toBe(403);
      await db
        .update(schema.internalAccounts)
        .set({ isActive: false })
        .where(eq(schema.internalAccounts.id, internalId));
      expect((await login(email, password, "Admin")).status).toBe(403);
      expect(
        (await request("/api/auth/me", "GET", undefined, session.token)).status,
      ).toBe(401);
      expect(
        (await request("/api/team?admin=1", "GET", undefined, session.token))
          .status,
      ).toBe(401);

      const legacy = await login(
        `legacy-${suffix}@example.test`,
        password,
        "Admin",
      );
      expect(legacy.status).toBe(200);
      expect(
        (
          await request(
            "/api/team?admin=1",
            "GET",
            undefined,
            (await read(legacy)).token,
          )
        ).status,
      ).toBe(200);
      await db
        .insert(schema.adminCredentials)
        .values({
          userId: superId,
          passwordHash: scryptSync(
            `${salt}:${newPassword}`,
            "cits-admin-credential",
            64,
          ).toString("hex"),
          passwordSalt: salt,
        });
      expect((await login(superEmail, password, "Super Admin")).status).toBe(
        401,
      );
      expect((await login(superEmail, newPassword, "Super Admin")).status).toBe(
        200,
      );
    });
  },
);
