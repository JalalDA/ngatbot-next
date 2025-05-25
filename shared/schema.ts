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

// ChatBot Builder - Non-AI Bots
export const chatBots = pgTable("chat_bots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  botName: text("bot_name").notNull(),
  botUsername: text("bot_username").notNull(),
  welcomeMessage: text("welcome_message").default("Selamat datang! Pilih menu di bawah ini:"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Menu Items for ChatBot Builder
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  chatBotId: integer("chat_bot_id").notNull().references(() => chatBots.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"), // For sub-menus - self reference added later
  title: text("title").notNull(),
  description: text("description"),
  buttonText: text("button_text").notNull(),
  responseType: text("response_type").notNull(), // text, image, payment, form, submenu
  responseContent: text("response_content"), // Text response or image URL
  price: decimal("price", { precision: 10, scale: 2 }), // For payment items
  order: integer("order").notNull().default(0), // Display order
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Flow Rules for Menu Navigation
export const flowRules = pgTable("flow_rules", {
  id: serial("id").primaryKey(),
  chatBotId: integer("chat_bot_id").notNull().references(() => chatBots.id, { onDelete: "cascade" }),
  fromMenuId: integer("from_menu_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  toMenuId: integer("to_menu_id").references(() => menuItems.id, { onDelete: "cascade" }),
  condition: text("condition"), // Additional conditions if needed
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payment Orders for ChatBot Builder
export const chatBotOrders = pgTable("chat_bot_orders", {
  id: serial("id").primaryKey(),
  chatBotId: integer("chat_bot_id").notNull().references(() => chatBots.id, { onDelete: "cascade" }),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  customerTelegramId: text("customer_telegram_id").notNull(),
  customerName: text("customer_name"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending").notNull(), // pending, paid, expired, cancelled
  qrCodeUrl: text("qr_code_url"),
  midtransOrderId: text("midtrans_order_id").unique(),
  snapToken: text("snap_token"),
  paymentInfo: text("payment_info"), // JSON payment details
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const insertChatBotSchema = z.object({
  token: z.string().min(1, "Bot token is required"),
  welcomeMessage: z.string().optional(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).pick({
  chatBotId: true,
  parentId: true,
  title: true,
  description: true,
  buttonText: true,
  responseType: true,
  responseContent: true,
  price: true,
  order: true,
  isActive: true,
});

export const insertFlowRuleSchema = createInsertSchema(flowRules).pick({
  chatBotId: true,
  fromMenuId: true,
  toMenuId: true,
  condition: true,
  isActive: true,
});

export const insertChatBotOrderSchema = createInsertSchema(chatBotOrders).pick({
  chatBotId: true,
  menuItemId: true,
  customerTelegramId: true,
  customerName: true,
  amount: true,
  status: true,
  qrCodeUrl: true,
  midtransOrderId: true,
  snapToken: true,
  paymentInfo: true,
  expiresAt: true,
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
export type ChatBot = typeof chatBots.$inferSelect;
export type InsertChatBot = z.infer<typeof insertChatBotSchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type FlowRule = typeof flowRules.$inferSelect;
export type InsertFlowRule = z.infer<typeof insertFlowRuleSchema>;
export type ChatBotOrder = typeof chatBotOrders.$inferSelect;
export type InsertChatBotOrder = z.infer<typeof insertChatBotOrderSchema>;
