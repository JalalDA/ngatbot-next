import axios from 'axios';
import crypto from 'crypto';

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    message: {
      message_id: number;
      chat: {
        id: number;
        first_name: string;
        username?: string;
        type: string;
      };
      date: number;
    };
    data: string;
  };
}

export class AutoBotService {
  /**
   * Validasi token bot dengan getMe API
   */
  static async validateBotToken(token: string): Promise<{ valid: boolean; botInfo?: TelegramBotInfo; error?: string }> {
    try {
      const response = await axios.get<TelegramApiResponse<TelegramBotInfo>>(
        `https://api.telegram.org/bot${token}/getMe`,
        { timeout: 10000 }
      );

      if (response.data.ok && response.data.result) {
        return {
          valid: true,
          botInfo: response.data.result
        };
      } else {
        return {
          valid: false,
          error: response.data.description || 'Token bot tidak valid'
        };
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.description || 'Gagal memvalidasi token bot'
      };
    }
  }

  /**
   * Set webhook untuk bot
   */
  static async setWebhook(token: string, webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post<TelegramApiResponse<boolean>>(
        `https://api.telegram.org/bot${token}/setWebhook`,
        {
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        },
        { timeout: 10000 }
      );

      if (response.data.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.description || 'Gagal set webhook'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.description || 'Gagal set webhook'
      };
    }
  }

  /**
   * Hapus webhook bot
   */
  static async removeWebhook(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post<TelegramApiResponse<boolean>>(
        `https://api.telegram.org/bot${token}/deleteWebhook`,
        {},
        { timeout: 10000 }
      );

      if (response.data.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.description || 'Gagal hapus webhook'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.description || 'Gagal hapus webhook'
      };
    }
  }

  /**
   * Kirim pesan ke chat Telegram
   */
  static async sendMessage(
    token: string,
    chatId: number | string,
    text: string,
    options?: {
      reply_markup?: any;
      parse_mode?: 'HTML' | 'Markdown';
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post<TelegramApiResponse<any>>(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chatId,
          text,
          parse_mode: options?.parse_mode || 'HTML',
          reply_markup: options?.reply_markup
        },
        { timeout: 10000 }
      );

      if (response.data.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.description || 'Gagal kirim pesan'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.description || 'Gagal kirim pesan'
      };
    }
  }

  /**
   * Jawab callback query
   */
  static async answerCallbackQuery(
    token: string,
    callbackQueryId: string,
    text?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post<TelegramApiResponse<boolean>>(
        `https://api.telegram.org/bot${token}/answerCallbackQuery`,
        {
          callback_query_id: callbackQueryId,
          text: text || ''
        },
        { timeout: 10000 }
      );

      if (response.data.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.description || 'Gagal jawab callback'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.description || 'Gagal jawab callback'
      };
    }
  }

  /**
   * Buat inline keyboard untuk produk
   */
  static createProductKeyboard(products: Array<{ id: number; name: string; price: string }>) {
    const buttons = products.map(product => [{
      text: `${product.name} - ${product.price}`,
      callback_data: `product_${product.id}`
    }]);

    return {
      inline_keyboard: buttons
    };
  }

  /**
   * Buat keyboard untuk menu utama
   */
  static createMainMenuKeyboard() {
    return {
      inline_keyboard: [
        [{ text: '🎨 Akun Canva', callback_data: 'category_canva' }],
        [{ text: '📱 Akun Netflix', callback_data: 'category_netflix' }],
        [{ text: '🎵 Akun Spotify', callback_data: 'category_spotify' }]
      ]
    };
  }

  /**
   * Buat keyboard untuk pembayaran
   */
  static createPaymentKeyboard(orderId: string) {
    return {
      inline_keyboard: [
        [{ text: '💳 Bayar Sekarang', url: `https://app.midtrans.com/snap/v3/redirection/{snapToken}` }],
        [{ text: '🔍 Cek Status Pembayaran', callback_data: `check_payment_${orderId}` }]
      ]
    };
  }

  /**
   * Generate webhook URL untuk bot
   */
  static generateWebhookUrl(botId: string): string {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    return `${baseUrl}/api/webhook/autobot/${botId}`;
  }

  /**
   * Encrypt token bot untuk keamanan
   */
  static encryptToken(token: string): string {
    const algorithm = 'aes-256-cbc';
    const secretKey = process.env.BOT_ENCRYPTION_KEY || 'default-secret-key-32-characters!!';
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, secretKey);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt token bot
   */
  static decryptToken(encryptedToken: string): string {
    const algorithm = 'aes-256-cbc';
    const secretKey = process.env.BOT_ENCRYPTION_KEY || 'default-secret-key-32-characters!!';
    
    const textParts = encryptedToken.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = textParts.join(':');
    
    const decipher = crypto.createDecipher(algorithm, secretKey);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Format pesan selamat datang
   */
  static getWelcomeMessage(botName: string): string {
    return `🤖 Selamat datang di <b>${botName}</b>!\n\n` +
           `Saya adalah bot otomatis untuk pembelian akun digital premium.\n\n` +
           `Silakan pilih kategori produk yang Anda inginkan:`;
  }

  /**
   * Format pesan detail produk
   */
  static getProductMessage(productName: string, description: string, price: string): string {
    return `📦 <b>${productName}</b>\n\n` +
           `${description}\n\n` +
           `💰 Harga: <b>${price}</b>\n\n` +
           `Klik tombol di bawah untuk melanjutkan pembayaran:`;
  }

  /**
   * Format pesan pembayaran
   */
  static getPaymentMessage(productName: string, amount: string, orderId: string): string {
    return `💳 <b>Pembayaran</b>\n\n` +
           `Produk: ${productName}\n` +
           `Total: <b>${amount}</b>\n` +
           `Order ID: <code>${orderId}</code>\n\n` +
           `Silakan klik tombol di bawah untuk melakukan pembayaran:`;
  }

  /**
   * Format pesan pengiriman akun
   */
  static getAccountMessage(email: string, password: string, productName: string): string {
    return `✅ <b>Pembayaran Berhasil!</b>\n\n` +
           `Berikut akun <b>${productName}</b> Anda:\n\n` +
           `📧 Email: <code>${email}</code>\n` +
           `🔐 Password: <code>${password}</code>\n\n` +
           `⚠️ <i>Simpan data ini dengan aman dan jangan bagikan kepada siapapun.</i>\n\n` +
           `Terima kasih telah berbelanja! 🙏`;
  }
}