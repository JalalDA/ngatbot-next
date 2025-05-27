import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"), // user, admin
  level: text("level").notNull().default("basic"), // basic, pro, business
  credits: integer("credits").notNull().default(250),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  botName: text("bot_name").notNull(),
  botUsername: text("bot_username").notNull(),
  systemPrompt: text("system_prompt").default("You are a helpful assistant that can answer questions and provide information."),
  isActive: boolean("is_active").notNull().default(true),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledge = pgTable("knowledge", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // text, link, file
  content: text("content").notNull(),
  url: text("url"), // for link type
  fileName: text("file_name"), // for file type
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(), // pro, business
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, success, failed
  midtransOrderId: text("midtrans_order_id").unique(),
  snapToken: text("snap_token"),
  paymentInfo: text("payment_info"), // JSON string for payment details
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SMM Panel Providers
export const smmProviders = pgTable("smm_providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull(),
  apiEndpoint: text("api_endpoint").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").default("USD"),
  balanceUpdatedAt: timestamp("balance_updated_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// SMM Panel Services
export const smmServices = pgTable("smm_services", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  providerId: integer("provider_id").references(() => smmProviders.id, { onDelete: "cascade" }).notNull(),
  mid: integer("mid").notNull(), // Internal ID 1-10
  name: text("name").notNull(),
  description: text("description"),
  min: integer("min").notNull(),
  max: integer("max").notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  serviceIdApi: text("service_id_api").notNull(), // Original service ID from provider
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// SMM Orders
export const smmOrders = pgTable("smm_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  serviceId: integer("service_id").references(() => smmServices.id, { onDelete: "cascade" }).notNull(),
  providerId: integer("provider_id").references(() => smmProviders.id, { onDelete: "cascade" }).notNull(),
  orderId: text("order_id").unique().notNull(), // Our internal order ID
  providerOrderId: text("provider_order_id"), // Order ID from SMM provider
  transactionId: integer("transaction_id").references(() => transactions.id),
  link: text("link").notNull(), // Target URL/username
  quantity: integer("quantity").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending").notNull(), // pending, processing, completed, failed, cancelled
  paymentStatus: text("payment_status").default("pending").notNull(), // pending, paid, failed
  startCount: integer("start_count"),
  remains: integer("remains"),
  notes: text("notes"),
  errorMessage: text("error_message"), // Error message for failed orders
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});



// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  fullName: true,
});

export const insertBotSchema = createInsertSchema(bots).pick({
  token: true,
});

export const insertKnowledgeSchema = createInsertSchema(knowledge).pick({
  botId: true,
  type: true,
  content: true,
  url: true,
  fileName: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  plan: true,
  amount: true,
  status: true,
  midtransOrderId: true,
  paymentInfo: true,
});

export const insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
});

export const insertSmmProviderSchema = z.object({
  userId: z.number().optional(),
  name: z.string(),
  apiKey: z.string(),
  apiEndpoint: z.string(),
  isActive: z.boolean().optional(),
});

export const insertSmmServiceSchema = createInsertSchema(smmServices).pick({
  userId: true,
  providerId: true,
  mid: true,
  name: true,
  description: true,
  min: true,
  max: true,
  rate: true,
  category: true,
  serviceIdApi: true,
  isActive: true,
});

export const insertSmmOrderSchema = createInsertSchema(smmOrders).pick({
  userId: true,
  serviceId: true,
  providerId: true,
  orderId: true,
  providerOrderId: true,
  transactionId: true,
  link: true,
  quantity: true,
  amount: true,
  status: true,
  paymentStatus: true,
  startCount: true,
  remains: true,
  notes: true,
  errorMessage: true,
});

export const autoBots = pgTable("auto_bots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  botName: text("bot_name").notNull(),
  botUsername: text("bot_username").notNull(),
  welcomeMessage: text("welcome_message").notNull().default("Selamat datang! Silakan pilih opsi di bawah ini:"),
  welcomeImageUrl: text("welcome_image_url"), // URL gambar untuk pesan sambutan
  keyboardConfig: json("keyboard_config").$type<{
    id: string;
    text: string;
    callbackData: string;
    url?: string;
    level?: number;
    parentId?: string;
    responseText?: string; // Teks respons yang dikirim ketika tombol diklik
    isAllShow?: boolean; // Property untuk tombol All Show
  }[]>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// API Keys table for provider functionality
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Changed from key_name to name for production compatibility
  apiKey: text("api_key").notNull().unique(),
  apiEndpoint: text("api_endpoint"),
  balance: decimal("balance", { precision: 15, scale: 7 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  totalRequests: integer("total_requests").notNull().default(0),
  totalOrders: integer("total_orders").notNull().default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).notNull().default("0.00"),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  balanceUpdatedAt: timestamp("balance_updated_at"),
});

// Insert schemas
export const insertAutoBotSchema = createInsertSchema(autoBots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  userId: true,
  name: true,
  apiKey: true,
  isActive: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Bot = typeof bots.$inferSelect;
export type InsertBot = z.infer<typeof insertBotSchema>;
export type Knowledge = typeof knowledge.$inferSelect;
export type InsertKnowledge = z.infer<typeof insertKnowledgeSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type SmmProvider = typeof smmProviders.$inferSelect;
export type InsertSmmProvider = z.infer<typeof insertSmmProviderSchema>;
export type SmmService = typeof smmServices.$inferSelect;
export type InsertSmmService = z.infer<typeof insertSmmServiceSchema>;
export type SmmOrder = typeof smmOrders.$inferSelect;
export type InsertSmmOrder = z.infer<typeof insertSmmOrderSchema>;
export type AutoBot = typeof autoBots.$inferSelect;
export type InsertAutoBot = z.infer<typeof insertAutoBotSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

