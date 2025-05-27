import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Environment-based database configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

let databaseUrl: string;

if (isDevelopment) {
  // Development: Use DEV_DATABASE_URL or fallback to existing DATABASE_URL
  databaseUrl = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL!;
  console.log('🔧 Using DEVELOPMENT database');
} else if (isProduction) {
  // Production: Use PROD_DATABASE_URL or fallback to existing DATABASE_URL  
  databaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL!;
  console.log('🚀 Using PRODUCTION database');
} else {
  // Default: Use existing DATABASE_URL
  databaseUrl = process.env.DATABASE_URL!;
  console.log('⚙️ Using DEFAULT database');
}

if (!databaseUrl) {
  throw new Error(
    "Database URL must be set. Check DATABASE_URL, DEV_DATABASE_URL, or PROD_DATABASE_URL environment variables.",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });