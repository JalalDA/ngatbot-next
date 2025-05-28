var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/openai.ts
var openai_exports = {};
__export(openai_exports, {
  checkOpenAIConnection: () => checkOpenAIConnection,
  generateBotResponse: () => generateBotResponse,
  validateOpenAIKey: () => validateOpenAIKey
});
import OpenAI from "openai";
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API Key is not configured. Please contact the system administrator.");
  }
  return new OpenAI({ apiKey });
}
async function generateBotResponse(userMessage, knowledgeBase) {
  try {
    const openai = getOpenAIClient();
    const lowerMessage = userMessage.toLowerCase();
    const isGreeting = /^(hai|hay|hello|halo|hi|good|selamat|apa kabar|kamu siapa|siapa kamu|who are you)/.test(lowerMessage);
    let systemPrompt = "";
    let userPrompt = "";
    if (isGreeting) {
      const firstKnowledge = knowledgeBase.split("\n\n")[0] || "";
      systemPrompt = firstKnowledge ? `${firstKnowledge}. Respond naturally to greetings and introduce yourself according to your role. Be warm and helpful.` : "You are a friendly AI assistant. Respond naturally to greetings and introduce yourself briefly. Be warm and helpful.";
      userPrompt = `User said: "${userMessage}". Please respond naturally according to your role.`;
    } else {
      systemPrompt = `You are a helpful AI assistant. Use the provided knowledge base to understand your role and respond accordingly.

Instructions:
- The first item in the knowledge base defines your role and identity - ALWAYS follow this role
- For general questions, answer naturally based on your role and training
- For SMM-related questions, use the knowledge base to provide specific service details
- Always be helpful and accurate
- If knowledge base contains SMM services, format them clearly with IDs and pricing`;
      userPrompt = `Knowledge Base:
${knowledgeBase}

User Message: ${userMessage}

Please provide a helpful and relevant response according to your role and the knowledge base:`;
    }
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response at the moment.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response");
  }
}
async function validateOpenAIKey(apiKey) {
  try {
    const testClient = new OpenAI({ apiKey });
    await testClient.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 1
    });
    return true;
  } catch (error) {
    return false;
  }
}
async function checkOpenAIConnection() {
  try {
    const openai = getOpenAIClient();
    await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 1
    });
    return true;
  } catch (error) {
    return false;
  }
}
var init_openai = __esm({
  "server/openai.ts"() {
    "use strict";
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  autoBots: () => autoBots,
  bots: () => bots,
  insertAutoBotSchema: () => insertAutoBotSchema,
  insertBotSchema: () => insertBotSchema,
  insertKnowledgeSchema: () => insertKnowledgeSchema,
  insertSettingSchema: () => insertSettingSchema,
  insertSmmOrderSchema: () => insertSmmOrderSchema,
  insertSmmProviderSchema: () => insertSmmProviderSchema,
  insertSmmServiceSchema: () => insertSmmServiceSchema,
  insertTransactionSchema: () => insertTransactionSchema,
  insertUserSchema: () => insertUserSchema,
  knowledge: () => knowledge,
  settings: () => settings,
  smmOrders: () => smmOrders,
  smmProviders: () => smmProviders,
  smmServices: () => smmServices,
  transactions: () => transactions,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"),
  // user, admin
  level: text("level").notNull().default("basic"),
  // basic, pro, business
  credits: integer("credits").notNull().default(250),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  botName: text("bot_name").notNull(),
  botUsername: text("bot_username").notNull(),
  systemPrompt: text("system_prompt").default("You are a helpful assistant that can answer questions and provide information."),
  isActive: boolean("is_active").notNull().default(true),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var knowledge = pgTable("knowledge", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  // text, link, file
  content: text("content").notNull(),
  url: text("url"),
  // for link type
  fileName: text("file_name"),
  // for file type
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(),
  // pro, business
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  // pending, success, failed
  midtransOrderId: text("midtrans_order_id").unique(),
  snapToken: text("snap_token"),
  paymentInfo: text("payment_info"),
  // JSON string for payment details
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var smmProviders = pgTable("smm_providers", {
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
var smmServices = pgTable("smm_services", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  providerId: integer("provider_id").references(() => smmProviders.id, { onDelete: "cascade" }).notNull(),
  mid: integer("mid").notNull(),
  // Internal ID 1-10
  name: text("name").notNull(),
  description: text("description"),
  min: integer("min").notNull(),
  max: integer("max").notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  serviceIdApi: text("service_id_api").notNull(),
  // Original service ID from provider
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var smmOrders = pgTable("smm_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  serviceId: integer("service_id").references(() => smmServices.id, { onDelete: "cascade" }).notNull(),
  providerId: integer("provider_id").references(() => smmProviders.id, { onDelete: "cascade" }).notNull(),
  orderId: text("order_id").unique().notNull(),
  // Our internal order ID
  providerOrderId: text("provider_order_id"),
  // Order ID from SMM provider
  transactionId: integer("transaction_id").references(() => transactions.id),
  link: text("link").notNull(),
  // Target URL/username
  quantity: integer("quantity").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending").notNull(),
  // pending, processing, completed, failed, cancelled
  paymentStatus: text("payment_status").default("pending").notNull(),
  // pending, paid, failed
  startCount: integer("start_count"),
  remains: integer("remains"),
  notes: text("notes"),
  errorMessage: text("error_message"),
  // Error message for failed orders
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  fullName: true
});
var insertBotSchema = createInsertSchema(bots).pick({
  token: true
});
var insertKnowledgeSchema = createInsertSchema(knowledge).pick({
  botId: true,
  type: true,
  content: true,
  url: true,
  fileName: true
});
var insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  plan: true,
  amount: true,
  status: true,
  midtransOrderId: true,
  paymentInfo: true
});
var insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true
});
var insertSmmProviderSchema = z.object({
  userId: z.number().optional(),
  name: z.string(),
  apiKey: z.string(),
  apiEndpoint: z.string(),
  isActive: z.boolean().optional()
});
var insertSmmServiceSchema = createInsertSchema(smmServices).pick({
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
  isActive: true
});
var insertSmmOrderSchema = createInsertSchema(smmOrders).pick({
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
  errorMessage: true
});
var autoBots = pgTable("auto_bots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  botName: text("bot_name").notNull(),
  botUsername: text("bot_username").notNull(),
  welcomeMessage: text("welcome_message").notNull().default("Selamat datang! Silakan pilih opsi di bawah ini:"),
  welcomeImageUrl: text("welcome_image_url"),
  // URL gambar untuk pesan sambutan
  keyboardConfig: json("keyboard_config").$type(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertAutoBotSchema = createInsertSchema(autoBots).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/storage.ts
import session from "express-session";

// server/db.ts
import dotenv from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
dotenv.config();
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc } from "drizzle-orm";
import connectPg from "connect-pg-simple";
var PostgresSessionStore = connectPg(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  // User methods
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values({
      ...insertUser,
      role: "user",
      level: "basic",
      credits: 250
    }).returning();
    return user;
  }
  async updateUser(id, updates) {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || void 0;
  }
  async deleteUser(id) {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }
  async getAllUsers() {
    return await db.select().from(users);
  }
  // Bot methods
  async getBot(id) {
    const [bot] = await db.select().from(bots).where(eq(bots.id, id));
    return bot || void 0;
  }
  async getBotsByUserId(userId) {
    return await db.select().from(bots).where(eq(bots.userId, userId));
  }
  async getBotByToken(token) {
    const [bot] = await db.select().from(bots).where(eq(bots.token, token));
    return bot || void 0;
  }
  async createBot(botData) {
    const [bot] = await db.insert(bots).values({
      userId: botData.userId,
      token: botData.token,
      botName: botData.botName,
      botUsername: botData.botUsername,
      isActive: true,
      messageCount: 0
    }).returning();
    return bot;
  }
  async updateBot(id, updates) {
    const [bot] = await db.update(bots).set(updates).where(eq(bots.id, id)).returning();
    return bot || void 0;
  }
  async deleteBot(id) {
    const result = await db.delete(bots).where(eq(bots.id, id));
    return (result.rowCount || 0) > 0;
  }
  async getAllBots() {
    return await db.select().from(bots);
  }
  // Knowledge methods
  async getKnowledge(id) {
    const [knowledgeItem] = await db.select().from(knowledge).where(eq(knowledge.id, id));
    return knowledgeItem || void 0;
  }
  async getKnowledgeByBotId(botId) {
    return await db.select().from(knowledge).where(eq(knowledge.botId, botId));
  }
  async createKnowledge(insertKnowledge) {
    const [knowledgeItem] = await db.insert(knowledge).values(insertKnowledge).returning();
    return knowledgeItem;
  }
  async updateKnowledge(id, updates) {
    const [knowledgeItem] = await db.update(knowledge).set(updates).where(eq(knowledge.id, id)).returning();
    return knowledgeItem || void 0;
  }
  async deleteKnowledge(id) {
    const result = await db.delete(knowledge).where(eq(knowledge.id, id));
    return (result.rowCount || 0) > 0;
  }
  // Transaction methods
  async getTransaction(id) {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || void 0;
  }
  async getTransactionsByUserId(userId) {
    return await db.select().from(transactions).where(eq(transactions.userId, userId));
  }
  async getTransactionByOrderId(orderId) {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.midtransOrderId, orderId));
    return transaction || void 0;
  }
  async createTransaction(insertTransaction) {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }
  async updateTransaction(id, updates) {
    const [transaction] = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return transaction || void 0;
  }
  // Settings methods
  async getSetting(key) {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || void 0;
  }
  async setSetting(insertSetting) {
    const [setting] = await db.insert(settings).values(insertSetting).returning();
    return setting;
  }
  async updateSetting(key, value) {
    const [setting] = await db.update(settings).set({ value, updatedAt: /* @__PURE__ */ new Date() }).where(eq(settings.key, key)).returning();
    return setting || void 0;
  }
  // SMM Provider methods
  async getSmmProvider(id) {
    const [provider] = await db.select().from(smmProviders).where(eq(smmProviders.id, id));
    return provider || void 0;
  }
  async getSmmProvidersByUserId(userId) {
    return await db.select().from(smmProviders).where(eq(smmProviders.userId, userId));
  }
  async createSmmProvider(insertProvider) {
    const [provider] = await db.insert(smmProviders).values(insertProvider).returning();
    return provider;
  }
  async updateSmmProvider(id, updates) {
    const [provider] = await db.update(smmProviders).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(smmProviders.id, id)).returning();
    return provider || void 0;
  }
  async deleteSmmProvider(id) {
    const result = await db.delete(smmProviders).where(eq(smmProviders.id, id));
    return (result.rowCount || 0) > 0;
  }
  // SMM Service methods
  async getSmmService(id) {
    const [service] = await db.select().from(smmServices).where(eq(smmServices.id, id));
    return service || void 0;
  }
  async getSmmServicesByUserId(userId) {
    return await db.select().from(smmServices).where(eq(smmServices.userId, userId));
  }
  async getSmmServicesByProviderId(providerId) {
    return await db.select().from(smmServices).where(eq(smmServices.providerId, providerId));
  }
  async getSmmServiceByMid(userId, mid) {
    const [service] = await db.select().from(smmServices).where(eq(smmServices.userId, userId) && eq(smmServices.mid, mid));
    return service || void 0;
  }
  async createSmmService(insertService) {
    const [service] = await db.insert(smmServices).values(insertService).returning();
    return service;
  }
  async updateSmmService(id, updates) {
    const [service] = await db.update(smmServices).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(smmServices.id, id)).returning();
    return service || void 0;
  }
  async deleteSmmService(id) {
    const result = await db.delete(smmServices).where(eq(smmServices.id, id));
    return result.rowCount > 0;
  }
  async getUsedMids(userId) {
    const services = await db.select({ mid: smmServices.mid }).from(smmServices).where(eq(smmServices.userId, userId));
    return services.map((s) => s.mid);
  }
  // SMM Order methods
  async getSmmOrder(id) {
    const [order] = await db.select().from(smmOrders).where(eq(smmOrders.id, id));
    return order || void 0;
  }
  async getSmmOrderByOrderId(orderId) {
    const [order] = await db.select().from(smmOrders).where(eq(smmOrders.orderId, orderId));
    return order || void 0;
  }
  async getSmmOrdersByUserId(userId, limit, offset) {
    const baseQuery = db.select({
      id: smmOrders.id,
      userId: smmOrders.userId,
      serviceId: smmOrders.serviceId,
      providerId: smmOrders.providerId,
      orderId: smmOrders.orderId,
      providerOrderId: smmOrders.providerOrderId,
      transactionId: smmOrders.transactionId,
      link: smmOrders.link,
      quantity: smmOrders.quantity,
      amount: smmOrders.amount,
      status: smmOrders.status,
      paymentStatus: smmOrders.paymentStatus,
      startCount: smmOrders.startCount,
      remains: smmOrders.remains,
      notes: smmOrders.notes,
      errorMessage: smmOrders.errorMessage,
      createdAt: smmOrders.createdAt,
      updatedAt: smmOrders.updatedAt,
      // Join service information with aliases
      serviceName: smmServices.name,
      serviceCategory: smmServices.category,
      serviceRate: smmServices.rate,
      serviceMid: smmServices.mid,
      // Join provider information
      providerName: smmProviders.name
    }).from(smmOrders).innerJoin(smmServices, eq(smmOrders.serviceId, smmServices.id)).innerJoin(smmProviders, eq(smmOrders.providerId, smmProviders.id)).where(eq(smmOrders.userId, userId)).orderBy(desc(smmOrders.createdAt));
    let results;
    if (limit && offset !== void 0) {
      results = await baseQuery.limit(limit).offset(offset);
    } else if (limit) {
      results = await baseQuery.limit(limit);
    } else {
      results = await baseQuery;
    }
    return results.map((row) => ({
      ...row,
      service: {
        name: row.serviceName,
        category: row.serviceCategory,
        rate: row.serviceRate,
        mid: row.serviceMid
      },
      provider: {
        name: row.providerName
      }
    }));
  }
  async createSmmOrder(insertOrder) {
    const [order] = await db.insert(smmOrders).values(insertOrder).returning();
    return order;
  }
  async updateSmmOrder(id, updates) {
    const [order] = await db.update(smmOrders).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(smmOrders.id, id)).returning();
    return order || void 0;
  }
  // Auto Bot management
  async createAutoBot(insertAutoBot) {
    const [autoBot] = await db.insert(autoBots).values(insertAutoBot).returning();
    return autoBot;
  }
  async getAutoBot(id) {
    const [autoBot] = await db.select().from(autoBots).where(eq(autoBots.id, id));
    return autoBot;
  }
  async getAutoBotsByUserId(userId) {
    return await db.select().from(autoBots).where(eq(autoBots.userId, userId)).orderBy(desc(autoBots.createdAt));
  }
  async updateAutoBot(id, updates) {
    const [autoBot] = await db.update(autoBots).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(autoBots.id, id)).returning();
    return autoBot;
  }
  async deleteAutoBot(id) {
    const result = await db.delete(autoBots).where(eq(autoBots.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  async getAllAutoBots() {
    return await db.select().from(autoBots).orderBy(desc(autoBots.createdAt));
  }
  async getAutoBotByToken(token) {
    const [autoBot] = await db.select().from(autoBots).where(eq(autoBots.token, token));
    return autoBot;
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !await comparePasswords(password, user.password)) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });
  app2.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }
    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password)
    });
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// server/telegram.ts
import TelegramBot from "node-telegram-bot-api";
init_openai();
var TelegramBotManager = class {
  activeBots = /* @__PURE__ */ new Map();
  async validateBotToken(token) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      if (data.ok) {
        return { valid: true, botInfo: data.result };
      } else {
        return { valid: false };
      }
    } catch (error) {
      console.error("Telegram API validation error:", error);
      return { valid: false };
    }
  }
  async startBot(token, botId) {
    try {
      if (this.activeBots.has(token)) {
        return;
      }
      const bot = new TelegramBot(token, { polling: true });
      this.activeBots.set(token, { bot, botId });
      bot.on("message", async (msg) => {
        await this.handleMessage(msg, botId);
      });
      bot.on("polling_error", (error) => {
        console.error(`Polling error for bot ${botId}:`, error);
      });
      console.log(`Bot ${botId} started successfully`);
    } catch (error) {
      console.error(`Failed to start bot ${botId}:`, error);
      throw error;
    }
  }
  async stopBot(token) {
    const botInstance = this.activeBots.get(token);
    if (botInstance) {
      try {
        await botInstance.bot.stopPolling();
        this.activeBots.delete(token);
        console.log(`Bot ${botInstance.botId} stopped successfully`);
      } catch (error) {
        console.error(`Error stopping bot ${botInstance.botId}:`, error);
      }
    }
  }
  async handleMessage(msg, botId) {
    try {
      if (!msg.text) return;
      const bot = await storage.getBot(botId);
      if (!bot || !bot.isActive) return;
      const user = await storage.getUser(bot.userId);
      if (!user || user.credits <= 0) {
        const botInstance2 = this.activeBots.get(bot.token);
        if (botInstance2) {
          await botInstance2.bot.sendMessage(msg.chat.id, "Sorry, this bot is temporarily unavailable due to insufficient credits.");
        }
        return;
      }
      const knowledgeItems = await storage.getKnowledgeByBotId(botId);
      const baseKnowledge = knowledgeItems.map((item) => {
        switch (item.type) {
          case "text":
            return item.content;
          case "link":
            return `Website: ${item.url}
Content: ${item.content}`;
          case "product":
            return `Product: ${item.productName}
Description: ${item.content}
Price: ${item.productPrice}`;
          case "file":
            return `File: ${item.fileName}
Content: ${item.content}`;
          default:
            return item.content;
        }
      }).join("\n\n");
      const userMessage = msg.text.toLowerCase();
      const isSmmQuery = userMessage.includes("service") || userMessage.includes("smm") || userMessage.includes("layanan") || userMessage.includes("harga") || userMessage.includes("price") || userMessage.includes("youtube") || userMessage.includes("instagram") || userMessage.includes("tiktok") || userMessage.includes("followers") || userMessage.includes("views") || userMessage.includes("likes") || userMessage.includes("order") || userMessage.includes("beli") || userMessage.includes("daftar") || userMessage.includes("list") || userMessage.includes("id ") || /^id\s*\d+/.test(userMessage);
      let knowledgeBase = baseKnowledge;
      if (isSmmQuery) {
        const smmServices2 = await storage.getSmmServicesByUserId(bot.userId);
        const smmKnowledge = smmServices2.filter((service) => service.isActive).map(
          (service) => `ID ${service.mid}: ${service.name} - Min: ${service.min}, Max: ${service.max}, Rate: Rp ${service.rate}/1000${service.description ? ` - ${service.description}` : ""}`
        ).join("\n");
        if (smmKnowledge) {
          knowledgeBase = [
            baseKnowledge,
            `

SMM Panel Services Available:
${smmKnowledge}`
          ].filter(Boolean).join("\n\n");
        }
      }
      const aiResponse = await generateBotResponse(msg.text, knowledgeBase);
      const botInstance = this.activeBots.get(bot.token);
      if (botInstance) {
        await botInstance.bot.sendMessage(msg.chat.id, aiResponse);
      }
      await storage.updateBot(botId, {
        messageCount: bot.messageCount + 1
      });
      await storage.updateUser(user.id, {
        credits: user.credits - 1
      });
    } catch (error) {
      console.error("Error handling message:", error);
      const bot = await storage.getBot(botId);
      if (bot) {
        const botInstance = this.activeBots.get(bot.token);
        if (botInstance) {
          await botInstance.bot.sendMessage(msg.chat.id, "Sorry, I encountered an error processing your message. Please try again later.");
        }
      }
    }
  }
  async restartAllBots() {
    try {
      const allBots = await storage.getAllBots();
      for (const bot of allBots) {
        if (bot.isActive) {
          await this.startBot(bot.token, bot.id);
        }
      }
    } catch (error) {
      console.error("Error restarting bots:", error);
    }
  }
};
var telegramBotManager = new TelegramBotManager();

// server/midtrans.ts
import pkg from "midtrans-client";
import crypto from "crypto";
var { Snap, CoreApi } = pkg;
function validateMidtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;
  const merchantId = process.env.MIDTRANS_MERCHANT_ID;
  if (!serverKey || !clientKey || !merchantId) {
    throw new Error("Midtrans configuration incomplete. Please check your API keys.");
  }
  if (!serverKey.startsWith("SB-Mid-server-") && !serverKey.startsWith("Mid-server-")) {
    throw new Error("Invalid Midtrans Server Key format");
  }
  if (!clientKey.startsWith("SB-Mid-client-") && !clientKey.startsWith("Mid-client-")) {
    throw new Error("Invalid Midtrans Client Key format");
  }
  console.log("Midtrans configuration validated successfully");
  console.log("Server Key:", serverKey.substring(0, 20) + "...");
  console.log("Client Key:", clientKey.substring(0, 20) + "...");
  console.log("Merchant ID:", merchantId);
}
validateMidtransConfig();
var snap = new Snap({
  isProduction: false,
  // Set to true for production
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});
var coreApi = new CoreApi({
  isProduction: false,
  // Set to true for production
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});
var UPGRADE_PLANS = {
  pro: {
    name: "Paket PRO",
    price: 299e3,
    credits: 1e4,
    level: "pro"
  },
  business: {
    name: "Paket BISNIS",
    price: 55e4,
    credits: 2e4,
    level: "business"
  }
};
async function createMidtransTransaction(params) {
  const { orderId, userId, userName, userEmail, plan } = params;
  const planConfig = UPGRADE_PLANS[plan];
  if (!planConfig) {
    throw new Error("Invalid plan selected");
  }
  const transactionDetails = {
    order_id: orderId,
    gross_amount: planConfig.price
  };
  const itemDetails = [
    {
      id: plan,
      name: `Paket ${planConfig.name}`,
      quantity: 1,
      price: planConfig.price
    }
  ];
  const customerDetails = {
    first_name: userName,
    email: userEmail
  };
  const creditCards = {
    secure: true
  };
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: planConfig.price
    },
    customer_details: {
      first_name: userName.replace(/[^a-zA-Z0-9\s]/g, "").trim(),
      email: userEmail
    }
  };
  console.log("Midtrans parameter:", JSON.stringify(parameter, null, 2));
  try {
    const transaction = await snap.createTransaction(parameter);
    console.log("Midtrans transaction created successfully:", transaction.token);
    return {
      token: transaction.token,
      redirectUrl: transaction.redirect_url
    };
  } catch (error) {
    console.error("Midtrans transaction creation error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    throw new Error(`Failed to create payment transaction: ${error.message || error}`);
  }
}
async function getTransactionStatus(orderId) {
  try {
    const statusResponse = await coreApi.transaction.status(orderId);
    return statusResponse;
  } catch (error) {
    console.error("Failed to get transaction status:", error);
    throw new Error("Failed to get transaction status");
  }
}
function verifySignatureKey(orderId, statusCode, grossAmount, signatureKey) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const hash = crypto.createHash("sha512").update(orderId + statusCode + grossAmount + serverKey).digest("hex");
  return hash === signatureKey;
}
function generateOrderId(userId, plan) {
  const timestamp2 = Date.now().toString();
  return `TXN${timestamp2.slice(-6)}${userId}`;
}

// server/smm-panel.ts
import axios from "axios";
var SmmPanelAPI = class {
  apiKey;
  apiEndpoint;
  constructor(apiKey, apiEndpoint) {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
  }
  // Get balance from SMM Panel
  async getBalance() {
    try {
      console.log(`\u{1F4B0} Fetching balance from ${this.apiEndpoint}`);
      const url = `${this.apiEndpoint}?action=balance&key=${this.apiKey}`;
      const response = await axios.get(url, {
        timeout: 3e4
      });
      if (response.data) {
        let balance = 0;
        let currency = "USD";
        if (typeof response.data === "object") {
          balance = parseFloat(response.data.balance || response.data.amount || 0);
          currency = response.data.currency || "USD";
        } else if (typeof response.data === "string" || typeof response.data === "number") {
          balance = parseFloat(response.data.toString());
        }
        console.log(`\u2705 Successfully fetched balance: ${balance} ${currency}`);
        return { balance, currency };
      } else {
        throw new Error("Invalid response format from SMM Panel");
      }
    } catch (error) {
      console.error("\u274C Error fetching balance from SMM Panel:", error.message);
      return { balance: 0, currency: "USD" };
    }
  }
  // Get services from SMM Panel
  async getServices() {
    try {
      console.log(`\u{1F50D} Fetching services from ${this.apiEndpoint}`);
      const url = `${this.apiEndpoint}?action=services&key=${this.apiKey}`;
      const response = await axios.get(url, {
        timeout: 3e4
      });
      if (response.data && Array.isArray(response.data)) {
        console.log(`\u2705 Successfully fetched ${response.data.length} services`);
        return response.data;
      } else {
        throw new Error("Invalid response format from SMM Panel");
      }
    } catch (error) {
      console.error("\u274C Error fetching services from SMM Panel:", error.message);
      throw new Error(`Failed to fetch services: ${error.message}`);
    }
  }
  // Create order in SMM Panel
  async createOrder(serviceId, link, quantity) {
    try {
      console.log(`\u{1F4DD} Creating order - Service: ${serviceId}, Link: ${link}, Quantity: ${quantity}`);
      const formData = new URLSearchParams({
        key: this.apiKey,
        action: "add",
        service: serviceId,
        link,
        quantity: quantity.toString()
      });
      const response = await axios.post(this.apiEndpoint, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 3e4
      });
      if (response.data) {
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        console.log(`\u2705 Order created successfully: ${response.data.order || response.data}`);
        return {
          order: response.data.order || response.data.toString(),
          error: response.data.error
        };
      } else {
        throw new Error("Invalid response from SMM Panel");
      }
    } catch (error) {
      console.error("\u274C Error creating order in SMM Panel:", error.message);
      if (error.response?.status === 404 || error.code === "ECONNREFUSED") {
        try {
          console.log(`\u{1F504} Retrying with GET method...`);
          const url = `${this.apiEndpoint}?key=${this.apiKey}&action=add&service=${serviceId}&link=${encodeURIComponent(link)}&quantity=${quantity}`;
          const getResponse = await axios.get(url, { timeout: 3e4 });
          if (getResponse.data) {
            if (getResponse.data.error) {
              throw new Error(getResponse.data.error);
            }
            console.log(`\u2705 Order created successfully with GET: ${getResponse.data.order || getResponse.data}`);
            return {
              order: getResponse.data.order || getResponse.data.toString(),
              error: getResponse.data.error
            };
          }
        } catch (getError) {
          console.error("\u274C GET method also failed:", getError.message);
          throw new Error(`Failed to create order: ${error.message}. GET fallback also failed: ${getError.message}`);
        }
      }
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }
  // Get order status from SMM Panel
  async getOrderStatus(orderId) {
    try {
      console.log(`\u{1F50D} Checking order status for: ${orderId}`);
      const formData = new URLSearchParams({
        key: this.apiKey,
        action: "status",
        order: orderId
      });
      const response = await axios.post(this.apiEndpoint, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 3e4
      });
      if (response.data) {
        console.log(`\u2705 Order status retrieved: ${response.data.status}`);
        return response.data;
      } else {
        throw new Error("Invalid response from SMM Panel");
      }
    } catch (error) {
      console.error("\u274C Error checking order status:", error.message);
      if (error.response?.status === 404 || error.code === "ECONNREFUSED") {
        try {
          console.log(`\u{1F504} Retrying status check with GET method...`);
          const url = `${this.apiEndpoint}?key=${this.apiKey}&action=status&order=${orderId}`;
          const getResponse = await axios.get(url, { timeout: 3e4 });
          if (getResponse.data) {
            console.log(`\u2705 Order status retrieved with GET: ${getResponse.data.status}`);
            return getResponse.data;
          }
        } catch (getError) {
          console.error("\u274C GET method also failed for status check:", getError.message);
        }
      }
      throw new Error(`Failed to check order status: ${error.message}`);
    }
  }
  // Test API connection
  async testConnection() {
    try {
      console.log(`\u{1F9EA} Testing connection to ${this.apiEndpoint}`);
      const response = await axios.post(this.apiEndpoint, {
        key: this.apiKey,
        action: "balance"
      }, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 1e4
      });
      if (response.data && typeof response.data.balance !== "undefined") {
        console.log(`\u2705 Connection successful! Balance: $${response.data.balance}`);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("\u274C Connection test failed:", error.message);
      return false;
    }
  }
};
function generateMid(existingMids) {
  for (let i = 1; i <= 10; i++) {
    if (!existingMids.includes(i)) {
      return i;
    }
  }
  return 1;
}
function parseRate(rate) {
  const numericRate = parseFloat(rate);
  return isNaN(numericRate) ? 0 : numericRate;
}

// server/auto-bot.ts
import TelegramBot2 from "node-telegram-bot-api";
var AutoBotManager = class {
  activeBots = /* @__PURE__ */ new Map();
  /**
   * Validate bot token by calling Telegram getMe API
   */
  async validateBotToken(token) {
    try {
      console.log("\u{1F916} Validating bot token...");
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
        method: "GET"
      });
      console.log(`\u{1F4E1} Response status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("\u274C HTTP error response:", errorText);
        return {
          valid: false,
          error: `HTTP ${response.status}: Token tidak valid atau kadaluarsa`
        };
      }
      const responseText = await response.text();
      console.log("\u{1F4DC} Raw response:", responseText.substring(0, 200) + "...");
      if (responseText.startsWith("<!DOCTYPE") || responseText.startsWith("<html")) {
        console.error("\u274C Received HTML response instead of JSON");
        return {
          valid: false,
          error: "Token bot tidak valid atau ada masalah dengan koneksi ke Telegram API"
        };
      }
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("\u274C JSON parse error:", parseError);
        console.error("\u{1F4C4} Response text that failed to parse:", responseText);
        return {
          valid: false,
          error: "Format response dari Telegram API tidak valid. Pastikan token bot benar."
        };
      }
      if (data.ok && data.result) {
        console.log("\u2705 Token validation successful:", data.result.username);
        return {
          valid: true,
          botInfo: data.result
        };
      } else {
        console.error("\u274C Telegram API error:", data);
        return {
          valid: false,
          error: data.description || "Token bot tidak valid"
        };
      }
    } catch (error) {
      console.error("\u274C Token validation error:", error);
      return {
        valid: false,
        error: "Gagal memvalidasi token: " + (error.message || "Unknown error")
      };
    }
  }
  /**
   * Start auto bot with inline keyboard configuration
   */
  async startAutoBot(autoBot) {
    try {
      if (this.activeBots.has(autoBot.token)) {
        await this.stopAutoBot(autoBot.token);
      }
      const bot = new TelegramBot2(autoBot.token, { polling: true });
      this.activeBots.set(autoBot.token, { bot, config: autoBot });
      bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const welcomeMessage = autoBot.welcomeMessage || "Selamat datang! Silakan pilih opsi di bawah ini:";
        const welcomeImageUrl = autoBot.welcomeImageUrl;
        const mainMenuButtons = (autoBot.keyboardConfig || []).filter(
          (btn) => (!btn.level || btn.level === 0) && !btn.isAllShow
        );
        const allShowButton = (autoBot.keyboardConfig || []).find((btn) => btn.isAllShow);
        const buttonsToShow = [...mainMenuButtons];
        if (allShowButton) {
          const existingButton = mainMenuButtons.find((btn) => btn.text === allShowButton.text);
          if (!existingButton) {
            buttonsToShow.push({
              id: "all_show_button",
              text: allShowButton.text || "\u{1F4CB} Lihat Semua Menu",
              callbackData: "show_all_menus",
              level: 0
            });
          }
        }
        const keyboard = this.createInlineKeyboard(buttonsToShow);
        try {
          if (welcomeImageUrl && welcomeImageUrl.trim()) {
            bot.sendPhoto(chatId, welcomeImageUrl, {
              caption: welcomeMessage,
              reply_markup: keyboard,
              parse_mode: "Markdown"
            }).catch((imageError) => {
              bot.sendMessage(chatId, welcomeMessage, {
                reply_markup: keyboard,
                parse_mode: "Markdown"
              }).catch(() => {
              });
            });
          } else {
            bot.sendMessage(chatId, welcomeMessage, {
              reply_markup: keyboard,
              parse_mode: "Markdown"
            }).catch(() => {
            });
          }
        } catch (error) {
          bot.sendMessage(chatId, welcomeMessage, {
            reply_markup: keyboard
          }).catch(() => {
          });
        }
      });
      bot.on("callback_query", async (callbackQuery) => {
        const msg = callbackQuery.message;
        const data = callbackQuery.data;
        if (msg && data) {
          const chatId = msg.chat.id;
          console.log(`\u{1F3AF} BOT ${autoBot.botName} - Callback received: "${data}" from chat ${chatId}`);
          console.log(`\u{1F4CB} ALL KEYBOARD CONFIG:`, JSON.stringify(autoBot.keyboardConfig, null, 2));
          if (data === "back_to_main") {
            console.log(`\u{1F3E0} Handling Menu Utama button`);
            const mainMenuButtons = (autoBot.keyboardConfig || []).filter(
              (btn) => (!btn.level || btn.level === 0) && !btn.isAllShow
            );
            const keyboard = this.createInlineKeyboard(mainMenuButtons);
            bot.deleteMessage(chatId, msg.message_id).catch(() => {
            });
            bot.sendMessage(chatId, autoBot.welcomeMessage || "Selamat datang! Silakan pilih opsi di bawah ini:", {
              reply_markup: keyboard,
              parse_mode: "Markdown"
            });
            return;
          }
          if (data === "show_all_menus" || data === "all_show") {
            console.log(`\u{1F4CB} Handling All Show button`);
            const allShowMessage = this.createAllShowMessage(autoBot.keyboardConfig || []);
            const keyboard = this.createAllShowKeyboard(autoBot.keyboardConfig || []);
            try {
              await bot.editMessageText(allShowMessage, {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: keyboard,
                parse_mode: "Markdown"
              });
            } catch (error) {
              console.log(`\u26A0\uFE0F Edit failed, using delete + send approach:`, error.message);
              bot.deleteMessage(chatId, msg.message_id).catch(() => {
              });
              await bot.sendMessage(chatId, allShowMessage, {
                reply_markup: keyboard,
                parse_mode: "Markdown"
              });
            }
            return;
          }
          const pressedButton = autoBot.keyboardConfig?.find((btn) => btn.callbackData === data);
          console.log(`\u{1F50D} Button search result:`, pressedButton ? `Found: "${pressedButton.text}" (ID: ${pressedButton.id}, Level: ${pressedButton.level}, ParentID: ${pressedButton.parentId})` : "NOT FOUND");
          if (!pressedButton) {
            console.log(`\u274C No button found for callback data: "${data}"`);
            console.log(`\u{1F4CB} Available buttons:`, autoBot.keyboardConfig?.map((btn) => `"${btn.text}" -> "${btn.callbackData}"`));
            return;
          }
          bot.answerCallbackQuery(callbackQuery.id).catch(() => {
          });
          if (pressedButton) {
            try {
              if (!pressedButton.level || pressedButton.level === 0) {
                const subMenus = (autoBot.keyboardConfig || []).filter(
                  (btn) => btn.level === 1 && btn.parentId === pressedButton.id
                );
                if (subMenus.length > 0) {
                  const allShowButton = (autoBot.keyboardConfig || []).find((btn) => btn.isAllShow);
                  const navigationButtons = [];
                  navigationButtons.push({
                    id: "home_sub_level",
                    text: "\u{1F3E0} Menu Utama",
                    callbackData: "back_to_main",
                    level: 1
                  });
                  if (allShowButton) {
                    navigationButtons.push({
                      id: "all_show_sub_level",
                      text: allShowButton.text || "\u{1F4CB} Lihat Semua Menu",
                      callbackData: "show_all_menus",
                      level: 1
                    });
                  }
                  const subMenusWithNavigation = [
                    ...subMenus,
                    ...navigationButtons
                  ];
                  const subMenuKeyboard = this.createInlineKeyboard(subMenusWithNavigation);
                  const menuText = pressedButton.responseText || `\u{1F4CB} Menu ${pressedButton.text}:`;
                  try {
                    await bot.deleteMessage(chatId, msg.message_id);
                  } catch (deleteError) {
                    console.log("Could not delete message, continuing...");
                  }
                  const buttonWithImage = pressedButton;
                  if (buttonWithImage.responseImage && buttonWithImage.responseImage.trim()) {
                    await bot.sendPhoto(chatId, buttonWithImage.responseImage, {
                      caption: menuText,
                      parse_mode: "Markdown",
                      reply_markup: subMenuKeyboard
                    });
                  } else {
                    await bot.sendMessage(chatId, menuText, {
                      reply_markup: subMenuKeyboard,
                      parse_mode: "Markdown"
                    });
                  }
                } else {
                  const responseText = pressedButton.responseText || `Anda memilih: ${pressedButton.text}`;
                  const backButton = this.createHomeButton("response");
                  const responseKeyboard = this.createInlineKeyboard([backButton]);
                  try {
                    await bot.deleteMessage(chatId, msg.message_id);
                  } catch (deleteError) {
                    console.log("Could not delete message, continuing...");
                  }
                  const buttonWithImage = pressedButton;
                  if (buttonWithImage.responseImage && buttonWithImage.responseImage.trim()) {
                    await bot.sendPhoto(chatId, buttonWithImage.responseImage, {
                      caption: responseText,
                      parse_mode: "Markdown",
                      reply_markup: responseKeyboard
                    });
                  } else {
                    await bot.sendMessage(chatId, responseText, {
                      reply_markup: responseKeyboard,
                      parse_mode: "Markdown"
                    });
                  }
                }
              } else {
                const currentLevel = pressedButton.level || 0;
                console.log(`\u{1F50D} Button pressed: "${pressedButton.text}" (ID: ${pressedButton.id}, Level: ${currentLevel})`);
                console.log(`\u{1F50D} Looking for child menus with level ${currentLevel + 1} and parentId: ${pressedButton.id}`);
                const childMenus = (autoBot.keyboardConfig || []).filter((btn) => {
                  const isCorrectLevel = btn.level === currentLevel + 1;
                  const exactParentMatch = btn.parentId === pressedButton.id;
                  const stringParentMatch = String(btn.parentId) === String(pressedButton.id);
                  const parentTextMatch = btn.parentId === pressedButton.text;
                  const hasMatchingParent = exactParentMatch || stringParentMatch || parentTextMatch;
                  console.log(`\u{1F50D} Checking button "${btn.text}": Level ${btn.level} (need ${currentLevel + 1}), ParentID "${btn.parentId}" (need "${pressedButton.id}") \u2192 Level Match: ${isCorrectLevel}, Parent Match: ${hasMatchingParent} (exact: ${exactParentMatch}, string: ${stringParentMatch}, text: ${parentTextMatch})`);
                  return isCorrectLevel && hasMatchingParent;
                });
                console.log(`\u{1F50D} Found ${childMenus.length} child menus:`, childMenus.map((btn) => `"${btn.text}" (ID: ${btn.id}, Level: ${btn.level}, ParentID: ${btn.parentId})`));
                if (childMenus.length > 0) {
                  const allShowButton = (autoBot.keyboardConfig || []).find((btn) => btn.isAllShow);
                  console.log(`\u{1F50D} Level ${currentLevel + 1} - Found All Show button:`, allShowButton ? "YES" : "NO");
                  const navigationButtons = [];
                  navigationButtons.push({
                    id: `home_level_${currentLevel + 1}`,
                    text: "\u{1F3E0} Menu Utama",
                    callbackData: "back_to_main",
                    level: currentLevel + 1
                  });
                  if (allShowButton) {
                    navigationButtons.push({
                      id: `all_show_level_${currentLevel + 1}`,
                      text: allShowButton.text || "\u{1F4CB} Lihat Semua Menu",
                      callbackData: "show_all_menus",
                      level: currentLevel + 1
                    });
                    console.log(`\u2705 Added navigation buttons to level ${currentLevel + 1}`);
                  }
                  const childMenusWithNavigation = [
                    ...childMenus,
                    ...navigationButtons
                  ];
                  console.log(`\u{1F4CB} Level ${currentLevel + 1} menu buttons:`, childMenusWithNavigation.map((btn) => btn.text));
                  const childMenuKeyboard = this.createInlineKeyboard(childMenusWithNavigation);
                  const levelNames = ["Menu", "Sub Menu", "Sub Sub Menu", "Level 4 Menu", "Level 5 Menu", "Level 6 Menu"];
                  const levelName = levelNames[currentLevel] || `Level ${currentLevel + 1} Menu`;
                  const menuText = pressedButton.responseText || `\u{1F4CB} ${levelName} ${pressedButton.text}:`;
                  try {
                    await bot.deleteMessage(chatId, msg.message_id);
                  } catch (deleteError) {
                    console.log("Could not delete message, continuing...");
                  }
                  const buttonWithImage = pressedButton;
                  if (buttonWithImage.responseImage && buttonWithImage.responseImage.trim()) {
                    await bot.sendPhoto(chatId, buttonWithImage.responseImage, {
                      caption: menuText,
                      parse_mode: "Markdown",
                      reply_markup: childMenuKeyboard
                    });
                  } else {
                    await bot.sendMessage(chatId, menuText, {
                      reply_markup: childMenuKeyboard,
                      parse_mode: "Markdown"
                    });
                  }
                } else {
                  const responseText = pressedButton.responseText || `Anda memilih: ${pressedButton.text}`;
                  const responseKeyboard = void 0;
                  const buttonWithImage = pressedButton;
                  if (buttonWithImage.responseImage && buttonWithImage.responseImage.trim()) {
                    await bot.deleteMessage(chatId, msg.message_id);
                    await bot.sendPhoto(chatId, buttonWithImage.responseImage, {
                      caption: responseText,
                      parse_mode: "Markdown",
                      reply_markup: responseKeyboard
                    });
                  } else {
                    await bot.editMessageText(responseText, {
                      chat_id: chatId,
                      message_id: msg.message_id,
                      reply_markup: responseKeyboard,
                      parse_mode: "Markdown"
                    });
                  }
                }
              }
            } catch (error) {
              console.error(`Error handling callback for bot ${autoBot.botName}:`, error?.message || error);
              if (error?.message?.includes("there is no text in the message to edit") || error?.message?.includes("message to edit not found")) {
                console.log("Message edit failed, this is normal when switching between text and image messages");
              }
            }
          }
        }
      });
      bot.on("polling_error", (error) => {
        console.error(`Polling error for bot ${autoBot.botName}:`, error);
      });
      bot.on("error", (error) => {
        console.error(`Bot error for ${autoBot.botName}:`, error);
      });
      console.log(`Auto bot ${autoBot.botName} started successfully`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to start auto bot ${autoBot.botName}:`, error);
      return { success: false, error: error.message };
    }
  }
  /**
   * Stop auto bot
   */
  async stopAutoBot(token) {
    try {
      const botInstance = this.activeBots.get(token);
      if (botInstance) {
        await botInstance.bot.stopPolling();
        this.activeBots.delete(token);
        console.log(`Auto bot with token ${token.slice(0, 10)}... stopped`);
      }
      return { success: true };
    } catch (error) {
      console.error(`Failed to stop auto bot:`, error);
      return { success: false, error: error.message };
    }
  }
  /**
   * Create HOME button with unique ID for each context
   */
  createHomeButton(context) {
    return {
      id: `home_${context}`,
      text: "\u{1F3E0} HOME",
      callbackData: "back_to_main",
      level: 0
    };
  }
  /**
   * Create All Show message with hierarchical menu structure
   */
  createAllShowMessage(buttons) {
    let message = "\u{1F4CB} *Semua Menu Tersedia:*\n\n";
    const buttonsByLevel = {};
    buttons.forEach((btn) => {
      const level = btn.level || 0;
      if (!buttonsByLevel[level]) buttonsByLevel[level] = [];
      buttonsByLevel[level].push(btn);
    });
    for (let level = 0; level <= 4; level++) {
      const levelButtons = buttonsByLevel[level] || [];
      if (levelButtons.length === 0) continue;
      const levelNames = ["\u{1F4CC} Menu Utama", "\u{1F4C2} Sub Menu", "\u{1F4C4} Sub Sub Menu", "\u{1F4CE} Level 4", "\u{1F4CA} Level 5"];
      message += `${levelNames[level]}:
`;
      levelButtons.forEach((btn) => {
        if (!btn.isAllShow) {
          const indent = "  ".repeat(level);
          message += `${indent}\u2022 ${btn.text}
`;
        }
      });
      message += "\n";
    }
    message += "Pilih menu yang ingin Anda akses:";
    return message;
  }
  /**
   * Create All Show keyboard with all available buttons
   */
  createAllShowKeyboard(buttons) {
    const availableButtons = buttons.filter((btn) => !btn.isAllShow);
    const keyboardButtons = [
      ...availableButtons,
      this.createHomeButton("allshow")
    ];
    return this.createInlineKeyboard(keyboardButtons);
  }
  /**
   * Create inline keyboard markup from configuration
   */
  createInlineKeyboard(buttons) {
    if (!buttons || buttons.length === 0) {
      return { inline_keyboard: [] };
    }
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      const row = [];
      const firstButton = buttons[i];
      if (firstButton.url) {
        row.push({
          text: firstButton.text,
          url: firstButton.url
        });
      } else {
        row.push({
          text: firstButton.text,
          callback_data: firstButton.callbackData
        });
      }
      if (i + 1 < buttons.length) {
        const secondButton = buttons[i + 1];
        if (secondButton.url) {
          row.push({
            text: secondButton.text,
            url: secondButton.url
          });
        } else {
          row.push({
            text: secondButton.text,
            callback_data: secondButton.callbackData
          });
        }
      }
      keyboard.push(row);
    }
    return { inline_keyboard: keyboard };
  }
  /**
   * Restart all active auto bots
   */
  async restartAllAutoBots() {
    try {
      const allAutoBots = await storage.getAllAutoBots();
      const activeAutoBots = allAutoBots.filter((bot) => bot.isActive);
      for (const [token] of this.activeBots) {
        await this.stopAutoBot(token);
      }
      for (const autoBot of activeAutoBots) {
        await this.startAutoBot(autoBot);
      }
      console.log(`Restarted ${activeAutoBots.length} active auto bots`);
    } catch (error) {
      console.error("Failed to restart auto bots:", error);
    }
  }
  /**
   * Get active bots count
   */
  getActiveBotCount() {
    return this.activeBots.size;
  }
  /**
   * Check if bot is running
   */
  isBotRunning(token) {
    return this.activeBots.has(token);
  }
};
var autoBotManager = new AutoBotManager();

// server/monitoring.ts
import { EventEmitter } from "events";
var ThreadingMonitor = class extends EventEmitter {
  activeOperations = /* @__PURE__ */ new Map();
  performanceMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageResponseTime: 0,
    peakConcurrency: 0,
    currentConcurrency: 0,
    memoryUsage: { used: 0, total: 0 },
    lastUpdated: /* @__PURE__ */ new Date()
  };
  maxConcurrency = 50;
  // Safety limit
  responseTimeThreshold = 1e4;
  // 10 seconds
  memoryThreshold = 0.85;
  // 85% memory usage threshold
  /**
   * Start monitoring an operation
   */
  startOperation(operationId, type, count = 1) {
    if (this.performanceMetrics.currentConcurrency >= this.maxConcurrency) {
      console.warn(`\u{1F6A8} THREADING LIMIT: Rejecting operation ${operationId}. Current: ${this.performanceMetrics.currentConcurrency}, Max: ${this.maxConcurrency}`);
      return false;
    }
    const memUsage = process.memoryUsage();
    const memoryUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
    if (memoryUsagePercent > this.memoryThreshold) {
      console.warn(`\u{1F6A8} MEMORY WARNING: ${(memoryUsagePercent * 100).toFixed(1)}% memory usage. Operation ${operationId} delayed.`);
      return false;
    }
    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      type,
      count
    });
    this.performanceMetrics.currentConcurrency++;
    this.performanceMetrics.totalOperations++;
    if (this.performanceMetrics.currentConcurrency > this.performanceMetrics.peakConcurrency) {
      this.performanceMetrics.peakConcurrency = this.performanceMetrics.currentConcurrency;
    }
    console.log(`\u{1F4CA} THREADING START: ${operationId} (${type}) - Current: ${this.performanceMetrics.currentConcurrency}/${this.maxConcurrency}`);
    return true;
  }
  /**
   * Complete an operation (success)
   */
  completeOperation(operationId, itemsProcessed = 0) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;
    const duration = Date.now() - operation.startTime;
    this.activeOperations.delete(operationId);
    this.performanceMetrics.currentConcurrency--;
    this.performanceMetrics.successfulOperations++;
    this.updateAverageResponseTime(duration);
    console.log(`\u2705 THREADING SUCCESS: ${operationId} completed in ${duration}ms (${itemsProcessed} items) - Current: ${this.performanceMetrics.currentConcurrency}`);
    if (duration > this.responseTimeThreshold) {
      console.warn(`\u26A0\uFE0F SLOW OPERATION: ${operationId} took ${duration}ms (threshold: ${this.responseTimeThreshold}ms)`);
    }
    this.emit("operationComplete", { operationId, duration, itemsProcessed, type: operation.type });
  }
  /**
   * Fail an operation
   */
  failOperation(operationId, error) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;
    const duration = Date.now() - operation.startTime;
    this.activeOperations.delete(operationId);
    this.performanceMetrics.currentConcurrency--;
    this.performanceMetrics.failedOperations++;
    this.updateAverageResponseTime(duration);
    console.error(`\u274C THREADING FAILURE: ${operationId} failed after ${duration}ms - Error: ${error} - Current: ${this.performanceMetrics.currentConcurrency}`);
    this.emit("operationFailed", { operationId, duration, error, type: operation.type });
  }
  /**
   * Get current system health
   */
  getSystemHealth() {
    const now = Date.now();
    const activeOps = Array.from(this.activeOperations.entries()).map(([id, op]) => ({
      id,
      type: op.type,
      duration: now - op.startTime,
      count: op.count
    }));
    const memUsage = process.memoryUsage();
    this.performanceMetrics.memoryUsage = {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal
    };
    this.performanceMetrics.lastUpdated = /* @__PURE__ */ new Date();
    let status = "healthy";
    const recommendations = [];
    const concurrencyRatio = this.performanceMetrics.currentConcurrency / this.maxConcurrency;
    if (concurrencyRatio > 0.8) {
      status = "warning";
      recommendations.push("High concurrency detected. Consider reducing batch sizes.");
    }
    const memoryRatio = memUsage.heapUsed / memUsage.heapTotal;
    if (memoryRatio > this.memoryThreshold) {
      status = "critical";
      recommendations.push("High memory usage. Reduce concurrent operations immediately.");
    }
    const errorRate = this.performanceMetrics.failedOperations / Math.max(this.performanceMetrics.totalOperations, 1);
    if (errorRate > 0.1) {
      status = "warning";
      recommendations.push("High error rate detected. Check external service connectivity.");
    }
    const stuckOps = activeOps.filter((op) => op.duration > this.responseTimeThreshold);
    if (stuckOps.length > 0) {
      status = "warning";
      recommendations.push(`${stuckOps.length} operations are running longer than expected.`);
    }
    return {
      status,
      metrics: this.performanceMetrics,
      activeOperations: activeOps,
      recommendations
    };
  }
  /**
   * Auto-cleanup stuck operations
   */
  cleanupStuckOperations() {
    const now = Date.now();
    let cleanedUp = 0;
    for (const [id, operation] of this.activeOperations.entries()) {
      const duration = now - operation.startTime;
      if (duration > this.responseTimeThreshold * 2) {
        console.warn(`\u{1F9F9} CLEANUP: Removing stuck operation ${id} (${duration}ms)`);
        this.failOperation(id, "Operation timeout - auto cleanup");
        cleanedUp++;
      }
    }
    return cleanedUp;
  }
  /**
   * Update average response time
   */
  updateAverageResponseTime(newTime) {
    const totalOps = this.performanceMetrics.successfulOperations + this.performanceMetrics.failedOperations;
    this.performanceMetrics.averageResponseTime = (this.performanceMetrics.averageResponseTime * (totalOps - 1) + newTime) / totalOps;
  }
  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const health = this.getSystemHealth();
    const memoryPercent = (health.metrics.memoryUsage.used / health.metrics.memoryUsage.total * 100).toFixed(1);
    const errorRate = (health.metrics.failedOperations / Math.max(health.metrics.totalOperations, 1) * 100).toFixed(1);
    return `
\u{1F4CA} THREADING MONITOR SUMMARY:
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F3AF} Status: ${health.status.toUpperCase()}
\u26A1 Current Operations: ${health.metrics.currentConcurrency}/${this.maxConcurrency}
\u{1F3C6} Peak Concurrency: ${health.metrics.peakConcurrency}
\u{1F4C8} Total Operations: ${health.metrics.totalOperations}
\u2705 Success Rate: ${(100 - parseFloat(errorRate)).toFixed(1)}%
\u23F1\uFE0F  Avg Response: ${health.metrics.averageResponseTime.toFixed(0)}ms
\u{1F4BE} Memory Usage: ${memoryPercent}%
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${health.recommendations.length > 0 ? "\u26A0\uFE0F  RECOMMENDATIONS:\n" + health.recommendations.map((r) => `\u2022 ${r}`).join("\n") : "\u2705 All systems optimal"}
    `.trim();
  }
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.performanceMetrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      peakConcurrency: 0,
      currentConcurrency: this.performanceMetrics.currentConcurrency,
      // Keep current
      memoryUsage: { used: 0, total: 0 },
      lastUpdated: /* @__PURE__ */ new Date()
    };
    console.log("\u{1F4CA} THREADING MONITOR: Metrics reset");
  }
};
var threadingMonitor = new ThreadingMonitor();
setInterval(() => {
  const cleaned = threadingMonitor.cleanupStuckOperations();
  if (cleaned > 0) {
    console.log(`\u{1F9F9} AUTO-CLEANUP: Removed ${cleaned} stuck operations`);
  }
}, 5 * 60 * 1e3);
setInterval(() => {
  console.log(threadingMonitor.getPerformanceSummary());
}, 10 * 60 * 1e3);

// server/routes.ts
import { z as z2 } from "zod";
function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}
function requireAdmin(req, res, next) {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}
function registerRoutes(app2) {
  setupAuth(app2);
  app2.post("/api/bots", requireAuth, async (req, res) => {
    try {
      const createBotSchema = insertBotSchema.extend({
        systemPrompt: z2.string().optional()
      });
      const validatedData = createBotSchema.parse(req.body);
      const validation = await telegramBotManager.validateBotToken(validatedData.token);
      if (!validation.valid) {
        return res.status(400).json({ message: "Invalid bot token" });
      }
      const existingBot = await storage.getBotByToken(validatedData.token);
      if (existingBot) {
        return res.status(400).json({ message: "Bot token already in use" });
      }
      const bot = await storage.createBot({
        ...validatedData,
        userId: req.user.id,
        botName: validation.botInfo.first_name,
        botUsername: validation.botInfo.username
      });
      if (validatedData.systemPrompt) {
        await storage.createKnowledge({
          botId: bot.id,
          type: "text",
          content: validatedData.systemPrompt
        });
      }
      await telegramBotManager.startBot(bot.token, bot.id);
      res.status(201).json(bot);
    } catch (error) {
      console.error("Create bot error:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bot" });
    }
  });
  app2.get("/api/bots", requireAuth, async (req, res) => {
    try {
      const [bots2] = await Promise.all([
        storage.getBotsByUserId(req.user.id)
      ]);
      res.json(bots2);
    } catch (error) {
      console.error("Get bots error:", error);
      res.status(500).json({ message: "Failed to retrieve bots" });
    }
  });
  app2.delete("/api/bots/:id", requireAuth, async (req, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBot(botId);
      if (!bot) {
        return res.status(404).json({ message: "Bot not found" });
      }
      if (bot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this bot" });
      }
      await telegramBotManager.stopBot(bot.token);
      await storage.deleteBot(botId);
      res.json({ message: "Bot deleted successfully" });
    } catch (error) {
      console.error("Delete bot error:", error);
      res.status(500).json({ message: "Failed to delete bot" });
    }
  });
  app2.post("/api/knowledge", requireAuth, async (req, res) => {
    try {
      const validatedData = insertKnowledgeSchema.parse(req.body);
      const bot = await storage.getBot(validatedData.botId);
      if (!bot || bot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to add knowledge to this bot" });
      }
      const knowledge2 = await storage.createKnowledge(validatedData);
      res.status(201).json(knowledge2);
    } catch (error) {
      console.error("Create knowledge error:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create knowledge" });
    }
  });
  app2.get("/api/knowledge/:botId", requireAuth, async (req, res) => {
    try {
      const botId = parseInt(req.params.botId);
      const bot = await storage.getBot(botId);
      if (!bot || bot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this bot's knowledge" });
      }
      const knowledge2 = await storage.getKnowledgeByBotId(botId);
      res.json(knowledge2);
    } catch (error) {
      console.error("Get knowledge error:", error);
      res.status(500).json({ message: "Failed to retrieve knowledge" });
    }
  });
  app2.put("/api/knowledge/:id", requireAuth, async (req, res) => {
    try {
      const knowledgeId = parseInt(req.params.id);
      const updateData = insertKnowledgeSchema.parse(req.body);
      const knowledge2 = await storage.getKnowledge(knowledgeId);
      if (!knowledge2) {
        return res.status(404).json({ message: "Knowledge not found" });
      }
      const bot = await storage.getBot(knowledge2.botId);
      if (!bot || bot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this knowledge" });
      }
      const updatedKnowledge = await storage.updateKnowledge(knowledgeId, updateData);
      res.json(updatedKnowledge);
    } catch (error) {
      console.error("Update knowledge error:", error);
      res.status(500).json({ message: "Failed to update knowledge" });
    }
  });
  app2.delete("/api/knowledge/:id", requireAuth, async (req, res) => {
    try {
      const knowledgeId = parseInt(req.params.id);
      const knowledge2 = await storage.getKnowledge(knowledgeId);
      if (!knowledge2) {
        return res.status(404).json({ message: "Knowledge not found" });
      }
      const bot = await storage.getBot(knowledge2.botId);
      if (!bot || bot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this knowledge" });
      }
      await storage.deleteKnowledge(knowledgeId);
      res.json({ message: "Knowledge deleted successfully" });
    } catch (error) {
      console.error("Delete knowledge error:", error);
      res.status(500).json({ message: "Failed to delete knowledge" });
    }
  });
  app2.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userProfile } = user;
      res.json(userProfile);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to retrieve profile" });
    }
  });
  app2.post("/api/admin/validate-secret", async (req, res) => {
    try {
      const { secret } = req.body;
      if (secret === "muhammadilmiladoni") {
        res.json({ valid: true });
      } else {
        res.status(400).json({ valid: false, message: "Invalid secret code" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to validate secret" });
    }
  });
  app2.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (username === "ilmi" && password === "ilmi123") {
        req.session.isAdmin = true;
        res.json({ success: true, user: { username: "ilmi", role: "admin" } });
      } else {
        res.status(400).json({ success: false, message: "Invalid admin credentials" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to login as admin" });
    }
  });
  app2.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const users2 = await storage.getAllUsers();
      const usersWithBotCount = await Promise.all(
        users2.map(async (user) => {
          const bots2 = await storage.getBotsByUserId(user.id);
          const { password, ...userWithoutPassword } = user;
          return {
            ...userWithoutPassword,
            botCount: bots2.length
          };
        })
      );
      res.json(usersWithBotCount);
    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });
  app2.put("/api/admin/users/:id", async (req, res) => {
    try {
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const userId = parseInt(req.params.id);
      const { level, credits } = req.body;
      const updatedUser = await storage.updateUser(userId, { level, credits });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  app2.delete("/api/admin/users/:id", async (req, res) => {
    try {
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const userId = parseInt(req.params.id);
      const userBots = await storage.getBotsByUserId(userId);
      for (const bot of userBots) {
        await telegramBotManager.stopBot(bot.token);
        await storage.deleteBot(bot.id);
      }
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  app2.get("/api/admin/openai-status", async (req, res) => {
    try {
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const hasApiKey = !!process.env.OPENAI_API_KEY;
      let isConnected = false;
      if (hasApiKey) {
        try {
          const { checkOpenAIConnection: checkOpenAIConnection2 } = await Promise.resolve().then(() => (init_openai(), openai_exports));
          isConnected = await checkOpenAIConnection2();
        } catch (error) {
          console.error("OpenAI connection check failed:", error);
        }
      }
      res.json({
        hasApiKey,
        isConnected,
        status: hasApiKey ? isConnected ? "connected" : "key_invalid" : "not_configured"
      });
    } catch (error) {
      console.error("Check OpenAI status error:", error);
      res.status(500).json({ message: "Failed to check OpenAI status" });
    }
  });
  app2.get("/api/admin/stats", async (req, res) => {
    try {
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const users2 = await storage.getAllUsers();
      const bots2 = await storage.getAllBots();
      const stats = {
        totalUsers: users2.length,
        activeBots: bots2.filter((bot) => bot.isActive).length,
        messagesCount: bots2.reduce((sum, bot) => sum + bot.messageCount, 0),
        revenue: 0
        // Mock value as payment is not implemented
      };
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Failed to retrieve stats" });
    }
  });
  app2.post("/api/admin/logout", async (req, res) => {
    try {
      req.session.isAdmin = false;
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to logout" });
    }
  });
  app2.post("/api/upgrade", requireAuth, async (req, res) => {
    try {
      console.log("Upgrade endpoint called with plan:", req.body.plan);
      const { plan } = req.body;
      if (!plan || !UPGRADE_PLANS[plan]) {
        console.log("Invalid plan:", plan);
        return res.status(400).json({ message: "Invalid plan selected" });
      }
      const orderId = generateOrderId(req.user.id, plan);
      const user = req.user;
      console.log("Creating Midtrans transaction for order:", orderId);
      const transaction = await createMidtransTransaction({
        orderId,
        userId: user.id,
        userName: user.fullName || user.username,
        userEmail: user.email,
        plan
      });
      console.log("Midtrans transaction created successfully");
      await storage.createTransaction({
        midtransOrderId: orderId,
        userId: user.id,
        plan,
        amount: UPGRADE_PLANS[plan].price,
        status: "pending"
      });
      console.log("Transaction saved to database");
      res.json({
        snapToken: transaction.token,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
        orderId
      });
    } catch (error) {
      console.error("Upgrade endpoint error:", error);
      res.status(500).json({ message: "Failed to create payment transaction", error: error.message });
    }
  });
  app2.post("/api/payments/upgrade", requireAuth, async (req, res) => {
    try {
      const { plan } = req.body;
      const paymentUrl = `https://app.midtrans.com/snap/v1/payment-page?plan=${plan}&user_id=${req.user.id}`;
      res.json({
        paymentUrl,
        message: "Redirecting to payment gateway (Mock)"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment" });
    }
  });
  app2.post("/api/upgrade-plan", requireAuth, async (req, res) => {
    try {
      const { plan } = req.body;
      if (!plan || !UPGRADE_PLANS[plan]) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.level === plan || user.level === "business" && plan === "pro") {
        return res.status(400).json({ message: "You already have this plan or higher" });
      }
      const orderId = generateOrderId(user.id, plan);
      const planConfig = UPGRADE_PLANS[plan];
      await storage.createTransaction({
        userId: user.id,
        plan,
        amount: planConfig.price,
        status: "pending",
        midtransOrderId: orderId,
        paymentInfo: JSON.stringify({ plan, credits: planConfig.credits })
      });
      const midtransResult = await createMidtransTransaction({
        orderId,
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        plan
      });
      res.json({
        success: true,
        token: midtransResult.token,
        redirectUrl: midtransResult.redirectUrl,
        orderId,
        plan: planConfig
      });
    } catch (error) {
      console.error("Upgrade plan error:", error);
      res.status(500).json({ message: "Failed to create upgrade plan" });
    }
  });
  app2.post("/api/payment-callback", async (req, res) => {
    try {
      console.log("Midtrans callback received:", req.body);
      const {
        order_id,
        status_code,
        gross_amount,
        signature_key,
        transaction_status,
        fraud_status
      } = req.body;
      const isValidSignature = process.env.NODE_ENV === "development" || verifySignatureKey(order_id, status_code, gross_amount, signature_key);
      if (!isValidSignature) {
        console.error("Invalid signature for order:", order_id);
        if (process.env.NODE_ENV !== "development") {
          return res.status(400).json({ message: "Invalid signature" });
        }
        console.log("Signature validation skipped in development mode");
      }
      const transaction = await storage.getTransactionByOrderId(order_id);
      if (!transaction) {
        console.error("Transaction not found for order:", order_id);
        return res.status(404).json({ message: "Transaction not found" });
      }
      let newStatus = "pending";
      console.log(`Processing payment status: ${transaction_status}, fraud_status: ${fraud_status}`);
      const successStatuses = ["capture", "settlement", "success"];
      const pendingStatuses = ["pending", "authorize"];
      const failedStatuses = ["cancel", "deny", "expire", "failure"];
      if (successStatuses.includes(transaction_status)) {
        if (!fraud_status || fraud_status === "accept") {
          newStatus = "success";
          const planConfig = UPGRADE_PLANS[transaction.plan];
          const currentUser = await storage.getUser(transaction.userId);
          if (currentUser && planConfig) {
            console.log(`\u2705 Upgrading user ${currentUser.id} from ${currentUser.level} to ${planConfig.level}`);
            console.log(`\u2705 Adding ${planConfig.credits} credits to current ${currentUser.credits} credits`);
            const newCredits = currentUser.credits + planConfig.credits;
            const updatedUser = await storage.updateUser(transaction.userId, {
              level: planConfig.level,
              credits: newCredits
            });
            console.log(`\u2705 User upgrade completed successfully!`);
            console.log(`   - New level: ${planConfig.level}`);
            console.log(`   - Total credits: ${newCredits}`);
            console.log(`   - Updated user:`, updatedUser);
          } else {
            console.error(`\u274C Failed to upgrade user - User: ${currentUser ? "found" : "not found"}, Plan: ${planConfig ? "found" : "not found"}`);
          }
        } else {
          console.log(`\u26A0\uFE0F Payment success but fraud detected: ${fraud_status}`);
          newStatus = "failed";
        }
      } else if (pendingStatuses.includes(transaction_status)) {
        newStatus = "pending";
        console.log(`\u23F3 Payment still pending: ${transaction_status}`);
      } else if (failedStatuses.includes(transaction_status)) {
        newStatus = "failed";
        console.log(`\u274C Payment failed: ${transaction_status}`);
      } else {
        console.log(`\u26A0\uFE0F Unknown payment status: ${transaction_status}, keeping as pending`);
        newStatus = "pending";
      }
      await storage.updateTransaction(transaction.id, {
        status: newStatus,
        paymentInfo: JSON.stringify({
          ...JSON.parse(transaction.paymentInfo || "{}"),
          midtrans_response: req.body
        })
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Payment callback error:", error);
      res.status(500).json({ message: "Payment callback failed" });
    }
  });
  app2.get("/api/payment-status/:orderId", requireAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const transaction = await storage.getTransactionByOrderId(orderId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      console.log(`\u{1F50D} Checking payment status for order: ${orderId}`);
      const midtransStatus = await getTransactionStatus(orderId);
      if (midtransStatus && midtransStatus.transaction_status) {
        const transactionStatus = midtransStatus.transaction_status;
        let newStatus = transaction.status;
        console.log(`\u{1F4B3} Midtrans status for ${orderId}: ${transactionStatus}`);
        const successStatuses = ["capture", "settlement", "success"];
        const failedStatuses = ["cancel", "deny", "expire", "failure"];
        if (successStatuses.includes(transactionStatus)) {
          if (!midtransStatus.fraud_status || midtransStatus.fraud_status === "accept") {
            newStatus = "success";
            if (transaction.status !== "success") {
              console.log(`\u{1F389} Payment successful! Upgrading user account...`);
              const planConfig = UPGRADE_PLANS[transaction.plan];
              const currentUser = await storage.getUser(transaction.userId);
              if (currentUser && planConfig) {
                const newCredits = currentUser.credits + planConfig.credits;
                const updatedUser = await storage.updateUser(transaction.userId, {
                  level: planConfig.level,
                  credits: newCredits
                });
                console.log(`\u2705 User ${currentUser.id} upgraded successfully!`);
                console.log(`   - New level: ${planConfig.level}`);
                console.log(`   - Total credits: ${newCredits}`);
              }
            }
          }
        } else if (failedStatuses.includes(transactionStatus)) {
          newStatus = "failed";
          console.log(`\u274C Payment failed with status: ${transactionStatus}`);
        }
        if (newStatus !== transaction.status) {
          await storage.updateTransaction(transaction.id, { status: newStatus });
          console.log(`\u{1F4DD} Transaction ${orderId} status updated to: ${newStatus}`);
        }
        res.json({
          orderId,
          status: newStatus,
          midtransStatus: transactionStatus,
          amount: transaction.amount,
          plan: transaction.plan
        });
      } else {
        console.log(`\u26A0\uFE0F No Midtrans status found for ${orderId}, using database status: ${transaction.status}`);
        res.json({
          orderId,
          status: transaction.status,
          amount: transaction.amount,
          plan: transaction.plan
        });
      }
    } catch (error) {
      console.error("\u274C Payment status check error:", error);
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });
  app2.get("/api/upgrade-plans", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const availablePlans = Object.entries(UPGRADE_PLANS).filter(([planKey, planConfig]) => {
        if (user.level === "business") return false;
        if (user.level === "pro" && planKey === "pro") return false;
        return true;
      }).map(([key, config]) => ({
        key,
        ...config
      }));
      res.json({
        currentLevel: user.level,
        currentCredits: user.credits,
        availablePlans
      });
    } catch (error) {
      console.error("Get upgrade plans error:", error);
      res.status(500).json({ message: "Failed to get upgrade plans" });
    }
  });
  app2.get("/api/smm/providers", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const providers = await storage.getSmmProvidersByUserId(user.id);
      res.json(providers);
    } catch (error) {
      console.error("Get SMM providers error:", error);
      res.status(500).json({ message: "Failed to fetch SMM providers" });
    }
  });
  app2.post("/api/smm/providers", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      console.log("Request body:", req.body);
      const { name, apiKey, apiEndpoint, isActive = true } = req.body;
      if (!name || !apiKey || !apiEndpoint) {
        return res.status(400).json({ message: "Name, API key, and endpoint are required" });
      }
      const trimmedName = String(name).trim();
      const trimmedApiKey = String(apiKey).trim();
      const trimmedEndpoint = String(apiEndpoint).trim();
      if (trimmedName.length < 1) {
        return res.status(400).json({ message: "Provider name cannot be empty" });
      }
      if (trimmedApiKey.length < 1) {
        return res.status(400).json({ message: "API key cannot be empty" });
      }
      if (!trimmedEndpoint.startsWith("http")) {
        return res.status(400).json({ message: "API endpoint must be a valid URL starting with http or https" });
      }
      const provider = await storage.createSmmProvider({
        userId: user.id,
        name: trimmedName,
        apiKey: trimmedApiKey,
        apiEndpoint: trimmedEndpoint,
        isActive: Boolean(isActive)
      });
      console.log("Provider created successfully:", provider);
      res.status(201).json(provider);
    } catch (error) {
      console.error("Create SMM provider error:", error);
      res.status(500).json({ message: "Failed to create SMM provider: " + error.message });
    }
  });
  app2.put("/api/smm/providers/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const providerId = parseInt(req.params.id);
      const { name, apiKey, apiEndpoint, isActive } = req.body;
      const existingProvider = await storage.getSmmProvider(providerId);
      if (!existingProvider || existingProvider.userId !== user.id) {
        return res.status(404).json({ message: "SMM provider not found" });
      }
      if (apiKey || apiEndpoint) {
        const testKey = apiKey || existingProvider.apiKey;
        const testEndpoint = apiEndpoint || existingProvider.apiEndpoint;
        const smmApi = new SmmPanelAPI(testKey, testEndpoint);
        const connectionTest = await smmApi.testConnection();
        if (!connectionTest) {
          return res.status(400).json({ message: "Failed to connect to SMM provider with new credentials" });
        }
      }
      const updatedProvider = await storage.updateSmmProvider(providerId, {
        name,
        apiKey,
        apiEndpoint,
        isActive
      });
      res.json(updatedProvider);
    } catch (error) {
      console.error("Update SMM provider error:", error);
      res.status(500).json({ message: "Failed to update SMM provider" });
    }
  });
  app2.delete("/api/smm/providers/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const providerId = parseInt(req.params.id);
      const existingProvider = await storage.getSmmProvider(providerId);
      if (!existingProvider || existingProvider.userId !== user.id) {
        return res.status(404).json({ message: "SMM provider not found" });
      }
      await storage.deleteSmmProvider(providerId);
      res.json({ message: "SMM provider deleted successfully" });
    } catch (error) {
      console.error("Delete SMM provider error:", error);
      res.status(500).json({ message: "Failed to delete SMM provider" });
    }
  });
  app2.put("/api/smm/providers/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const providerId = parseInt(req.params.id);
      const { name, apiKey, apiEndpoint, isActive } = req.body;
      const provider = await storage.getSmmProvider(providerId);
      if (!provider || provider.userId !== user.id) {
        return res.status(404).json({ message: "Provider not found" });
      }
      const updatedProvider = await storage.updateSmmProvider(providerId, {
        name,
        apiKey,
        apiEndpoint,
        isActive
      });
      res.json(updatedProvider);
    } catch (error) {
      console.error("Update provider error:", error);
      res.status(500).json({ message: "Failed to update provider" });
    }
  });
  app2.get("/api/smm/providers/:id/services", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const providerId = parseInt(req.params.id);
      const provider = await storage.getSmmProvider(providerId);
      if (!provider || provider.userId !== user.id) {
        return res.status(404).json({ message: "Provider not found" });
      }
      const smmApi = new SmmPanelAPI(provider.apiKey, provider.apiEndpoint);
      const services = await smmApi.getServices();
      res.json({ services });
    } catch (error) {
      console.error("Fetch services error:", error);
      res.status(500).json({ message: "Failed to fetch services from provider" });
    }
  });
  app2.post("/api/smm/providers/:id/import-services", requireAuth, async (req, res) => {
    const operationId = `import_services_${Date.now()}_${req.params.id}`;
    try {
      const user = req.user;
      const providerId = parseInt(req.params.id);
      const { services: selectedServices, batchSize = 10 } = req.body;
      const healthCheck = threadingMonitor.getSystemHealth();
      if (healthCheck.status === "critical") {
        return res.status(503).json({
          success: false,
          message: "Sistem sedang overload. Import dibatalkan untuk menjaga stabilitas.",
          recommendations: healthCheck.recommendations
        });
      }
      const provider = await storage.getSmmProvider(providerId);
      if (!provider || provider.userId !== user.id) {
        return res.status(404).json({ message: "SMM provider not found" });
      }
      if (!selectedServices || !Array.isArray(selectedServices)) {
        return res.status(400).json({ message: "No services provided for import" });
      }
      if (!threadingMonitor.startOperation(operationId, "service_import", selectedServices.length)) {
        return res.status(503).json({
          success: false,
          message: "Sistem sedang busy. Import ditolak untuk menjaga stabilitas.",
          currentOperations: threadingMonitor.getSystemHealth().metrics.currentConcurrency
        });
      }
      const usedMids = await storage.getUsedMids(user.id);
      let importedCount = 0;
      const errors = [];
      const batches = [];
      for (let i = 0; i < selectedServices.length; i += batchSize) {
        batches.push(selectedServices.slice(i, i + batchSize));
      }
      console.log(`Processing ${selectedServices.length} services in ${batches.length} batches of ${batchSize}`);
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`\u{1F680} Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} services using multithreading...`);
        const batchPromises = batch.map(async (service) => {
          try {
            const mid = generateMid(usedMids);
            if (mid) {
              usedMids.push(mid);
              await storage.createSmmService({
                userId: user.id,
                providerId: provider.id,
                mid,
                name: service.name,
                description: service.category || "",
                min: service.min,
                max: service.max,
                rate: parseRate(service.rate).toString(),
                category: service.category,
                serviceIdApi: (service.service || service.id).toString(),
                isActive: true
              });
              return { success: true, serviceName: service.name };
            } else {
              return { success: false, serviceName: service.name, error: "No available MID" };
            }
          } catch (error) {
            return { success: false, serviceName: service.name, error: error.message };
          }
        });
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result) => {
          if (result.status === "fulfilled") {
            if (result.value.success) {
              importedCount++;
            } else {
              errors.push(`${result.value.serviceName}: ${result.value.error}`);
            }
          } else {
            errors.push(`Unknown error: ${result.reason}`);
          }
        });
        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
      threadingMonitor.completeOperation(operationId, importedCount);
      res.json({
        message: `Successfully imported ${importedCount} services`,
        importedCount,
        totalRequested: selectedServices.length,
        batchesProcessed: batches.length,
        errors: errors.length > 0 ? errors : void 0,
        systemHealth: threadingMonitor.getSystemHealth().status
      });
    } catch (error) {
      console.error("Import services error:", error);
      threadingMonitor.failOperation(operationId, error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({ message: "Failed to import services from provider" });
    }
  });
  app2.post("/api/smm/providers/:id/import-services-batch", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const providerId = parseInt(req.params.id);
      const { servicesBatch, batchIndex, totalBatches } = req.body;
      const provider = await storage.getSmmProvider(providerId);
      if (!provider || provider.userId !== user.id) {
        return res.status(404).json({ message: "SMM provider not found" });
      }
      if (!servicesBatch || !Array.isArray(servicesBatch)) {
        return res.status(400).json({ message: "No services batch provided" });
      }
      const usedMids = await storage.getUsedMids(user.id);
      let importedCount = 0;
      const errors = [];
      console.log(`\u{1F680} Processing batch ${batchIndex + 1}/${totalBatches} with ${servicesBatch.length} services using multithreading...`);
      const chunkSize = 5;
      const chunks = [];
      for (let i = 0; i < servicesBatch.length; i += chunkSize) {
        chunks.push(servicesBatch.slice(i, i + chunkSize));
      }
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (service) => {
          try {
            const mid = generateMid(usedMids);
            if (mid) {
              usedMids.push(mid);
              await storage.createSmmService({
                userId: user.id,
                providerId: provider.id,
                mid,
                name: service.name,
                description: service.category || "",
                min: service.min,
                max: service.max,
                rate: parseRate(service.rate).toString(),
                category: service.category,
                serviceIdApi: (service.service || service.id).toString(),
                isActive: true
              });
              return { success: true, serviceName: service.name };
            } else {
              return { success: false, serviceName: service.name, error: "No available MID" };
            }
          } catch (error) {
            return { success: false, serviceName: service.name, error: error.message };
          }
        });
        const chunkResults = await Promise.allSettled(chunkPromises);
        chunkResults.forEach((result) => {
          if (result.status === "fulfilled") {
            if (result.value.success) {
              importedCount++;
            } else {
              errors.push(`${result.value.serviceName}: ${result.value.error}`);
            }
          } else {
            errors.push(`Unknown error: ${result.reason}`);
          }
        });
      }
      res.json({
        message: `Batch ${batchIndex + 1}/${totalBatches} processed successfully`,
        importedCount,
        batchIndex,
        totalBatches,
        isLastBatch: batchIndex === totalBatches - 1,
        errors: errors.length > 0 ? errors : void 0
      });
    } catch (error) {
      console.error("Import services batch error:", error);
      res.status(500).json({ message: "Failed to import services batch" });
    }
  });
  app2.get("/api/smm/services", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const services = await storage.getSmmServicesByUserId(user.id);
      res.json(services);
    } catch (error) {
      console.error("Get SMM services error:", error);
      res.status(500).json({ message: "Failed to fetch SMM services" });
    }
  });
  app2.put("/api/smm/services/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const serviceId = parseInt(req.params.id);
      const { name, description, min, max, rate, syncProvider, priceType, priceValue, isActive } = req.body;
      const existingService = await storage.getSmmService(serviceId);
      if (!existingService || existingService.userId !== user.id) {
        return res.status(404).json({ message: "SMM service not found" });
      }
      let finalRate = rate;
      if (priceType === "percentage") {
        const providerRate = parseFloat(existingService.rate);
        finalRate = (providerRate * (1 + priceValue / 100)).toString();
      } else if (priceType === "fixed") {
        finalRate = priceValue.toString();
      }
      const updatedService = await storage.updateSmmService(serviceId, {
        name,
        description,
        min: syncProvider ? existingService.min : min,
        max: syncProvider ? existingService.max : max,
        rate: finalRate,
        isActive
      });
      res.json(updatedService);
    } catch (error) {
      console.error("Update SMM service error:", error);
      res.status(500).json({ message: "Failed to update SMM service" });
    }
  });
  app2.delete("/api/smm/services/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const serviceId = parseInt(req.params.id);
      const service = await storage.getSmmService(serviceId);
      if (!service || service.userId !== user.id) {
        return res.status(404).json({ message: "Service not found" });
      }
      const success = await storage.deleteSmmService(serviceId);
      if (success) {
        res.json({ message: "Service deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete service" });
      }
    } catch (error) {
      console.error("Delete SMM service error:", error);
      res.status(500).json({ message: "Failed to delete SMM service" });
    }
  });
  app2.post("/api/smm/services/bulk-delete", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const { serviceIds } = req.body;
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return res.status(400).json({ message: "Invalid service IDs provided" });
      }
      let deletedCount = 0;
      const errors = [];
      console.log(`\u{1F680} Bulk deleting ${serviceIds.length} services using multithreading...`);
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < serviceIds.length; i += batchSize) {
        batches.push(serviceIds.slice(i, i + batchSize));
      }
      for (const batch of batches) {
        const batchPromises = batch.map(async (serviceId) => {
          try {
            const service = await storage.getSmmService(serviceId);
            if (service && service.userId === user.id) {
              const success = await storage.deleteSmmService(serviceId);
              if (success) {
                return { success: true, serviceId };
              } else {
                return { success: false, serviceId, error: "Failed to delete" };
              }
            } else {
              return { success: false, serviceId, error: "Not found or access denied" };
            }
          } catch (error) {
            return { success: false, serviceId, error: error.message };
          }
        });
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result) => {
          if (result.status === "fulfilled") {
            if (result.value.success) {
              deletedCount++;
            } else {
              errors.push(`Service ID ${result.value.serviceId}: ${result.value.error}`);
            }
          } else {
            errors.push(`Unknown error: ${result.reason}`);
          }
        });
      }
      res.json({
        message: `Successfully deleted ${deletedCount} services`,
        deletedCount,
        totalRequested: serviceIds.length,
        errors: errors.length > 0 ? errors : void 0
      });
    } catch (error) {
      console.error("Bulk delete SMM services error:", error);
      res.status(500).json({ message: "Failed to bulk delete SMM services" });
    }
  });
  app2.post("/api/smm/providers/:id/update-balance", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const providerId = parseInt(req.params.id);
      const provider = await storage.getSmmProvider(providerId);
      if (!provider || provider.userId !== user.id) {
        return res.status(404).json({ message: "Provider not found" });
      }
      const smmAPI = new SmmPanelAPI(provider.apiKey, provider.apiEndpoint);
      const balanceInfo = await smmAPI.getBalance();
      const updatedProvider = await storage.updateSmmProvider(providerId, {
        balance: balanceInfo.balance.toString(),
        currency: balanceInfo.currency,
        balanceUpdatedAt: /* @__PURE__ */ new Date()
      });
      res.json({
        balance: balanceInfo.balance,
        currency: balanceInfo.currency,
        updatedAt: /* @__PURE__ */ new Date()
      });
    } catch (error) {
      console.error("Update provider balance error:", error);
      res.status(500).json({ message: "Failed to update provider balance" });
    }
  });
  app2.get("/api/smm/orders", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const orders = await storage.getSmmOrdersByUserId(user.id, limit, offset);
      const ordersToSync = orders.filter(
        (order) => order.status !== "completed" && order.status !== "cancelled" && order.status !== "refunded" && order.providerOrderId
      );
      if (ordersToSync.length > 0) {
        const syncPromises = ordersToSync.map(async (order) => {
          try {
            const provider = await storage.getSmmProvider(order.providerId);
            if (!provider) return null;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3e3);
            const statusResponse = await fetch(`${provider.apiEndpoint}?key=${provider.apiKey}&action=status&order=${order.providerOrderId}`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData && statusData.status) {
                const systemStatus = mapProviderStatus2(statusData.status);
                if (systemStatus !== order.status) {
                  await storage.updateSmmOrder(order.id, {
                    status: systemStatus,
                    startCount: statusData.start_count || order.startCount,
                    remains: statusData.remains || order.remains
                  });
                  return { orderId: order.id, updated: true, oldStatus: order.status, newStatus: systemStatus };
                }
              }
            }
            return { orderId: order.id, updated: false };
          } catch (syncError) {
            return { orderId: order.id, error: syncError.message };
          }
        });
        const syncResults = await Promise.allSettled(syncPromises);
        syncResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value?.updated) {
            console.log(`\u2705 Auto-sync updated order ${result.value.orderId}: ${result.value.oldStatus} -> ${result.value.newStatus}`);
          }
        });
      }
      const updatedOrders = await storage.getSmmOrdersByUserId(user.id, limit, offset);
      res.json(updatedOrders);
    } catch (error) {
      console.error("Get SMM orders error:", error);
      res.status(500).json({ message: "Failed to fetch SMM orders" });
    }
  });
  app2.post("/api/smm/orders/sync", requireAuth, async (req, res) => {
    const operationId = `sync_orders_${Date.now()}_${req.user.id}`;
    try {
      const user = req.user;
      const healthCheck = threadingMonitor.getSystemHealth();
      if (healthCheck.status === "critical") {
        return res.status(503).json({
          success: false,
          message: "Sistem sedang overload. Coba lagi dalam beberapa menit.",
          recommendations: healthCheck.recommendations
        });
      }
      const [allOrders] = await Promise.all([
        storage.getSmmOrdersByUserId(user.id, 1e3, 0)
      ]);
      if (!allOrders || allOrders.length === 0) {
        return res.json({
          success: true,
          message: "Tidak ada order untuk disinkronisasi",
          syncedCount: 0,
          updatedCount: 0
        });
      }
      const ordersToSync = allOrders.filter(
        (order) => order.status !== "completed" && order.status !== "cancelled" && order.status !== "refunded" && order.providerOrderId && order.providerOrderId.trim() !== ""
      );
      if (!threadingMonitor.startOperation(operationId, "order_sync", ordersToSync.length)) {
        return res.status(503).json({
          success: false,
          message: "Sistem sedang busy. Operasi ditolak untuk menjaga stabilitas.",
          currentOperations: threadingMonitor.getSystemHealth().metrics.currentConcurrency
        });
      }
      let syncedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      console.log(`\u{1F504} MONITORED SYNC: Starting parallel sync for ${ordersToSync.length} orders (OpID: ${operationId})...`);
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < ordersToSync.length; i += batchSize) {
        batches.push(ordersToSync.slice(i, i + batchSize));
      }
      for (const batch of batches) {
        const batchPromises = batch.map(async (order) => {
          try {
            const provider = await storage.getSmmProvider(order.providerId);
            if (!provider) {
              console.warn(`\u26A0\uFE0F Provider not found for order ${order.id}`);
              return { success: false, orderId: order.id, error: "Provider not found" };
            }
            const statusUrl = `${provider.apiEndpoint}?key=${provider.apiKey}&action=status&order=${order.providerOrderId}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5e3);
            const statusResponse = await fetch(statusUrl, {
              method: "GET",
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData && statusData.status) {
                const systemStatus = mapProviderStatus2(statusData.status);
                if (systemStatus !== order.status) {
                  await storage.updateSmmOrder(order.id, {
                    status: systemStatus,
                    startCount: statusData.start_count || order.startCount,
                    remains: statusData.remains || order.remains
                  });
                  return { success: true, orderId: order.id, updated: true, oldStatus: order.status, newStatus: systemStatus };
                } else {
                  return { success: true, orderId: order.id, updated: false, status: order.status };
                }
              } else {
                return { success: false, orderId: order.id, error: "Invalid response data" };
              }
            } else {
              return { success: false, orderId: order.id, error: `HTTP ${statusResponse.status}` };
            }
          } catch (syncError) {
            return { success: false, orderId: order.id, error: syncError.message };
          }
        });
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result) => {
          if (result.status === "fulfilled") {
            syncedCount++;
            if (result.value.updated) {
              updatedCount++;
              console.log(`\u2705 Updated order ${result.value.orderId}: ${result.value.oldStatus} -> ${result.value.newStatus}`);
            }
          } else {
            errorCount++;
          }
        });
      }
      console.log(`\u{1F4CA} MONITORED SYNC COMPLETED: ${syncedCount} checked, ${updatedCount} updated, ${errorCount} errors`);
      threadingMonitor.completeOperation(operationId, updatedCount);
      res.json({
        success: true,
        message: `Berhasil sinkronisasi ${syncedCount} order, ${updatedCount} order diperbarui${errorCount > 0 ? `, ${errorCount} error` : ""}`,
        syncedCount,
        updatedCount,
        errorCount,
        systemHealth: threadingMonitor.getSystemHealth().status
      });
    } catch (error) {
      console.error("Manual sync orders error:", error);
      threadingMonitor.failOperation(operationId, error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({
        success: false,
        message: "Gagal melakukan sinkronisasi",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/system/health", requireAuth, async (req, res) => {
    try {
      const health = threadingMonitor.getSystemHealth();
      const summary = threadingMonitor.getPerformanceSummary();
      res.json({
        ...health,
        summary,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Get system health error:", error);
      res.status(500).json({ message: "Failed to get system health" });
    }
  });
  app2.post("/api/system/reset-metrics", requireAdmin, async (req, res) => {
    try {
      threadingMonitor.resetMetrics();
      res.json({
        success: true,
        message: "Performance metrics reset successfully",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Reset metrics error:", error);
      res.status(500).json({ message: "Failed to reset metrics" });
    }
  });
  app2.post("/api/system/cleanup", requireAdmin, async (req, res) => {
    try {
      const cleaned = threadingMonitor.cleanupStuckOperations();
      res.json({
        success: true,
        message: `Successfully cleaned up ${cleaned} stuck operations`,
        cleanedCount: cleaned,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Cleanup stuck operations error:", error);
      res.status(500).json({ message: "Failed to cleanup stuck operations" });
    }
  });
  function mapProviderStatus2(providerStatus) {
    const statusMap = {
      "pending": "pending",
      "in progress": "processing",
      "processing": "processing",
      "partial": "partial",
      "completed": "completed",
      "canceled": "cancelled",
      "cancelled": "cancelled",
      "refunded": "refunded"
    };
    return statusMap[providerStatus.toLowerCase()] || providerStatus.toLowerCase();
  }
  app2.post("/api/smm/orders", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const { serviceId, link, quantity } = req.body;
      if (!serviceId || !link || !quantity) {
        return res.status(400).json({ message: "Service, link, and quantity are required" });
      }
      const service = await storage.getSmmService(serviceId);
      if (!service || service.userId !== user.id) {
        return res.status(404).json({ message: "Service not found" });
      }
      if (quantity < service.min || quantity > service.max) {
        return res.status(400).json({
          message: `Quantity must be between ${service.min} and ${service.max}`
        });
      }
      const provider = await storage.getSmmProvider(service.providerId);
      if (!provider || provider.userId !== user.id) {
        return res.status(404).json({ message: "Provider not found" });
      }
      const rate = parseFloat(service.rate);
      const amount = (rate * quantity / 1e3).toFixed(2);
      const orderId = `ORD_${user.id}_${Date.now()}`;
      try {
        const smmApi = new SmmPanelAPI(provider.apiKey, provider.apiEndpoint);
        const providerResponse = await smmApi.createOrder(
          service.serviceIdApi,
          // Use the API service ID from the service
          link,
          quantity
        );
        if (providerResponse.error) {
          return res.status(400).json({
            message: "Failed to send order to provider",
            error: providerResponse.error
          });
        }
        const orderData = {
          userId: user.id,
          serviceId,
          providerId: service.providerId,
          orderId,
          providerOrderId: providerResponse.order,
          // Store provider's order ID
          link,
          quantity,
          amount,
          status: "processing",
          // Set to processing since it was sent to provider
          paymentStatus: "completed"
          // Assuming payment is handled separately
        };
        const newOrder = await storage.createSmmOrder(orderData);
        res.json({
          ...newOrder,
          providerOrderId: providerResponse.order,
          message: "Order successfully sent to provider"
        });
      } catch (providerError) {
        console.error("Provider API error:", providerError);
        const orderData = {
          userId: user.id,
          serviceId,
          providerId: service.providerId,
          orderId,
          link,
          quantity,
          amount,
          status: "failed",
          paymentStatus: "pending",
          errorMessage: providerError.message || "Failed to send order to provider"
        };
        await storage.createSmmOrder(orderData);
        return res.status(500).json({
          message: "Failed to send order to provider",
          error: `Failed to create order: ${providerError.message || "Unknown error"}`
        });
      }
    } catch (error) {
      console.error("Create SMM order error:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });
  app2.post("/api/smm/orders/:id/update-status", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const orderId = parseInt(req.params.id);
      const order = await storage.getSmmOrder(orderId);
      if (!order || order.userId !== user.id) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (!order.providerOrderId) {
        return res.status(400).json({ message: "Order has no provider order ID to check" });
      }
      const provider = await storage.getSmmProvider(order.providerId);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      try {
        const smmApi = new SmmPanelAPI(provider.apiKey, provider.apiEndpoint);
        const statusResponse = await smmApi.getOrderStatus(order.providerOrderId);
        const mappedStatus = mapProviderStatus2(statusResponse.status);
        const updatedOrder = await storage.updateSmmOrder(orderId, {
          status: mappedStatus,
          startCount: parseInt(statusResponse.start_count) || order.startCount,
          remains: parseInt(statusResponse.remains) || order.remains,
          updatedAt: /* @__PURE__ */ new Date()
        });
        res.json({
          ...updatedOrder,
          providerStatus: statusResponse,
          message: "Order status updated successfully"
        });
      } catch (providerError) {
        console.error("Provider status check error:", providerError);
        res.status(500).json({
          message: "Failed to check order status from provider",
          error: providerError.message
        });
      }
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });
  app2.post("/api/autobots/validate-token", requireAuth, async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Bot token is required" });
      }
      const validation = await autoBotManager.validateBotToken(token);
      if (validation.valid) {
        res.json({
          valid: true,
          botInfo: validation.botInfo
        });
      } else {
        res.status(400).json({
          valid: false,
          error: validation.error
        });
      }
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ message: "Failed to validate token" });
    }
  });
  app2.get("/api/autobots", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const autoBots2 = await storage.getAutoBotsByUserId(user.id);
      res.json(autoBots2);
    } catch (error) {
      console.error("Get auto bots error:", error);
      res.status(500).json({ message: "Failed to fetch auto bots" });
    }
  });
  app2.post("/api/autobots", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const { token, botName, botUsername, welcomeMessage, keyboardConfig, isActive } = req.body;
      console.log("\u{1F680} Creating auto bot with data:", {
        token: token ? `${token.substring(0, 10)}...` : "missing",
        botName,
        botUsername,
        keyboardConfig: keyboardConfig ? "provided" : "empty"
      });
      if (!token || !botName || !botUsername) {
        return res.status(400).json({ message: "Token, nama bot, dan username bot harus diisi" });
      }
      if (keyboardConfig) {
        try {
          if (typeof keyboardConfig === "string") {
            JSON.parse(keyboardConfig);
          } else if (Array.isArray(keyboardConfig)) {
            keyboardConfig.forEach((button, index) => {
              if (!button.id || !button.text || !button.callbackData) {
                throw new Error(`Button ${index + 1} harus memiliki id, text, dan callbackData`);
              }
            });
          }
        } catch (parseError) {
          console.error("\u274C Keyboard config validation error:", parseError);
          return res.status(400).json({
            message: "Konfigurasi keyboard tidak valid: " + (parseError instanceof Error ? parseError.message : "Format JSON salah")
          });
        }
      }
      const existingBot = await storage.getAutoBotByToken(token);
      if (existingBot) {
        return res.status(400).json({ message: "Token bot ini sudah digunakan" });
      }
      console.log("\u{1F50D} Validating bot token...");
      const validation = await autoBotManager.validateBotToken(token);
      if (!validation.valid) {
        console.error("\u274C Token validation failed:", validation.error);
        return res.status(400).json({ message: validation.error || "Token bot tidak valid" });
      }
      console.log("\u2705 Token valid, creating bot in database...");
      const autoBot = await storage.createAutoBot({
        userId: user.id,
        token,
        botName,
        botUsername,
        welcomeMessage: welcomeMessage || "Selamat datang! Silakan pilih opsi di bawah ini:",
        keyboardConfig: keyboardConfig || [],
        isActive: isActive !== false
      });
      if (autoBot.isActive) {
        console.log("\u{1F680} Starting auto bot...");
        const startResult = await autoBotManager.startAutoBot(autoBot);
        if (!startResult.success) {
          console.error("\u274C Failed to start bot:", startResult.error);
          await storage.updateAutoBot(autoBot.id, { isActive: false });
          return res.status(500).json({
            message: `Bot berhasil dibuat tapi gagal dijalankan: ${startResult.error}`
          });
        }
      }
      console.log("\u2705 Auto bot created successfully");
      res.json(autoBot);
    } catch (error) {
      console.error("\u274C Create auto bot error:", error);
      res.status(500).json({
        message: "Gagal membuat auto bot: " + (error instanceof Error ? error.message : "Unknown error")
      });
    }
  });
  app2.patch("/api/autobots/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const botId = parseInt(req.params.id);
      const updates = req.body;
      const existingBot = await storage.getAutoBot(botId);
      if (!existingBot || existingBot.userId !== user.id) {
        return res.status(404).json({ message: "Auto bot not found" });
      }
      const updatedBot = await storage.updateAutoBot(botId, updates);
      if (!updatedBot) {
        return res.status(404).json({ message: "Auto bot not found" });
      }
      if (updatedBot.isActive) {
        await autoBotManager.stopAutoBot(updatedBot.token);
        await autoBotManager.startAutoBot(updatedBot);
      } else {
        await autoBotManager.stopAutoBot(updatedBot.token);
      }
      res.json(updatedBot);
    } catch (error) {
      console.error("Update auto bot error:", error);
      res.status(500).json({ message: "Failed to update auto bot" });
    }
  });
  app2.delete("/api/autobots/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const botId = parseInt(req.params.id);
      const existingBot = await storage.getAutoBot(botId);
      if (!existingBot || existingBot.userId !== user.id) {
        return res.status(404).json({ message: "Auto bot not found" });
      }
      await autoBotManager.stopAutoBot(existingBot.token);
      const deleted = await storage.deleteAutoBot(botId);
      if (!deleted) {
        return res.status(404).json({ message: "Auto bot not found" });
      }
      res.json({ message: "Auto bot deleted successfully" });
    } catch (error) {
      console.error("Delete auto bot error:", error);
      res.status(500).json({ message: "Failed to delete auto bot" });
    }
  });
  app2.post("/api/autobots/:id/toggle", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const botId = parseInt(req.params.id);
      const { isActive } = req.body;
      const existingBot = await storage.getAutoBot(botId);
      if (!existingBot || existingBot.userId !== user.id) {
        return res.status(404).json({ message: "Auto bot not found" });
      }
      const updatedBot = await storage.updateAutoBot(botId, { isActive });
      if (!updatedBot) {
        return res.status(404).json({ message: "Auto bot not found" });
      }
      if (isActive) {
        await autoBotManager.startAutoBot(updatedBot);
      } else {
        await autoBotManager.stopAutoBot(updatedBot.token);
      }
      res.json(updatedBot);
    } catch (error) {
      console.error("Toggle auto bot error:", error);
      res.status(500).json({ message: "Failed to toggle auto bot" });
    }
  });
  setTimeout(async () => {
    try {
      await telegramBotManager.restartAllBots();
      await autoBotManager.restartAllAutoBots();
    } catch (error) {
      console.error("Failed to restart bots on server start:", error);
    }
  }, 1e3);
  app2.get("/api/system/security-status", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      res.json({
        status: "active",
        protections: {
          rateLimiting: "enabled",
          securityFiltering: "enabled",
          logSanitization: "enabled",
          threatDetection: "enabled"
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        message: "Semua sistem keamanan aktif dan melindungi aplikasi"
      });
    } catch (error) {
      console.error("Security status error:", error);
      res.status(500).json({ message: "Failed to get security status" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/security-logger.ts
var SecurityLogger = class {
  sensitivePatterns = [
    // API Keys & Tokens
    /api[_-]?key[s]?[\s=:]+[a-zA-Z0-9_-]{10,}/gi,
    /token[\s=:]+[a-zA-Z0-9_.-]{10,}/gi,
    /secret[\s=:]+[a-zA-Z0-9_.-]{10,}/gi,
    /password[\s=:]+.{3,}/gi,
    // Database & Connection Strings
    /DATABASE_URL[\s=:]+.+/gi,
    /postgres:\/\/.+/gi,
    /mysql:\/\/.+/gi,
    /mongodb:\/\/.+/gi,
    // Payment & Financial
    /sk_[a-zA-Z0-9_-]+/gi,
    // Stripe secret keys
    /pk_[a-zA-Z0-9_-]+/gi,
    // Stripe public keys
    /midtrans[\s=:]+.+/gi,
    /snap[_-]?token[\s=:]+.+/gi,
    // User Credentials
    /email[\s=:]+[^\s]+@[^\s]+/gi,
    /phone[\s=:]+[\d\+\-\s]{8,}/gi,
    // Internal IDs that shouldn't be exposed
    /bot[_-]?token[\s=:]+[0-9]{8,}:[a-zA-Z0-9_-]{30,}/gi,
    /telegram[_-]?token[\s=:]+[0-9]{8,}:[a-zA-Z0-9_-]{30,}/gi
  ];
  suspiciousPatterns = [
    // SQL Injection attempts
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b)[\s\S]*(\bFROM\b|\bWHERE\b|\bINTO\b)/gi,
    // XSS attempts
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    // Path traversal
    /\.\.\/|\.\.\\|\.\.\%2f|\.\.\%5c/gi,
    // Command injection
    /[;&|`$]/g,
    // Common attack patterns
    /eval\s*\(/gi,
    /exec\s*\(/gi,
    /system\s*\(/gi
  ];
  blockedUserAgents = [
    /nikto/i,
    /sqlmap/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /burp/i,
    /crawl/i,
    /spider/i,
    /bot/i
    // Generic bot blocker (you can customize this)
  ];
  /**
   * Sanitize sensitive data from logs
   */
  sanitizeForLog(data) {
    let sanitized = typeof data === "string" ? data : JSON.stringify(data);
    this.sensitivePatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    });
    sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "****-****-****-****");
    sanitized = sanitized.replace(/\b\d{3}-?\d{3}-?\d{4}\b/g, "XXX-XXX-XXXX");
    return sanitized;
  }
  /**
   * Check for suspicious requests
   */
  detectSuspiciousActivity(req) {
    const threats = [];
    let riskLevel = "low";
    const fullUrl = req.originalUrl || req.url;
    this.suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(fullUrl)) {
        threats.push(`Suspicious URL pattern detected: ${this.getPatternName(index)}`);
        riskLevel = "high";
      }
    });
    if (req.body) {
      const bodyStr = JSON.stringify(req.body);
      this.suspiciousPatterns.forEach((pattern, index) => {
        if (pattern.test(bodyStr)) {
          threats.push(`Suspicious payload detected: ${this.getPatternName(index)}`);
          riskLevel = "critical";
        }
      });
    }
    const userAgent = req.headers["user-agent"] || "";
    this.blockedUserAgents.forEach((pattern) => {
      if (pattern.test(userAgent)) {
        threats.push(`Blocked user agent: ${pattern.source}`);
        riskLevel = "medium";
      }
    });
    const ip = req.ip || req.connection.remoteAddress;
    if (this.isRapidRequests(ip)) {
      threats.push("Rapid requests detected - possible DoS attempt");
      riskLevel = riskLevel === "critical" ? "critical" : "high";
    }
    return {
      isSuspicious: threats.length > 0,
      threats,
      riskLevel
    };
  }
  requestCounts = /* @__PURE__ */ new Map();
  isRapidRequests(ip) {
    if (!ip) return false;
    if (process.env.NODE_ENV === "development") {
      return false;
    }
    const now = Date.now();
    const windowMs = 60 * 1e3;
    const maxRequests = 100;
    const record = this.requestCounts.get(ip);
    if (!record || now - record.lastReset > windowMs) {
      this.requestCounts.set(ip, { count: 1, lastReset: now });
      return false;
    }
    record.count++;
    return record.count > maxRequests;
  }
  getPatternName(index) {
    const names = [
      "SQL Injection",
      "XSS Attack",
      "Path Traversal",
      "Command Injection",
      "Code Execution"
    ];
    return names[index] || "Unknown Pattern";
  }
  /**
   * Security middleware for Express
   */
  securityMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const securityCheck = this.detectSuspiciousActivity(req);
      if (securityCheck.isSuspicious) {
        const logData = {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          ip: req.ip || req.connection.remoteAddress,
          method: req.method,
          url: this.sanitizeForLog(req.originalUrl || req.url),
          userAgent: this.sanitizeForLog(req.headers["user-agent"] || ""),
          threats: securityCheck.threats,
          riskLevel: securityCheck.riskLevel,
          headers: this.sanitizeForLog(req.headers),
          body: req.body ? this.sanitizeForLog(req.body) : void 0
        };
        console.error(`\u{1F6A8} SECURITY ALERT [${securityCheck.riskLevel.toUpperCase()}]:`, JSON.stringify(logData, null, 2));
        if (securityCheck.riskLevel === "critical") {
          return res.status(403).json({
            error: "Request blocked for security reasons",
            requestId: `sec_${Date.now()}`
          });
        }
      }
      const originalSend = res.send;
      res.send = function(body) {
        const duration = Date.now() - startTime;
        if (res.statusCode >= 400 || req.method !== "GET") {
          const logData = {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            method: req.method,
            url: req.originalUrl || req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers["user-agent"] ? "[SANITIZED]" : void 0,
            // Don't log response body for security
            responseSize: typeof body === "string" ? body.length : 0
          };
          if (res.statusCode >= 500) {
            console.error("\u{1F525} SERVER ERROR:", JSON.stringify(logData, null, 2));
          } else if (res.statusCode >= 400) {
            console.warn("\u26A0\uFE0F  CLIENT ERROR:", JSON.stringify(logData, null, 2));
          } else {
            console.log("\u{1F4DD} REQUEST:", JSON.stringify(logData, null, 2));
          }
        }
        return originalSend.call(this, body);
      };
      next();
    };
  }
  /**
   * Rate limiting per IP
   */
  rateLimitMiddleware(maxRequests = 100, windowMs = 6e4) {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress || "unknown";
      if (this.isRapidRequests(ip)) {
        console.warn(`\u{1F6AB} RATE LIMIT: IP ${ip} exceeded ${maxRequests} requests per minute`);
        return res.status(429).json({
          error: "Too many requests",
          retryAfter: Math.ceil(windowMs / 1e3)
        });
      }
      next();
    };
  }
  /**
   * Clean up old rate limit records
   */
  cleanupRateLimitRecords() {
    const now = Date.now();
    const cutoff = 5 * 60 * 1e3;
    for (const [ip, record] of this.requestCounts.entries()) {
      if (now - record.lastReset > cutoff) {
        this.requestCounts.delete(ip);
      }
    }
  }
};
var securityLogger = new SecurityLogger();
setInterval(() => {
  securityLogger.cleanupRateLimitRecords();
}, 5 * 60 * 1e3);

// server/index.ts
var app = express2();
app.use(securityLogger.securityMiddleware());
app.use(securityLogger.rateLimitMiddleware(150, 6e4));
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      const basicLogLine = `${req.method} ${path3} ${res.statusCode} ${duration}ms`;
      if (res.statusCode >= 400) {
        console.error(`\u{1F525} API ERROR: ${basicLogLine}`);
      } else if (req.method !== "GET") {
        console.log(`\u{1F4DD} API: ${basicLogLine}`);
      }
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
