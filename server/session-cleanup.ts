import { pool } from './db';

/**
 * Force cleanup all sessions for fresh production start
 */
export async function forceSessionCleanup() {
  try {
    // Drop session table if exists to ensure complete cleanup
    await pool.query('DROP TABLE IF EXISTS "session" CASCADE');
    console.log('🧹 Session table dropped for fresh start');
    return true;
  } catch (error) {
    console.error('Session cleanup error:', error);
    return false;
  }
}

/**
 * Initialize fresh session system
 */
export async function initializeFreshSession() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    console.log('🚀 PRODUCTION MODE: Forcing fresh session cleanup');
    await forceSessionCleanup();
  } else {
    console.log('🔧 DEVELOPMENT MODE: Session preserved');
  }
}