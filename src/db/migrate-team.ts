import { queryClient } from "./index";

try {
  const migration = await Bun.file(
    new URL("../../docker/migrations/001_team_members.sql", import.meta.url),
  ).text();
  await queryClient.unsafe(migration);
  console.log("Team table is ready.");
} finally {
  await queryClient.end();
}
