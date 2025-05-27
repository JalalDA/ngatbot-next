import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Environment-based database configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Get database URL based on environment
const getDatabaseUrl = () => {
  if (isProduction) {
    return process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;
  } else {
    // Development environment - current DATABASE_URL becomes DEV
    return process.env.DATABASE_URL_DEV || process.env.DATABASE_URL;
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