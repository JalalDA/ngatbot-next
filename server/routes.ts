import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { pool } from "./db";
import { telegramBotManager } from "./telegram";
import {
  insertBotSchema,
  insertKnowledgeSchema,
  insertSettingSchema,
  insertSmmProviderSchema,
  insertSmmServiceSchema,
  insertSmmOrderSchema,
  insertAutoBotSchema,
} from "@shared/schema";
import {
  createMidtransTransaction,
  generateOrderId,
  verifySignatureKey,
  getTransactionStatus,
  UPGRADE_PLANS,
  type PlanType,
} from "./midtrans";
import {
  SmmPanelAPI,
  generateSmmOrderId,
  generateMid,
  parseRate,
  calculateOrderAmount,
  mapProviderStatus,
} from "./smm-panel";
import { autoBotManager } from "./auto-bot";
import { threadingMonitor } from "./monitoring";
import { 
  validateApiKey, 
  getBalance, 
  getServices, 
  createOrder, 
  getOrderStatus,
  generateApiKey 
} from "./provider-api";
import { z } from "zod";

function requireAuth(req: any, res: any, next: any) {
  console.log(`🔐 Auth check for ${req.method} ${req.url} - isAuthenticated: ${req.isAuthenticated()}`);
  if (!req.isAuthenticated()) {
    console.log(`❌ Auth failed for ${req.method} ${req.url}`);
    return res.status(401).json({ message: "Authentication required" });
  }
  console.log(`✅ Auth passed for ${req.method} ${req.url}`);
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  // Global request logging
  app.use((req, res, next) => {
    console.log(`📥 REQUEST: ${req.method} ${req.url}`);
    next();
  });

  // Setup authentication routes
  setupAuth(app);

  // ===============================
  // API PROVIDER ENDPOINTS - Compatible with SMM Panel format
  // ===============================
  
  // API Provider endpoints for resellers (using /api path to avoid Vite conflicts)
  app.get("/api/smm-provider", validateApiKey, getBalance);
  app.post("/api/smm-provider", validateApiKey, (req, res) => {
    const action = req.body.action || req.query.action;
    
    switch (action) {
      case 'balance':
        return getBalance(req, res);
      case 'services':
        return getServices(req, res);
      case 'add':
        return createOrder(req, res);
      case 'status':
        return getOrderStatus(req, res);
      default:
        return res.json({ error: 'Invalid action' });
    }
  });

  // API v2 endpoints (same functionality but different path for compatibility)
  app.get("/api/v2", validateApiKey, getBalance);
  app.post("/api/v2", validateApiKey, (req, res) => {
    const action = req.body.action || req.query.action;
    
    switch (action) {
      case 'balance':
        return getBalance(req, res);
      case 'services':
        return getServices(req, res);
      case 'add':
        return createOrder(req, res);
      case 'status':
        return getOrderStatus(req, res);
      default:
        return res.json({ error: 'Invalid action' });
    }
  });

  // Bot management routes
  app.post("/api/bots", requireAuth, async (req, res) => {
    try {
      // Create a custom schema that includes systemPrompt
      const createBotSchema = insertBotSchema.extend({
        systemPrompt: z.string().optional(),
      });
      const validatedData = createBotSchema.parse(req.body);

      // Validate bot token with Telegram
      const validation = await telegramBotManager.validateBotToken(
        validatedData.token,
      );
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
          content: validatedData.systemPrompt,
        });
      }

      // Start the bot
      await telegramBotManager.startBot(bot.token, bot.id);

      res.status(201).json(bot);
    } catch (error) {
      console.error("Create bot error:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bot" });
    }
  });

  app.get("/api/bots", requireAuth, async (req, res) => {
    try {
      // MULTITHREADING: Load bots with parallel data fetching
      const [bots] = await Promise.all([storage.getBotsByUserId(req.user.id)]);
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
        return res
          .status(403)
          .json({ message: "Not authorized to delete this bot" });
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
        return res
          .status(403)
          .json({ message: "Not authorized to add knowledge to this bot" });
      }

      const knowledge = await storage.createKnowledge(validatedData);
      res.status(201).json(knowledge);
    } catch (error) {
      console.error("Create knowledge error:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: error.errors });
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
        return res
          .status(403)
          .json({ message: "Not authorized to view this bot's knowledge" });
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
        return res
          .status(403)
          .json({ message: "Not authorized to update this knowledge" });
      }

      const updatedKnowledge = await storage.updateKnowledge(
        knowledgeId,
        updateData,
      );
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
        return res
          .status(403)
          .json({ message: "Not authorized to delete this knowledge" });
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
        res
          .status(400)
          .json({ success: false, message: "Invalid admin credentials" });
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
        }),
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
        status: hasApiKey
          ? isConnected
            ? "connected"
            : "key_invalid"
          : "not_configured",
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
        activeBots: bots.filter((bot) => bot.isActive).length,
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
      res.status(500).json({
        message: "Failed to create payment transaction",
        error: error.message,
      });
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
        message: "Redirecting to payment gateway (Mock)",
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
      if (
        user.level === plan ||
        (user.level === "business" && plan === "pro")
      ) {
        return res
          .status(400)
          .json({ message: "You already have this plan or higher" });
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
        paymentInfo: JSON.stringify({ plan, credits: planConfig.credits }),
      });

      // Create Midtrans transaction
      const midtransResult = await createMidtransTransaction({
        orderId,
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        plan: plan as PlanType,
      });

      res.json({
        success: true,
        token: midtransResult.token,
        redirectUrl: midtransResult.redirectUrl,
        orderId: orderId,
        plan: planConfig,
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
        fraud_status,
      } = req.body;

      // For development/sandbox, skip signature validation or make it optional
      const isValidSignature =
        process.env.NODE_ENV === "development" ||
        verifySignatureKey(order_id, status_code, gross_amount, signature_key);

      if (!isValidSignature) {
        console.error("Invalid signature for order:", order_id);
        // In development, log but don't reject
        if (process.env.NODE_ENV !== "development") {
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
      console.log(
        `Processing payment status: ${transaction_status}, fraud_status: ${fraud_status}`,
      );

      // Define successful payment statuses for Midtrans
      const successStatuses = ["capture", "settlement", "success"];
      const pendingStatuses = ["pending", "authorize"];
      const failedStatuses = ["cancel", "deny", "expire", "failure"];

      if (successStatuses.includes(transaction_status)) {
        if (!fraud_status || fraud_status === "accept") {
          newStatus = "success";

          // Update user level and credits
          const planConfig = UPGRADE_PLANS[transaction.plan as PlanType];
          const currentUser = await storage.getUser(transaction.userId);

          if (currentUser && planConfig) {
            console.log(
              `✅ Upgrading user ${currentUser.id} from ${currentUser.level} to ${planConfig.level}`,
            );
            console.log(
              `✅ Adding ${planConfig.credits} credits to current ${currentUser.credits} credits`,
            );

            const newCredits = currentUser.credits + planConfig.credits;

            const updatedUser = await storage.updateUser(transaction.userId, {
              level: planConfig.level,
              credits: newCredits,
            });

            console.log(`✅ User upgrade completed successfully!`);
            console.log(`   - New level: ${planConfig.level}`);
            console.log(`   - Total credits: ${newCredits}`);
            console.log(`   - Updated user:`, updatedUser);
          } else {
            console.error(
              `❌ Failed to upgrade user - User: ${currentUser ? "found" : "not found"}, Plan: ${planConfig ? "found" : "not found"}`,
            );
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
        console.log(
          `⚠️ Unknown payment status: ${transaction_status}, keeping as pending`,
        );
        newStatus = "pending";
      }

      // Update transaction status
      await storage.updateTransaction(transaction.id, {
        status: newStatus,
        paymentInfo: JSON.stringify({
          ...JSON.parse(transaction.paymentInfo || "{}"),
          midtrans_response: req.body,
        }),
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
        const successStatuses = ["capture", "settlement", "success"];
        const failedStatuses = ["cancel", "deny", "expire", "failure"];

        if (successStatuses.includes(transactionStatus)) {
          if (
            !midtransStatus.fraud_status ||
            midtransStatus.fraud_status === "accept"
          ) {
            newStatus = "success";

            // Update user level and credits if not already done
            if (transaction.status !== "success") {
              console.log(`🎉 Payment successful! Upgrading user account...`);

              const planConfig = UPGRADE_PLANS[transaction.plan as PlanType];
              const currentUser = await storage.getUser(transaction.userId);

              if (currentUser && planConfig) {
                const newCredits = currentUser.credits + planConfig.credits;

                const updatedUser = await storage.updateUser(
                  transaction.userId,
                  {
                    level: planConfig.level,
                    credits: newCredits,
                  },
                );

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
          await storage.updateTransaction(transaction.id, {
            status: newStatus,
          });
          console.log(
            `📝 Transaction ${orderId} status updated to: ${newStatus}`,
          );
        }

        res.json({
          orderId,
          status: newStatus,
          midtransStatus: transactionStatus,
          amount: transaction.amount,
          plan: transaction.plan,
        });
      } else {
        console.log(
          `⚠️ No Midtrans status found for ${orderId}, using database status: ${transaction.status}`,
        );
        res.json({
          orderId,
          status: transaction.status,
          amount: transaction.amount,
          plan: transaction.plan,
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
          if (user.level === "business") return false;
          if (user.level === "pro" && planKey === "pro") return false;
          return true;
        })
        .map(([key, config]) => ({
          key,
          ...config,
        }));

      res.json({
        currentLevel: user.level,
        currentCredits: user.credits,
        availablePlans,
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
        return res
          .status(400)
          .json({ message: "Name, API key, and endpoint are required" });
      }

      // Simple validation instead of Zod
      const trimmedName = String(name).trim();
      const trimmedApiKey = String(apiKey).trim();
      const trimmedEndpoint = String(apiEndpoint).trim();

      if (trimmedName.length < 1) {
        return res
          .status(400)
          .json({ message: "Provider name cannot be empty" });
      }

      if (trimmedApiKey.length < 1) {
        return res.status(400).json({ message: "API key cannot be empty" });
      }

      if (!trimmedEndpoint.startsWith("http")) {
        return res.status(400).json({
          message:
            "API endpoint must be a valid URL starting with http or https",
        });
      }

      const provider = await storage.createSmmProvider({
        userId: user.id,
        name: trimmedName,
        apiKey: trimmedApiKey,
        apiEndpoint: trimmedEndpoint,
        isActive: Boolean(isActive),
      });

      console.log("Provider created successfully:", provider);
      res.status(201).json(provider);
    } catch (error) {
      console.error("Create SMM provider error:", error);
      res.status(500).json({
        message: "Failed to create SMM provider: " + (error as Error).message,
      });
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
          return res.status(400).json({
            message: "Failed to connect to SMM provider with new credentials",
          });
        }
      }

      const updatedProvider = await storage.updateSmmProvider(providerId, {
        name,
        apiKey,
        apiEndpoint,
        isActive,
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
        isActive,
      });

      res.json(updatedProvider);
    } catch (error) {
      console.error("Update provider error:", error);
      res.status(500).json({ message: "Failed to update provider" });
    }
  });

  // Get services from SMM provider (without importing)
  app.get("/api/smm/providers/:id/services", requireAuth, async (req, res) => {
    console.log(`🔄 START: Loading services for provider ID: ${req.params.id}`);
    try {
      const user = req.user!;
      const providerId = parseInt(req.params.id);

      console.log(`🔍 Loading services for provider ID: ${providerId}, User ID: ${user.id}`);

      // Check if provider exists and belongs to user
      const provider = await storage.getSmmProvider(providerId);
      if (!provider || provider.userId !== user.id) {
        console.error(`❌ Provider not found or access denied. Provider: ${JSON.stringify(provider)}`);
        return res.status(404).json({ message: "Provider not found" });
      }

      console.log(`✅ Provider found: ${provider.name} - ${provider.apiEndpoint}`);
      console.log(`🔑 Using API Key: ${provider.apiKey.substring(0, 10)}...`);

      const smmApi = new SmmPanelAPI(provider.apiKey, provider.apiEndpoint);
      
      console.log(`📡 Calling getServices() from SmmPanelAPI...`);
      const services = await smmApi.getServices();
      
      console.log(`✅ Successfully fetched ${services.length} services`);
      res.json({ services });
    } catch (error) {
      console.error("❌ Fetch services error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      res
        .status(500)
        .json({ 
          message: "Failed to fetch services from provider",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
  });

  // Import services from SMM provider with batch processing + MONITORING
<<<<<<< HEAD
  app.post(
    "/api/smm/providers/:id/import-services",
    requireAuth,
    async (req, res) => {
      const operationId = `import_services_${Date.now()}_${req.params.id}`;

      try {
        const user = req.user!;
        const providerId = parseInt(req.params.id);
        const { services: selectedServices, batchSize = 10 } = req.body;
=======
  app.post("/api/smm/providers/:id/import-services", requireAuth, async (req, res) => {
    const operationId = `import_services_${Date.now()}_${req.params.id}`;
    
    try {
      const user = req.user!;
      const providerId = parseInt(req.params.id);
      const { services: selectedServices, batchSize = 100 } = req.body;

      // SAFETY CHECK: Monitor system health before starting
      // const healthCheck = threadingMonitor.getSystemHealth();
      // if (healthCheck.status === 'critical') {
      //   return res.status(503).json({ 
      //     success: false,
      //     message: "Sistem sedang overload. Import dibatalkan untuk menjaga stabilitas.",
      //     recommendations: healthCheck.recommendations
      //   });
      // }
>>>>>>> b2ca51dba4873e15d9d676164059c0c4c29ab4ad

        // SAFETY CHECK: Monitor system health before starting
        // const healthCheck = threadingMonitor.getSystemHealth();
        // if (healthCheck.status === 'critical') {
        //   return res.status(503).json({
        //     success: false,
        //     message: "Sistem sedang overload. Import dibatalkan untuk menjaga stabilitas.",
        //     recommendations: healthCheck.recommendations
        //   });
        // }

<<<<<<< HEAD
        // Check if provider belongs to user
        const provider = await storage.getSmmProvider(providerId);
        if (!provider || provider.userId !== user.id) {
          return res.status(404).json({ message: "SMM provider not found" });
=======
      if (!selectedServices || !Array.isArray(selectedServices)) {
        return res.status(400).json({ message: "No services provided for import" });
      }

      // SAFETY CHECK: Monitor operation start
      // if (!threadingMonitor.startOperation(operationId, 'service_import', selectedServices.length)) {
      //   return res.status(503).json({ 
      //     success: false,
      //     message: "Sistem sedang busy. Import ditolak untuk menjaga stabilitas.",
      //     currentOperations: threadingMonitor.getSystemHealth().metrics.currentConcurrency
      //   });
      // }

      // Get used MIDs for this user
      const usedMids = await storage.getUsedMids(user.id);
      
      let importedCount = 0;
      const errors: string[] = [];

      // Process services in batches to avoid request size limits
      const batches = [];
      for (let i = 0; i < selectedServices.length; i += batchSize) {
        batches.push(selectedServices.slice(i, i + batchSize));
      }

      console.log(`Processing ${selectedServices.length} services in ${batches.length} batches of ${batchSize}`);

      // MULTITHREADING: Process batches with parallel operations
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🚀 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} services using multithreading...`);

        // PARALLEL: Process services in current batch simultaneously
        const batchPromises = batch.map(async (service) => {
          try {
            // Auto-assign MID (1-10) - thread-safe
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
              return { success: false, serviceName: service.name, error: 'No available MID' };
            }
          } catch (error) {
            return { success: false, serviceName: service.name, error: (error as Error).message };
          }
        });

        // ASYNC: Wait for all services in batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              importedCount++;
            } else {
              errors.push(`${result.value.serviceName}: ${result.value.error}`);
            }
          } else {
            errors.push(`Unknown error: ${result.reason}`);
          }
        });

        // Small delay between batches to prevent overwhelming the database
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay
>>>>>>> b2ca51dba4873e15d9d676164059c0c4c29ab4ad
        }

        if (!selectedServices || !Array.isArray(selectedServices)) {
          return res
            .status(400)
            .json({ message: "No services provided for import" });
        }

        // SAFETY CHECK: Monitor operation start
        // if (!threadingMonitor.startOperation(operationId, 'service_import', selectedServices.length)) {
        //   return res.status(503).json({
        //     success: false,
        //     message: "Sistem sedang busy. Import ditolak untuk menjaga stabilitas.",
        //     currentOperations: threadingMonitor.getSystemHealth().metrics.currentConcurrency
        //   });
        // }

        // Get used MIDs for this user
        const usedMids = await storage.getUsedMids(user.id);

        let importedCount = 0;
        const errors: string[] = [];

        // Process services in batches to avoid request size limits
        const batches = [];
        for (let i = 0; i < selectedServices.length; i += batchSize) {
          batches.push(selectedServices.slice(i, i + batchSize));
        }

        console.log(
          `Processing ${selectedServices.length} services in ${batches.length} batches of ${batchSize}`,
        );

        // MULTITHREADING: Process batches with parallel operations
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          console.log(
            `🚀 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} services using multithreading...`,
          );

          // PARALLEL: Process services in current batch simultaneously
          const batchPromises = batch.map(async (service) => {
            try {
              // Auto-assign MID (1-10) - thread-safe
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
                  isActive: true,
                });

                return { success: true, serviceName: service.name };
              } else {
                return {
                  success: false,
                  serviceName: service.name,
                  error: "No available MID",
                };
              }
            } catch (error) {
              return {
                success: false,
                serviceName: service.name,
                error: (error as Error).message,
              };
            }
          });

          // ASYNC: Wait for all services in batch to complete
          const batchResults = await Promise.allSettled(batchPromises);

          batchResults.forEach((result) => {
            if (result.status === "fulfilled") {
              if (result.value.success) {
                importedCount++;
              } else {
                errors.push(
                  `${result.value.serviceName}: ${result.value.error}`,
                );
              }
            } else {
              errors.push(`Unknown error: ${result.reason}`);
            }
          });

          // Small delay between batches to prevent overwhelming the database
          if (batchIndex < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 50)); // Reduced delay
          }
        }

        // MONITORING: Complete operation successfully
        threadingMonitor.completeOperation(operationId, importedCount);

        res.json({
          message: `Successfully imported ${importedCount} services`,
          importedCount,
          totalRequested: selectedServices.length,
          batchesProcessed: batches.length,
          errors: errors.length > 0 ? errors : undefined,
          systemHealth: threadingMonitor.getSystemHealth().status,
        });
      } catch (error) {
        console.error("Import services error:", error);

        // MONITORING: Fail operation
        threadingMonitor.failOperation(
          operationId,
          error instanceof Error ? error.message : "Unknown error",
        );

        res
          .status(500)
          .json({ message: "Failed to import services from provider" });
      }
    },
  );

  // Batch import endpoint for very large service imports
  app.post(
    "/api/smm/providers/:id/import-services-batch",
    requireAuth,
    async (req, res) => {
      try {
        const user = req.user!;
        const providerId = parseInt(req.params.id);
        const { servicesBatch, batchIndex, totalBatches } = req.body;

        // Check if provider belongs to user
        const provider = await storage.getSmmProvider(providerId);
        if (!provider || provider.userId !== user.id) {
          return res.status(404).json({ message: "SMM provider not found" });
        }

        if (!servicesBatch || !Array.isArray(servicesBatch)) {
          return res
            .status(400)
            .json({ message: "No services batch provided" });
        }

        // Get used MIDs for this user
        const usedMids = await storage.getUsedMids(user.id);

        let importedCount = 0;
        const errors: string[] = [];

        console.log(
          `🚀 Processing batch ${batchIndex + 1}/${totalBatches} with ${servicesBatch.length} services using multithreading...`,
        );

        // MULTITHREADING: Process services in parallel chunks
        const chunkSize = 5; // Process 5 services simultaneously
        const chunks = [];
        for (let i = 0; i < servicesBatch.length; i += chunkSize) {
          chunks.push(servicesBatch.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
          const chunkPromises = chunk.map(async (service) => {
            try {
              // Auto-assign MID (1-10) - thread-safe
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
                  isActive: true,
                });

                return { success: true, serviceName: service.name };
              } else {
                return {
                  success: false,
                  serviceName: service.name,
                  error: "No available MID",
                };
              }
            } catch (error) {
              return {
                success: false,
                serviceName: service.name,
                error: (error as Error).message,
              };
            }
          });

          // ASYNC: Wait for chunk to complete
          const chunkResults = await Promise.allSettled(chunkPromises);

          chunkResults.forEach((result) => {
            if (result.status === "fulfilled") {
              if (result.value.success) {
                importedCount++;
              } else {
                errors.push(
                  `${result.value.serviceName}: ${result.value.error}`,
                );
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
          errors: errors.length > 0 ? errors : undefined,
        });
      } catch (error) {
        console.error("Import services batch error:", error);
        res.status(500).json({ message: "Failed to import services batch" });
      }
    },
  );

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
      const {
        name,
        description,
        min,
        max,
        rate,
        syncProvider,
        priceType,
        priceValue,
        isActive,
      } = req.body;

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
        isActive,
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
        return res
          .status(400)
          .json({ message: "Invalid service IDs provided" });
      }

      let deletedCount = 0;
      const errors: string[] = [];

      console.log(
        `🚀 Bulk deleting ${serviceIds.length} services using multithreading...`,
      );

      // MULTITHREADING: Process deletions in parallel batches
      const batchSize = 10; // Process 10 deletions simultaneously
      const batches = [];
      for (let i = 0; i < serviceIds.length; i += batchSize) {
        batches.push(serviceIds.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (serviceId) => {
          try {
            // Check if service belongs to user
            const service = await storage.getSmmService(serviceId);
            if (service && service.userId === user.id) {
              const success = await storage.deleteSmmService(serviceId);
              if (success) {
                return { success: true, serviceId };
              } else {
                return { success: false, serviceId, error: "Failed to delete" };
              }
            } else {
              return {
                success: false,
                serviceId,
                error: "Not found or access denied",
              };
            }
          } catch (error) {
            return {
              success: false,
              serviceId,
              error: (error as Error).message,
            };
          }
        });

        // ASYNC: Wait for batch to complete
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result) => {
          if (result.status === "fulfilled") {
            if (result.value.success) {
              deletedCount++;
            } else {
              errors.push(
                `Service ID ${result.value.serviceId}: ${result.value.error}`,
              );
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
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Bulk delete SMM services error:", error);
      res.status(500).json({ message: "Failed to bulk delete SMM services" });
    }
  });

  // Update provider balance
  app.post(
    "/api/smm/providers/:id/update-balance",
    requireAuth,
    async (req, res) => {
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
          balanceUpdatedAt: new Date(),
        });

        res.json({
          balance: balanceInfo.balance,
          currency: balanceInfo.currency,
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Update provider balance error:", error);
        res.status(500).json({ message: "Failed to update provider balance" });
      }
    },
  );

  // Get SMM orders for current user with pagination and auto sync status
  app.get("/api/smm/orders", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      // Fetch orders from database
      const orders = await storage.getSmmOrdersByUserId(user.id, limit, offset);

      // Auto sync status untuk orders yang belum complete
      const ordersToSync = orders.filter(
        (order) =>
          order.status !== "completed" &&
          order.status !== "cancelled" &&
          order.status !== "refunded" &&
          order.providerOrderId,
      );

      // MULTITHREADING: Sync status dengan provider menggunakan parallel processing
      if (ordersToSync.length > 0) {
        const syncPromises = ordersToSync.map(async (order) => {
          try {
            // Get provider info asynchronously
            const provider = await storage.getSmmProvider(order.providerId);
            if (!provider) return null;

            // Check status dari provider dengan timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            const statusResponse = await fetch(
              `${provider.apiEndpoint}?key=${provider.apiKey}&action=status&order=${order.providerOrderId}`,
              {
                signal: controller.signal,
              },
            );
            clearTimeout(timeoutId);

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();

              if (statusData && statusData.status) {
                // Map provider status ke system status
                const systemStatus = mapProviderStatus(statusData.status);

                // Update status jika berbeda
                if (systemStatus !== order.status) {
                  await storage.updateSmmOrder(order.id, {
                    status: systemStatus,
                    startCount: statusData.start_count || order.startCount,
                    remains: statusData.remains || order.remains,
                  });

                  return {
                    orderId: order.id,
                    updated: true,
                    oldStatus: order.status,
                    newStatus: systemStatus,
                  };
                }
              }
            }
            return { orderId: order.id, updated: false };
          } catch (syncError) {
            return { orderId: order.id, error: syncError.message };
          }
        });

        // ASYNC: Execute all sync operations in parallel
        const syncResults = await Promise.allSettled(syncPromises);
        syncResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value?.updated) {
            console.log(
              `✅ Auto-sync updated order ${result.value.orderId}: ${result.value.oldStatus} -> ${result.value.newStatus}`,
            );
          }
        });
      }

      // Fetch updated orders setelah sync
      const updatedOrders = await storage.getSmmOrdersByUserId(
        user.id,
        limit,
        offset,
      );
      res.json(updatedOrders);
    } catch (error) {
      console.error("Get SMM orders error:", error);
      res.status(500).json({ message: "Failed to fetch SMM orders" });
    }
  });

  // Manual sync orders status endpoint - OPTIMIZED WITH MULTITHREADING + MONITORING
  app.post("/api/smm/orders/sync", requireAuth, async (req, res) => {
    const operationId = `sync_orders_${Date.now()}_${req.user!.id}`;

    try {
      const user = req.user!;

      // SAFETY CHECK: Monitor system health before starting
      // const healthCheck = threadingMonitor.getSystemHealth();
      // if (healthCheck.status === "critical") {
      //   return res.status(503).json({
      //     success: false,
      //     message: "Sistem sedang overload. Coba lagi dalam beberapa menit.",
      //     recommendations: healthCheck.recommendations,
      //   });
      // }

      // Get all orders for the user that might need syncing - ASYNC
      const [allOrders] = await Promise.all([
        storage.getSmmOrdersByUserId(user.id, 1000, 0),
      ]);

      if (!allOrders || allOrders.length === 0) {
        return res.json({
          success: true,
          message: "Tidak ada order untuk disinkronisasi",
          syncedCount: 0,
          updatedCount: 0,
        });
      }

      const ordersToSync = allOrders.filter(
        (order) =>
          order.status !== "completed" &&
          order.status !== "cancelled" &&
          order.status !== "refunded" &&
          order.providerOrderId &&
          order.providerOrderId.trim() !== "",
      );

      // SAFETY CHECK: Monitor operation start
      // if (
      //   !threadingMonitor.startOperation(
      //     operationId,
      //     "order_sync",
      //     ordersToSync.length,
      //   )
      // ) {
      //   return res.status(503).json({
      //     success: false,
      //     message:
      //       "Sistem sedang busy. Operasi ditolak untuk menjaga stabilitas.",
      //     currentOperations:
      //       threadingMonitor.getSystemHealth().metrics.currentConcurrency,
      //   });
      // }

      let syncedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      console.log(
        `🔄 MONITORED SYNC: Starting parallel sync for ${ordersToSync.length} orders (OpID: ${operationId})...`,
      );

      // MULTITHREADING: Process orders in parallel batches
      const batchSize = 10; // Process 10 orders simultaneously
      const batches = [];
      for (let i = 0; i < ordersToSync.length; i += batchSize) {
        batches.push(ordersToSync.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (order) => {
          try {
            // Get provider info asynchronously
            const provider = await storage.getSmmProvider(order.providerId);
            if (!provider) {
              console.warn(`⚠️ Provider not found for order ${order.id}`);
              return {
                success: false,
                orderId: order.id,
                error: "Provider not found",
              };
            }

            // ASYNC with timeout for API call
            const statusUrl = `${provider.apiEndpoint}?key=${provider.apiKey}&action=status&order=${order.providerOrderId}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for faster response

            const statusResponse = await fetch(statusUrl, {
              method: "GET",
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();

              if (statusData && statusData.status) {
                // Map provider status ke system status
                const systemStatus = mapProviderStatus(statusData.status);

                // Update status jika berbeda
                if (systemStatus !== order.status) {
                  await storage.updateSmmOrder(order.id, {
                    status: systemStatus,
                    startCount: statusData.start_count || order.startCount,
                    remains: statusData.remains || order.remains,
                  });

                  return {
                    success: true,
                    orderId: order.id,
                    updated: true,
                    oldStatus: order.status,
                    newStatus: systemStatus,
                  };
                } else {
                  return {
                    success: true,
                    orderId: order.id,
                    updated: false,
                    status: order.status,
                  };
                }
              } else {
                return {
                  success: false,
                  orderId: order.id,
                  error: "Invalid response data",
                };
              }
            } else {
              return {
                success: false,
                orderId: order.id,
                error: `HTTP ${statusResponse.status}`,
              };
            }
          } catch (syncError) {
            return {
              success: false,
              orderId: order.id,
              error: syncError.message,
            };
          }
        });

        // MULTITHREADING: Process batch in parallel and collect results
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result) => {
          if (result.status === "fulfilled") {
            syncedCount++;
            if (result.value.updated) {
              updatedCount++;
              console.log(
                `✅ Updated order ${result.value.orderId}: ${result.value.oldStatus} -> ${result.value.newStatus}`,
              );
            }
          } else {
            errorCount++;
          }
        });
      }

      console.log(
        `📊 MONITORED SYNC COMPLETED: ${syncedCount} checked, ${updatedCount} updated, ${errorCount} errors`,
      );

      // MONITORING: Complete operation successfully
      threadingMonitor.completeOperation(operationId, updatedCount);

      res.json({
        success: true,
        message: `Berhasil sinkronisasi ${syncedCount} order, ${updatedCount} order diperbarui${errorCount > 0 ? `, ${errorCount} error` : ""}`,
        syncedCount,
        updatedCount,
        errorCount,
        systemHealth: threadingMonitor.getSystemHealth().status,
      });
    } catch (error) {
      console.error("Manual sync orders error:", error);

      // MONITORING: Fail operation
      threadingMonitor.failOperation(
        operationId,
        error instanceof Error ? error.message : "Unknown error",
      );

      res.status(500).json({
        success: false,
        message: "Gagal melakukan sinkronisasi",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // MONITORING ENDPOINTS - System Health & Performance
  app.get("/api/system/health", requireAuth, async (req, res) => {
    try {
      const health = threadingMonitor.getSystemHealth();
      const summary = threadingMonitor.getPerformanceSummary();

      res.json({
        ...health,
        summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get system health error:", error);
      res.status(500).json({ message: "Failed to get system health" });
    }
  });

  // Reset performance metrics (admin only)
  app.post("/api/system/reset-metrics", requireAdmin, async (req, res) => {
    try {
      threadingMonitor.resetMetrics();
      res.json({
        success: true,
        message: "Performance metrics reset successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Reset metrics error:", error);
      res.status(500).json({ message: "Failed to reset metrics" });
    }
  });



  // Manual cleanup stuck operations (admin only)
  app.post("/api/system/cleanup", requireAdmin, async (req, res) => {
    try {
      const cleaned = threadingMonitor.cleanupStuckOperations();
      res.json({
        success: true,
        message: `Successfully cleaned up ${cleaned} stuck operations`,
        cleanedCount: cleaned,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Cleanup stuck operations error:", error);
      res.status(500).json({ message: "Failed to cleanup stuck operations" });
    }
  });

  // PAYMENT METHOD SETTINGS ENDPOINTS
  // Get current payment settings
  app.get("/api/payment/settings", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      console.log(`💳 GET payment settings for user ${userId}`);
      
      const settings = await storage.getPaymentSettings(userId);
      
      res.json({
        id: settings?.id || null,
        serverKey: settings?.serverKey ? `${settings.serverKey.substring(0, 15)}...` : '',
        clientKey: settings?.clientKey ? `${settings.clientKey.substring(0, 15)}...` : '',
        isProduction: settings?.isProduction || false,
        isConfigured: !!(settings?.serverKey && settings?.clientKey),
        createdAt: settings?.createdAt || null,
        updatedAt: settings?.updatedAt || null,
      });
    } catch (error) {
      console.error("❌ Get payment settings error:", error);
      res.status(500).json({ 
        message: "Gagal mengambil pengaturan pembayaran",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Save/Update payment settings
  app.post("/api/payment/settings", requireAuth, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "User tidak terotentikasi" });
      }
      
      const userId = req.user.id;
      const { serverKey, clientKey, isProduction } = req.body;
      
      console.log(`💳 POST payment settings for user ${userId}`);
      
      // Validate input
      const paymentSchema = z.object({
        serverKey: z.string().min(1, 'Server Key wajib diisi'),
        clientKey: z.string().min(1, 'Client Key wajib diisi'),
        isProduction: z.boolean().default(false),
      });

      const validData = paymentSchema.parse({ serverKey, clientKey, isProduction });
      
      // Save settings
      const settings = await storage.savePaymentSettings(userId, validData);
      
      res.json({
        success: true,
        message: "Pengaturan pembayaran berhasil disimpan",
        settings: {
          id: settings.id,
          isProduction: settings.isProduction,
          isConfigured: true,
          updatedAt: settings.updatedAt,
        }
      });
    } catch (error) {
      console.error("❌ Save payment settings error:", error);
      res.status(500).json({ 
        message: "Gagal menyimpan pengaturan pembayaran",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test Midtrans connection
  app.post("/api/payment/test-connection", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      console.log(`🔄 Test Midtrans connection for user ${userId}`);
      
      const settings = await storage.getPaymentSettings(userId);
      
      if (!settings || !settings.serverKey) {
        return res.status(400).json({ 
          message: "Pengaturan Midtrans belum dikonfigurasi" 
        });
      }

      // Test connection with basic validation
      if (settings.isProduction) {
        if (!settings.serverKey.startsWith('Mid-server-')) {
          throw new Error('Server Key production harus dimulai dengan "Mid-server-"');
        }
      } else {
        if (!settings.serverKey.startsWith('SB-Mid-server-')) {
          throw new Error('Server Key sandbox harus dimulai dengan "SB-Mid-server-"');
        }
      }
      
      res.json({
        success: true,
        message: "Koneksi Midtrans berhasil",
        environment: settings.isProduction ? 'Production' : 'Sandbox',
        serverKeyValid: true,
        clientKeyValid: !!settings.clientKey,
      });
    } catch (error) {
      console.error("❌ Test Midtrans connection error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Koneksi Midtrans gagal"
      });
    }
  });

  // Delete payment settings
  app.delete("/api/payment/settings", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      console.log(`🗑️ DELETE payment settings for user ${userId}`);
      
      await storage.deletePaymentSettings(userId);
      
      res.json({
        success: true,
        message: "Pengaturan pembayaran berhasil dihapus"
      });
    } catch (error) {
      console.error("❌ Delete payment settings error:", error);
      res.status(500).json({ 
        message: "Gagal menghapus pengaturan pembayaran",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Helper function untuk mapping status provider ke system status
  function mapProviderStatus(providerStatus: string): string {
    const statusMap: { [key: string]: string } = {
      pending: "pending",
      "in progress": "processing",
      processing: "processing",
      partial: "partial",
      completed: "completed",
      canceled: "cancelled",
      cancelled: "cancelled",
      refunded: "refunded",
    };

    return (
      statusMap[providerStatus.toLowerCase()] || providerStatus.toLowerCase()
    );
  }

  // Create new SMM order
  app.post("/api/smm/orders", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { serviceId, link, quantity } = req.body;

      // Validate input
      if (!serviceId || !link || !quantity) {
        return res
          .status(400)
          .json({ message: "Service, link, and quantity are required" });
      }

      // Get service details
      const service = await storage.getSmmService(serviceId);
      if (!service || service.userId !== user.id) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Validate quantity
      if (quantity < service.min || quantity > service.max) {
        return res.status(400).json({
          message: `Quantity must be between ${service.min} and ${service.max}`,
        });
      }

      // Get provider details
      const provider = await storage.getSmmProvider(service.providerId);
      if (!provider || provider.userId !== user.id) {
        return res.status(404).json({ message: "Provider not found" });
      }

      // Calculate amount
      const rate = parseFloat(service.rate);
      const amount = ((rate * quantity) / 1000).toFixed(2);

      // Generate unique order ID
      const orderId = `ORD_${user.id}_${Date.now()}`;

      try {
        // Send order to external SMM provider
        const smmApi = new SmmPanelAPI(provider.apiKey, provider.apiEndpoint);
        const providerResponse = await smmApi.createOrder(
          service.serviceIdApi, // Use the API service ID from the service
          link,
          quantity,
        );

        if (providerResponse.error) {
          return res.status(400).json({
            message: "Failed to send order to provider",
            error: providerResponse.error,
          });
        }

        // Create order with provider order ID
        const orderData = {
          userId: user.id,
          serviceId: serviceId,
          providerId: service.providerId,
          orderId: orderId,
          providerOrderId: providerResponse.order, // Store provider's order ID
          link: link,
          quantity: quantity,
          amount: amount,
          status: "processing", // Set to processing since it was sent to provider
          paymentStatus: "completed", // Assuming payment is handled separately
        };

        const newOrder = await storage.createSmmOrder(orderData);

        res.json({
          ...newOrder,
          providerOrderId: providerResponse.order,
          message: "Order successfully sent to provider",
        });
      } catch (providerError: any) {
        console.error("Provider API error:", providerError);

        // Create order with failed status for tracking
        const orderData = {
          userId: user.id,
          serviceId: serviceId,
          providerId: service.providerId,
          orderId: orderId,
          link: link,
          quantity: quantity,
          amount: amount,
          status: "failed",
          paymentStatus: "pending",
          errorMessage:
            providerError.message || "Failed to send order to provider",
        };

        await storage.createSmmOrder(orderData);

        return res.status(500).json({
          message: "Failed to send order to provider",
          error: `Failed to create order: ${providerError.message || "Unknown error"}`,
        });
      }
    } catch (error) {
      console.error("Create SMM order error:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Update SMM order status
  app.post(
    "/api/smm/orders/:id/update-status",
    requireAuth,
    async (req, res) => {
      try {
        const user = req.user!;
        const orderId = parseInt(req.params.id);

        // Get order details
        const order = await storage.getSmmOrder(orderId);
        if (!order || order.userId !== user.id) {
          return res.status(404).json({ message: "Order not found" });
        }

        // If order doesn't have provider order ID, can't check status
        if (!order.providerOrderId) {
          return res
            .status(400)
            .json({ message: "Order has no provider order ID to check" });
        }

        // Get provider details
        const provider = await storage.getSmmProvider(order.providerId);
        if (!provider) {
          return res.status(404).json({ message: "Provider not found" });
        }

        try {
          // Get status from SMM provider
          const smmApi = new SmmPanelAPI(provider.apiKey, provider.apiEndpoint);
          const statusResponse = await smmApi.getOrderStatus(
            order.providerOrderId,
          );

          // Map provider status to our internal status
          const mappedStatus = mapProviderStatus(statusResponse.status);

          // Update order with latest status
          const updatedOrder = await storage.updateSmmOrder(orderId, {
            status: mappedStatus,
            startCount:
              parseInt(statusResponse.start_count) || order.startCount,
            remains: parseInt(statusResponse.remains) || order.remains,
            updatedAt: new Date(),
          });

          res.json({
            ...updatedOrder,
            providerStatus: statusResponse,
            message: "Order status updated successfully",
          });
        } catch (providerError: any) {
          console.error("Provider status check error:", providerError);
          res.status(500).json({
            message: "Failed to check order status from provider",
            error: providerError.message,
          });
        }
      } catch (error) {
        console.error("Update order status error:", error);
        res.status(500).json({ message: "Failed to update order status" });
      }
    },
  );

  // Auto Bot Routes

  // Validate bot token
  app.post("/api/autobots/validate-token", requireAuth, async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Bot token is required" });
      }

      const validation = await autoBotManager.validateBotToken(token);

      if (validation.valid) {
        res.json({
          valid: true,
          botInfo: validation.botInfo,
        });
      } else {
        res.status(400).json({
          valid: false,
          error: validation.error,
        });
      }
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ message: "Failed to validate token" });
    }
  });

  // Get user's auto bots
  app.get("/api/autobots", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const autoBots = await storage.getAutoBotsByUserId(user.id);
      res.json(autoBots);
    } catch (error) {
      console.error("Get auto bots error:", error);
      res.status(500).json({ message: "Failed to fetch auto bots" });
    }
  });

  // Create auto bot
  app.post("/api/autobots", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const {
        token,
        botName,
        botUsername,
        welcomeMessage,
        keyboardConfig,
        isActive,
      } = req.body;

      console.log("🚀 Creating auto bot with data:", {
        token: token ? `${token.substring(0, 10)}...` : "missing",
        botName,
        botUsername,
        keyboardConfig: keyboardConfig ? "provided" : "empty",
      });

      // Validate required fields
      if (!token || !botName || !botUsername) {
        return res
          .status(400)
          .json({ message: "Token, nama bot, dan username bot harus diisi" });
      }

      // Validate keyboard configuration JSON
      if (keyboardConfig) {
        try {
          if (typeof keyboardConfig === "string") {
            JSON.parse(keyboardConfig);
          } else if (Array.isArray(keyboardConfig)) {
            // Validate array structure
            keyboardConfig.forEach((button, index) => {
              if (!button.id || !button.text || !button.callbackData) {
                throw new Error(
                  `Button ${index + 1} harus memiliki id, text, dan callbackData`,
                );
              }
            });
          }
        } catch (parseError) {
          console.error("❌ Keyboard config validation error:", parseError);
          return res.status(400).json({
            message:
              "Konfigurasi keyboard tidak valid: " +
              (parseError instanceof Error
                ? parseError.message
                : "Format JSON salah"),
          });
        }
      }

      // Check if token is already in use
      const existingBot = await storage.getAutoBotByToken(token);
      if (existingBot) {
        return res
          .status(400)
          .json({ message: "Token bot ini sudah digunakan" });
      }

      // Validate token first
      console.log("🔍 Validating bot token...");
      const validation = await autoBotManager.validateBotToken(token);
      if (!validation.valid) {
        console.error("❌ Token validation failed:", validation.error);
        return res
          .status(400)
          .json({ message: validation.error || "Token bot tidak valid" });
      }

      console.log("✅ Token valid, creating bot in database...");
      const autoBot = await storage.createAutoBot({
        userId: user.id,
        token,
        botName,
        botUsername,
        welcomeMessage:
          welcomeMessage || "Selamat datang! Silakan pilih opsi di bawah ini:",
        keyboardConfig: keyboardConfig || [],
        isActive: isActive !== false,
      });

      // Start the bot if it's active
      if (autoBot.isActive) {
        console.log("🚀 Starting auto bot...");
        const startResult = await autoBotManager.startAutoBot(autoBot);
        if (!startResult.success) {
          console.error("❌ Failed to start bot:", startResult.error);
          // Update bot to inactive if start failed
          await storage.updateAutoBot(autoBot.id, { isActive: false });
          return res.status(500).json({
            message: `Bot berhasil dibuat tapi gagal dijalankan: ${startResult.error}`,
          });
        }
      }

      console.log("✅ Auto bot created successfully");
      res.json(autoBot);
    } catch (error) {
      console.error("❌ Create auto bot error:", error);
      res.status(500).json({
        message:
          "Gagal membuat auto bot: " +
          (error instanceof Error ? error.message : "Unknown error"),
      });
    }
  });

  // Update auto bot
  app.patch("/api/autobots/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const botId = parseInt(req.params.id);
      const updates = req.body;

      // Get existing bot
      const existingBot = await storage.getAutoBot(botId);
      if (!existingBot || existingBot.userId !== user.id) {
        return res.status(404).json({ message: "Auto bot not found" });
      }

      // Update bot
      const updatedBot = await storage.updateAutoBot(botId, updates);
      if (!updatedBot) {
        return res.status(404).json({ message: "Auto bot not found" });
      }

      // Restart bot if it's active
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

  // Delete auto bot
  app.delete("/api/autobots/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const botId = parseInt(req.params.id);

      // Get existing bot
      const existingBot = await storage.getAutoBot(botId);
      if (!existingBot || existingBot.userId !== user.id) {
        return res.status(404).json({ message: "Auto bot not found" });
      }

      // Stop bot if running
      await autoBotManager.stopAutoBot(existingBot.token);

      // Delete bot
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

  // Start/Stop auto bot
  app.post("/api/autobots/:id/toggle", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const botId = parseInt(req.params.id);
      const { isActive } = req.body;

      // Get existing bot
      const existingBot = await storage.getAutoBot(botId);
      if (!existingBot || existingBot.userId !== user.id) {
        return res.status(404).json({ message: "Auto bot not found" });
      }

      // Update bot status
      const updatedBot = await storage.updateAutoBot(botId, { isActive });
      if (!updatedBot) {
        return res.status(404).json({ message: "Auto bot not found" });
      }

      // Start or stop bot
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

  // Start bot manager after a delay to ensure database is ready
  setTimeout(async () => {
    try {
      await telegramBotManager.restartAllBots();
      await autoBotManager.restartAllAutoBots();
    } catch (error) {
      console.error("Failed to restart bots on server start:", error);
    }
  }, 1000);

  // SECURITY MONITORING ENDPOINTS
  app.get("/api/system/security-status", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      res.json({
        status: "active",
        protections: {
          rateLimiting: "enabled",
          securityFiltering: "enabled",
          logSanitization: "enabled",
          threatDetection: "enabled",
        },
        timestamp: new Date().toISOString(),
        message: "Semua sistem keamanan aktif dan melindungi aplikasi",
      });
    } catch (error) {
      console.error("Security status error:", error);
      res.status(500).json({ message: "Failed to get security status" });
    }
  });

  // API KEYS MANAGEMENT ENDPOINTS
  
  // Get user's API keys
  app.get("/api/api-keys", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const result = await pool.query(
        'SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
        [user.id]
      );
      
      // Transform data untuk frontend
      const apiKeys = result.rows.map(row => ({
        id: row.id,
        keyName: row.name,
        apiKey: row.api_key,
        isActive: row.is_active,
        lastUsed: row.last_used,
        totalRequests: row.total_requests || 0,
        totalOrders: row.total_orders || 0,
        totalRevenue: row.total_revenue || "0",
        createdAt: row.created_at
      }));
      
      res.json(apiKeys);
    } catch (error) {
      console.error("Get API keys error:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  // Create new API key
  app.post("/api/api-keys", requireAuth, async (req, res) => {
    console.log("=== API KEY CREATION ENDPOINT HIT ===");
    console.log("Request body:", req.body);
    console.log("User:", req.user);
    
    try {
      const user = req.user!;
      const { keyName } = req.body;

      console.log("Creating API key for user:", user.id, "with name:", keyName);

      if (!keyName || keyName.trim().length === 0) {
        console.log("Missing keyName in request");
        return res.status(400).json({ message: "API key name is required" });
      }

      const apiKey = generateApiKey();
      console.log("Generated API key:", apiKey);
      
      // Simpan API key langsung ke database
      const result = await pool.query(
        `INSERT INTO api_keys (name, user_id, api_key, api_endpoint, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
        [keyName.trim(), user.id, apiKey, 'https://your-domain.replit.app/api/v2', true]
      );

      const createdApiKey = result.rows[0];
      console.log("Successfully created API key:", createdApiKey);
      
      res.json(createdApiKey);
    } catch (error) {
      console.error("Create API key error:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  // Toggle API key status
  app.patch("/api/api-keys/:id/toggle", requireAuth, async (req, res) => {
    console.log("=== TOGGLE API KEY ENDPOINT HIT ===");
    console.log("User ID:", req.user?.id);
    console.log("API Key ID:", req.params.id);
    console.log("Request body:", req.body);
    
    try {
      const user = req.user!;
      const keyId = parseInt(req.params.id);
      const { isActive } = req.body;

      console.log("Parsed keyId:", keyId);
      console.log("isActive value:", isActive);

      // Verify ownership and update
      const result = await pool.query(
        'UPDATE api_keys SET is_active = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
        [isActive, keyId, user.id]
      );

      console.log("Update result rows:", result.rows.length);

      if (result.rows.length === 0) {
        console.log("No rows updated - API key not found");
        return res.status(404).json({ message: "API key not found" });
      }

      const row = result.rows[0];
      const updatedKey = {
        id: row.id,
        keyName: row.name,
        apiKey: row.api_key,
        isActive: row.is_active,
        lastUsed: row.last_used,
        totalRequests: row.total_requests || 0,
        totalOrders: row.total_orders || 0,
        totalRevenue: row.total_revenue || "0",
        createdAt: row.created_at
      };

      console.log("Successfully updated API key:", updatedKey);
      res.json(updatedKey);
    } catch (error) {
      console.error("Toggle API key error:", error);
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  // Delete API key
  app.delete("/api/api-keys/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const keyId = parseInt(req.params.id);

      // Verify ownership
      const existingKey = await storage.getUserApiKey(keyId);
      if (!existingKey || existingKey.userId !== user.id) {
        return res.status(404).json({ message: "API key not found" });
      }

      await storage.deleteUserApiKey(keyId);
      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      console.error("Delete API key error:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
