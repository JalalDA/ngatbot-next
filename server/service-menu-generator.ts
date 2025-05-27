import { storage } from "./storage";
import { serviceCategories, servicePackages } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface ServiceMenuKeyboard {
  id: string;
  text: string;
  callbackData: string;
  level: number;
  parentId?: string;
  price?: number;
  packageId?: number;
  categoryId?: number;
}

/**
 * Generate dynamic menu structure based on Service Management configuration
 */
export class ServiceMenuGenerator {
  
  /**
   * Generate keyboard configuration from user's service management setup
   */
  async generateMenuForUser(userId: number): Promise<ServiceMenuKeyboard[]> {
    try {
      console.log(`🎛️ Generating menu for user ${userId}`);
      
      // Get active categories for this user
      const categories = await storage.getServiceCategories(userId);
      console.log(`📂 Found ${categories.length} categories`);
      
      // Get active packages for all categories
      const packages = await storage.getServicePackages(userId);
      console.log(`📦 Found ${packages.length} packages`);
      
      const menuItems: ServiceMenuKeyboard[] = [];
      
      // Add main menu items (categories)
      categories.forEach((category, index) => {
        const categoryIcon = this.getCategoryIcon(category.icon);
        menuItems.push({
          id: `category_${category.id}`,
          text: `${categoryIcon} ${category.name}`,
          callbackData: `category_${category.id}`,
          level: 0,
          categoryId: category.id
        });
      });
      
      // Add packages as sub-menu items
      categories.forEach(category => {
        const categoryPackages = packages.filter(pkg => 
          pkg.categoryId === category.id && pkg.isActive
        );
        
        categoryPackages.forEach((pkg, index) => {
          const formatPrice = this.formatPrice(pkg.price);
          menuItems.push({
            id: `package_${pkg.id}`,
            text: `${pkg.name} - ${formatPrice}`,
            callbackData: `package_${pkg.id}`,
            level: 1,
            parentId: `category_${category.id}`,
            price: pkg.price,
            packageId: pkg.id,
            categoryId: category.id
          });
        });
      });
      
      // Add HOME button
      menuItems.push({
        id: 'home_main',
        text: '🏠 Menu Utama',
        callbackData: 'home',
        level: 1
      });
      
      console.log(`✅ Generated ${menuItems.length} menu items`);
      return menuItems;
      
    } catch (error) {
      console.error('❌ Error generating service menu:', error);
      return this.getDefaultMenu();
    }
  }
  
  /**
   * Generate keyboard markup for Telegram
   */
  generateKeyboardMarkup(menuItems: ServiceMenuKeyboard[], currentLevel: number = 0, parentId?: string): any {
    const filteredItems = menuItems.filter(item => {
      if (currentLevel === 0) {
        return item.level === 0; // Show main categories
      } else {
        return item.level === 1 && item.parentId === parentId; // Show packages for selected category
      }
    });
    
    const buttons = filteredItems.map(item => [{
      text: item.text,
      callback_data: item.callbackData
    }]);
    
    // Add HOME button for sub-menus
    if (currentLevel > 0) {
      buttons.push([{
        text: '🏠 Menu Utama',
        callback_data: 'home'
      }]);
    }
    
    return {
      inline_keyboard: buttons
    };
  }
  
  /**
   * Get menu item by callback data
   */
  getMenuItem(menuItems: ServiceMenuKeyboard[], callbackData: string): ServiceMenuKeyboard | undefined {
    return menuItems.find(item => item.callbackData === callbackData);
  }
  
  /**
   * Generate payment flow message for selected package
   */
  async generatePaymentMessage(packageId: number, userId: number): Promise<string> {
    try {
      const packages = await storage.getServicePackages(userId);
      const selectedPackage = packages.find(pkg => pkg.id === packageId);
      
      if (!selectedPackage) {
        return "❌ Paket tidak ditemukan";
      }
      
      const categories = await storage.getServiceCategories(userId);
      const category = categories.find(cat => cat.id === selectedPackage.categoryId);
      
      const formatPrice = this.formatPrice(selectedPackage.price);
      const categoryIcon = this.getCategoryIcon(category?.icon || 'package');
      
      return `${categoryIcon} **${selectedPackage.name}**
      
📋 **Detail Layanan:**
• Kategori: ${category?.name || 'Unknown'}
• Jumlah: ${selectedPackage.quantity.toLocaleString()}
• Harga: ${formatPrice}
• Deskripsi: ${selectedPackage.description || 'Layanan berkualitas tinggi'}

💳 **Langkah Pembayaran:**
1️⃣ Masukkan link target (Instagram/TikTok/YouTube)
2️⃣ Konfirmasi pesanan
3️⃣ Bayar melalui QRIS Midtrans
4️⃣ Verifikasi pembayaran otomatis
5️⃣ Layanan akan diproses dalam 1-24 jam

Ketik link target Anda atau ketik /cancel untuk membatalkan.`;
      
    } catch (error) {
      console.error('❌ Error generating payment message:', error);
      return "❌ Terjadi kesalahan. Silakan coba lagi.";
    }
  }
  
  /**
   * Get category icon emoji
   */
  private getCategoryIcon(iconType: string): string {
    const iconMap: { [key: string]: string } = {
      'followers': '👥',
      'likes': '❤️',
      'views': '👁️',
      'comments': '💬',
      'package': '📦'
    };
    
    return iconMap[iconType] || '📦';
  }
  
  /**
   * Format price to Indonesian Rupiah
   */
  private formatPrice(price: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  }
  
  /**
   * Fallback default menu if service management is not configured
   */
  private getDefaultMenu(): ServiceMenuKeyboard[] {
    return [
      {
        id: 'default_followers',
        text: '👥 Followers',
        callbackData: 'default_followers',
        level: 0
      },
      {
        id: 'default_likes', 
        text: '❤️ Likes',
        callbackData: 'default_likes',
        level: 0
      },
      {
        id: 'configure',
        text: '⚙️ Konfigurasi Menu',
        callbackData: 'configure_menu',
        level: 0
      }
    ];
  }
  
  /**
   * Preview menu structure (for Service Management page)
   */
  async generateMenuPreview(userId: number): Promise<string> {
    const menuItems = await this.generateMenuForUser(userId);
    
    let preview = "🤖 **Preview Menu Bot Telegram**\n\n";
    preview += "📋 **Menu Utama**\n";
    
    const categories = menuItems.filter(item => item.level === 0);
    
    categories.forEach((category, categoryIndex) => {
      const isLastCategory = categoryIndex === categories.length - 1;
      const categoryPrefix = isLastCategory ? "└──" : "├──";
      
      preview += `${categoryPrefix} ${category.text}\n`;
      
      const packages = menuItems.filter(item => 
        item.level === 1 && item.parentId === category.id
      );
      
      packages.forEach((pkg, pkgIndex) => {
        const isLastPackage = pkgIndex === packages.length - 1;
        const pkgPrefix = isLastCategory 
          ? (isLastPackage ? "    └──" : "    ├──")
          : (isLastPackage ? "│   └──" : "│   ├──");
          
        preview += `${pkgPrefix} ${pkg.text}\n`;
        
        // Add payment flow indication for first package
        if (pkgIndex === 0) {
          const flowPrefix = isLastCategory ? "        └──" : "│       └──";
          preview += `${flowPrefix} 💳 Bayar → QRIS → ✅ Selesai\n`;
        }
      });
    });
    
    return preview;
  }
}

export const serviceMenuGenerator = new ServiceMenuGenerator();