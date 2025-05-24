import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { telegramBotManager } from "./telegram";
import { insertBotSchema, insertKnowledgeSchema, insertSettingSchema } from "@shared/schema";
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
