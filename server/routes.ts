import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { telegramBotManager } from "./telegram";
import { insertBotSchema, insertKnowledgeSchema, insertSettingSchema } from "@shared/schema";
import { createMidtransTransaction, generateOrderId, verifySignatureKey, getTransactionStatus, UPGRADE_PLANS, type PlanType } from "./midtrans";
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
      const validatedData = insertBotSchema.parse(req.body);
      
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
