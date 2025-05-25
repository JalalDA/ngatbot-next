import type { Express } from "express";
import { storage } from "./storage";
import { AutoBotService } from "./auto-bot-service";
import { insertAutoBotSchema, insertProductSchema } from "@shared/schema";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function registerAutoBotRoutes(app: Express) {
  // Get auto bots for current user
  app.get("/api/auto-bots", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const bots = await storage.getAutoBotsByUserId(user.id);
      res.json(bots);
    } catch (error) {
      console.error("Get auto bots error:", error);
      res.status(500).json({ message: "Failed to fetch auto bots" });
    }
  });

  // Create new auto bot
  app.post("/api/auto-bots", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { botToken } = req.body;

      if (!botToken) {
        return res.status(400).json({ message: "Bot token is required" });
      }

      // Validate bot token with Telegram API
      const validationResult = await AutoBotService.validateBotToken(botToken);
      if (!validationResult.valid) {
        return res.status(400).json({ 
          message: validationResult.error || "Token bot tidak valid" 
        });
      }

      const botInfo = validationResult.botInfo!;
      
      // Generate webhook URL
      const webhookUrl = AutoBotService.generateWebhookUrl(botInfo.id.toString());

      // Set webhook for the bot
      const webhookResult = await AutoBotService.setWebhook(botToken, webhookUrl);
      if (!webhookResult.success) {
        return res.status(400).json({ 
          message: webhookResult.error || "Gagal mengatur webhook bot" 
        });
      }

      // Create auto bot in database
      const autoBot = await storage.createAutoBot({
        userId: user.id,
        botToken: botToken,
        botUsername: botInfo.username,
        botName: botInfo.first_name,
        botId: botInfo.id.toString(),
        isActive: true,
        webhookUrl
      });

      res.json({
        ...autoBot,
        botName: botInfo.first_name,
        botUsername: botInfo.username
      });
    } catch (error) {
      console.error("Create auto bot error:", error);
      res.status(500).json({ message: "Failed to create auto bot" });
    }
  });

  // Delete auto bot
  app.delete("/api/auto-bots/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const botId = parseInt(req.params.id);

      // Check if bot belongs to user
      const bot = await storage.getAutoBot(botId);
      if (!bot || bot.userId !== user.id) {
        return res.status(404).json({ message: "Bot not found" });
      }

      // Remove webhook
      await AutoBotService.removeWebhook(bot.botToken);

      // Delete bot from database
      const success = await storage.deleteAutoBot(botId);
      if (success) {
        res.json({ message: "Bot deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete bot" });
      }
    } catch (error) {
      console.error("Delete auto bot error:", error);
      res.status(500).json({ message: "Failed to delete auto bot" });
    }
  });

  // Get products
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
}