import * as schema from "./schema";
import postgres, { type Sql } from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

declare global {
  var __studioPostgresClient: Sql | undefined;
}

const maxConnections = Number.parseInt(
  process.env.POSTGRES_MAX_CONNECTIONS ||
    (process.env.NODE_ENV === "production" ? "5" : "1"),
  10
);

const client =
  globalThis.__studioPostgresClient ??
  postgres(connectionString, {
    max: Number.isFinite(maxConnections) && maxConnections > 0 ? maxConnections : 1,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__studioPostgresClient = client;
}

export const db = drizzle(client, { schema });
