import { users, bots, knowledge, smmServices, nonAiChatbots, botFlows, type User, type InsertUser, type Bot, type InsertBot, type Knowledge, type InsertKnowledge, type SmmService, type InsertSmmService, type NonAiChatbot, type InsertNonAiChatbot, type BotFlow, type InsertBotFlow } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq } from "drizzle-orm";
import SQLiteStore from "connect-sqlite3";

const SQLiteSessionStore = SQLiteStore(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Bot management
  getBot(id: number): Promise<Bot | undefined>;
  getBotsByUserId(userId: number): Promise<Bot[]>;
  getBotByToken(token: string): Promise<Bot | undefined>;
  createBot(bot: InsertBot & { userId: number; botName: string; botUsername: string }): Promise<Bot>;
  updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined>;
  deleteBot(id: number): Promise<boolean>;
  getAllBots(): Promise<Bot[]>;

  // Knowledge management
  getKnowledge(id: number): Promise<Knowledge | undefined>;
  getKnowledgeByBotId(botId: number): Promise<Knowledge[]>;
  createKnowledge(knowledge: InsertKnowledge): Promise<Knowledge>;
  updateKnowledge(id: number, updates: Partial<Knowledge>): Promise<Knowledge | undefined>;
  deleteKnowledge(id: number): Promise<boolean>;

  // SMM Services management
  getSmmService(id: number): Promise<SmmService | undefined>;
  getAllSmmServices(): Promise<SmmService[]>;
  createSmmService(service: InsertSmmService): Promise<SmmService>;
  updateSmmService(id: number, updates: Partial<SmmService>): Promise<SmmService | undefined>;
  deleteSmmService(id: number): Promise<boolean>;

  // Non-AI Chatbot management
  getNonAiChatbot(id: number): Promise<NonAiChatbot | undefined>;
  getNonAiChatbotsByUserId(userId: number): Promise<NonAiChatbot[]>;
  getNonAiChatbotByToken(token: string): Promise<NonAiChatbot | undefined>;
  createNonAiChatbot(chatbot: InsertNonAiChatbot): Promise<NonAiChatbot>;
  updateNonAiChatbot(id: number, updates: Partial<NonAiChatbot>): Promise<NonAiChatbot | undefined>;
  deleteNonAiChatbot(id: number): Promise<boolean>;

  // Bot Flow management
  getBotFlow(id: number): Promise<BotFlow | undefined>;
  getBotFlowsByChatbotId(chatbotId: number): Promise<BotFlow[]>;
  getBotFlowByCommand(chatbotId: number, command: string): Promise<BotFlow | undefined>;
  createBotFlow(flow: InsertBotFlow): Promise<BotFlow>;
  updateBotFlow(id: number, updates: Partial<BotFlow>): Promise<BotFlow | undefined>;
  deleteBotFlow(id: number): Promise<boolean>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new SQLiteSessionStore({ 
      db: 'sessions.db',
      dir: '.',
      table: 'sessions'
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        role: "user",
        level: "basic", 
        credits: 250,
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Bot methods
  async getBot(id: number): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.id, id));
    return bot || undefined;
  }

  async getBotsByUserId(userId: number): Promise<Bot[]> {
    return await db.select().from(bots).where(eq(bots.userId, userId));
  }

  async getBotByToken(token: string): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots).where(eq(bots.token, token));
    return bot || undefined;
  }

  async createBot(insertBot: InsertBot & { userId: number; botName: string; botUsername: string }): Promise<Bot> {
    const [bot] = await db
      .insert(bots)
      .values(insertBot)
      .returning();
    return bot;
  }

  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined> {
    const [bot] = await db
      .update(bots)
      .set(updates)
      .where(eq(bots.id, id))
      .returning();
    return bot || undefined;
  }

  async deleteBot(id: number): Promise<boolean> {
    const result = await db.delete(bots).where(eq(bots.id, id));
    return result.rowCount > 0;
  }

  async getAllBots(): Promise<Bot[]> {
    return await db.select().from(bots);
  }

  // Knowledge methods
  async getKnowledge(id: number): Promise<Knowledge | undefined> {
    const [knowledge] = await db.select().from(knowledge).where(eq(knowledge.id, id));
    return knowledge || undefined;
  }

  async getKnowledgeByBotId(botId: number): Promise<Knowledge[]> {
    return await db.select().from(knowledge).where(eq(knowledge.botId, botId));
  }

  async createKnowledge(insertKnowledge: InsertKnowledge): Promise<Knowledge> {
    const [knowledge] = await db
      .insert(knowledge)
      .values(insertKnowledge)
      .returning();
    return knowledge;
  }

  async updateKnowledge(id: number, updates: Partial<Knowledge>): Promise<Knowledge | undefined> {
    const [knowledge] = await db
      .update(knowledge)
      .set(updates)
      .where(eq(knowledge.id, id))
      .returning();
    return knowledge || undefined;
  }

  async deleteKnowledge(id: number): Promise<boolean> {
    const result = await db.delete(knowledge).where(eq(knowledge.id, id));
    return result.rowCount > 0;
  }

  // SMM Services methods
  async getSmmService(id: number): Promise<SmmService | undefined> {
    const [service] = await db.select().from(smmServices).where(eq(smmServices.id, id));
    return service || undefined;
  }

  async getAllSmmServices(): Promise<SmmService[]> {
    return await db.select().from(smmServices);
  }

  async createSmmService(insertService: InsertSmmService): Promise<SmmService> {
    const [service] = await db
      .insert(smmServices)
      .values(insertService)
      .returning();
    return service;
  }

  async updateSmmService(id: number, updates: Partial<SmmService>): Promise<SmmService | undefined> {
    const [service] = await db
      .update(smmServices)
      .set(updates)
      .where(eq(smmServices.id, id))
      .returning();
    return service || undefined;
  }

  async deleteSmmService(id: number): Promise<boolean> {
    const result = await db.delete(smmServices).where(eq(smmServices.id, id));
    return result.rowCount > 0;
  }

  // Non-AI Chatbot methods
  async getNonAiChatbot(id: number): Promise<NonAiChatbot | undefined> {
    const [chatbot] = await db.select().from(nonAiChatbots).where(eq(nonAiChatbots.id, id));
    return chatbot || undefined;
  }

  async getNonAiChatbotsByUserId(userId: number): Promise<NonAiChatbot[]> {
    return await db.select().from(nonAiChatbots).where(eq(nonAiChatbots.userId, userId));
  }

  async getNonAiChatbotByToken(token: string): Promise<NonAiChatbot | undefined> {
    const [chatbot] = await db.select().from(nonAiChatbots).where(eq(nonAiChatbots.botToken, token));
    return chatbot || undefined;
  }

  async createNonAiChatbot(insertChatbot: InsertNonAiChatbot): Promise<NonAiChatbot> {
    const [chatbot] = await db
      .insert(nonAiChatbots)
      .values(insertChatbot)
      .returning();
    return chatbot;
  }

  async updateNonAiChatbot(id: number, updates: Partial<NonAiChatbot>): Promise<NonAiChatbot | undefined> {
    const [chatbot] = await db
      .update(nonAiChatbots)
      .set(updates)
      .where(eq(nonAiChatbots.id, id))
      .returning();
    return chatbot || undefined;
  }

  async deleteNonAiChatbot(id: number): Promise<boolean> {
    const result = await db.delete(nonAiChatbots).where(eq(nonAiChatbots.id, id));
    return result.rowCount > 0;
  }

  // Bot Flow methods
  async getBotFlow(id: number): Promise<BotFlow | undefined> {
    const [flow] = await db.select().from(botFlows).where(eq(botFlows.id, id));
    return flow || undefined;
  }

  async getBotFlowsByChatbotId(chatbotId: number): Promise<BotFlow[]> {
    return await db.select().from(botFlows).where(eq(botFlows.chatbotId, chatbotId));
  }

  async getBotFlowByCommand(chatbotId: number, command: string): Promise<BotFlow | undefined> {
    const [flow] = await db.select().from(botFlows)
      .where(eq(botFlows.chatbotId, chatbotId))
      .where(eq(botFlows.command, command));
    return flow || undefined;
  }

  async createBotFlow(insertFlow: InsertBotFlow): Promise<BotFlow> {
    const [flow] = await db
      .insert(botFlows)
      .values(insertFlow)
      .returning();
    return flow;
  }

  async updateBotFlow(id: number, updates: Partial<BotFlow>): Promise<BotFlow | undefined> {
    const [flow] = await db
      .update(botFlows)
      .set(updates)
      .where(eq(botFlows.id, id))
      .returning();
    return flow || undefined;
  }

  async deleteBotFlow(id: number): Promise<boolean> {
    const result = await db.delete(botFlows).where(eq(botFlows.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();