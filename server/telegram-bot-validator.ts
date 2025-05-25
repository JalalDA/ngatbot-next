// Telegram Bot Validation Service
export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramApiResponse {
  ok: boolean;
  result?: TelegramBotInfo;
  description?: string;
  error_code?: number;
}

export interface BotValidationResult {
  valid: boolean;
  botInfo?: TelegramBotInfo;
  error?: string;
  errorCode?: number;
}

export interface WebhookSetupResult {
  success: boolean;
  webhookUrl?: string;
  error?: string;
  telegramError?: string;
}

export class TelegramBotValidator {
  private static readonly TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
  private static readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  /**
   * Validate bot token by calling Telegram getMe API
   */
  static async validateBotToken(token: string): Promise<BotValidationResult> {
    if (!token || token.trim().length === 0) {
      return {
        valid: false,
        error: "Token bot tidak boleh kosong"
      };
    }

    // Basic token format validation
    const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
    if (!tokenPattern.test(token.trim())) {
      return {
        valid: false,
        error: "Format token tidak valid. Token harus berformat: BOT_ID:SECRET_KEY"
      };
    }

    try {
      const response = await fetch(`${this.TELEGRAM_API_BASE}${token}/getMe`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      const data: TelegramApiResponse = await response.json();

      if (!data.ok) {
        const errorMessages: { [key: number]: string } = {
          401: "Token bot tidak valid atau sudah tidak aktif",
          404: "Bot tidak ditemukan. Pastikan token dari @BotFather benar",
          429: "Terlalu banyak permintaan. Coba lagi dalam beberapa menit"
        };

        return {
          valid: false,
          error: errorMessages[data.error_code || 0] || data.description || "Token bot tidak valid",
          errorCode: data.error_code
        };
      }

      if (!data.result) {
        return {
          valid: false,
          error: "Response tidak valid dari Telegram API"
        };
      }

      // Verify it's actually a bot
      if (!data.result.is_bot) {
        return {
          valid: false,
          error: "Token ini bukan untuk bot. Pastikan Anda menggunakan token dari @BotFather"
        };
      }

      return {
        valid: true,
        botInfo: data.result
      };

    } catch (error) {
      console.error('Bot validation error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            valid: false,
            error: "Timeout saat memvalidasi token. Coba lagi nanti"
          };
        }
        
        if (error.message.includes('fetch')) {
          return {
            valid: false,
            error: "Tidak dapat terhubung ke Telegram API. Periksa koneksi internet"
          };
        }
      }

      return {
        valid: false,
        error: "Gagal memvalidasi token bot. Coba lagi nanti"
      };
    }
  }

  /**
   * Set webhook for the bot
   */
  static async setupWebhook(token: string, webhookUrl: string): Promise<WebhookSetupResult> {
    if (!token || !webhookUrl) {
      return {
        success: false,
        error: "Token dan webhook URL diperlukan"
      };
    }

    // Validate webhook URL format
    try {
      const url = new URL(webhookUrl);
      if (url.protocol !== 'https:') {
        return {
          success: false,
          error: "Webhook URL harus menggunakan HTTPS"
        };
      }
    } catch {
      return {
        success: false,
        error: "Format webhook URL tidak valid"
      };
    }

    try {
      const response = await fetch(`${this.TELEGRAM_API_BASE}${token}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          max_connections: 40,
          drop_pending_updates: true
        }),
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      const data: TelegramApiResponse = await response.json();

      if (!data.ok) {
        const errorMessages: { [key: number]: string } = {
          400: "URL webhook tidak valid atau tidak dapat diakses",
          401: "Token bot tidak valid",
          429: "Terlalu banyak permintaan webhook"
        };

        return {
          success: false,
          error: "Gagal mengatur webhook",
          telegramError: errorMessages[data.error_code || 0] || data.description
        };
      }

      return {
        success: true,
        webhookUrl: webhookUrl
      };

    } catch (error) {
      console.error('Webhook setup error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: "Timeout saat mengatur webhook"
          };
        }
      }

      return {
        success: false,
        error: "Gagal mengatur webhook. Coba lagi nanti"
      };
    }
  }

  /**
   * Remove webhook for the bot
   */
  static async removeWebhook(token: string): Promise<WebhookSetupResult> {
    try {
      const response = await fetch(`${this.TELEGRAM_API_BASE}${token}/deleteWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      const data: TelegramApiResponse = await response.json();

      if (!data.ok) {
        return {
          success: false,
          error: "Gagal menghapus webhook",
          telegramError: data.description
        };
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('Webhook removal error:', error);
      return {
        success: false,
        error: "Gagal menghapus webhook"
      };
    }
  }

  /**
   * Generate webhook URL for bot
   */
  static generateWebhookUrl(botToken: string): string {
    const domain = process.env.REPLIT_DOMAINS || 'http://localhost:5000';
    return `${domain}/api/chatbot-nonai/webhook/${botToken}`;
  }

  /**
   * Check if bot token is already used
   */
  static async checkTokenExists(token: string, currentUserId: number): Promise<boolean> {
    try {
      // This would check against database if we had bot storage
      // For now, return false (token not used)
      return false;
    } catch (error) {
      console.error('Token existence check error:', error);
      return false;
    }
  }
}