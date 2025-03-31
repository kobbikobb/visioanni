import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/src/db/schema",
  out: "./migrations",
  dialect: "postgresql"
});
