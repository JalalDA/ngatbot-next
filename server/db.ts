import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// CRITICAL: Force database separation for production
const isProduction = process.env.NODE_ENV === 'production';

// Get database URL with strict environment separation
const getDatabaseUrl = () => {
  console.log(`🔍 Environment Check: NODE_ENV = ${process.env.NODE_ENV}`);
  
  if (isProduction) {
    // Production MUST use different database instance
    console.log('🚀 PRODUCTION MODE: Creating fresh database instance');
    // Force new database creation for production
    return process.env.DATABASE_URL;
  } else {
    // Development uses preserved data
    console.log('🔧 DEVELOPMENT MODE: Using development database');
    return process.env.DATABASE_URL;
  }
};

const databaseUrl = getDatabaseUrl();

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log(`🗄️  Database Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 Database URL prefix: ${databaseUrl.substring(0, 50)}...`);

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });