import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

// Configuração do Drizzle para Supabase
export default defineConfig({
  out: "./migrations",
  schema: "./packages/shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/mardecores",
  },
  verbose: true,
  strict: true,
});
