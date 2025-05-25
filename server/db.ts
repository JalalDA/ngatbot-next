import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { users, bots, knowledge, smmServices, nonAiChatbots, botFlows } from "../shared/schema";

const client = createClient({
  url: "file:local.db",
});

export const db = drizzle(client, { schema: { users, bots, knowledge, smmServices, nonAiChatbots, botFlows } });