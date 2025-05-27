import TelegramBot from 'node-telegram-bot-api';
import { db } from './db.js';
import { telegramOrders, telegramServices, telegramPaymentSettings } from '../shared/schema.js';
import { createMidtransTransaction, getTransactionStatus } from './midtrans.js';
import { eq, and } from 'drizzle-orm';

interface SmmBotConfig {
  token: string;
  services: {
    id: string;
    name: string;
    category: string;
    price: number;
    minQuantity: number;
    maxQuantity: number;
  }[];
}

export class TelegramSmmBot {
  private bot: TelegramBot;
  private services: Map<string, any> = new Map();
  private token: string;
  private botOwnerId: string | null = null;
  private pendingPaymentSetup: Map<number, { step: string; data: any }> = new Map();

  constructor(config: SmmBotConfig) {
    this.token = config.token;
    this.bot = new TelegramBot(config.token, { polling: true });
    
    // Initialize services
    config.services.forEach(service => {
      this.services.set(service.id, service);
    });

    this.setupEventHandlers();
    console.log('🤖 SMM Telegram Bot initialized with token:', config.token.substring(0, 10) + '...');
  }

  private setupEventHandlers() {
    // Handle /start command
    this.bot.onText(/\/start/, (msg) => {
      this.handleStartCommand(msg);
    });

    // Handle /payment command
    this.bot.onText(/\/payment/, (msg) => {
      this.handlePaymentCommand(msg);
    });

    // Handle callback queries (inline keyboard button clicks)
    this.bot.on('callback_query', (query) => {
      this.handleCallbackQuery(query);
    });

    // Handle text messages for link input and payment setup
    this.bot.on('message', (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        this.handleTextMessage(msg);
      }
    });
  }

  private async handleStartCommand(msg: any) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    const username = msg.from?.username || 'Unknown';

    console.log(`👋 User ${username} (${userId}) started the bot`);

    const welcomeMessage = `🎉 Selamat datang di SMM Panel Bot!

Pilih layanan yang Anda inginkan dari menu di bawah ini:`;

    const mainMenuKeyboard = this.createMainMenuKeyboard();

    await this.bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: {
        inline_keyboard: mainMenuKeyboard
      }
    });

    // Set bot owner on first interaction
    if (!this.botOwnerId) {
      this.botOwnerId = userId;
      console.log(`👑 Bot owner set to: ${username} (${userId})`);
    }
  }

  private async handlePaymentCommand(msg: any) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    const username = msg.from?.username || 'Unknown';

    console.log(`💳 Payment command from ${username} (${userId})`);

    // Check if user is bot owner
    if (this.botOwnerId && userId !== this.botOwnerId) {
      await this.bot.sendMessage(chatId, '❌ Anda tidak memiliki akses untuk mengatur payment method. Hanya owner bot yang dapat melakukan konfigurasi ini.');
      return;
    }

    // If not set yet, set as owner
    if (!this.botOwnerId) {
      this.botOwnerId = userId;
      console.log(`👑 Bot owner set via payment command: ${username} (${userId})`);
    }

    try {
      // Check current payment settings
      const [currentSettings] = await db.select()
        .from(telegramPaymentSettings)
        .where(eq(telegramPaymentSettings.botToken, this.token))
        .limit(1);

      let message = '💳 Konfigurasi Payment Method Midtrans\n\n';

      if (currentSettings && currentSettings.isConfigured) {
        message += '✅ Status: Terkonfigurasi\n';
        message += `🔧 Mode: ${currentSettings.midtransIsProduction ? 'Production' : 'Sandbox'}\n`;
        message += `🔑 Server Key: ${currentSettings.midtransServerKey ? `${currentSettings.midtransServerKey.substring(0, 10)}...` : 'Tidak diset'}\n`;
        message += `🔐 Client Key: ${currentSettings.midtransClientKey ? `${currentSettings.midtransClientKey.substring(0, 10)}...` : 'Tidak diset'}\n\n`;
        message += '⚙️ Pilih aksi yang ingin dilakukan:';
      } else {
        message += '❌ Status: Belum dikonfigurasi\n\n';
        message += '📋 Untuk menggunakan fitur pembayaran, Anda perlu mengatur kredensial Midtrans:\n';
        message += '• Server Key\n';
        message += '• Client Key\n';
        message += '• Mode (Sandbox/Production)\n\n';
        message += '🔗 Dapatkan kredensial dari dashboard Midtrans Anda:\n';
        message += '• Sandbox: https://dashboard.sandbox.midtrans.com/\n';
        message += '• Production: https://dashboard.midtrans.com/\n\n';
        message += '⚙️ Pilih aksi untuk melakukan konfigurasi:';
      }

      const keyboard = [
        [{ text: '🔧 Setup/Update Kredensial', callback_data: 'payment_setup' }],
      ];

      if (currentSettings && currentSettings.isConfigured) {
        keyboard.push(
          [{ text: '🔄 Test Koneksi', callback_data: 'payment_test' }],
          [{ text: '🗑️ Hapus Konfigurasi', callback_data: 'payment_delete' }]
        );
      }

      keyboard.push([{ text: '🔙 Menu Utama', callback_data: 'back_to_main' }]);

      await this.bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });

    } catch (error) {
      console.error('❌ Error handling payment command:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengakses pengaturan pembayaran.');
    }
  }

  private createMainMenuKeyboard() {
    // Group services by category
    const categories = new Map<string, any[]>();
    
    this.services.forEach(service => {
      if (!categories.has(service.category)) {
        categories.set(service.category, []);
      }
      categories.get(service.category)!.push(service);
    });

    const keyboard: any[][] = [];

    // Create category buttons
    categories.forEach((services, category) => {
      keyboard.push([{
        text: `${this.getCategoryIcon(category)} ${category}`,
        callback_data: `category_${category}`
      }]);
    });

    // Add info and support buttons
    keyboard.push([
      { text: '📊 Cek Pesanan', callback_data: 'check_orders' },
      { text: '💬 Bantuan', callback_data: 'help' }
    ]);

    return keyboard;
  }

  private getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Instagram Followers': '👥',
      'Instagram Likes': '❤️',
      'Instagram Views': '👀',
      'Instagram Comments': '💬',
      'TikTok Followers': '🎵',
      'TikTok Likes': '💖',
      'TikTok Views': '📺',
      'YouTube Subscribers': '📺',
      'YouTube Views': '🔥',
      'YouTube Likes': '👍',
      'Facebook Page Likes': '👍',
      'Facebook Post Likes': '❤️',
      'Twitter Followers': '🐦',
      'Twitter Likes': '💙'
    };
    return icons[category] || '🎯';
  }

  private async handleCallbackQuery(query: any) {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const data = query.data;

    console.log(`📱 Callback query from ${userId}: ${data}`);

    try {
      if (data.startsWith('category_')) {
        await this.handleCategorySelection(query);
      } else if (data.startsWith('service_')) {
        await this.handleServiceSelection(query);
      } else if (data.startsWith('quantity_')) {
        await this.handleQuantitySelection(query);
      } else if (data.startsWith('pay_')) {
        await this.handlePaymentInitiation(query);
      } else if (data.startsWith('check_payment_')) {
        await this.handlePaymentCheck(query);
      } else if (data === 'back_to_main') {
        await this.handleBackToMain(query);
      } else if (data === 'check_orders') {
        await this.handleCheckOrders(query);
      } else if (data === 'help') {
        await this.handleHelp(query);
      }

      // Answer callback query to remove loading state
      await this.bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error('❌ Error handling callback query:', error);
      await this.bot.answerCallbackQuery(query.id, {
        text: 'Terjadi kesalahan. Silakan coba lagi.',
        show_alert: true
      });
    }
  }

  private async handleCategorySelection(query: any) {
    const category = query.data.replace('category_', '');
    const chatId = query.message.chat.id;

    // Filter services by category
    const categoryServices = Array.from(this.services.values())
      .filter(service => service.category === category);

    if (categoryServices.length === 0) {
      await this.bot.editMessageText('❌ Tidak ada layanan tersedia untuk kategori ini.', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: '🔙 Kembali ke Menu Utama', callback_data: 'back_to_main' }
          ]]
        }
      });
      return;
    }

    const message = `📋 Pilih layanan ${category}:

Silakan pilih paket yang Anda inginkan:`;

    const keyboard: any[][] = [];

    // Create service buttons
    categoryServices.forEach(service => {
      keyboard.push([{
        text: `${service.name} - Rp${service.price.toLocaleString('id-ID')}`,
        callback_data: `service_${service.id}`
      }]);
    });

    // Add back button
    keyboard.push([
      { text: '🔙 Kembali ke Menu Utama', callback_data: 'back_to_main' }
    ]);

    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }

  private async handleServiceSelection(query: any) {
    const serviceId = query.data.replace('service_', '');
    const chatId = query.message.chat.id;
    const service = this.services.get(serviceId);

    if (!service) {
      await this.bot.answerCallbackQuery(query.id, {
        text: 'Layanan tidak ditemukan',
        show_alert: true
      });
      return;
    }

    const message = `📦 ${service.name}

💰 Harga: Rp${service.price.toLocaleString('id-ID')}
📊 Min: ${service.minQuantity}
📈 Max: ${service.maxQuantity}

Pilih jumlah yang Anda inginkan:`;

    const keyboard: any[][] = [];

    // Create quantity options
    const quantities = [1000, 5000, 10000, 25000, 50000];
    quantities.forEach(qty => {
      if (qty >= service.minQuantity && qty <= service.maxQuantity) {
        const totalPrice = (service.price * qty / 1000);
        keyboard.push([{
          text: `${qty.toLocaleString('id-ID')} - Rp${totalPrice.toLocaleString('id-ID')}`,
          callback_data: `quantity_${serviceId}_${qty}`
        }]);
      }
    });

    // Add back button
    keyboard.push([
      { text: '🔙 Kembali ke Kategori', callback_data: `category_${service.category}` }
    ]);

    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }

  private async handleQuantitySelection(query: any) {
    const [_, serviceId, quantity] = query.data.replace('quantity_', '').split('_');
    const chatId = query.message.chat.id;
    const service = this.services.get(serviceId);
    const qty = parseInt(quantity);

    if (!service) {
      await this.bot.answerCallbackQuery(query.id, {
        text: 'Layanan tidak ditemukan',
        show_alert: true
      });
      return;
    }

    const totalPrice = (service.price * qty / 1000);

    const message = `🛒 Detail Pesanan

📦 Layanan: ${service.name}
📊 Jumlah: ${qty.toLocaleString('id-ID')}
💰 Total: Rp${totalPrice.toLocaleString('id-ID')}

📝 Silakan kirim link profil/post yang ingin diproses:

Contoh:
• Instagram: https://instagram.com/username
• TikTok: https://tiktok.com/@username
• YouTube: https://youtube.com/watch?v=...`;

    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [[
          { text: '🔙 Kembali ke Layanan', callback_data: `service_${serviceId}` }
        ]]
      }
    });

    // Store pending order data
    global.pendingOrders = global.pendingOrders || new Map();
    global.pendingOrders.set(chatId, {
      serviceId,
      serviceName: service.name,
      quantity: qty,
      price: totalPrice,
      userId: query.from.id.toString(),
      username: query.from.username || 'Unknown'
    });
  }

  private async handleTextMessage(msg: any) {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Check if user has pending order
    global.pendingOrders = global.pendingOrders || new Map();
    const pendingOrder = global.pendingOrders.get(chatId);

    if (!pendingOrder) {
      return; // No pending order
    }

    // Validate URL
    if (!this.isValidUrl(text)) {
      await this.bot.sendMessage(chatId, '❌ URL tidak valid. Silakan kirim link yang benar.\n\nContoh:\n• https://instagram.com/username\n• https://tiktok.com/@username');
      return;
    }

    // Create order and initiate payment
    try {
      const orderId = this.generateOrderId();
      
      // Create Midtrans transaction
      const midtransResult = await createMidtransTransaction({
        orderId,
        userId: parseInt(pendingOrder.userId),
        userName: pendingOrder.username,
        userEmail: `${pendingOrder.username}@telegram.local`,
        plan: 'premium' // You might want to adjust this
      });

      // Save order to database
      await db.insert(telegramOrders).values({
        orderId,
        botToken: this.token,
        telegramUserId: pendingOrder.userId,
        telegramUsername: pendingOrder.username,
        serviceId: pendingOrder.serviceId,
        serviceName: pendingOrder.serviceName,
        quantity: pendingOrder.quantity,
        amount: pendingOrder.price.toString(),
        currency: 'IDR',
        status: 'pending',
        midtransTransactionId: midtransResult.transaction_id,
        qrisUrl: midtransResult.qr_string,
        targetLink: text,
        paymentExpiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      const message = `✅ Pesanan berhasil dibuat!

🆔 Order ID: ${orderId}
📦 Layanan: ${pendingOrder.serviceName}
📊 Jumlah: ${pendingOrder.quantity.toLocaleString('id-ID')}
🔗 Target: ${text}
💰 Total: Rp${pendingOrder.price.toLocaleString('id-ID')}

💳 Silakan lakukan pembayaran dengan scan QR Code di bawah ini:`;

      await this.bot.sendMessage(chatId, message);

      // Send QR Code image
      if (midtransResult.qr_string) {
        await this.bot.sendPhoto(chatId, midtransResult.qr_string, {
          caption: '📱 Scan QR Code untuk pembayaran',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Cek Pembayaran', callback_data: `check_payment_${orderId}` },
              { text: '🔙 Menu Utama', callback_data: 'back_to_main' }
            ]]
          }
        });
      }

      // Clear pending order
      global.pendingOrders.delete(chatId);

    } catch (error) {
      console.error('❌ Error creating order:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan saat membuat pesanan. Silakan coba lagi.');
    }
  }

  private async handlePaymentCheck(query: any) {
    const orderId = query.data.replace('check_payment_', '');
    const chatId = query.message.chat.id;

    try {
      // Get order from database
      const [order] = await db.select()
        .from(telegramOrders)
        .where(eq(telegramOrders.orderId, orderId))
        .limit(1);

      if (!order) {
        await this.bot.answerCallbackQuery(query.id, {
          text: 'Pesanan tidak ditemukan',
          show_alert: true
        });
        return;
      }

      // Check payment status with Midtrans
      const paymentStatus = await getTransactionStatus(orderId);

      if (paymentStatus.transaction_status === 'settlement' || paymentStatus.transaction_status === 'capture') {
        // Payment successful
        await db.update(telegramOrders)
          .set({ status: 'paid' })
          .where(eq(telegramOrders.orderId, orderId));

        await this.bot.sendMessage(chatId, `🎉 Pembayaran berhasil!

✅ Order ID: ${orderId}
📦 Layanan: ${order.serviceName}
🚀 Pesanan Anda sedang diproses...

📸 Anda akan menerima hasil (link foto/bukti) dalam 5-30 menit.`);

        // Here you would typically trigger the actual service processing
        // For demo purposes, we'll simulate it
        setTimeout(async () => {
          await this.deliverResult(orderId, chatId);
        }, 60000); // 1 minute for demo

      } else if (paymentStatus.transaction_status === 'pending') {
        await this.bot.answerCallbackQuery(query.id, {
          text: 'Pembayaran masih pending. Silakan coba lagi dalam beberapa menit.',
          show_alert: true
        });
      } else {
        await this.bot.answerCallbackQuery(query.id, {
          text: 'Pembayaran belum berhasil. Silakan lakukan pembayaran terlebih dahulu.',
          show_alert: true
        });
      }

    } catch (error) {
      console.error('❌ Error checking payment:', error);
      await this.bot.answerCallbackQuery(query.id, {
        text: 'Terjadi kesalahan saat mengecek pembayaran',
        show_alert: true
      });
    }
  }

  private async deliverResult(orderId: string, chatId: number) {
    try {
      // Simulate result delivery
      const resultLink = `https://example.com/result/${orderId}.jpg`;

      await db.update(telegramOrders)
        .set({ 
          status: 'completed',
          resultLink 
        })
        .where(eq(telegramOrders.orderId, orderId));

      await this.bot.sendMessage(chatId, `✅ Pesanan selesai!

🆔 Order ID: ${orderId}
📸 Hasil: ${resultLink}

Terima kasih telah menggunakan layanan kami! 🙏`);

    } catch (error) {
      console.error('❌ Error delivering result:', error);
    }
  }

  private async handleBackToMain(query: any) {
    const chatId = query.message.chat.id;
    
    const welcomeMessage = `🎉 SMM Panel Bot

Pilih layanan yang Anda inginkan:`;

    const mainMenuKeyboard = this.createMainMenuKeyboard();

    await this.bot.editMessageText(welcomeMessage, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: mainMenuKeyboard
      }
    });
  }

  private async handleCheckOrders(query: any) {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();

    try {
      const orders = await db.select()
        .from(telegramOrders)
        .where(eq(telegramOrders.telegramUserId, userId))
        .orderBy(telegramOrders.createdAt)
        .limit(10);

      if (orders.length === 0) {
        await this.bot.editMessageText('📋 Anda belum memiliki pesanan.', {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: {
            inline_keyboard: [[
              { text: '🔙 Menu Utama', callback_data: 'back_to_main' }
            ]]
          }
        });
        return;
      }

      let message = '📋 Pesanan Anda:\n\n';
      orders.forEach(order => {
        const status = this.getStatusIcon(order.status);
        message += `${status} ${order.orderId}\n`;
        message += `📦 ${order.serviceName}\n`;
        message += `💰 Rp${parseFloat(order.amount).toLocaleString('id-ID')}\n`;
        message += `📅 ${new Date(order.createdAt).toLocaleDateString('id-ID')}\n\n`;
      });

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: '🔙 Menu Utama', callback_data: 'back_to_main' }
          ]]
        }
      });

    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      await this.bot.editMessageText('❌ Terjadi kesalahan saat mengambil data pesanan.', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: '🔙 Menu Utama', callback_data: 'back_to_main' }
          ]]
        }
      });
    }
  }

  private async handleHelp(query: any) {
    const chatId = query.message.chat.id;

    const helpMessage = `💬 Bantuan SMM Panel Bot

🎯 Cara menggunakan:
1. Pilih kategori layanan
2. Pilih paket yang diinginkan
3. Kirim link target (profil/post)
4. Lakukan pembayaran via QRIS
5. Tunggu hasil diproses

📞 Kontak Support:
• Telegram: @support
• WhatsApp: +62xxx-xxxx-xxxx

⏰ Jam Operasional:
• Senin - Jumat: 09:00 - 21:00
• Sabtu - Minggu: 10:00 - 18:00`;

    await this.bot.editMessageText(helpMessage, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [[
          { text: '🔙 Menu Utama', callback_data: 'back_to_main' }
        ]]
      }
    });
  }

  private getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'pending': '⏳',
      'paid': '✅',
      'completed': '🎉',
      'cancelled': '❌'
    };
    return icons[status] || '❓';
  }

  private isValidUrl(text: string): boolean {
    try {
      new URL(text);
      return text.includes('instagram.com') || 
             text.includes('tiktok.com') || 
             text.includes('youtube.com') ||
             text.includes('facebook.com') ||
             text.includes('twitter.com');
    } catch {
      return false;
    }
  }

  private generateOrderId(): string {
    return `TG${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  public stop() {
    this.bot.stopPolling();
    console.log('🛑 SMM Telegram Bot stopped');
  }
}

// Manager for multiple SMM bots
export class SmmBotManager {
  private activeBots: Map<string, TelegramSmmBot> = new Map();

  async startSmmBot(token: string, services: any[]): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.activeBots.has(token)) {
        this.activeBots.get(token)?.stop();
      }

      const bot = new TelegramSmmBot({ token, services });
      this.activeBots.set(token, bot);

      console.log('✅ SMM Bot started successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error starting SMM bot:', error);
      return { success: false, error: error.message };
    }
  }

  async stopSmmBot(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const bot = this.activeBots.get(token);
      if (bot) {
        bot.stop();
        this.activeBots.delete(token);
        console.log('✅ SMM Bot stopped successfully');
        return { success: true };
      }
      return { success: false, error: 'Bot not found' };
    } catch (error: any) {
      console.error('❌ Error stopping SMM bot:', error);
      return { success: false, error: error.message };
    }
  }

  getActiveBotCount(): number {
    return this.activeBots.size;
  }

  isBotRunning(token: string): boolean {
    return this.activeBots.has(token);
  }
}

export const smmBotManager = new SmmBotManager();