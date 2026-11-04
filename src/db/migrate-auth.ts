import { queryClient } from "./index";

try {
  const migration = await Bun.file(
    new URL("../../docker/migrations/002_auth_accounts.sql", import.meta.url),
  ).text();
  await queryClient.begin(async (transaction) => {
    await transaction.unsafe(migration, [], { prepare: false });
  });
  console.log("Admin authentication tables are ready.");
} finally {
  await queryClient.end();
}
