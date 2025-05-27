import { db } from './db';
import { users, bots, knowledge, smmProviders, smmServices, autoBots, settings } from '@shared/schema';
import bcrypt from 'bcrypt';

async function seedDevelopmentData() {
  console.log('🌱 Seeding development database with fresh data...');

  try {
    // Clear existing data in development
    await db.delete(smmServices);
    await db.delete(smmProviders);
    await db.delete(autoBots);
    await db.delete(knowledge);
    await db.delete(bots);
    await db.delete(users);
    await db.delete(settings);

    console.log('🧹 Cleared existing development data');

    // Create development users
    const devUsers = await db.insert(users).values([
      {
        username: 'admin_dev',
        email: 'admin@dev.local',
        password: await hashPassword('dev123'),
        fullName: 'Development Admin',
        role: 'admin',
        level: 'business',
        credits: 1000
      },
      {
        username: 'user_dev',
        email: 'user@dev.local', 
        password: await hashPassword('dev123'),
        fullName: 'Development User',
        role: 'user',
        level: 'pro',
        credits: 500
      },
      {
        username: 'tester_dev',
        email: 'tester@dev.local',
        password: await hashPassword('dev123'),
        fullName: 'Development Tester',
        role: 'user',
        level: 'basic',
        credits: 250
      }
    ]).returning();

    console.log('👥 Created development users:', devUsers.length);

    // Create development bots
    const devBots = await db.insert(bots).values([
      {
        userId: devUsers[0].id,
        token: '1234567890:DEV_BOT_TOKEN_SAMPLE_ONLY',
        botName: 'Dev Assistant Bot',
        botUsername: 'dev_assistant_bot',
        systemPrompt: 'You are a helpful development assistant for testing purposes.',
        isActive: true,
        messageCount: 0
      },
      {
        userId: devUsers[1].id,
        token: '0987654321:DEV_USER_BOT_TOKEN_SAMPLE',
        botName: 'User Test Bot',
        botUsername: 'user_test_bot',
        systemPrompt: 'You are a user test bot for development.',
        isActive: true,
        messageCount: 5
      }
    ]).returning();

    console.log('🤖 Created development bots:', devBots.length);

    // Create development knowledge base
    await db.insert(knowledge).values([
      {
        botId: devBots[0].id,
        type: 'text',
        content: 'This is development knowledge base content for testing purposes.'
      },
      {
        botId: devBots[0].id,
        type: 'product',
        content: 'Development Product Test',
        productName: 'Dev SMM Service',
        productPrice: '10000'
      },
      {
        botId: devBots[1].id,
        type: 'link',
        content: 'Development resource link',
        url: 'https://dev.example.com'
      }
    ]);

    console.log('🧠 Created development knowledge base');

    // Create development SMM providers
    const devProviders = await db.insert(smmProviders).values([
      {
        userId: devUsers[0].id,
        name: 'Dev SMM Provider 1',
        apiKey: 'dev_api_key_123',
        apiEndpoint: 'https://dev-smm-api-1.example.com/api/v2',
        balance: '1000.00',
        currency: 'USD',
        isActive: true
      },
      {
        userId: devUsers[0].id,
        name: 'Dev SMM Provider 2',
        apiKey: 'dev_api_key_456',
        apiEndpoint: 'https://dev-smm-api-2.example.com/api/v1',
        balance: '750.50',
        currency: 'USD',
        isActive: true
      }
    ]).returning();

    console.log('🏪 Created development SMM providers:', devProviders.length);

    // Create development SMM services
    await db.insert(smmServices).values([
      {
        userId: devUsers[0].id,
        providerId: devProviders[0].id,
        mid: 1,
        name: 'Dev Instagram Followers',
        description: 'Development Instagram followers service for testing',
        min: 100,
        max: 10000,
        rate: '0.50',
        category: 'Instagram',
        serviceIdApi: 'dev_ig_followers_001',
        isActive: true
      },
      {
        userId: devUsers[0].id,
        providerId: devProviders[0].id,
        mid: 2,
        name: 'Dev Instagram Likes',
        description: 'Development Instagram likes service for testing',
        min: 50,
        max: 5000,
        rate: '0.25',
        category: 'Instagram',
        serviceIdApi: 'dev_ig_likes_001',
        isActive: true
      },
      {
        userId: devUsers[0].id,
        providerId: devProviders[1].id,
        mid: 3,
        name: 'Dev TikTok Views',
        description: 'Development TikTok views service for testing',
        min: 1000,
        max: 100000,
        rate: '0.10',
        category: 'TikTok',
        serviceIdApi: 'dev_tiktok_views_001',
        isActive: true
      },
      {
        userId: devUsers[0].id,
        providerId: devProviders[1].id,
        mid: 4,
        name: 'Dev YouTube Subscribers',
        description: 'Development YouTube subscribers service for testing',
        min: 10,
        max: 1000,
        rate: '2.00',
        category: 'YouTube',
        serviceIdApi: 'dev_youtube_subs_001',
        isActive: true
      },
      {
        userId: devUsers[0].id,
        providerId: devProviders[0].id,
        mid: 5,
        name: 'Dev Facebook Page Likes',
        description: 'Development Facebook page likes service for testing',
        min: 100,
        max: 5000,
        rate: '0.75',
        category: 'Facebook',
        serviceIdApi: 'dev_fb_likes_001',
        isActive: true
      }
    ]);

    console.log('📦 Created development SMM services: 5 services');

    // Create development auto bots
    await db.insert(autoBots).values([
      {
        userId: devUsers[0].id,
        token: '5555555555:DEV_AUTO_BOT_TOKEN_SAMPLE',
        botName: 'Dev Auto Bot',
        botUsername: 'dev_auto_bot',
        welcomeMessage: '🔧 Welcome to Development Auto Bot! This is for testing purposes.',
        welcomeImageUrl: 'https://via.placeholder.com/400x300?text=DEV+BOT',
        keyboardConfig: [
          {
            id: 'dev-main-1',
            text: '📋 Dev Menu',
            callbackData: 'dev_main',
            level: 0,
            isAllShow: true,
            responseText: 'Development main menu for testing'
          },
          {
            id: 'dev-services-1', 
            text: 'Dev Services',
            callbackData: 'dev_services',
            level: 0,
            responseText: 'Development services menu'
          },
          {
            id: 'dev-ig-1',
            text: 'Dev Instagram',
            callbackData: 'dev_ig',
            level: 1,
            parentId: 'dev-services-1',
            responseText: 'Development Instagram services'
          },
          {
            id: 'dev-followers-1',
            text: 'Dev 1K Followers',
            callbackData: 'dev_1k_followers',
            level: 2,
            parentId: 'dev-ig-1',
            responseText: 'Development 1K Instagram followers package'
          }
        ],
        isActive: true
      }
    ]);

    console.log('🔄 Created development auto bots');

    // Create development settings
    await db.insert(settings).values([
      {
        key: 'app_name',
        value: 'SMM Panel Development'
      },
      {
        key: 'environment',
        value: 'development'
      },
      {
        key: 'maintenance_mode',
        value: 'false'
      },
      {
        key: 'dev_mode',
        value: 'true'
      }
    ]);

    console.log('⚙️ Created development settings');

    console.log('✅ Development database seeded successfully!');
    console.log('');
    console.log('🔑 Development Login Credentials:');
    console.log('Admin: admin@dev.local / dev123');
    console.log('User:  user@dev.local / dev123');
    console.log('Test:  tester@dev.local / dev123');
    console.log('');
    console.log('🤖 Development Bot Tokens (for testing only):');
    console.log('AI Bot: 1234567890:DEV_BOT_TOKEN_SAMPLE_ONLY');
    console.log('Auto Bot: 5555555555:DEV_AUTO_BOT_TOKEN_SAMPLE');
    console.log('');

  } catch (error) {
    console.error('❌ Error seeding development data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedDevelopmentData()
    .then(() => {
      console.log('🌱 Development seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Development seeding failed:', error);
      process.exit(1);
    });
}

export { seedDevelopmentData };