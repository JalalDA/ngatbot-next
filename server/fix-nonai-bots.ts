import { storage } from "./storage";
import { NonAiChatbotService } from "./non-ai-chatbot";

/**
 * Fix Non-AI bots by stopping polling and setting up webhooks properly
 */
export async function fixNonAiBots() {
  try {
    console.log("🔧 Starting Non-AI bot webhook fix...");
    
    // Get all Non-AI chatbots
    const allNonAiBots = await storage.getAllNonAiChatbots();
    console.log(`Found ${allNonAiBots.length} Non-AI chatbots`);
    
    for (const bot of allNonAiBots) {
      if (!bot.isActive) {
        console.log(`⏭️ Skipping inactive bot: ${bot.botUsername}`);
        continue;
      }
      
      console.log(`🤖 Fixing bot: ${bot.botUsername} (ID: ${bot.id})`);
      
      try {
        // Step 1: Remove any existing webhook first
        console.log(`  🗑️ Removing existing webhook...`);
        await NonAiChatbotService.removeWebhook(bot.botToken);
        
        // Step 2: Wait a bit for Telegram to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 3: Set new webhook
        const webhookUrl = NonAiChatbotService.generateWebhookUrl(bot.id);
        console.log(`  🔗 Setting webhook to: ${webhookUrl}`);
        
        const webhookResult = await NonAiChatbotService.setWebhook(bot.botToken, webhookUrl);
        
        if (webhookResult.success) {
          console.log(`  ✅ Webhook set successfully for ${bot.botUsername}`);
          
          // Update webhook URL in database
          await storage.updateNonAiChatbot(bot.id, { webhookUrl });
        } else {
          console.error(`  ❌ Failed to set webhook for ${bot.botUsername}:`, webhookResult.error);
        }
        
      } catch (error) {
        console.error(`  💥 Error fixing bot ${bot.botUsername}:`, error);
      }
    }
    
    console.log("🎉 Non-AI bot webhook fix completed!");
    
  } catch (error) {
    console.error("💥 Error in fixNonAiBots:", error);
    throw error;
  }
}