import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { teamRoutes } from "../src/routes/team";
import {
  parseTeamMember,
  sortTeamMembers,
  type TeamMember,
} from "../src/types/team";
import { db, queryClient, schema } from "../src/db";
import { env } from "../src/config/env";
import { inArray } from "drizzle-orm";

const app = new Elysia().use(teamRoutes);
async function json<T = never>(response: Response | Promise<Response>) {
  return (await (await response).json()) as { success: boolean; data: T };
}
const input = {
  name: "Anggota Uji API",
  position: "Pengujian",
  photoUrl: null,
  displayOrder: 2,
  isActive: false,
  showOnHomepage: false,
  isDemo: true,
};

function request(path = "", method = "GET", body?: unknown, token?: string) {
  const req = new Request(
    `${process.env.TEST_TEAM_BASE_URL || "http://localhost"}/api/team${path}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
  return process.env.TEST_TEAM_BASE_URL ? fetch(req) : app.handle(req);
}

test("team input trims required fields and rejects invalid names, orders, flags and photo URLs", () => {
  const parsed = parseTeamMember({ name: " Nama Uji ", position: " Teknisi " });
  expect(parsed).toEqual({
    ok: true,
    value: {
      name: "Nama Uji",
      position: "Teknisi",
      photoUrl: null,
      displayOrder: 0,
      isActive: true,
      showOnHomepage: true,
      isDemo: false,
    },
  });
  for (const fields of [
    { name: " " },
    { position: " " },
    { name: "x".repeat(121) },
    { displayOrder: -1 },
    { displayOrder: 1.5 },
    { displayOrder: 10000 },
    { isActive: "false" },
    { photoUrl: "javascript:alert(1)" },
    { photoUrl: "//example.com/photo.png" },
  ]) {
    expect(parseTeamMember({ ...input, ...fields }).ok).toBe(false);
  }
  expect(
    parseTeamMember({ ...input, photoUrl: "/uploads/photo.webp" }).ok,
  ).toBe(true);
});

test("optional team name is trimmed, persisted in input and validated", () => {
  const parsed = parseTeamMember({ ...input, teamName: "  Infrastruktur & Pengadaan  " });
  expect(parsed.ok).toBe(true);
  if (parsed.ok) expect(parsed.value.teamName).toBe("Infrastruktur & Pengadaan");
  for (const teamName of [null, 42, [], "x".repeat(101)])
    expect(parseTeamMember({ ...input, teamName }).ok).toBe(false);
  const empty = parseTeamMember({ ...input, teamName: "" });
  expect(empty.ok && empty.value.teamName).toBe("");
});

test("sorting preserves input and breaks equal display orders consistently", () => {
  const members = [
    { ...input, id: "b", name: "Budi" },
    { ...input, id: "a", name: "Andi" },
  ];
  expect(sortTeamMembers(members).map((member) => member.id)).toEqual([
    "a",
    "b",
  ]);
  expect(members.map((member) => member.id)).toEqual(["b", "a"]);
});

test("all admin team operations reject missing or malformed tokens", async () => {
  for (const token of [undefined, "invalid-token"]) {
    for (const [path, method, body] of [
      ["?admin=1", "GET", undefined],
      ["/missing", "GET", undefined],
      ["", "POST", input],
      ["/missing", "PUT", input],
      ["/missing", "DELETE", undefined],
    ] as const) {
      const response = await request(path, method, body, token);
      expect(response.status).toBe(401);
      expect((await json(response)).success).toBe(false);
    }
  }
});

describe.skipIf(process.env.TEST_TEAM_API !== "1")(
  "team database integration",
  () => {
    let token: string;
    const createdIds: string[] = [];
    beforeAll(async () => {
      const [admin] = await db
        .select({ id: schema.adminUsers.id })
        .from(schema.adminUsers)
        .limit(1);
      if (!admin)
        throw new Error("An existing backend admin account is required");
      const signer = new Elysia()
        .use(jwt({ name: "jwt", secret: env.JWT_SECRET }))
        .get("/token", ({ jwt }) =>
          jwt.sign({ sub: admin.id, exp: Math.floor(Date.now() / 1000) + 60 }),
        );
      token = await (
        await signer.handle(new Request("http://localhost/token"))
      ).text();
    });
    afterAll(async () => {
      if (createdIds.length)
        await db
          .delete(schema.teamMembers)
          .where(inArray(schema.teamMembers.id, createdIds));
      await queryClient.end();
    });

    test("CRUD, publication filters, validation and missing member responses", async () => {
      const create = await request("", "POST", input, token);
      expect(create.status).toBe(201);
      const member = (await json<TeamMember>(create)).data;
      createdIds.push(member.id);
      expect(member.name).toBe(input.name);

      const publicList = await json<TeamMember[]>(request());
      expect(
        publicList.data.some((item: { id: string }) => item.id === member.id),
      ).toBe(false);
      const adminList = await request("?admin=1", "GET", undefined, token);
      expect(adminList.status).toBe(200);
      expect(
        (await json<TeamMember[]>(adminList)).data.some(
          (item: { id: string }) => item.id === member.id,
        ),
      ).toBe(true);
      expect(
        (await request(`/${member.id}`, "GET", undefined, token)).status,
      ).toBe(200);

      const invalidName = await request(
        "",
        "POST",
        { ...input, name: " " },
        token,
      );
      expect(invalidName.status).toBe(400);
      const invalidPhoto = await request(
        "",
        "POST",
        { ...input, photoUrl: "javascript:alert(1)" },
        token,
      );
      expect(invalidPhoto.status).toBe(400);
      const invalidOrder = await request(
        `/${member.id}`,
        "PUT",
        { ...input, displayOrder: -1 },
        token,
      );
      expect(invalidOrder.status).toBe(422);
      expect(
        (
          await json<TeamMember>(
            request(`/${member.id}`, "GET", undefined, token),
          )
        ).data.displayOrder,
      ).toBe(2);

      const update = await request(
        `/${member.id}`,
        "PUT",
        {
          ...input,
          name: "Anggota Uji Diubah",
          isActive: true,
          showOnHomepage: true,
        },
        token,
      );
      expect(update.status).toBe(200);
      expect((await json<TeamMember>(update)).data.name).toBe(
        "Anggota Uji Diubah",
      );
      expect(
        (await json<TeamMember[]>(request())).data.some(
          (item: { id: string }) => item.id === member.id,
        ),
      ).toBe(true);
      await request(
        `/${member.id}`,
        "PUT",
        { ...input, isActive: true, showOnHomepage: false },
        token,
      );
      expect(
        (await json<TeamMember[]>(request())).data.some(
          (item: { id: string }) => item.id === member.id,
        ),
      ).toBe(false);

      expect(
        (await request(`/${member.id}`, "DELETE", undefined, token)).status,
      ).toBe(200);
      expect(
        (await request(`/${member.id}`, "GET", undefined, token)).status,
      ).toBe(404);
      expect((await request(`/${member.id}`, "PUT", input, token)).status).toBe(
        404,
      );
      expect(
        (await request(`/${member.id}`, "DELETE", undefined, token)).status,
      ).toBe(404);
    });
  },
);
