import { createAdminUser } from '@/lib/auth';

async function init() {
  try {
    console.log('🚀 Initializing Ggh0stCloud...');
    console.log('📧 Admin Email:', process.env.ADMIN_EMAIL || 'admin@example.com');
    console.log('👤 Admin Name:', process.env.ADMIN_NAME || process.env.ADMIN_USERNAME || 'Administrator');
    
    await createAdminUser();
    
    console.log('✅ Initialization completed successfully');
    console.log('🔗 Access your cloud storage at:', process.env.APP_URL || 'http://localhost:3000');
    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

init();