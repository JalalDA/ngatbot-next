import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import type { AutoBot } from "@shared/schema";

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
  responseImage?: string; // URL gambar yang dikirim ketika tombol diklik
  isAllShow?: boolean; // New property for All Show button
}

export class AutoBotManager {
  private activeBots: Map<string, { bot: TelegramBot; config: AutoBot }> = new Map();

  /**
   * Validate bot token by calling Telegram getMe API
   */
  async validateBotToken(token: string): Promise<{ valid: boolean; botInfo?: TelegramBotInfo; error?: string }> {
    try {
      console.log('🤖 Validating bot token...');
      
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
        method: 'GET'
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        return {
          valid: false,
          error: `HTTP ${response.status}: Token tidak valid atau kadaluarsa`
        };
      }

      const responseText = await response.text();
      console.log('📜 Raw response:', responseText.substring(0, 200) + '...');

      // Check if response is HTML (error page)
      if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
        console.error('❌ Received HTML response instead of JSON');
        return {
          valid: false,
          error: 'Token bot tidak valid atau ada masalah dengan koneksi ke Telegram API'
        };
      }

      let data: TelegramApiResponse<TelegramBotInfo>;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('📄 Response text that failed to parse:', responseText);
        return {
          valid: false,
          error: 'Format response dari Telegram API tidak valid. Pastikan token bot benar.'
        };
      }

      if (data.ok && data.result) {
        console.log('✅ Token validation successful:', data.result.username);
        return {
          valid: true,
          botInfo: data.result
        };
      } else {
        console.error('❌ Telegram API error:', data);
        return {
          valid: false,
          error: data.description || 'Token bot tidak valid'
        };
      }
    } catch (error: any) {
      console.error('❌ Token validation error:', error);
      return {
        valid: false,
        error: 'Gagal memvalidasi token: ' + (error.message || 'Unknown error')
      };
    }
  }

  /**
   * Start auto bot with inline keyboard configuration
   */
  async startAutoBot(autoBot: AutoBot): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if bot is already running
      if (this.activeBots.has(autoBot.token)) {
        await this.stopAutoBot(autoBot.token);
      }

      const bot = new TelegramBot(autoBot.token, { polling: true });
      
      // Store bot instance
      this.activeBots.set(autoBot.token, { bot, config: autoBot });

      // Handle /start command
      bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const welcomeMessage = autoBot.welcomeMessage || "Selamat datang! Silakan pilih opsi di bawah ini:";
        const welcomeImageUrl = (autoBot as any).welcomeImageUrl;
        
        let buttonsToShow: InlineKeyboard[] = [];
        
        // Check if Service Management Integration is enabled
        if ((autoBot as any).enableServiceManagement) {
          try {
            // Get Service Management data using storage interface
            const { storage } = await import('./storage');
            const categories = await storage.getServiceCategories();
            
            // Create buttons from Service Management categories
            buttonsToShow = categories
              .filter(category => category.isActive)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((category, index) => ({
                id: `service_category_${category.id}`,
                text: `${this.getCategoryIcon(category.icon)} ${category.name}`,
                callbackData: `service_category_${category.id}`,
                level: 0
              }));
            
            console.log(`🎯 Service Management: Loaded ${buttonsToShow.length} categories for bot ${autoBot.botName}`);
          } catch (error) {
            console.error('❌ Error loading Service Management data:', error);
            // Fallback to manual keyboard config
            buttonsToShow = (autoBot.keyboardConfig || []).filter(btn => 
              (!btn.level || btn.level === 0) && !btn.isAllShow
            );
          }
        } else {
          // Use manual keyboard configuration
          const mainMenuButtons = (autoBot.keyboardConfig || []).filter(btn => 
            (!btn.level || btn.level === 0) && !btn.isAllShow
          );
          
          // Check if there's an All Show button configured
          const allShowButton = (autoBot.keyboardConfig || []).find(btn => btn.isAllShow);
          buttonsToShow = [...mainMenuButtons];
          
          // Add All Show button if configured (but avoid duplicates)
          if (allShowButton) {
            // Check if there's already a button with the same text to avoid duplication
            const existingButton = mainMenuButtons.find(btn => btn.text === allShowButton.text);
            if (!existingButton) {
              buttonsToShow.push({
                id: 'all_show_button',
                text: allShowButton.text || '📋 Lihat Semua Menu',
                callbackData: 'show_all_menus',
                level: 0
              });
            }
          }
        }
        
        const keyboard = this.createInlineKeyboard(buttonsToShow);
        
        // Asynchronous image and text sending to avoid blocking
        try {
          if (welcomeImageUrl && welcomeImageUrl.trim()) {
            // Send image with caption and keyboard asynchronously
            bot.sendPhoto(chatId, welcomeImageUrl, {
              caption: welcomeMessage,
              reply_markup: keyboard,
              parse_mode: 'Markdown'
            }).catch(imageError => {
              // If image fails, fallback to text message without blocking
              bot.sendMessage(chatId, welcomeMessage, {
                reply_markup: keyboard,
                parse_mode: 'Markdown'
              }).catch(() => {});
            });
          } else {
            // Send text message only
            bot.sendMessage(chatId, welcomeMessage, {
              reply_markup: keyboard,
              parse_mode: 'Markdown'
            }).catch(() => {});
          }
        } catch (error) {
          // Non-blocking error handling
          bot.sendMessage(chatId, welcomeMessage, {
            reply_markup: keyboard
          }).catch(() => {});
        }
      });

      // Handle callback queries (inline button presses)
      bot.on('callback_query', async (callbackQuery) => {
        const msg = callbackQuery.message;
        const data = callbackQuery.data;
        
        if (msg && data) {
          const chatId = msg.chat.id;
          
          console.log(`🎯 BOT ${autoBot.botName} - Callback received: "${data}" from chat ${chatId}`);
          console.log(`📋 ALL KEYBOARD CONFIG:`, JSON.stringify(autoBot.keyboardConfig, null, 2));
          
          // Handle special navigation buttons FIRST
          if (data === 'back_to_main') {
            console.log(`🏠 Handling Menu Utama button`);
            // Show main menu again - exclude All Show buttons
            const mainMenuButtons = (autoBot.keyboardConfig || []).filter(btn => 
              (!btn.level || btn.level === 0) && !btn.isAllShow
            );
            const keyboard = this.createInlineKeyboard(mainMenuButtons);
            
            // Fast delete and send
            bot.deleteMessage(chatId, msg.message_id).catch(() => {});
            bot.sendMessage(chatId, autoBot.welcomeMessage || "Selamat datang! Silakan pilih opsi di bawah ini:", {
              reply_markup: keyboard,
              parse_mode: 'Markdown'
            });
            return;
          }
          
          // Handle All Show button (both direct and navigation)
          if (data === 'show_all_menus' || data === 'all_show') {
            console.log(`📋 Handling All Show button`);
            const allShowMessage = this.createAllShowMessage(autoBot.keyboardConfig || []);
            const keyboard = this.createAllShowKeyboard(autoBot.keyboardConfig || []);
            
            try {
              // Try editing first
              await bot.editMessageText(allShowMessage, {
                chat_id: chatId,
                message_id: msg.message_id,
                reply_markup: keyboard,
                parse_mode: 'Markdown'
              });
            } catch (error: any) {
              console.log(`⚠️ Edit failed, using delete + send approach:`, error.message);
              // If edit fails, delete and send new message
              bot.deleteMessage(chatId, msg.message_id).catch(() => {});
              await bot.sendMessage(chatId, allShowMessage, {
                reply_markup: keyboard,
                parse_mode: 'Markdown'
              });
            }
            return;
          }
          
          // Find the button that was pressed
          const pressedButton = autoBot.keyboardConfig?.find(btn => btn.callbackData === data);
          
          console.log(`🔍 Button search result:`, pressedButton ? 
            `Found: "${pressedButton.text}" (ID: ${pressedButton.id}, Level: ${pressedButton.level}, ParentID: ${pressedButton.parentId})` : 
            'NOT FOUND');
          
          if (!pressedButton) {
            console.log(`❌ No button found for callback data: "${data}"`);
            console.log(`📋 Available buttons:`, autoBot.keyboardConfig?.map(btn => `"${btn.text}" -> "${btn.callbackData}"`));
            return; // Exit early if button not found
          }
          
          // Answer callback query immediately for fast response
          bot.answerCallbackQuery(callbackQuery.id).catch(() => {});
          



          
          if (pressedButton) {
            try {
              

              
              // Check if this is a main menu button (level 0) that has sub-menus
              if (!pressedButton.level || pressedButton.level === 0) {
                // Find sub-menus for this main menu
                const subMenus = (autoBot.keyboardConfig || []).filter(btn => 
                  btn.level === 1 && btn.parentId === pressedButton.id
                );
                
                if (subMenus.length > 0) {
                  // Find All Show button from config
                  const allShowButton = (autoBot.keyboardConfig || []).find(btn => btn.isAllShow);
                  // Add navigation buttons (Home + All Show)
                  const navigationButtons = [];
                  
                  // Always add Home button
                  navigationButtons.push({
                    id: 'home_sub_level',
                    text: '🏠 Menu Utama',
                    callbackData: 'back_to_main',
                    level: 1
                  });
                  
                  // Add All Show button if available
                  if (allShowButton) {
                    navigationButtons.push({
                      id: 'all_show_sub_level',
                      text: allShowButton.text || '📋 Lihat Semua Menu',
                      callbackData: 'show_all_menus',
                      level: 1
                    });
                  }
                  
                  // Show sub menus with All Show button only (no back button)
                  const subMenusWithNavigation = [
                    ...subMenus,
                    ...navigationButtons
                  ];
                  

                  
                  // Replace main menu with sub-menus
                  const subMenuKeyboard = this.createInlineKeyboard(subMenusWithNavigation);
                  
                  // Use response text if available, otherwise use default format
                  const menuText = pressedButton.responseText || `📋 Menu ${pressedButton.text}:`;
                  
                  // Always delete original message and send new one to avoid conflicts
                  try {
                    await bot.deleteMessage(chatId, msg.message_id);
                  } catch (deleteError) {
                    console.log('Could not delete message, continuing...');
                  }
                  
                  // Check if button has image URL
                  const buttonWithImage = pressedButton as any;
                  if (buttonWithImage.responseImage && buttonWithImage.responseImage.trim()) {
                    // Send new photo with caption and keyboard
                    await bot.sendPhoto(chatId, buttonWithImage.responseImage, {
                      caption: menuText,
                      parse_mode: 'Markdown',
                      reply_markup: subMenuKeyboard
                    });
                  } else {
                    // Send text message
                    await bot.sendMessage(chatId, menuText, {
                      reply_markup: subMenuKeyboard,
                      parse_mode: 'Markdown'
                    });
                  }
                } else {
                  // No sub-menus, show response text inline with back button
                  const responseText = pressedButton.responseText || `Anda memilih: ${pressedButton.text}`;
                  
                  // Create back button
                  const backButton = this.createHomeButton('response');
                  
                  const responseKeyboard = this.createInlineKeyboard([backButton]);
                  
                  // Always delete original message and send new one to avoid conflicts
                  try {
                    await bot.deleteMessage(chatId, msg.message_id);
                  } catch (deleteError) {
                    console.log('Could not delete message, continuing...');
                  }
                  
                  // Check if button has image URL
                  const buttonWithImage = pressedButton as any;
                  if (buttonWithImage.responseImage && buttonWithImage.responseImage.trim()) {
                    // Send new photo with caption and keyboard
                    await bot.sendPhoto(chatId, buttonWithImage.responseImage, {
                      caption: responseText,
                      parse_mode: 'Markdown',
                      reply_markup: responseKeyboard
                    });
                  } else {
                    // Send text message
                    await bot.sendMessage(chatId, responseText, {
                      reply_markup: responseKeyboard,
                      parse_mode: 'Markdown'
                    });
                  }
                }
              } else {
                // Handle any level button (level 1, 2, 3, 4, 5)
                const currentLevel = pressedButton.level || 0;
                
                console.log(`🔍 Button pressed: "${pressedButton.text}" (ID: ${pressedButton.id}, Level: ${currentLevel})`);
                console.log(`🔍 Looking for child menus with level ${currentLevel + 1} and parentId: ${pressedButton.id}`);
                
                // FIX: More flexible matching to handle ID inconsistencies
                const childMenus = (autoBot.keyboardConfig || []).filter(btn => {
                  const isCorrectLevel = btn.level === currentLevel + 1;
                  
                  // Try multiple matching strategies
                  const exactParentMatch = btn.parentId === pressedButton.id;
                  const stringParentMatch = String(btn.parentId) === String(pressedButton.id);
                  const parentTextMatch = btn.parentId === pressedButton.text; // Some configs use text as parentId
                  
                  const hasMatchingParent = exactParentMatch || stringParentMatch || parentTextMatch;
                  
                  console.log(`🔍 Checking button "${btn.text}": Level ${btn.level} (need ${currentLevel + 1}), ParentID "${btn.parentId}" (need "${pressedButton.id}") → Level Match: ${isCorrectLevel}, Parent Match: ${hasMatchingParent} (exact: ${exactParentMatch}, string: ${stringParentMatch}, text: ${parentTextMatch})`);
                  
                  return isCorrectLevel && hasMatchingParent;
                });
                
                console.log(`🔍 Found ${childMenus.length} child menus:`, childMenus.map(btn => `"${btn.text}" (ID: ${btn.id}, Level: ${btn.level}, ParentID: ${btn.parentId})`));
                
                if (childMenus.length > 0) {
                  // Find All Show button from config
                  const allShowButton = (autoBot.keyboardConfig || []).find(btn => btn.isAllShow);
                  console.log(`🔍 Level ${currentLevel + 1} - Found All Show button:`, allShowButton ? 'YES' : 'NO');
                  
                  // Add navigation buttons (Home + All Show)
                  const navigationButtons = [];
                  
                  // Always add Home button
                  navigationButtons.push({
                    id: `home_level_${currentLevel + 1}`,
                    text: '🏠 Menu Utama',
                    callbackData: 'back_to_main',
                    level: currentLevel + 1
                  });
                  
                  // Add All Show button if available
                  if (allShowButton) {
                    navigationButtons.push({
                      id: `all_show_level_${currentLevel + 1}`,
                      text: allShowButton.text || '📋 Lihat Semua Menu',
                      callbackData: 'show_all_menus',
                      level: currentLevel + 1
                    });
                    console.log(`✅ Added navigation buttons to level ${currentLevel + 1}`);
                  }
                  
                  const childMenusWithNavigation = [
                    ...childMenus,
                    ...navigationButtons
                  ];
                  
                  console.log(`📋 Level ${currentLevel + 1} menu buttons:`, childMenusWithNavigation.map(btn => btn.text));
                  
                  const childMenuKeyboard = this.createInlineKeyboard(childMenusWithNavigation);
                  
                  // Use response text if available, otherwise use default format
                  const levelNames = ['Menu', 'Sub Menu', 'Sub Sub Menu', 'Level 4 Menu', 'Level 5 Menu', 'Level 6 Menu'];
                  const levelName = levelNames[currentLevel] || `Level ${currentLevel + 1} Menu`;
                  const menuText = pressedButton.responseText || `📋 ${levelName} ${pressedButton.text}:`;
                  
                  // Always delete original message and send new one to avoid conflicts
                  try {
                    await bot.deleteMessage(chatId, msg.message_id);
                  } catch (deleteError) {
                    console.log('Could not delete message, continuing...');
                  }
                  
                  // Check if button has image URL
                  const buttonWithImage = pressedButton as any;
                  if (buttonWithImage.responseImage && buttonWithImage.responseImage.trim()) {
                    // Send new photo with caption and keyboard
                    await bot.sendPhoto(chatId, buttonWithImage.responseImage, {
                      caption: menuText,
                      parse_mode: 'Markdown',
                      reply_markup: childMenuKeyboard
                    });
                  } else {
                    // Send text message
                    await bot.sendMessage(chatId, menuText, {
                      reply_markup: childMenuKeyboard,
                      parse_mode: 'Markdown'
                    });
                  }
                } else {
                  // No child menus, this is a final button - show response text inline with back button
                  const responseText = pressedButton.responseText || `Anda memilih: ${pressedButton.text}`;
                  
                  // No keyboard for final response
                  const responseKeyboard = undefined;
                  
                  // Check if button has image URL
                  const buttonWithImage = pressedButton as any;
                  if (buttonWithImage.responseImage && buttonWithImage.responseImage.trim()) {
                    // Delete the original message
                    await bot.deleteMessage(chatId, msg.message_id);
                    // Send new photo with caption and keyboard
                    await bot.sendPhoto(chatId, buttonWithImage.responseImage, {
                      caption: responseText,
                      parse_mode: 'Markdown',
                      reply_markup: responseKeyboard
                    });
                  } else {
                    // Send text only
                    await bot.editMessageText(responseText, {
                      chat_id: chatId,
                      message_id: msg.message_id,
                      reply_markup: responseKeyboard,
                      parse_mode: 'Markdown'
                    });
                  }
                }
              }
            } catch (error: any) {
              console.error(`Error handling callback for bot ${autoBot.botName}:`, error?.message || error);
              
              // If it's a Telegram API error about editing message, try to send a new message instead
              if (error?.message?.includes('there is no text in the message to edit') || 
                  error?.message?.includes('message to edit not found')) {
                console.log('Message edit failed, this is normal when switching between text and image messages');
              }
            }
          }
        }
      });

      // Handle errors
      bot.on('polling_error', (error) => {
        console.error(`Polling error for bot ${autoBot.botName}:`, error);
      });

      bot.on('error', (error) => {
        console.error(`Bot error for ${autoBot.botName}:`, error);
      });

      console.log(`Auto bot ${autoBot.botName} started successfully`);
      return { success: true };

    } catch (error: any) {
      console.error(`Failed to start auto bot ${autoBot.botName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop auto bot
   */
  async stopAutoBot(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const botInstance = this.activeBots.get(token);
      
      if (botInstance) {
        await botInstance.bot.stopPolling();
        this.activeBots.delete(token);
        console.log(`Auto bot with token ${token.slice(0, 10)}... stopped`);
      }

      return { success: true };
    } catch (error: any) {
      console.error(`Failed to stop auto bot:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get category icon based on icon type
   */
  private getCategoryIcon(iconType: string): string {
    const iconMap: { [key: string]: string } = {
      'followers': '👥',
      'likes': '❤️',
      'views': '👁️',
      'comments': '💬',
      'instagram': '📷',
      'tiktok': '🎵',
      'youtube': '📺',
      'facebook': '📘',
      'twitter': '🐦'
    };
    return iconMap[iconType.toLowerCase()] || '📋';
  }

  /**
   * Create HOME button with unique ID for each context
   */
  private createHomeButton(context: string): InlineKeyboard {
    return {
      id: `home_${context}`,
      text: '🏠 HOME',
      callbackData: 'back_to_main',
      level: 0
    };
  }

  /**
   * Create All Show message with hierarchical menu structure
   */
  private createAllShowMessage(buttons: InlineKeyboard[]): string {
    let message = "📋 *Semua Menu Tersedia:*\n\n";
    
    // Group buttons by level
    const buttonsByLevel: { [key: number]: InlineKeyboard[] } = {};
    buttons.forEach(btn => {
      const level = btn.level || 0;
      if (!buttonsByLevel[level]) buttonsByLevel[level] = [];
      buttonsByLevel[level].push(btn);
    });
    
    // Create hierarchical display
    for (let level = 0; level <= 4; level++) {
      const levelButtons = buttonsByLevel[level] || [];
      if (levelButtons.length === 0) continue;
      
      const levelNames = ['📌 Menu Utama', '📂 Sub Menu', '📄 Sub Sub Menu', '📎 Level 4', '📊 Level 5'];
      message += `${levelNames[level]}:\n`;
      
      levelButtons.forEach(btn => {
        if (!btn.isAllShow) { // Don't show the All Show button itself
          const indent = '  '.repeat(level);
          message += `${indent}• ${btn.text}\n`;
        }
      });
      message += '\n';
    }
    
    message += "Pilih menu yang ingin Anda akses:";
    return message;
  }

  /**
   * Create All Show keyboard with all available buttons
   */
  private createAllShowKeyboard(buttons: InlineKeyboard[]): any {
    const availableButtons = buttons.filter(btn => !btn.isAllShow);
    const keyboardButtons = [
      ...availableButtons,
      this.createHomeButton('allshow')
    ];
    
    return this.createInlineKeyboard(keyboardButtons);
  }

  /**
   * Create inline keyboard markup from configuration
   */
  private createInlineKeyboard(buttons: InlineKeyboard[]): any {
    if (!buttons || buttons.length === 0) {
      return { inline_keyboard: [] };
    }

    // Create rows of buttons (2 buttons per row)
    const keyboard: any[][] = [];
    
    for (let i = 0; i < buttons.length; i += 2) {
      const row: any[] = [];
      
      // Add first button in row
      const firstButton = buttons[i];
      if (firstButton.url) {
        row.push({
          text: firstButton.text,
          url: firstButton.url
        });
      } else {
        row.push({
          text: firstButton.text,
          callback_data: firstButton.callbackData
        });
      }
      
      // Add second button in row if exists
      if (i + 1 < buttons.length) {
        const secondButton = buttons[i + 1];
        if (secondButton.url) {
          row.push({
            text: secondButton.text,
            url: secondButton.url
          });
        } else {
          row.push({
            text: secondButton.text,
            callback_data: secondButton.callbackData
          });
        }
      }
      
      keyboard.push(row);
    }

    return { inline_keyboard: keyboard };
  }



  /**
   * Restart all active auto bots
   */
  async restartAllAutoBots(): Promise<void> {
    try {
      const allAutoBots = await storage.getAllAutoBots();
      const activeAutoBots = allAutoBots.filter(bot => bot.isActive);

      // Stop all running bots first
      for (const [token] of this.activeBots) {
        await this.stopAutoBot(token);
      }

      // Start active bots
      for (const autoBot of activeAutoBots) {
        await this.startAutoBot(autoBot);
      }

      console.log(`Restarted ${activeAutoBots.length} active auto bots`);
    } catch (error) {
      console.error('Failed to restart auto bots:', error);
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

// Export singleton instance
export const autoBotManager = new AutoBotManager();