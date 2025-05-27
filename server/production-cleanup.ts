import { pool } from './db';

/**
 * Production database cleanup - menghapus semua data untuk fresh start
 */
export async function cleanupProductionDatabase() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    console.log('🔧 DEVELOPMENT MODE: Cleanup dibatalkan, data preserved');
    return false;
  }

  try {
    console.log('🚀 PRODUCTION MODE: Memulai database cleanup...');
    
    // Hapus semua data dari tabel utama
    await pool.query('TRUNCATE users, auto_bots, bots, knowledge, settings, smm_providers, smm_services, smm_orders, transactions RESTART IDENTITY CASCADE');
    
    // Hapus session table jika ada
    await pool.query('DROP TABLE IF EXISTS "session" CASCADE');
    
    console.log('✅ PRODUCTION CLEANUP: Database berhasil di-reset untuk fresh start');
    console.log('🎯 PRODUCTION READY: Database siap untuk pengguna baru');
    
    return true;
  } catch (error) {
    console.error('❌ PRODUCTION CLEANUP ERROR:', error);
    return false;
  }
}

/**
 * Verifikasi database kosong untuk production
 */
export async function verifyCleanDatabase() {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM auto_bots) as auto_bots,
        (SELECT COUNT(*) FROM bots) as bots,
        (SELECT COUNT(*) FROM smm_orders) as orders
    `);
    
    const counts = result.rows[0];
    const totalRecords = Object.values(counts).reduce((sum: number, count) => sum + parseInt(count as string), 0);
    
    console.log('📊 DATABASE STATUS:');
    console.log(`   Users: ${counts.users}`);
    console.log(`   Bots: ${counts.bots}`);
    console.log(`   Auto Bots: ${counts.auto_bots}`);
    console.log(`   Orders: ${counts.orders}`);
    console.log(`   Total Records: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('✅ VERIFICATION: Database benar-benar kosong dan siap production');
      return true;
    } else {
      console.log('⚠️  VERIFICATION: Database masih berisi data');
      return false;
    }
  } catch (error) {
    console.error('❌ VERIFICATION ERROR:', error);
    return false;
  }
}