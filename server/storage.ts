import { users, bots, knowledge, transactions, settings, smmProviders, smmServices, smmOrders, autoBots, apiKeys, type User, type InsertUser, type Bot, type InsertBot, type Knowledge, type InsertKnowledge, type Transaction, type InsertTransaction, type Setting, type InsertSetting, type SmmProvider, type InsertSmmProvider, type SmmService, type InsertSmmService, type SmmOrder, type InsertSmmOrder, type AutoBot, type InsertAutoBot } from "@shared/schema";
import session from "express-session";
import { db, pool } from "./db";
import { eq, and, desc } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

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
  
  // Transaction management
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getTransactionByOrderId(orderId: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Settings management
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(key: string, value: string): Promise<Setting | undefined>;
  
  // SMM Provider management
  getSmmProvider(id: number): Promise<SmmProvider | undefined>;
  getSmmProvidersByUserId(userId: number): Promise<SmmProvider[]>;
  createSmmProvider(provider: InsertSmmProvider): Promise<SmmProvider>;
  updateSmmProvider(id: number, updates: Partial<SmmProvider>): Promise<SmmProvider | undefined>;
  deleteSmmProvider(id: number): Promise<boolean>;
  
  // SMM Service management
  getSmmService(id: number): Promise<SmmService | undefined>;
  getSmmServicesByUserId(userId: number): Promise<SmmService[]>;
  getSmmServicesByProviderId(providerId: number): Promise<SmmService[]>;
  getSmmServiceByMid(userId: number, mid: number): Promise<SmmService | undefined>;
  createSmmService(service: InsertSmmService): Promise<SmmService>;
  updateSmmService(id: number, updates: Partial<SmmService>): Promise<SmmService | undefined>;
  deleteSmmService(id: number): Promise<boolean>;
  getUsedMids(userId: number): Promise<number[]>;
  
  // SMM Order management
  getSmmOrder(id: number): Promise<SmmOrder | undefined>;
  getSmmOrderByOrderId(orderId: string): Promise<SmmOrder | undefined>;
  getSmmOrdersByUserId(userId: number, limit?: number, offset?: number): Promise<any[]>;
  createSmmOrder(order: InsertSmmOrder): Promise<SmmOrder>;
  updateSmmOrder(id: number, updates: Partial<SmmOrder>): Promise<SmmOrder | undefined>;

  // Auto Bot management
  createAutoBot(autoBot: InsertAutoBot): Promise<AutoBot>;
  getAutoBot(id: number): Promise<AutoBot | undefined>;
  getAutoBotsByUserId(userId: number): Promise<AutoBot[]>;
  updateAutoBot(id: number, updates: Partial<AutoBot>): Promise<AutoBot | undefined>;
  deleteAutoBot(id: number): Promise<boolean>;
  getAllAutoBots(): Promise<AutoBot[]>;
  getAutoBotByToken(token: string): Promise<AutoBot | undefined>;
  
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
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
    return (result.rowCount || 0) > 0;
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

  async createBot(botData: InsertBot & { userId: number; botName: string; botUsername: string }): Promise<Bot> {
    const [bot] = await db
      .insert(bots)
      .values({
        userId: botData.userId,
        token: botData.token,
        botName: botData.botName,
        botUsername: botData.botUsername,
        isActive: true,
        messageCount: 0,
      })
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
    return (result.rowCount || 0) > 0;
  }

  async getAllBots(): Promise<Bot[]> {
    return await db.select().from(bots);
  }

  // Knowledge methods
  async getKnowledge(id: number): Promise<Knowledge | undefined> {
    const [knowledgeItem] = await db.select().from(knowledge).where(eq(knowledge.id, id));
    return knowledgeItem || undefined;
  }

  async getKnowledgeByBotId(botId: number): Promise<Knowledge[]> {
    return await db.select().from(knowledge).where(eq(knowledge.botId, botId));
  }

  async createKnowledge(insertKnowledge: InsertKnowledge): Promise<Knowledge> {
    const [knowledgeItem] = await db
      .insert(knowledge)
      .values(insertKnowledge)
      .returning();
    return knowledgeItem;
  }

  async updateKnowledge(id: number, updates: Partial<Knowledge>): Promise<Knowledge | undefined> {
    const [knowledgeItem] = await db
      .update(knowledge)
      .set(updates)
      .where(eq(knowledge.id, id))
      .returning();
    return knowledgeItem || undefined;
  }

  async deleteKnowledge(id: number): Promise<boolean> {
    const result = await db.delete(knowledge).where(eq(knowledge.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Transaction methods
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId));
  }

  async getTransactionByOrderId(orderId: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.midtransOrderId, orderId));
    return transaction || undefined;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return transaction || undefined;
  }

  // Settings methods
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(insertSetting: InsertSetting): Promise<Setting> {
    const [setting] = await db
      .insert(settings)
      .values(insertSetting)
      .returning();
    return setting;
  }

  async updateSetting(key: string, value: string): Promise<Setting | undefined> {
    const [setting] = await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key))
      .returning();
    return setting || undefined;
  }

  // SMM Provider methods
  async getSmmProvider(id: number): Promise<SmmProvider | undefined> {
    const [provider] = await db.select().from(smmProviders).where(eq(smmProviders.id, id));
    return provider || undefined;
  }

  async getSmmProvidersByUserId(userId: number): Promise<SmmProvider[]> {
    return await db.select().from(smmProviders).where(eq(smmProviders.userId, userId));
  }

  async createSmmProvider(insertProvider: InsertSmmProvider): Promise<SmmProvider> {
    const [provider] = await db
      .insert(smmProviders)
      .values(insertProvider)
      .returning();
    return provider;
  }

  async updateSmmProvider(id: number, updates: Partial<SmmProvider>): Promise<SmmProvider | undefined> {
    const [provider] = await db
      .update(smmProviders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(smmProviders.id, id))
      .returning();
    return provider || undefined;
  }

  async deleteSmmProvider(id: number): Promise<boolean> {
    const result = await db.delete(smmProviders).where(eq(smmProviders.id, id));
    return (result.rowCount || 0) > 0;
  }

  // SMM Service methods
  async getSmmService(id: number): Promise<SmmService | undefined> {
    const [service] = await db.select().from(smmServices).where(eq(smmServices.id, id));
    return service || undefined;
  }

  async getSmmServicesByUserId(userId: number): Promise<SmmService[]> {
    return await db.select().from(smmServices).where(eq(smmServices.userId, userId));
  }

  async getSmmServicesByProviderId(providerId: number): Promise<SmmService[]> {
    return await db.select().from(smmServices).where(eq(smmServices.providerId, providerId));
  }

  async getSmmServiceByMid(userId: number, mid: number): Promise<SmmService | undefined> {
    const [service] = await db
      .select()
      .from(smmServices)
      .where(eq(smmServices.userId, userId) && eq(smmServices.mid, mid));
    return service || undefined;
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
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(smmServices.id, id))
      .returning();
    return service || undefined;
  }

  async deleteSmmService(id: number): Promise<boolean> {
    const result = await db.delete(smmServices).where(eq(smmServices.id, id));
    return result.rowCount > 0;
  }

  async getUsedMids(userId: number): Promise<number[]> {
    const services = await db
      .select({ mid: smmServices.mid })
      .from(smmServices)
      .where(eq(smmServices.userId, userId));
    return services.map(s => s.mid);
  }

  // SMM Order methods
  async getSmmOrder(id: number): Promise<SmmOrder | undefined> {
    const [order] = await db.select().from(smmOrders).where(eq(smmOrders.id, id));
    return order || undefined;
  }

  async getSmmOrderByOrderId(orderId: string): Promise<SmmOrder | undefined> {
    const [order] = await db.select().from(smmOrders).where(eq(smmOrders.orderId, orderId));
    return order || undefined;
  }

  async getSmmOrdersByUserId(userId: number, limit?: number, offset?: number): Promise<any[]> {
    const baseQuery = db
      .select({
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
        providerName: smmProviders.name,
      })
      .from(smmOrders)
      .innerJoin(smmServices, eq(smmOrders.serviceId, smmServices.id))
      .innerJoin(smmProviders, eq(smmOrders.providerId, smmProviders.id))
      .where(eq(smmOrders.userId, userId))
      .orderBy(desc(smmOrders.createdAt));

    let results;
    if (limit && offset !== undefined) {
      results = await baseQuery.limit(limit).offset(offset);
    } else if (limit) {
      results = await baseQuery.limit(limit);
    } else {
      results = await baseQuery;
    }
    
    // Transform the results to include nested objects
    return results.map(row => ({
      ...row,
      service: {
        name: row.serviceName,
        category: row.serviceCategory,
        rate: row.serviceRate,
        mid: row.serviceMid,
      },
      provider: {
        name: row.providerName,
      }
    }));
  }

  async createSmmOrder(insertOrder: InsertSmmOrder): Promise<SmmOrder> {
    const [order] = await db
      .insert(smmOrders)
      .values(insertOrder)
      .returning();
    return order;
  }

  async updateSmmOrder(id: number, updates: Partial<SmmOrder>): Promise<SmmOrder | undefined> {
    const [order] = await db
      .update(smmOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(smmOrders.id, id))
      .returning();
    return order || undefined;
  }

  // Auto Bot management
  async createAutoBot(insertAutoBot: InsertAutoBot): Promise<AutoBot> {
    const [autoBot] = await db
      .insert(autoBots)
      .values(insertAutoBot)
      .returning();
    return autoBot;
  }

  async getAutoBot(id: number): Promise<AutoBot | undefined> {
    const [autoBot] = await db
      .select()
      .from(autoBots)
      .where(eq(autoBots.id, id));
    return autoBot;
  }

  async getAutoBotsByUserId(userId: number): Promise<AutoBot[]> {
    return await db
      .select()
      .from(autoBots)
      .where(eq(autoBots.userId, userId))
      .orderBy(desc(autoBots.createdAt));
  }

  async updateAutoBot(id: number, updates: Partial<AutoBot>): Promise<AutoBot | undefined> {
    const [autoBot] = await db
      .update(autoBots)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(autoBots.id, id))
      .returning();
    return autoBot;
  }

  async deleteAutoBot(id: number): Promise<boolean> {
    const result = await db
      .delete(autoBots)
      .where(eq(autoBots.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getAllAutoBots(): Promise<AutoBot[]> {
    return await db
      .select()
      .from(autoBots)
      .orderBy(desc(autoBots.createdAt));
  }

  async getAutoBotByToken(token: string): Promise<AutoBot | undefined> {
    const [autoBot] = await db
      .select()
      .from(autoBots)
      .where(eq(autoBots.token, token));
    return autoBot;
  }

  // API Keys methods
  async getUserApiKeys(userId: number): Promise<any[]> {
    const result = await pool.query(
      'SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async createUserApiKey(data: any): Promise<any> {
    console.log("Storage: Creating API key with data:", data);
    
    const result = await pool.query(
      'INSERT INTO api_keys (name, user_id, api_key, api_endpoint, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
      [data.keyName, data.userId, data.apiKey, 'https://your-domain.replit.app/api/v2', data.isActive ?? true]
    );
    
    console.log("Storage: API key created:", result.rows[0]);
    return result.rows[0];
  }

  async getUserApiKey(id: number): Promise<any | undefined> {
    const result = await pool.query(
      'SELECT * FROM api_keys WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async updateUserApiKey(id: number, updates: any): Promise<any | undefined> {
    const setFields = [];
    const values = [];
    let valueIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      setFields.push(`${key} = $${valueIndex}`);
      values.push(value);
      valueIndex++;
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE api_keys SET ${setFields.join(', ')} WHERE id = $${valueIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteUserApiKey(id: number): Promise<void> {
    await pool.query(
      'DELETE FROM api_keys WHERE id = $1',
      [id]
    );
  }

}

export const storage = new DatabaseStorage();