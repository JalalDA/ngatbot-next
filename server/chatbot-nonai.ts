import { db } from "./db.js";
import { telegramUsers, orders, akunCanva } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { createMidtransTransaction, getTransactionStatus } from "./midtrans.js";

// Interface untuk webhook Telegram
export interface TelegramWebhookUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name: string;
      last_name?: string;
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
      last_name?: string;
      username?: string;
    };
    message: {
      message_id: number;
      chat: {
        id: number;
        first_name: string;
        last_name?: string;
        username?: string;
        type: string;
      };
      date: number;
    };
    data: string;
  };
}

// Product catalog
export const PRODUCTS = {
  canva: {
    name: "Akun Canva Pro",
    price: 25000,
    description: "Akun Canva Pro premium dengan akses ke semua fitur"
  }
} as const;

export class ChatbotNonAIService {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  // Simpan atau update user Telegram
  async saveOrUpdateTelegramUser(userData: any) {
    try {
      const existing = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, userData.id.toString()))
        .limit(1);

      if (existing.length === 0) {
        const [newUser] = await db
          .insert(telegramUsers)
          .values({
            telegramId: userData.id.toString(),
            username: userData.username || null,
            firstName: userData.first_name,
            lastName: userData.last_name || null,
            languageCode: userData.language_code || null,
            isBot: userData.is_bot || false,
          })
          .returning();
        return newUser;
      } else {
        const [updatedUser] = await db
          .update(telegramUsers)
          .set({
            username: userData.username || null,
            firstName: userData.first_name,
            lastName: userData.last_name || null,
            languageCode: userData.language_code || null,
            lastActivity: new Date(),
          })
          .where(eq(telegramUsers.telegramId, userData.id.toString()))
          .returning();
        return updatedUser;
      }
    } catch (error) {
      console.error("Error saving Telegram user:", error);
      throw error;
    }
  }

  // Kirim pesan ke Telegram
  async sendMessage(chatId: number, text: string, replyMarkup?: any) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          reply_markup: replyMarkup,
          parse_mode: "HTML",
        }),
      });

      const result = await response.json();
      if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
      }
      return result;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  // Buat inline keyboard untuk menu produk
  createProductMenu() {
    return {
      inline_keyboard: [
        [
          {
            text: "🎨 Akun Canva Pro - Rp 25.000",
            callback_data: "product_canva"
          }
        ],
        [
          {
            text: "ℹ️ Info & Support",
            callback_data: "info"
          }
        ]
      ]
    };
  }

  // Buat inline keyboard untuk konfirmasi pembelian
  createPurchaseConfirmation(productType: string) {
    return {
      inline_keyboard: [
        [
          {
            text: "✅ Ya, Beli Sekarang",
            callback_data: `buy_${productType}`
          }
        ],
        [
          {
            text: "🔙 Kembali ke Menu",
            callback_data: "menu"
          }
        ]
      ]
    };
  }

  // Proses pembelian produk
  async processPurchase(telegramUserId: number, productType: string) {
    try {
      const product = PRODUCTS[productType as keyof typeof PRODUCTS];
      if (!product) {
        throw new Error("Product not found");
      }

      // Buat order di database
      const [order] = await db
        .insert(orders)
        .values({
          telegramUserId: telegramUserId,
          productType: productType,
          productName: product.name,
          price: product.price.toString(),
          status: "pending",
        })
        .returning();

      // Buat transaksi Midtrans
      const midtransOrder = await createMidtransTransaction({
        orderId: `ORDER-${order.id}-${Date.now()}`,
        userId: telegramUserId,
        userName: `Telegram-${telegramUserId}`,
        userEmail: `user${telegramUserId}@telegram.bot`,
        plan: "custom" as any,
        amount: product.price,
        itemDetails: [{
          id: productType,
          name: product.name,
          price: product.price,
          quantity: 1
        }]
      });

      // Update order dengan data Midtrans
      await db
        .update(orders)
        .set({
          midtransOrderId: midtransOrder.order_id,
          snapToken: midtransOrder.token,
          qrisUrl: midtransOrder.qris_url,
          paymentMethod: "qris",
        })
        .where(eq(orders.id, order.id));

      return {
        order,
        midtransOrder
      };
    } catch (error) {
      console.error("Error processing purchase:", error);
      throw error;
    }
  }

  // Cek status pembayaran
  async checkPaymentStatus(orderId: string) {
    try {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.midtransOrderId, orderId))
        .limit(1);

      if (!order) {
        throw new Error("Order not found");
      }

      const status = await getTransactionStatus(orderId);
      
      // Update status order
      if (status.transaction_status === "settlement" || status.transaction_status === "capture") {
        await db
          .update(orders)
          .set({
            status: "paid",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));

        // Deliver produk
        await this.deliverProduct(order);
        
        return { status: "paid", order };
      } else if (status.transaction_status === "pending") {
        return { status: "pending", order };
      } else {
        await db
          .update(orders)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
        
        return { status: "failed", order };
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      throw error;
    }
  }

  // Kirim produk ke user setelah pembayaran berhasil
  async deliverProduct(order: any) {
    try {
      if (order.productType === "canva") {
        // Ambil akun Canva yang tersedia
        const [availableAccount] = await db
          .select()
          .from(akunCanva)
          .where(eq(akunCanva.status, "available"))
          .limit(1);

        if (!availableAccount) {
          throw new Error("No available Canva accounts");
        }

        // Mark akun sebagai terjual
        await db
          .update(akunCanva)
          .set({
            status: "sold",
            orderId: order.id,
            soldAt: new Date(),
          })
          .where(eq(akunCanva.id, availableAccount.id));

        // Ambil data user Telegram
        const [telegramUser] = await db
          .select()
          .from(telegramUsers)
          .where(eq(telegramUsers.id, order.telegramUserId))
          .limit(1);

        if (telegramUser) {
          // Kirim akun ke user
          const message = `
🎉 <b>Pembayaran Berhasil!</b>

✅ Akun Canva Pro Anda:
📧 <b>Email:</b> <code>${availableAccount.email}</code>
🔐 <b>Password:</b> <code>${availableAccount.password}</code>

📋 <b>Cara Login:</b>
1. Buka canva.com
2. Klik "Log In"
3. Masukkan email dan password di atas
4. Nikmati fitur Canva Pro!

⚠️ <b>Penting:</b>
- Jangan ganti password
- Jangan share akun ke orang lain
- Simpan data ini dengan baik

Terima kasih telah berbelanja! 🙏
          `;

          await this.sendMessage(parseInt(telegramUser.telegramId), message);
        }

        // Update order status menjadi delivered
        await db
          .update(orders)
          .set({
            status: "delivered",
            deliveredAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));

        return availableAccount;
      }
    } catch (error) {
      console.error("Error delivering product:", error);
      throw error;
    }
  }

  // Answer callback query
  async answerCallbackQuery(callbackQueryId: string, text?: string) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text || "",
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error answering callback query:", error);
      throw error;
    }
  }

  // Process webhook update
  async processWebhookUpdate(update: TelegramWebhookUpdate) {
    try {
      if (update.message) {
        const message = update.message;
        const user = message.from;
        const chatId = message.chat.id;

        // Simpan user
        const telegramUser = await this.saveOrUpdateTelegramUser(user);

        if (message.text === "/start") {
          const welcomeMessage = `
🤖 <b>Selamat datang di Bot Penjualan!</b>

Halo ${user.first_name}! 👋

🛍️ Kami menyediakan berbagai akun premium dengan harga terjangkau.

Silakan pilih produk yang Anda inginkan:
          `;

          await this.sendMessage(chatId, welcomeMessage, this.createProductMenu());
        } else {
          // Pesan default
          await this.sendMessage(
            chatId, 
            "Ketik /start untuk melihat menu produk yang tersedia! 😊"
          );
        }
      } else if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const user = callbackQuery.from;
        const chatId = callbackQuery.message!.chat.id;
        const data = callbackQuery.data;

        // Simpan user
        const telegramUser = await this.saveOrUpdateTelegramUser(user);

        // Answer callback query
        await this.answerCallbackQuery(callbackQuery.id);

        if (data === "menu") {
          const menuMessage = "🛍️ Silakan pilih produk yang Anda inginkan:";
          await this.sendMessage(chatId, menuMessage, this.createProductMenu());
        } else if (data === "product_canva") {
          const product = PRODUCTS.canva;
          const message = `
🎨 <b>${product.name}</b>

💰 <b>Harga:</b> Rp ${product.price.toLocaleString('id-ID')}
📝 <b>Deskripsi:</b> ${product.description}

✨ <b>Fitur yang didapat:</b>
• Akses ke semua template premium
• Background remover unlimited
• Magic resize & animate
• Brand kit & folder organizer
• Download tanpa watermark

Apakah Anda ingin membeli produk ini?
          `;

          await this.sendMessage(chatId, message, this.createPurchaseConfirmation("canva"));
        } else if (data === "buy_canva") {
          try {
            const purchase = await this.processPurchase(telegramUser.id, "canva");
            
            const paymentMessage = `
💳 <b>Pembayaran Dibuat!</b>

📋 <b>Detail Order:</b>
🆔 Order ID: <code>${purchase.order.id}</code>
🎨 Produk: ${purchase.order.productName}
💰 Total: Rp ${parseInt(purchase.order.price).toLocaleString('id-ID')}

💳 <b>Cara Pembayaran:</b>
1. Scan QR Code QRIS di bawah ini
2. Atau gunakan link pembayaran
3. Pembayaran akan diproses otomatis

🔗 <b>Link Pembayaran:</b>
${purchase.midtransOrder.redirect_url}

⏰ <b>Batas Waktu:</b> 24 jam
📞 <b>Butuh bantuan?</b> Ketik /start lalu pilih Info & Support

<i>Akun akan dikirim otomatis setelah pembayaran berhasil!</i>
            `;

            await this.sendMessage(chatId, paymentMessage);
          } catch (error) {
            await this.sendMessage(
              chatId, 
              "❌ Maaf, terjadi kesalahan saat memproses pesanan. Silakan coba lagi nanti."
            );
          }
        } else if (data === "info") {
          const infoMessage = `
ℹ️ <b>Informasi & Support</b>

📞 <b>Customer Service:</b>
- Telegram: @yoursupport
- WhatsApp: +62-xxx-xxxx-xxxx

🕐 <b>Jam Operasional:</b>
Senin - Minggu: 08:00 - 22:00 WIB

❓ <b>FAQ:</b>
• Pembayaran: QRIS/Transfer Bank
• Pengiriman: Otomatis setelah bayar
• Garansi: Replace jika akun error

💡 <b>Tips:</b>
Simpan username & password dengan baik!
          `;

          const backButton = {
            inline_keyboard: [
              [
                {
                  text: "🔙 Kembali ke Menu",
                  callback_data: "menu"
                }
              ]
            ]
          };

          await this.sendMessage(chatId, infoMessage, backButton);
        }
      }
    } catch (error) {
      console.error("Error processing webhook update:", error);
      throw error;
    }
  }
}

// Export default service
export function createChatbotService(botToken: string) {
  return new ChatbotNonAIService(botToken);
}