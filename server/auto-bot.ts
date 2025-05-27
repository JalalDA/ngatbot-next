import TelegramBot from 'node-telegram-bot-api';
import type { AutoBot } from '../shared/schema';

interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

interface InlineKeyboard {
  id: string;
  text: string;
  callbackData: string;
  url?: string;
  level?: number;
  parentId?: string;
  responseText?: string;
  responseImage?: string;
  isAllShow?: boolean;
}

export class AutoBotManager {
  private activeBots: Map<string, { bot: TelegramBot; config: AutoBot }> = new Map();

  /**
   * Stop all active bots to prevent conflicts
   */
  async stopAllBots(): Promise<void> {
    console.log('Stopping all active bots...');
    const tokens = Array.from(this.activeBots.keys());
    
    for (const token of tokens) {
      await this.stopAutoBot(token);
    }
    
    // Clear the map completely
    this.activeBots.clear();
    
    console.log('All bots stopped successfully');
  }

  /**
   * Validate bot token by calling Telegram getMe API
   */
  async validateBotToken(token: string): Promise<{ valid: boolean; botInfo?: TelegramBotInfo; error?: string }> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data: TelegramApiResponse<TelegramBotInfo> = await response.json();
      
      if (data.ok && data.result) {
        return { valid: true, botInfo: data.result };
      } else {
        return { valid: false, error: data.description || 'Token tidak valid' };
      }
    } catch (error) {
      return { valid: false, error: 'Gagal memvalidasi token' };
    }
  }

  /**
   * Start auto bot with inline keyboard configuration
   */
  async startAutoBot(autoBot: AutoBot): Promise<{ success: boolean; error?: string }> {
    try {
      // Stop existing bot if running
      if (this.activeBots.has(autoBot.token)) {
        await this.stopAutoBot(autoBot.token);
        // Wait a bit for the previous instance to fully stop
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Create bot instance with error handling
      const bot = new TelegramBot(autoBot.token, { 
        polling: {
          interval: 1000,
          autoStart: false
        }
      });

      // Add error handler for polling errors
      bot.on('polling_error', (error) => {
        console.error('Bot polling error:', error);
        // Don't restart automatically to prevent conflicts
      });

      // Start polling manually
      await bot.startPolling();
      
      // Store bot
      this.activeBots.set(autoBot.token, { bot, config: autoBot });

      // Handle /start command
      bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const mainMenuButtons = (autoBot.keyboardConfig || []).filter(btn => 
          (!btn.level || btn.level === 0) && !btn.isAllShow
        );
        const keyboard = this.createInlineKeyboard(mainMenuButtons);
        const welcomeMessage = autoBot.welcomeMessage || "Selamat datang! Silakan pilih opsi di bawah ini:";

        // Check if welcome image is configured
        if (autoBot.welcomeImage && autoBot.welcomeImage.trim()) {
          await bot.sendPhoto(chatId, autoBot.welcomeImage, {
            caption: welcomeMessage,
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        } else {
          await bot.sendMessage(chatId, welcomeMessage, {
            reply_markup: keyboard
          });
        }
      });

      // Handle callback queries with proper error handling
      bot.on('callback_query', async (callbackQuery) => {
        try {
          const msg = callbackQuery.message;
          const data = callbackQuery.data;
          
          if (!msg || !data) return;
          
          const chatId = msg.chat.id;
          
          // Always answer callback query first to prevent loading state
          await bot.answerCallbackQuery(callbackQuery.id);
          
          // Find the button that was pressed
          const pressedButton = autoBot.keyboardConfig?.find(btn => btn.callbackData === data);
          
          // Handle back to main menu
          if (data === 'back_to_main') {
            const mainMenuButtons = (autoBot.keyboardConfig || []).filter(btn => 
              (!btn.level || btn.level === 0) && !btn.isAllShow
            );
            const keyboard = this.createInlineKeyboard(mainMenuButtons);
            const welcomeMessage = autoBot.welcomeMessage || "Selamat datang! Silakan pilih opsi di bawah ini:";
            
            if (autoBot.welcomeImage && autoBot.welcomeImage.trim()) {
              await bot.deleteMessage(chatId, msg.message_id);
              await bot.sendPhoto(chatId, autoBot.welcomeImage, {
                caption: welcomeMessage,
                parse_mode: 'Markdown',
                reply_markup: keyboard
              });
            } else {
              await this.safeEditMessage(bot, chatId, msg.message_id, welcomeMessage, keyboard);
            }
            return;
          }

          // Handle All Show button
          if (data === 'show_all_menus') {
            const allShowMessage = this.createAllShowMessage(autoBot.keyboardConfig || []);
            const keyboard = this.createAllShowKeyboard(autoBot.keyboardConfig || []);
            
            await this.safeEditMessage(bot, chatId, msg.message_id, allShowMessage, keyboard);
            return;
          }

          if (pressedButton) {
            // Handle button with response text/image
            if (pressedButton.responseText || pressedButton.responseImage) {
              const responseText = pressedButton.responseText || `Anda memilih: ${pressedButton.text}`;
              
              if (pressedButton.responseImage && pressedButton.responseImage.trim()) {
                await bot.deleteMessage(chatId, msg.message_id);
                await bot.sendPhoto(chatId, pressedButton.responseImage, {
                  caption: responseText,
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: [[{ text: '« Kembali ke Menu Utama', callback_data: 'back_to_main' }]]
                  }
                });
              } else {
                await this.safeEditMessage(bot, chatId, msg.message_id, responseText, {
                  inline_keyboard: [[{ text: '« Kembali ke Menu Utama', callback_data: 'back_to_main' }]]
                });
              }
              return;
            }

            // Handle navigation buttons
            if (!pressedButton.level || pressedButton.level === 0) {
              const subMenus = (autoBot.keyboardConfig || []).filter(btn => 
                btn.parentId === pressedButton.id && btn.level === 1
              );
              
              if (subMenus.length > 0) {
                const keyboard = this.createInlineKeyboard(subMenus);
                await this.safeEditMessage(bot, chatId, msg.message_id, `Menu: ${pressedButton.text}`, keyboard);
              }
            } else {
              const nextLevel = (pressedButton.level || 0) + 1;
              const subMenus = (autoBot.keyboardConfig || []).filter(btn => 
                btn.parentId === pressedButton.id && btn.level === nextLevel
              );
              
              if (subMenus.length > 0) {
                const keyboard = this.createInlineKeyboard(subMenus);
                await this.safeEditMessage(bot, chatId, msg.message_id, `Menu: ${pressedButton.text}`, keyboard);
              }
            }
          }
        } catch (error) {
          console.error('Error handling callback query:', error);
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error starting auto bot:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Safely edit message (handles both text and photo messages)
   */
  private async safeEditMessage(bot: TelegramBot, chatId: number, messageId: number, text: string, keyboard: any) {
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      // If edit fails (likely a photo message), delete and send new message
      try {
        await bot.deleteMessage(chatId, messageId);
        await bot.sendMessage(chatId, text, {
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      } catch (deleteError) {
        console.error('Error deleting message:', deleteError);
      }
    }
  }

  /**
   * Stop auto bot
   */
  async stopAutoBot(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const botInstance = this.activeBots.get(token);
      if (botInstance) {
        try {
          await botInstance.bot.stopPolling();
        } catch (stopError) {
          console.warn('Warning stopping bot polling:', stopError);
          // Continue even if stop fails
        }
        
        // Remove all listeners to prevent memory leaks
        botInstance.bot.removeAllListeners();
        this.activeBots.delete(token);
      }
      return { success: true };
    } catch (error) {
      console.error('Error stopping auto bot:', error);
      this.activeBots.delete(token); // Force remove even if error
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create All Show message with hierarchical menu structure
   */
  private createAllShowMessage(buttons: InlineKeyboard[]): string {
    let message = "*📋 Semua Menu Tersedia:*\n\n";
    
    const levelButtons: { [key: number]: InlineKeyboard[] } = {};
    buttons.forEach(btn => {
      const level = btn.level || 0;
      if (!levelButtons[level]) levelButtons[level] = [];
      levelButtons[level].push(btn);
    });

    for (let level = 0; level <= 5; level++) {
      if (levelButtons[level] && levelButtons[level].length > 0) {
        const indent = "  ".repeat(level);
        levelButtons[level].forEach(btn => {
          if (!btn.isAllShow) {
            message += `${indent}• ${btn.text}\n`;
          }
        });
      }
    }

    return message;
  }

  /**
   * Create All Show keyboard with all available buttons
   */
  private createAllShowKeyboard(buttons: InlineKeyboard[]): any {
    const keyboard: any[][] = [];
    const mainButtons = buttons.filter(btn => (!btn.level || btn.level === 0) && !btn.isAllShow);
    
    mainButtons.forEach(btn => {
      keyboard.push([{ text: btn.text, callback_data: btn.callbackData }]);
    });

    keyboard.push([{ text: '« Kembali ke Menu Utama', callback_data: 'back_to_main' }]);
    return { inline_keyboard: keyboard };
  }

  /**
   * Create inline keyboard markup from configuration
   */
  private createInlineKeyboard(buttons: InlineKeyboard[]): any {
    const keyboard: any[][] = [];
    
    // Filter out All Show buttons and add regular buttons
    const regularButtons = buttons.filter(btn => !btn.isAllShow);
    regularButtons.forEach(btn => {
      const buttonConfig: any = { text: btn.text, callback_data: btn.callbackData };
      if (btn.url) {
        buttonConfig.url = btn.url;
        delete buttonConfig.callback_data;
      }
      keyboard.push([buttonConfig]);
    });

    // Add All Show button if there are sub-menus
    const hasSubMenus = buttons.some(btn => btn.level && btn.level > 0);
    if (hasSubMenus && regularButtons.length > 0) {
      keyboard.push([{ text: '📋 Lihat Semua Menu', callback_data: 'show_all_menus' }]);
    }

    // Add back button for sub-menus
    if (buttons.length > 0 && buttons[0].level && buttons[0].level > 0) {
      keyboard.push([{ text: '« Kembali ke Menu Utama', callback_data: 'back_to_main' }]);
    }

    return { inline_keyboard: keyboard };
  }

  /**
   * Restart all active auto bots
   */
  async restartAllAutoBots(): Promise<void> {
    const tokens = Array.from(this.activeBots.keys());
    for (const token of tokens) {
      const botInstance = this.activeBots.get(token);
      if (botInstance) {
        await this.stopAutoBot(token);
        await this.startAutoBot(botInstance.config);
      }
    }
  }

  /**
   * Get active bots count
   */
  getActiveBotCount(): number {
    return this.activeBots.size;
  }

  /**
   * Check if bot is running
   */
  isBotRunning(token: string): boolean {
    return this.activeBots.has(token);
  }
}

export const autoBotManager = new AutoBotManager();