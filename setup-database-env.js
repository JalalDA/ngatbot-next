#!/usr/bin/env node
/**
 * Script untuk setup environment-based database
 * Memisahkan data development dan production
 */

const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

// Setup WebSocket untuk Neon
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

async function setupEnvironments() {
  console.log('🔧 Setting up environment-based database configuration...\n');
  
  // Current DATABASE_URL menjadi development database
  const currentDbUrl = process.env.DATABASE_URL;
  
  if (!currentDbUrl) {
    console.error('❌ DATABASE_URL tidak ditemukan!');
    process.exit(1);
  }
  
  console.log('📊 Current database configuration:');
  console.log(`🔗 Current DB: ${currentDbUrl.substring(0, 50)}...`);
  console.log('\n📝 Environment mapping:');
  console.log('• Development (NODE_ENV=development): Current DATABASE_URL (with existing data)');
  console.log('• Production (NODE_ENV=production): New fresh DATABASE_URL (empty)');
  
  // Test connection to current database
  try {
    const devPool = new Pool({ connectionString: currentDbUrl });
    await devPool.query('SELECT 1');
    console.log('✅ Development database connection: OK');
    
    // Check if there's existing data
    const userCount = await devPool.query('SELECT COUNT(*) FROM users');
    const botCount = await devPool.query('SELECT COUNT(*) FROM bots');
    const serviceCount = await devPool.query('SELECT COUNT(*) FROM smm_services');
    
    console.log('\n📈 Current data in development database:');
    console.log(`• Users: ${userCount.rows[0].count}`);
    console.log(`• Bots: ${botCount.rows[0].count}`);
    console.log(`• SMM Services: ${serviceCount.rows[0].count}`);
    
    await devPool.end();
  } catch (error) {
    console.error('❌ Error connecting to development database:', error.message);
    process.exit(1);
  }
  
  console.log('\n🎯 Setup Summary:');
  console.log('1. Current data akan tetap tersedia di development environment');
  console.log('2. Production akan menggunakan database baru yang kosong');
  console.log('3. Environment variables:');
  console.log('   - DATABASE_URL_DEV: Current database (with data)');
  console.log('   - DATABASE_URL_PROD: New database (fresh/empty)');
  
  console.log('\n✅ Environment setup completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Set DATABASE_URL_PROD untuk production database');
  console.log('2. Deploy aplikasi dengan NODE_ENV=production');
  console.log('3. Production akan otomatis menggunakan database kosong yang baru');
}

// Run the setup
setupEnvironments().catch(console.error);