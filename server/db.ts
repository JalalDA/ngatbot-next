
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { Pool } from "pg";
import { users, bots, knowledge, smmServices, nonAiChatbots, botFlows } from "../shared/schema";

const client = createClient({
  url: "file:local.db",
});

export const db = drizzle(client, { schema: { users, bots, knowledge, smmServices, nonAiChatbots, botFlows } });

// Create PostgreSQL pool for session storage
export const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DB || "sessions",
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "password",
});
