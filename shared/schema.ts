import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
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
  type: text("type").notNull(), // text, link, file, product
  content: text("content").notNull(),
  url: text("url"), // for link type
  fileName: text("file_name"), // for file type
  productName: text("product_name"), // for product type
  productPrice: text("product_price"), // for product type
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Bot Builder Tables untuk fitur /builderbotnonai
export const autoBots = pgTable("auto_bots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  botToken: text("bot_token").notNull(),
  botUsername: text("bot_username").notNull(),
  botName: text("bot_name").notNull(),
  botId: text("bot_id").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  webhookUrl: text("webhook_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const botOrders = pgTable("bot_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  botId: integer("bot_id").notNull().references(() => autoBots.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  chatId: text("chat_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, paid, completed, failed
  midtransOrderId: text("midtrans_order_id"),
  midtransSnapToken: text("midtrans_snap_token"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accountStock = pgTable("account_stock", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  password: text("password").notNull(),
  status: text("status").notNull().default("available"), // available, used
  usedBy: integer("used_by").references(() => users.id),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => botOrders.id, { onDelete: "cascade" }),
  midtransOrderId: text("midtrans_order_id").notNull().unique(),
  snapToken: text("snap_token"),
  paymentType: text("payment_type"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, settlement, failed, expired
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  productName: true,
  productPrice: true,
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
});

// Bot Builder Insert Schemas
export const insertAutoBotSchema = createInsertSchema(autoBots).pick({
  userId: true,
  botToken: true,
  botUsername: true,
  botName: true,
  botId: true,
  isActive: true,
  webhookUrl: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  description: true,
  price: true,
  category: true,
  isActive: true,
});

export const insertBotOrderSchema = createInsertSchema(botOrders).pick({
  userId: true,
  botId: true,
  productId: true,
  chatId: true,
  status: true,
  midtransOrderId: true,
  midtransSnapToken: true,
  amount: true,
});

export const insertAccountStockSchema = createInsertSchema(accountStock).pick({
  productId: true,
  email: true,
  password: true,
  status: true,
  usedBy: true,
  usedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  orderId: true,
  midtransOrderId: true,
  snapToken: true,
  paymentType: true,
  amount: true,
  status: true,
  paidAt: true,
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

// Bot Builder Types
export type AutoBot = typeof autoBots.$inferSelect;
export type InsertAutoBot = z.infer<typeof insertAutoBotSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type BotOrder = typeof botOrders.$inferSelect;
export type InsertBotOrder = z.infer<typeof insertBotOrderSchema>;
export type AccountStock = typeof accountStock.$inferSelect;
export type InsertAccountStock = z.infer<typeof insertAccountStockSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

