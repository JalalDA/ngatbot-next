import { db } from "./db";
import { serviceCategories, servicePackages } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Simple test functions for Service Management integration
 */
export class ServiceManagementTest {
  
  /**
   * Get categories and packages for a user
   */
  async getServiceData(userId: number) {
    try {
      console.log(`🔍 Getting service data for user ${userId}`);
      
      // Get categories
      const categories = await db
        .select()
        .from(serviceCategories)
        .where(eq(serviceCategories.userId, userId));
      
      // Get packages
      const packages = await db
        .select()
        .from(servicePackages) 
        .where(eq(servicePackages.userId, userId));
      
      console.log(`📂 Found ${categories.length} categories`);
      console.log(`📦 Found ${packages.length} packages`);
      
      return { categories, packages };
      
    } catch (error) {
      console.error('❌ Error getting service data:', error);
      return { categories: [], packages: [] };
    }
  }
  
  /**
   * Generate bot menu structure from service data
   */
  generateBotMenu(categories: any[], packages: any[]) {
    console.log('🎛️ Generating bot menu structure...');
    
    const menuStructure = {
      mainMenu: [],
      subMenus: {}
    };
    
    // Create main menu from categories
    categories.forEach(category => {
      const categoryIcon = this.getCategoryIcon(category.icon);
      menuStructure.mainMenu.push({
        id: `category_${category.id}`,
        text: `${categoryIcon} ${category.name}`,
        callbackData: `category_${category.id}`,
        description: category.description
      });
      
      // Create sub-menu for this category
      const categoryPackages = packages.filter(pkg => pkg.category_id === category.id);
      menuStructure.subMenus[`category_${category.id}`] = categoryPackages.map(pkg => ({
        id: `package_${pkg.id}`,
        text: `${pkg.name} - ${this.formatPrice(pkg.price)}`,
        callbackData: `package_${pkg.id}`,
        price: pkg.price,
        quantity: pkg.quantity,
        description: pkg.description
      }));
    });
    
    console.log('✅ Menu structure generated successfully');
    return menuStructure;
  }
  
  /**
   * Generate preview text for testing
   */
  generatePreviewText(menuStructure: any) {
    let preview = "🤖 **Preview Bot Menu Telegram**\n\n";
    preview += "📋 **Menu Utama**\n";
    
    menuStructure.mainMenu.forEach((item, index) => {
      const isLast = index === menuStructure.mainMenu.length - 1;
      const prefix = isLast ? "└──" : "├──";
      
      preview += `${prefix} ${item.text}\n`;
      
      // Add sub-menu items
      const subItems = menuStructure.subMenus[item.id] || [];
      subItems.forEach((subItem, subIndex) => {
        const isLastSub = subIndex === subItems.length - 1;
        const subPrefix = isLast 
          ? (isLastSub ? "    └──" : "    ├──")
          : (isLastSub ? "│   └──" : "│   ├──");
          
        preview += `${subPrefix} ${subItem.text}\n`;
        
        // Add payment flow for first item
        if (subIndex === 0) {
          const flowPrefix = isLast ? "        └──" : "│       └──";
          preview += `${flowPrefix} 💳 Input Link → QRIS → ✅ Selesai\n`;
        }
      });
    });
    
    return preview;
  }
  
  /**
   * Get category icon
   */
  private getCategoryIcon(iconType: string): string {
    const iconMap = {
      'followers': '👥',
      'likes': '❤️', 
      'views': '👁️',
      'comments': '💬'
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
}

export const serviceTest = new ServiceManagementTest();