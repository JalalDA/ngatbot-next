import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Environment-based database separation
const getDatabaseUrl = () => {
  const nodeEnv = process.env.NODE_ENV;
  console.log(`🔍 Environment Check: NODE_ENV = ${nodeEnv}`);
  
  if (nodeEnv === 'production') {
    // Production: Menggunakan Neon database yang fresh
    const prodUrl = process.env.DATABASE_URL_PROD;
    console.log('🚀 PRODUCTION MODE: Using Neon database (fresh)');
    console.log(`🔗 Production DB: ${prodUrl?.substring(0, 50)}...`);
    return prodUrl;
  } else {
    // Development: Menggunakan database development terpisah
    const devUrl = process.env.DATABASE_URL_DEV;
    console.log('🔧 DEVELOPMENT MODE: Using development database');
    console.log(`🔗 Development DB: ${devUrl?.substring(0, 50)}...`);
    return devUrl;
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