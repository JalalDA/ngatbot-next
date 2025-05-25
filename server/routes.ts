import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { telegramBotManager } from "./telegram";
import { insertBotSchema, insertKnowledgeSchema, insertSettingSchema, insertSmmProviderSchema, insertSmmServiceSchema, insertSmmOrderSchema } from "@shared/schema";
import { createMidtransTransaction, generateOrderId, verifySignatureKey, getTransactionStatus, UPGRADE_PLANS, type PlanType } from "./midtrans";
import { SmmPanelAPI, generateSmmOrderId, generateMid, parseRate, calculateOrderAmount } from "./smm-panel";
import { z } from "zod";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Bot management routes
  app.post("/api/bots", requireAuth, async (req, res) => {
    try {
      // Create a custom schema that includes systemPrompt
      const createBotSchema = insertBotSchema.extend({
        systemPrompt: z.string().optional()
      });
      const validatedData = createBotSchema.parse(req.body);
      
      // Validate bot token with Telegram
      const validation = await telegramBotManager.validateBotToken(validatedData.token);
      if (!validation.valid) {
        return res.status(400).json({ message: "Invalid bot token" });
      }

      // Check if bot token already exists
      const existingBot = await storage.getBotByToken(validatedData.token);
      if (existingBot) {
        return res.status(400).json({ message: "Bot token already in use" });
      }

      // Create bot
      const bot = await storage.createBot({
        ...validatedData,
        userId: req.user.id,
        botName: validation.botInfo.first_name,
        botUsername: validation.botInfo.username,
      });

      // Auto-create system prompt as first knowledge item
      if (validatedData.systemPrompt) {
        await storage.createKnowledge({
          botId: bot.id,
          type: "text",
          content: validatedData.systemPrompt
        });
      }

      // Start the bot
      await telegramBotManager.startBot(bot.token, bot.id);

      res.status(201).json(bot);
    } catch (error) {
      console.error("Create bot error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bot" });
    }
  });

  app.get("/api/bots", requireAuth, async (req, res) => {
    try {
      const bots = await storage.getBotsByUserId(req.user.id);
      res.json(bots);
    } catch (error) {
      console.error("Get bots error:", error);
      res.status(500).json({ message: "Failed to retrieve bots" });
    }
  });

  app.delete("/api/bots/:id", requireAuth, async (req, res) => {
    try {
      const botId = parseInt(req.params.id);
      const bot = await storage.getBot(botId);
      
      if (!bot) {
        return res.status(404).json({ message: "Bot not found" });
      }
      
      if (bot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this bot" });
      }

      // Stop the bot
      await telegramBotManager.stopBot(bot.token);
      
      // Delete from storage
      await storage.deleteBot(botId);
      
      res.json({ message: "Bot deleted successfully" });
    } catch (error) {
      console.error("Delete bot error:", error);
      res.status(500).json({ message: "Failed to delete bot" });
    }
  });

  // Knowledge management routes
  app.post("/api/knowledge", requireAuth, async (req, res) => {
    try {
      const validatedData = insertKnowledgeSchema.parse(req.body);
      
      // Verify bot ownership
      const bot = await storage.getBot(validatedData.botId);
      if (!bot || bot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to add knowledge to this bot" });
      }

      const knowledge = await storage.createKnowledge(validatedData);
      res.status(201).json(knowledge);
    } catch (error) {
      console.error("Create knowledge error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create knowledge" });
    }
  });

  app.get("/api/knowledge/:botId", requireAuth, async (req, res) => {
    try {
      const botId = parseInt(req.params.botId);
      
      // Verify bot ownership
      const bot = await storage.getBot(botId);
      if (!bot || bot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this bot's knowledge" });
      }

      const knowledge = await storage.getKnowledgeByBotId(botId);
      res.json(knowledge);
    } catch (error) {
      console.error("Get knowledge error:", error);
      res.status(500).json({ message: "Failed to retrieve knowledge" });
    }
  });

  // Update knowledge
  app.put("/api/knowledge/:id", requireAuth, async (req, res) => {
    try {
      const knowledgeId = parseInt(req.params.id);
      const updateData = insertKnowledgeSchema.parse(req.body);
      
      const knowledge = await storage.getKnowledge(knowledgeId);
      if (!knowledge) {
        return res.status(404).json({ message: "Knowledge not found" });
      }

      // Verify bot ownership
      const bot = await storage.getBot(knowledge.botId);
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

  app.delete("/api/knowledge/:id", requireAuth, async (req, res) => {
    try {
      const knowledgeId = parseInt(req.params.id);
      const knowledge = await storage.getKnowledge(knowledgeId);
      
      if (!knowledge) {
        return res.status(404).json({ message: "Knowledge not found" });
      }

      // Verify bot ownership
      const bot = await storage.getBot(knowledge.botId);
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

  // User profile routes
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password
      const { password, ...userProfile } = user;
      res.json(userProfile);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to retrieve profile" });
    }
  });

  // Admin routes
  app.post("/api/admin/validate-secret", async (req, res) => {
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

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (username === "ilmi" && password === "ilmi123") {
        // Create a simple admin session
        req.session.isAdmin = true;
        res.json({ success: true, user: { username: "ilmi", role: "admin" } });
      } else {
        res.status(400).json({ success: false, message: "Invalid admin credentials" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to login as admin" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      const usersWithBotCount = await Promise.all(
        users.map(async (user) => {
          const bots = await storage.getBotsByUserId(user.id);
          const { password, ...userWithoutPassword } = user;
          return {
            ...userWithoutPassword,
            botCount: bots.length,
          };
        })
      );
      
      res.json(usersWithBotCount);
    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
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

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const userId = parseInt(req.params.id);
      
      // Delete user's bots first
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

  app.get("/api/admin/openai-status", async (req, res) => {
    try {
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const hasApiKey = !!process.env.OPENAI_API_KEY;
      let isConnected = false;
      
      if (hasApiKey) {
        try {
          const { checkOpenAIConnection } = await import("./openai");
          isConnected = await checkOpenAIConnection();
        } catch (error) {
          console.error("OpenAI connection check failed:", error);
        }
      }
      
      res.json({ 
        hasApiKey,
        isConnected,
        status: hasApiKey ? (isConnected ? "connected" : "key_invalid") : "not_configured"
      });
    } catch (error) {
      console.error("Check OpenAI status error:", error);
      res.status(500).json({ message: "Failed to check OpenAI status" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (!req.session.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      const bots = await storage.getAllBots();
      
      const stats = {
        totalUsers: users.length,
        activeBots: bots.filter(bot => bot.isActive).length,
        messagesCount: bots.reduce((sum, bot) => sum + bot.messageCount, 0),
        revenue: 0, // Mock value as payment is not implemented
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Failed to retrieve stats" });
    }
  });

  app.post("/api/admin/logout", async (req, res) => {
    try {
      req.session.isAdmin = false;
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // Real upgrade endpoint with Midtrans integration
  app.post("/api/upgrade", requireAuth, async (req, res) => {
    try {
      console.log("Upgrade endpoint called with plan:", req.body.plan);
      const { plan } = req.body;
      
      if (!plan || !UPGRADE_PLANS[plan as PlanType]) {
        console.log("Invalid plan:", plan);
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      const orderId = generateOrderId(req.user!.id, plan as PlanType);
      const user = req.user!;

      console.log("Creating Midtrans transaction for order:", orderId);

      // Create Midtrans transaction
      const transaction = await createMidtransTransaction({
        orderId,
        userId: user.id,
        userName: user.fullName || user.username,
        userEmail: user.email,
        plan: plan as PlanType,
      });

      console.log("Midtrans transaction created successfully");

      // Save transaction to database
      await storage.createTransaction({
        midtransOrderId: orderId,
        userId: user.id,
        plan,
        amount: UPGRADE_PLANS[plan as PlanType].price,
        status: "pending",
      });

      console.log("Transaction saved to database");

      res.json({
        snapToken: transaction.token,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
        orderId,
      });
    } catch (error) {
      console.error("Upgrade endpoint error:", error);
      res.status(500).json({ message: "Failed to create payment transaction", error: error.message });
    }
  });

  // Payment routes (mock implementation) 
  app.post("/api/payments/upgrade", requireAuth, async (req, res) => {
    try {
      const { plan } = req.body;
      
      // Mock payment redirect URL
      const paymentUrl = `https://app.midtrans.com/snap/v1/payment-page?plan=${plan}&user_id=${req.user.id}`;
      
      res.json({ 
        paymentUrl,
        message: "Redirecting to payment gateway (Mock)" 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Upgrade Plan Endpoints
  app.post("/api/upgrade-plan", requireAuth, async (req, res) => {
    try {
      const { plan } = req.body;
      
      if (!plan || !UPGRADE_PLANS[plan as PlanType]) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user already has this plan or higher
      if (user.level === plan || (user.level === 'business' && plan === 'pro')) {
        return res.status(400).json({ message: "You already have this plan or higher" });
      }

      const orderId = generateOrderId(user.id, plan as PlanType);
      const planConfig = UPGRADE_PLANS[plan as PlanType];

      // Create transaction record
      await storage.createTransaction({
        userId: user.id,
        plan,
        amount: planConfig.price,
        status: "pending",
        midtransOrderId: orderId,
        paymentInfo: JSON.stringify({ plan, credits: planConfig.credits })
      });

      // Create Midtrans transaction
      const midtransResult = await createMidtransTransaction({
        orderId,
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        plan: plan as PlanType
      });

      res.json({
        success: true,
        token: midtransResult.token,
        redirectUrl: midtransResult.redirectUrl,
        orderId: orderId,
        plan: planConfig
      });

    } catch (error) {
      console.error("Upgrade plan error:", error);
      res.status(500).json({ message: "Failed to create upgrade plan" });
    }
  });

  // Midtrans Payment Callback
  app.post("/api/payment-callback", async (req, res) => {
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

      // For development/sandbox, skip signature validation or make it optional
      const isValidSignature = process.env.NODE_ENV === 'development' || 
        verifySignatureKey(order_id, status_code, gross_amount, signature_key);

      if (!isValidSignature) {
        console.error("Invalid signature for order:", order_id);
        // In development, log but don't reject
        if (process.env.NODE_ENV !== 'development') {
          return res.status(400).json({ message: "Invalid signature" });
        }
        console.log("Signature validation skipped in development mode");
      }

      // Get transaction from database
      const transaction = await storage.getTransactionByOrderId(order_id);
      
      if (!transaction) {
        console.error("Transaction not found for order:", order_id);
        return res.status(404).json({ message: "Transaction not found" });
      }

      let newStatus = "pending";
      
      // Handle payment status - more comprehensive status handling
      console.log(`Processing payment status: ${transaction_status}, fraud_status: ${fraud_status}`);
      
      // Define successful payment statuses for Midtrans
      const successStatuses = ['capture', 'settlement', 'success'];
      const pendingStatuses = ['pending', 'authorize'];
      const failedStatuses = ['cancel', 'deny', 'expire', 'failure'];
      
      if (successStatuses.includes(transaction_status)) {
        if (!fraud_status || fraud_status === 'accept') {
          newStatus = "success";
          
          // Update user level and credits
          const planConfig = UPGRADE_PLANS[transaction.plan as PlanType];
          const currentUser = await storage.getUser(transaction.userId);
          
          if (currentUser && planConfig) {
            console.log(`✅ Upgrading user ${currentUser.id} from ${currentUser.level} to ${planConfig.level}`);
            console.log(`✅ Adding ${planConfig.credits} credits to current ${currentUser.credits} credits`);
            
            const newCredits = currentUser.credits + planConfig.credits;
            
            const updatedUser = await storage.updateUser(transaction.userId, {
              level: planConfig.level,
              credits: newCredits
            });
            
            console.log(`✅ User upgrade completed successfully!`);
            console.log(`   - New level: ${planConfig.level}`);
            console.log(`   - Total credits: ${newCredits}`);
            console.log(`   - Updated user:`, updatedUser);
          } else {
            console.error(`❌ Failed to upgrade user - User: ${currentUser ? 'found' : 'not found'}, Plan: ${planConfig ? 'found' : 'not found'}`);
          }
        } else {
          console.log(`⚠️ Payment success but fraud detected: ${fraud_status}`);
          newStatus = "failed";
        }
      } else if (pendingStatuses.includes(transaction_status)) {
        newStatus = "pending";
        console.log(`⏳ Payment still pending: ${transaction_status}`);
      } else if (failedStatuses.includes(transaction_status)) {
        newStatus = "failed";
        console.log(`❌ Payment failed: ${transaction_status}`);
      } else {
        console.log(`⚠️ Unknown payment status: ${transaction_status}, keeping as pending`);
        newStatus = "pending";
      }

      // Update transaction status
      await storage.updateTransaction(transaction.id, {
        status: newStatus,
        paymentInfo: JSON.stringify({
          ...JSON.parse(transaction.paymentInfo || '{}'),
          midtrans_response: req.body
        })
      });

      res.json({ success: true });

    } catch (error) {
      console.error("Payment callback error:", error);
      res.status(500).json({ message: "Payment callback failed" });
    }
  });

  // Check payment status manually (for frontend polling)
  app.get("/api/payment-status/:orderId", requireAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // Get transaction from database
      const transaction = await storage.getTransactionByOrderId(orderId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Check if transaction belongs to current user
      if (transaction.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      console.log(`🔍 Checking payment status for order: ${orderId}`);
      
      // Get status from Midtrans
      const midtransStatus = await getTransactionStatus(orderId);
      
      if (midtransStatus && midtransStatus.transaction_status) {
        const transactionStatus = midtransStatus.transaction_status;
        let newStatus = transaction.status;
        
        console.log(`💳 Midtrans status for ${orderId}: ${transactionStatus}`);
        
        // Process payment status similar to callback with improved logic
        const successStatuses = ['capture', 'settlement', 'success'];
        const failedStatuses = ['cancel', 'deny', 'expire', 'failure'];
        
        if (successStatuses.includes(transactionStatus)) {
          if (!midtransStatus.fraud_status || midtransStatus.fraud_status === 'accept') {
            newStatus = "success";
            
            // Update user level and credits if not already done
            if (transaction.status !== 'success') {
              console.log(`🎉 Payment successful! Upgrading user account...`);
              
              const planConfig = UPGRADE_PLANS[transaction.plan as PlanType];
              const currentUser = await storage.getUser(transaction.userId);
              
              if (currentUser && planConfig) {
                const newCredits = currentUser.credits + planConfig.credits;
                
                const updatedUser = await storage.updateUser(transaction.userId, {
                  level: planConfig.level,
                  credits: newCredits
                });
                
                console.log(`✅ User ${currentUser.id} upgraded successfully!`);
                console.log(`   - New level: ${planConfig.level}`);
                console.log(`   - Total credits: ${newCredits}`);
              }
            }
          }
        } else if (failedStatuses.includes(transactionStatus)) {
          newStatus = "failed";
          console.log(`❌ Payment failed with status: ${transactionStatus}`);
        }
        
        // Update transaction status if changed
        if (newStatus !== transaction.status) {
          await storage.updateTransaction(transaction.id, { status: newStatus });
          console.log(`📝 Transaction ${orderId} status updated to: ${newStatus}`);
        }
        
        res.json({
          orderId,
          status: newStatus,
          midtransStatus: transactionStatus,
          amount: transaction.amount,
          plan: transaction.plan
        });
      } else {
        console.log(`⚠️ No Midtrans status found for ${orderId}, using database status: ${transaction.status}`);
        res.json({
          orderId,
          status: transaction.status,
          amount: transaction.amount,
          plan: transaction.plan
        });
      }
    } catch (error) {
      console.error("❌ Payment status check error:", error);
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });

  // Get available upgrade plans
  app.get("/api/upgrade-plans", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const availablePlans = Object.entries(UPGRADE_PLANS)
        .filter(([planKey, planConfig]) => {
          // Don't show plans user already has or lower plans
          if (user.level === 'business') return false;
          if (user.level === 'pro' && planKey === 'pro') return false;
          return true;
        })
        .map(([key, config]) => ({
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

  // ===============================
  // SMM PANEL ROUTES
  // ===============================

  // Get all SMM providers for current user
  app.get("/api/smm/providers", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const providers = await storage.getSmmProvidersByUserId(user.id);
      res.json(providers);
    } catch (error) {
      console.error("Get SMM providers error:", error);
      res.status(500).json({ message: "Failed to fetch SMM providers" });
    }
  });

  // Create new SMM provider
  app.post("/api/smm/providers", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      console.log("Request body:", req.body);
      
      const { name, apiKey, apiEndpoint, isActive = true } = req.body;

      // Validate required fields
      if (!name || !apiKey || !apiEndpoint) {
        return res.status(400).json({ message: "Name, API key, and endpoint are required" });
      }

      // Simple validation instead of Zod
      const trimmedName = String(name).trim();
      const trimmedApiKey = String(apiKey).trim();
      const trimmedEndpoint = String(apiEndpoint).trim();

      if (trimmedName.length < 1) {
        return res.status(400).json({ message: "Provider name cannot be empty" });
      }

      if (trimmedApiKey.length < 1) {
        return res.status(400).json({ message: "API key cannot be empty" });
      }

      if (!trimmedEndpoint.startsWith('http')) {
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
      res.status(500).json({ message: "Failed to create SMM provider: " + (error as Error).message });
    }
  });

  // Update SMM provider
  app.put("/api/smm/providers/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const providerId = parseInt(req.params.id);
      const { name, apiKey, apiEndpoint, isActive } = req.body;

      // Check if provider belongs to user
      const existingProvider = await storage.getSmmProvider(providerId);
      if (!existingProvider || existingProvider.userId !== user.id) {
        return res.status(404).json({ message: "SMM provider not found" });
      }

      // Test connection if API details changed
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

  // Delete SMM provider
  app.delete("/api/smm/providers/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const providerId = parseInt(req.params.id);

      // Check if provider belongs to user
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

  // Update SMM provider
  app.put("/api/smm/providers/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const providerId = parseInt(req.params.id);
      const { name, apiKey, apiEndpoint, isActive } = req.body;

      // Check if provider exists and belongs to user
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

  // Get services from SMM provider (without importing)
  app.get("/api/smm/providers/:id/services", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const providerId = parseInt(req.params.id);

      // Check if provider exists and belongs to user
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

  // Import services from SMM provider
  app.post("/api/smm/providers/:id/import-services", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const providerId = parseInt(req.params.id);
      const { services: selectedServices } = req.body;

      // Check if provider belongs to user
      const provider = await storage.getSmmProvider(providerId);
      if (!provider || provider.userId !== user.id) {
        return res.status(404).json({ message: "SMM provider not found" });
      }

      if (!selectedServices || !Array.isArray(selectedServices)) {
        return res.status(400).json({ message: "No services provided for import" });
      }

      // Get used MIDs for this user
      const usedMids = await storage.getUsedMids(user.id);
      
      let importedCount = 0;
      const errors: string[] = [];

      for (const service of selectedServices) {
        try {
          // Auto-assign MID (1-10)
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

            importedCount++;
          }
        } catch (error) {
          errors.push(`Failed to import ${service.name}: ${(error as Error).message}`);
        }
      }

      res.json({
        message: `Successfully imported ${importedCount} services`,
        importedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Import services error:", error);
      res.status(500).json({ message: "Failed to import services from provider" });
    }
  });

  // Get all SMM services for current user
  app.get("/api/smm/services", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const services = await storage.getSmmServicesByUserId(user.id);
      res.json(services);
    } catch (error) {
      console.error("Get SMM services error:", error);
      res.status(500).json({ message: "Failed to fetch SMM services" });
    }
  });

  // Update SMM service
  app.put("/api/smm/services/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const serviceId = parseInt(req.params.id);
      const { name, description, min, max, rate, syncProvider, priceType, priceValue, isActive } = req.body;

      // Check if service belongs to user
      const existingService = await storage.getSmmService(serviceId);
      if (!existingService || existingService.userId !== user.id) {
        return res.status(404).json({ message: "SMM service not found" });
      }

      // Calculate final rate based on price type
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

  // Delete individual SMM service
  app.delete("/api/smm/services/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const serviceId = parseInt(req.params.id);

      // Check if service belongs to user
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

  // Bulk delete SMM services
  app.post("/api/smm/services/bulk-delete", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { serviceIds } = req.body;

      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return res.status(400).json({ message: "Invalid service IDs provided" });
      }

      let deletedCount = 0;
      const errors: string[] = [];

      for (const serviceId of serviceIds) {
        try {
          // Check if service belongs to user
          const service = await storage.getSmmService(serviceId);
          if (service && service.userId === user.id) {
            const success = await storage.deleteSmmService(serviceId);
            if (success) {
              deletedCount++;
            } else {
              errors.push(`Failed to delete service ID ${serviceId}`);
            }
          } else {
            errors.push(`Service ID ${serviceId} not found or access denied`);
          }
        } catch (error) {
          errors.push(`Error deleting service ID ${serviceId}: ${(error as Error).message}`);
        }
      }

      res.json({
        message: `Successfully deleted ${deletedCount} services`,
        deletedCount,
        totalRequested: serviceIds.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Bulk delete SMM services error:", error);
      res.status(500).json({ message: "Failed to bulk delete SMM services" });
    }
  });

  // Update provider balance
  app.post("/api/smm/providers/:id/update-balance", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const providerId = parseInt(req.params.id);

      // Check if provider belongs to user
      const provider = await storage.getSmmProvider(providerId);
      if (!provider || provider.userId !== user.id) {
        return res.status(404).json({ message: "Provider not found" });
      }

      // Get balance from SMM API
      const smmAPI = new SmmPanelAPI(provider.apiKey, provider.apiEndpoint);
      const balanceInfo = await smmAPI.getBalance();

      // Update provider with new balance
      const updatedProvider = await storage.updateSmmProvider(providerId, {
        balance: balanceInfo.balance.toString(),
        currency: balanceInfo.currency,
        balanceUpdatedAt: new Date()
      });

      res.json({
        balance: balanceInfo.balance,
        currency: balanceInfo.currency,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Update provider balance error:", error);
      res.status(500).json({ message: "Failed to update provider balance" });
    }
  });

  // Get SMM orders for current user
  app.get("/api/smm/orders", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const orders = await storage.getSmmOrdersByUserId(user.id);
      res.json(orders);
    } catch (error) {
      console.error("Get SMM orders error:", error);
      res.status(500).json({ message: "Failed to fetch SMM orders" });
    }
  });

  // Bot Non-AI Management Routes
  app.get("/api/chatbot-nonai/bots", requireAuth, async (req, res) => {
    try {
      // For now, return empty array since we don't have bot storage yet
      // In future, this would fetch user's bots from database
      res.json([]);
    } catch (error) {
      console.error("Get bots error:", error);
      res.status(500).json({ message: "Failed to fetch bots" });
    }
  });

  app.post("/api/chatbot-nonai/bots", requireAuth, async (req, res) => {
    try {
      const { name, token } = req.body;
      const user = req.user!;

      if (!name || !token) {
        return res.status(400).json({ message: "Nama bot dan token diperlukan" });
      }

      // Validate bot token by calling Telegram API
      const validateResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const validateResult = await validateResponse.json();

      if (!validateResult.ok) {
        return res.status(400).json({ 
          message: "Token bot tidak valid. Pastikan token dari @BotFather benar." 
        });
      }

      const botInfo = validateResult.result;

      // Set webhook URL
      const webhookUrl = `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/chatbot-nonai/webhook/${token}`;
      const webhookResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
        }),
      });

      const webhookResult = await webhookResponse.json();
      
      if (!webhookResult.ok) {
        return res.status(400).json({ 
          message: "Gagal mengatur webhook. Coba lagi nanti." 
        });
      }

      // For now, just return success with bot info
      // In future, save to database
      res.json({
        id: Date.now(),
        name: name,
        botName: botInfo.first_name,
        botUsername: botInfo.username,
        token: token,
        isActive: true,
        webhookUrl: webhookUrl,
        stats: {
          totalUsers: 0,
          totalOrders: 0,
          revenue: 0,
          activeUsers: 0
        }
      });
    } catch (error) {
      console.error("Create bot error:", error);
      res.status(500).json({ 
        message: "Gagal membuat bot. Pastikan token valid dan belum digunakan." 
      });
    }
  });

  app.get("/api/chatbot-nonai/stats", requireAuth, async (req, res) => {
    try {
      // Get basic stats from database
      const { db } = await import("./db.js");
      const { telegramUsers, orders } = await import("../shared/schema.js");
      const { count, sum } = await import("drizzle-orm");

      const [userCount] = await db.select({ count: count() }).from(telegramUsers);
      const [orderCount] = await db.select({ count: count() }).from(orders);
      const [revenueSum] = await db.select({ 
        total: sum(orders.price) 
      }).from(orders).where(eq(orders.status, "delivered"));

      res.json({
        totalUsers: userCount.count || 0,
        totalOrders: orderCount.count || 0,
        revenue: parseFloat(revenueSum.total || "0"),
        totalProducts: 1 // Currently only Canva
      });
    } catch (error) {
      console.error("Get stats error:", error);
      res.json({
        totalUsers: 0,
        totalOrders: 0,
        revenue: 0,
        totalProducts: 1
      });
    }
  });

  app.get("/api/chatbot-nonai/orders", requireAuth, async (req, res) => {
    try {
      const { db } = await import("./db.js");
      const { orders, telegramUsers } = await import("../shared/schema.js");
      const { eq } = await import("drizzle-orm");

      const ordersWithUsers = await db
        .select({
          id: orders.id,
          customerName: telegramUsers.firstName,
          product: orders.productName,
          amount: orders.price,
          status: orders.status,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .leftJoin(telegramUsers, eq(orders.telegramUserId, telegramUsers.id))
        .orderBy(orders.createdAt)
        .limit(50);

      res.json(ordersWithUsers);
    } catch (error) {
      console.error("Get orders error:", error);
      res.json([]);
    }
  });

  // Chatbot Non-AI Webhook Routes
  app.post("/api/chatbot-nonai/webhook/:botToken", async (req, res) => {
    try {
      const { botToken } = req.params;
      const update = req.body;

      // Import chatbot service
      const { createChatbotService } = await import("./chatbot-nonai.js");
      const chatbotService = createChatbotService(botToken);

      // Process webhook update
      await chatbotService.processWebhookUpdate(update);

      res.json({ ok: true });
    } catch (error) {
      console.error("Chatbot webhook error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Check payment status for chatbot orders
  app.post("/api/chatbot-nonai/check-payment", async (req, res) => {
    try {
      const { orderId, botToken } = req.body;

      if (!orderId || !botToken) {
        return res.status(400).json({ error: "Order ID and bot token required" });
      }

      const { createChatbotService } = await import("./chatbot-nonai.js");
      const chatbotService = createChatbotService(botToken);

      const result = await chatbotService.checkPaymentStatus(orderId);
      res.json(result);
    } catch (error) {
      console.error("Check payment status error:", error);
      res.status(500).json({ error: "Failed to check payment status" });
    }
  });

  // Midtrans notification handler for chatbot orders
  app.post("/api/chatbot-nonai/midtrans-notification", async (req, res) => {
    try {
      const notification = req.body;
      const orderId = notification.order_id;
      const transactionStatus = notification.transaction_status;

      console.log("Midtrans notification for chatbot:", notification);

      if (transactionStatus === "settlement" || transactionStatus === "capture") {
        // Import necessary modules
        const { db } = await import("./db.js");
        const { orders, telegramUsers } = await import("../shared/schema.js");
        const { eq } = await import("drizzle-orm");

        // Find order
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.midtransOrderId, orderId))
          .limit(1);

        if (order && order.status === "pending") {
          // Update order status
          await db
            .update(orders)
            .set({
              status: "paid",
              updatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));

          // Get telegram user info
          const [telegramUser] = await db
            .select()
            .from(telegramUsers)
            .where(eq(telegramUsers.id, order.telegramUserId))
            .limit(1);

          if (telegramUser) {
            // Create dummy chatbot service to deliver product
            const { createChatbotService } = await import("./chatbot-nonai.js");
            const chatbotService = createChatbotService("DUMMY_TOKEN"); // We only need delivery function
            
            await chatbotService.deliverProduct(order);
          }
        }
      }

      res.json({ status: "ok" });
    } catch (error) {
      console.error("Midtrans notification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Start bot manager after a delay to ensure database is ready
  setTimeout(async () => {
    try {
      await telegramBotManager.restartAllBots();
    } catch (error) {
      console.error("Failed to restart bots on server start:", error);
    }
  }, 1000);

  const httpServer = createServer(app);
  return httpServer;
}
