import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { eq, or, sql } from "drizzle-orm";
import { db, schema } from "../db";

export type AccountTitle = "Super Admin" | "Admin";
export type PermissionAction = "view" | "create" | "edit" | "delete";
export interface Account {
  id: string;
  name: string;
  email: string;
  role: string;
  title: AccountTitle;
  avatar: string;
  accountType: "internal" | "admin";
  pageAccess: string[];
  permissions: Record<string, string[]>;
}

export function verifySaltedPassword(
  password: string,
  hash: string,
  salt: string,
  algo: string,
  context: "internal" | "admin",
) {
  const candidate =
    algo === "sha256"
      ? createHash("sha256").update(`${salt}:${password}`).digest("hex")
      : algo === "scrypt"
        ? scryptSync(
            `${salt}:${password}`,
            context === "internal"
              ? "cits-internal-account"
              : "cits-admin-credential",
            64,
          ).toString("hex")
        : "";
  if (
    !candidate ||
    !/^[a-f0-9]+$/i.test(hash) ||
    candidate.length !== hash.length
  )
    return false;
  return timingSafeEqual(
    Buffer.from(candidate, "hex"),
    Buffer.from(hash, "hex"),
  );
}

function internalUser(
  row: typeof schema.internalAccounts.$inferSelect,
): Account {
  const permissions =
    row.permissions ??
    Object.fromEntries(
      row.pageAccess.map((page) => [
        page,
        ["view", "create", "edit", "delete"],
      ]),
    );
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: "Admin Internal",
    title: "Admin",
    accountType: "internal",
    avatar: "/avatars/admin.webp",
    pageAccess: Object.keys(permissions).filter((page) =>
      permissions[page]?.includes("view"),
    ),
    permissions,
  };
}

function adminUser(row: typeof schema.adminUsers.$inferSelect): Account {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || "Admin",
    title: row.role?.toLowerCase().includes("super") ? "Super Admin" : "Admin",
    accountType: "admin",
    avatar: row.avatarUrl || "/avatars/admin.webp",
    pageAccess: [],
    permissions: {},
  };
}

export async function authenticateAccount(
  email: string,
  password: string,
  title?: AccountTitle,
): Promise<Account | "inactive" | null> {
  const input = email.trim().toLowerCase();
  if (title !== "Super Admin") {
    const [internal] = await db
      .select()
      .from(schema.internalAccounts)
      .where(sql`lower(${schema.internalAccounts.email}) = ${input}`)
      .limit(1);
    if (internal) {
      if (
        !verifySaltedPassword(
          password,
          internal.passwordHash,
          internal.passwordSalt,
          internal.passwordAlgo,
          "internal",
        )
      )
        return null;
      return internal.isActive ? internalUser(internal) : "inactive";
    }
  }
  const [admin] = await db
    .select()
    .from(schema.adminUsers)
    .where(
      or(
        sql`lower(${schema.adminUsers.email}) = ${input}`,
        sql`lower(${schema.adminUsers.name}) = ${input}`,
        eq(schema.adminUsers.email, `${input}@cits.id`),
      ),
    )
    .limit(1);
  if (!admin) return null;
  const user = adminUser(admin);
  if (title && user.title !== title) return null;
  const [credential] = await db
    .select()
    .from(schema.adminCredentials)
    .where(eq(schema.adminCredentials.userId, admin.id))
    .limit(1);
  const valid = credential
    ? verifySaltedPassword(
        password,
        credential.passwordHash,
        credential.passwordSalt,
        credential.passwordAlgo,
        "admin",
      )
    : await Bun.password
        .verify(password, admin.passwordHash)
        .catch(() => false);
  return valid ? user : null;
}

export async function resolveAccount(payload: {
  sub?: unknown;
  accountType?: unknown;
}): Promise<Account | null> {
  if (typeof payload.sub !== "string") return null;
  if (payload.accountType === "internal") {
    const [row] = await db
      .select()
      .from(schema.internalAccounts)
      .where(eq(schema.internalAccounts.id, payload.sub))
      .limit(1);
    return row?.isActive ? internalUser(row) : null;
  }
  const [row] = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.id, payload.sub))
    .limit(1);
  return row ? adminUser(row) : null;
}

export function canManageTeam(account: Account, action: PermissionAction) {
  return (
    account.title === "Super Admin" ||
    (account.permissions.team?.includes("view") === true &&
      account.permissions.team.includes(action))
  );
}
