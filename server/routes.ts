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

  // ===============================
  // NON-AI CHATBOT BUILDER ROUTES
  // ===============================

  // Get all non-AI chatbots for current user
  app.get("/api/nonai-chatbots", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const chatbots = await storage.getNonAiChatbotsByUserId(user.id);
      res.json(chatbots);
    } catch (error) {
      console.error("Get non-AI chatbots error:", error);
      res.status(500).json({ message: "Failed to fetch non-AI chatbots" });
    }
  });

  // Create new non-AI chatbot
  app.post("/api/nonai-chatbots", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { botToken } = req.body;

      console.log("=== Creating Non-AI Chatbot ===");
      console.log("User ID:", user.id);
      console.log("Bot Token provided:", botToken ? "Yes" : "No");

      if (!botToken) {
        console.log("ERROR: No bot token provided");
        return res.status(400).json({ message: "Token bot diperlukan" });
      }

      // Validate bot token with Telegram API
      console.log("Step 1: Validating bot token with Telegram...");
      const { NonAiChatbotService } = await import("./non-ai-chatbot");
      const validation = await NonAiChatbotService.validateBotToken(botToken);
      
      console.log("Validation result:", validation);
      
      if (!validation.valid) {
        console.log("ERROR: Bot token validation failed:", validation.error);
        return res.status(400).json({ 
          message: validation.error || "Token tidak valid. Pastikan token dari @BotFather benar." 
        });
      }

      console.log("Step 2: Checking if bot token already exists...");
      // Check if bot token already exists
      const existingBot = await storage.getNonAiChatbotByToken(botToken);
      if (existingBot) {
        console.log("ERROR: Bot token already exists");
        return res.status(400).json({ message: "Token bot sudah digunakan" });
      }

      console.log("Step 3: Creating bot in database...");
      // Generate webhook URL
      const webhookUrl = NonAiChatbotService.generateWebhookUrl(0); // Will be updated after creation

      // Create chatbot
      const chatbot = await storage.createNonAiChatbot({
        userId: user.id,
        botToken,
        botUsername: validation.botInfo!.username,
        botName: validation.botInfo!.first_name,
        webhookUrl: webhookUrl.replace('/0', `/${0}`), // Placeholder
        isActive: true
      });

      console.log("Bot created successfully:", chatbot.id);

      console.log("Step 4: Updating webhook URL...");
      // Update webhook URL with actual bot ID
      const actualWebhookUrl = NonAiChatbotService.generateWebhookUrl(chatbot.id);
      await storage.updateNonAiChatbot(chatbot.id, { webhookUrl: actualWebhookUrl });

      console.log("Step 5: Setting webhook with Telegram...");
      // Set webhook with Telegram
      const webhookResult = await NonAiChatbotService.setWebhook(botToken, actualWebhookUrl);
      if (!webhookResult.success) {
        console.warn("Failed to set webhook:", webhookResult.error);
        // Don't fail the creation if webhook fails - user can still use the bot
      }

      console.log("=== Non-AI Chatbot Created Successfully ===");
      res.status(201).json({ ...chatbot, webhookUrl: actualWebhookUrl });
    } catch (error) {
      console.error("=== Create non-AI chatbot error ===");
      console.error("Error details:", error);
      console.error("Error message:", error instanceof Error ? error.message : 'Unknown error');
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      
      // Provide more specific error messages
      let errorMessage = "Gagal membuat chatbot";
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = "Token bot sudah digunakan";
        } else if (error.message.includes('invalid') || error.message.includes('token')) {
          errorMessage = "Token tidak valid atau tidak dapat menghubungi Telegram";
        } else if (error.message.includes('database') || error.message.includes('connection')) {
          errorMessage = "Error database. Coba lagi dalam beberapa saat";
        } else if (error.message.includes('webhook')) {
          errorMessage = "Bot berhasil dibuat tetapi gagal mengatur webhook";
        }
      }
      
      res.status(500).json({ message: errorMessage });
    }
  });

  // Get specific non-AI chatbot
  app.get("/api/nonai-chatbots/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const chatbotId = parseInt(req.params.id);
      
      const chatbot = await storage.getNonAiChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== user.id) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      res.json(chatbot);
    } catch (error) {
      console.error("Get non-AI chatbot error:", error);
      res.status(500).json({ message: "Failed to fetch non-AI chatbot" });
    }
  });

  // Update non-AI chatbot
  app.put("/api/nonai-chatbots/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const chatbotId = parseInt(req.params.id);
      const { botName, isActive } = req.body;

      const chatbot = await storage.getNonAiChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== user.id) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      const updatedChatbot = await storage.updateNonAiChatbot(chatbotId, {
        botName,
        isActive
      });

      res.json(updatedChatbot);
    } catch (error) {
      console.error("Update non-AI chatbot error:", error);
      res.status(500).json({ message: "Failed to update non-AI chatbot" });
    }
  });

  // Delete non-AI chatbot
  app.delete("/api/nonai-chatbots/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const chatbotId = parseInt(req.params.id);

      const chatbot = await storage.getNonAiChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== user.id) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      // Remove webhook from Telegram
      const { NonAiChatbotService } = await import("./non-ai-chatbot");
      await NonAiChatbotService.removeWebhook(chatbot.botToken);

      // Delete chatbot (flows will be cascade deleted)
      await storage.deleteNonAiChatbot(chatbotId);

      res.json({ message: "Chatbot deleted successfully" });
    } catch (error) {
      console.error("Delete non-AI chatbot error:", error);
      res.status(500).json({ message: "Failed to delete non-AI chatbot" });
    }
  });

  // Get bot flows for specific chatbot
  app.get("/api/nonai-chatbots/:id/flows", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const chatbotId = parseInt(req.params.id);

      const chatbot = await storage.getNonAiChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== user.id) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      const flows = await storage.getBotFlowsByChatbotId(chatbotId);
      res.json(flows);
    } catch (error) {
      console.error("Get bot flows error:", error);
      res.status(500).json({ message: "Failed to fetch bot flows" });
    }
  });

  // Create new bot flow
  app.post("/api/nonai-chatbots/:id/flows", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const chatbotId = parseInt(req.params.id);
      const { command, type, text, buttons, parentCommand, inlineButtons } = req.body;
      
      console.log("Create flow data received:", {
        command,
        type,
        text,
        buttons,
        parentCommand,
        inlineButtons
      });

      const chatbot = await storage.getNonAiChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== user.id) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      // Validate required fields
      if (!command || !type || !text) {
        return res.status(400).json({ message: "Command, type, and text are required" });
      }

      if (type !== "menu" && type !== "text") {
        return res.status(400).json({ message: "Type must be 'menu' or 'text'" });
      }

      if (type === "menu" && (!buttons || !Array.isArray(buttons) || buttons.length === 0)) {
        return res.status(400).json({ message: "Buttons are required for menu type" });
      }

      // Check if command already exists for this chatbot
      const existingFlow = await storage.getBotFlowByCommand(chatbotId, command);
      if (existingFlow) {
        return res.status(400).json({ message: "Command already exists for this chatbot" });
      }

      const flow = await storage.createBotFlow({
        chatbotId,
        command,
        type,
        text,
        buttons: type === "menu" ? buttons : null,
        parentCommand,
        inlineButtons: inlineButtons || null
      });

      res.status(201).json(flow);
    } catch (error) {
      console.error("Create bot flow error:", error);
      res.status(500).json({ message: "Failed to create bot flow" });
    }
  });

  // Create example flows
  app.post("/api/nonai-chatbots/:chatbotId/create-example", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const chatbotId = parseInt(req.params.chatbotId);

      const chatbot = await storage.getNonAiChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== user.id) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      // Create example flows structure
      const exampleFlows = [
        // Main menu (/start)
        {
          chatbotId,
          command: "/start",
          type: "menu" as const,
          text: "🤖 Selamat datang! Pilih menu di bawah ini:",
          buttons: ["🎯 Fitur", "💰 Harga", "📞 Kontak", "ℹ️ Info"],
          parentCommand: null
        },
        // Fitur submenu
        {
          chatbotId,
          command: "🎯 Fitur",
          type: "menu" as const,
          text: "🎯 Berikut adalah fitur-fitur kami:",
          buttons: ["⚡ Fitur A", "🚀 Fitur B", "🔧 Fitur C", "🔙 Kembali ke Menu Utama"],
          parentCommand: "/start"
        },
        // Fitur A detail
        {
          chatbotId,
          command: "⚡ Fitur A",
          type: "menu" as const,
          text: "⚡ Fitur A - Solusi cepat dan mudah!\n\nDeskripsi lengkap tentang Fitur A yang amazing ini.",
          buttons: ["📖 Detail Lebih", "💡 Cara Pakai", "🔙 Kembali ke Fitur"],
          parentCommand: "🎯 Fitur"
        },
        // Fitur B detail
        {
          chatbotId,
          command: "🚀 Fitur B",
          type: "text" as const,
          text: "🚀 Fitur B - Teknologi terdepan!\n\nIni adalah penjelasan detail tentang Fitur B yang revolusioner.",
          buttons: null,
          parentCommand: "🎯 Fitur"
        },
        // Fitur C detail
        {
          chatbotId,
          command: "🔧 Fitur C",
          type: "text" as const,
          text: "🔧 Fitur C - Customizable sesuai kebutuhan!\n\nFitur C memberikan fleksibilitas maksimal untuk kebutuhan Anda.",
          buttons: null,
          parentCommand: "🎯 Fitur"
        },
        // Harga submenu
        {
          chatbotId,
          command: "💰 Harga",
          type: "menu" as const,
          text: "💰 Paket harga kami:",
          buttons: ["📦 Paket Basic", "⭐ Paket Pro", "👑 Paket Premium", "🔙 Kembali ke Menu Utama"],
          parentCommand: "/start"
        },
        // Paket Basic
        {
          chatbotId,
          command: "📦 Paket Basic",
          type: "text" as const,
          text: "📦 Paket Basic - Rp 100.000/bulan\n\n✅ Fitur A\n✅ Support email\n✅ 1 user\n\nCocok untuk pemula!",
          buttons: null,
          parentCommand: "💰 Harga"
        },
        // Paket Pro
        {
          chatbotId,
          command: "⭐ Paket Pro",
          type: "text" as const,
          text: "⭐ Paket Pro - Rp 250.000/bulan\n\n✅ Semua fitur Basic\n✅ Fitur B & C\n✅ Support prioritas\n✅ 5 users\n\nPilihan terpopuler!",
          buttons: null,
          parentCommand: "💰 Harga"
        },
        // Paket Premium
        {
          chatbotId,
          command: "👑 Paket Premium",
          type: "text" as const,
          text: "👑 Paket Premium - Rp 500.000/bulan\n\n✅ Semua fitur Pro\n✅ Custom development\n✅ Dedicated support\n✅ Unlimited users\n\nSolusi enterprise!",
          buttons: null,
          parentCommand: "💰 Harga"
        },
        // Kontak
        {
          chatbotId,
          command: "📞 Kontak",
          type: "text" as const,
          text: "📞 Hubungi kami:\n\n📧 Email: support@perusahaan.com\n📱 WhatsApp: +62 812-3456-7890\n🌐 Website: www.perusahaan.com\n\nKami siap membantu Anda!",
          buttons: null,
          parentCommand: "/start"
        },
        // Info
        {
          chatbotId,
          command: "ℹ️ Info",
          type: "text" as const,
          text: "ℹ️ Tentang Kami\n\nPerusahaan technology terdepan yang berfokus pada inovasi dan kepuasan pelanggan.\n\nBerdiri sejak 2020, kami telah melayani 1000+ klients dengan tingkat kepuasan 98%.",
          buttons: null,
          parentCommand: "/start"
        },
        // Back buttons navigation
        {
          chatbotId,
          command: "🔙 Kembali ke Menu Utama",
          type: "menu" as const,
          text: "🤖 Selamat datang! Pilih menu di bawah ini:",
          buttons: ["🎯 Fitur", "💰 Harga", "📞 Kontak", "ℹ️ Info"],
          parentCommand: null
        },
        {
          chatbotId,
          command: "🔙 Kembali ke Fitur",
          type: "menu" as const,
          text: "🎯 Berikut adalah fitur-fitur kami:",
          buttons: ["⚡ Fitur A", "🚀 Fitur B", "🔧 Fitur C", "🔙 Kembali ke Menu Utama"],
          parentCommand: "/start"
        }
      ];

      // Create flows one by one
      for (const flowData of exampleFlows) {
        try {
          await storage.createBotFlow(flowData);
        } catch (error) {
          // Skip if flow already exists
          console.log(`Flow ${flowData.command} already exists, skipping...`);
        }
      }

      res.json({ message: "Example flows created successfully", count: exampleFlows.length });
    } catch (error) {
      console.error("Create example flows error:", error);
      res.status(500).json({ message: "Failed to create example flows" });
    }
  });

  // Update bot flow
  app.put("/api/nonai-chatbots/:chatbotId/flows/:flowId", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const chatbotId = parseInt(req.params.chatbotId);
      const flowId = parseInt(req.params.flowId);
      const { command, type, text, buttons, parentCommand, inlineButtons } = req.body;

      const chatbot = await storage.getNonAiChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== user.id) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      const flow = await storage.getBotFlow(flowId);
      if (!flow || flow.chatbotId !== chatbotId) {
        return res.status(404).json({ message: "Bot flow not found" });
      }

      const updatedFlow = await storage.updateBotFlow(flowId, {
        command,
        type,
        text,
        buttons: type === "menu" ? buttons : null,
        parentCommand,
        inlineButtons: inlineButtons || null
      });

      res.json(updatedFlow);
    } catch (error) {
      console.error("Update bot flow error:", error);
      res.status(500).json({ message: "Failed to update bot flow" });
    }
  });

  // Delete bot flow
  app.delete("/api/nonai-chatbots/:chatbotId/flows/:flowId", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const chatbotId = parseInt(req.params.chatbotId);
      const flowId = parseInt(req.params.flowId);

      const chatbot = await storage.getNonAiChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== user.id) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      const flow = await storage.getBotFlow(flowId);
      if (!flow || flow.chatbotId !== chatbotId) {
        return res.status(404).json({ message: "Bot flow not found" });
      }

      await storage.deleteBotFlow(flowId);
      res.json({ message: "Bot flow deleted successfully" });
    } catch (error) {
      console.error("Delete bot flow error:", error);
      res.status(500).json({ message: "Failed to delete bot flow" });
    }
  });

  // Webhook handler for non-AI chatbots
  app.post("/api/webhook/nonai/:chatbotId", async (req, res) => {
    try {
      const chatbotId = parseInt(req.params.chatbotId);
      const update = req.body;

      console.log("=== Webhook received ===");
      console.log("Chatbot ID:", chatbotId);
      console.log("Update:", JSON.stringify(update, null, 2));

      // Get chatbot
      const chatbot = await storage.getNonAiChatbot(chatbotId);
      if (!chatbot || !chatbot.isActive) {
        return res.status(404).json({ message: "Chatbot not found or inactive" });
      }

      // Process webhook update
      const { NonAiChatbotService, WebhookProcessor } = await import("./non-ai-chatbot");
      
      const { chatId, text, messageType } = WebhookProcessor.extractUserInput(update);
      
      console.log("Extracted input:", { chatId, text, messageType });

      // Find matching flow for the command/button text
      const flow = await storage.getBotFlowByCommand(chatbotId, text);
      
      console.log("Found flow:", flow ? `${flow.command} (${flow.type})` : "None");

      if (flow) {
        // Send response based on flow type
        if (flow.type === "menu") {
          const replyMarkup = NonAiChatbotService.createKeyboardMarkup(flow.buttons || []);
          await NonAiChatbotService.sendMessage(chatbot.botToken, chatId, flow.text, replyMarkup);
          console.log("Sent menu response with buttons:", flow.buttons);
        } else {
          // Check if flow has inline buttons
          let replyMarkup = null;
          if (flow.inlineButtons && flow.inlineButtons.trim()) {
            replyMarkup = NonAiChatbotService.createInlineKeyboardMarkup(flow.inlineButtons);
            console.log("Using inline keyboard for text flow");
          }
          await NonAiChatbotService.sendMessage(chatbot.botToken, chatId, flow.text, replyMarkup);
          console.log("Sent text response:", flow.text);
        }
      } else {
        // Try to find if this text matches any button and get its target flow
        const allFlows = await storage.getBotFlowsByChatbotId(chatbotId);
        let targetFlow = null;

        // Look for a flow that has this text as one of its buttons
        for (const checkFlow of allFlows) {
          if (checkFlow.buttons && checkFlow.buttons.includes(text)) {
            // Found a button match, now look for a flow with the same command as the button text
            targetFlow = await storage.getBotFlowByCommand(chatbotId, text);
            break;
          }
        }

        if (targetFlow) {
          console.log("Found target flow for button:", targetFlow.command);
          if (targetFlow.type === "menu") {
            const replyMarkup = NonAiChatbotService.createKeyboardMarkup(targetFlow.buttons || []);
            await NonAiChatbotService.sendMessage(chatbot.botToken, chatId, targetFlow.text, replyMarkup);
          } else {
            // Check if flow has inline buttons
            let replyMarkup = null;
            if (targetFlow.inlineButtons && targetFlow.inlineButtons.trim()) {
              replyMarkup = NonAiChatbotService.createInlineKeyboardMarkup(targetFlow.inlineButtons);
              console.log("Using inline keyboard for target flow");
            }
            await NonAiChatbotService.sendMessage(chatbot.botToken, chatId, targetFlow.text, replyMarkup);
          }
        } else {
          // Default response or /start command
          if (text === "/start") {
            const startFlow = await storage.getBotFlowByCommand(chatbotId, "/start");
            if (startFlow) {
              if (startFlow.type === "menu") {
                const replyMarkup = NonAiChatbotService.createKeyboardMarkup(startFlow.buttons || []);
                await NonAiChatbotService.sendMessage(chatbot.botToken, chatId, startFlow.text, replyMarkup);
              } else {
                await NonAiChatbotService.sendMessage(chatbot.botToken, chatId, startFlow.text);
              }
            } else {
              await NonAiChatbotService.sendMessage(chatbot.botToken, chatId, "🤖 Bot siap! Silakan konfigurasikan flow Anda di dashboard.");
            }
          } else {
            await NonAiChatbotService.sendMessage(chatbot.botToken, chatId, "❌ Perintah tidak ditemukan. Ketik /start untuk memulai.");
          }
        }
      }

      // Answer callback query if it's from inline keyboard
      if (update.callback_query) {
        await WebhookProcessor.answerCallbackQuery(chatbot.botToken, update.callback_query.id);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Initialize bots on server start
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
