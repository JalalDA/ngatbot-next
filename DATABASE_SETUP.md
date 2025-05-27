# 🗄️ Database Environment Setup

## Current Configuration

### 📊 Data Status
- **Existing Data** → Automatically becomes **PRODUCTION** data
- **New Development Database** → Fresh data for testing

### 🔧 Environment Variables

```bash
# Current (becomes production)
DATABASE_URL=postgresql://current_database_url

# Add for development (new)
DEV_DATABASE_URL=postgresql://dev_database_url

# Add for production (explicit)
PROD_DATABASE_URL=postgresql://current_database_url
```

## 🚀 Quick Setup

### 1. For Development Testing
```bash
# Create development database and seed with fresh data
NODE_ENV=development tsx server/seed-dev.ts
```

### 2. Environment Detection
- `NODE_ENV=development` → Uses DEV_DATABASE_URL
- `NODE_ENV=production` → Uses PROD_DATABASE_URL  
- Default → Uses DATABASE_URL (fallback)

## 📋 Development Data Created

### 👥 Users
- **admin@dev.local** / dev123 (Admin)
- **user@dev.local** / dev123 (Pro User)
- **tester@dev.local** / dev123 (Basic User)

### 🤖 Bots
- Dev Assistant Bot (AI Bot)
- Dev Auto Bot (Inline Keyboard Bot)

### 🏪 SMM Services  
- 5 test services across platforms
- 2 development providers
- Sample orders for testing

### ⚙️ Settings
- Development environment flags
- Test configurations

## 🔒 Production Safety

- ✅ All existing data preserved as production
- ✅ Development isolated in separate database
- ✅ No risk of data mixing
- ✅ Easy environment switching

## 🎯 Next Steps

1. Set DEV_DATABASE_URL in Replit secrets
2. Run seed script for development data
3. Deploy with PROD_DATABASE_URL for production