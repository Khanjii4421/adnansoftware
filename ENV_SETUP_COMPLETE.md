# 🔧 Complete .env File Setup Guide

## 📋 Step-by-Step Setup

### Step 1: Create .env File

Project root folder mein `.env` file create karo:

```bash
# Windows (PowerShell)
Copy-Item env.example .env

# Mac/Linux
cp env.example .env
```

### Step 2: Required Variables Set Karo

`.env` file open karo aur ye values fill karo:

#### 1. Supabase Database (Required)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Kaise lein:**
- [Supabase Dashboard](https://app.supabase.com) → Login
- Apne project ko select karo
- **Settings** → **API** click karo
- **Project URL** copy karo → `SUPABASE_URL`
- **service_role** key (secret, red color) copy karo → `SUPABASE_SERVICE_ROLE_KEY`

#### 2. Server Port (Required)

```env
PORT=3000
```

**Notes:**
- Local development: `3000`
- Railway: `3000` (automatic)
- Render: `10000`

#### 3. JWT Secret Key (Required)

```env
JWT_SECRET_KEY=your-very-secret-key-minimum-32-characters-long
```

**Generate karne ke liye:**
- [randomkeygen.com](https://randomkeygen.com) par jao
- "CodeIgniter Encryption Keys" section se ek key copy karo
- Minimum 32 characters hona chahiye

#### 4. Environment (Required)

```env
NODE_ENV=development
```

**Options:**
- Local: `development`
- Production: `production`

### Step 3: Optional Variables

#### Frontend API URL (Agar frontend separate hai)

```env
REACT_APP_API_URL=http://localhost:3000/api
```

**Production mein:**
- Railway: `https://your-app-name.up.railway.app/api`
- Render: `https://your-app-name.onrender.com/api`

### Step 4: Verify .env File

`.env` file aise dikhni chahiye:

```env
# Database
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx

# Server
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET_KEY=your-generated-secret-key-here-minimum-32-chars

# Frontend (optional)
REACT_APP_API_URL=http://localhost:3000/api
```

### Step 5: Restart Server

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run server
```

## ✅ Verification Checklist

- [ ] `.env` file created hai
- [ ] `SUPABASE_URL` set hai
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set hai
- [ ] `JWT_SECRET_KEY` set hai (minimum 32 chars)
- [ ] `PORT=3000` set hai
- [ ] `NODE_ENV=development` set hai
- [ ] Server restart kiya hai
- [ ] No "Database not configured" error

## 🚨 Common Errors & Fixes

### Error: "Database not configured"
**Fix:** 
- Check karo ki `SUPABASE_URL` aur `SUPABASE_SERVICE_ROLE_KEY` dono set hain
- Server restart karo

### Error: "Invalid JWT secret"
**Fix:**
- `JWT_SECRET_KEY` minimum 32 characters hona chahiye
- Strong random key generate karo

### Error: "Port already in use"
**Fix:**
- `PORT` change karo (e.g., `3001`)
- Ya jo port use ho raha hai wo close karo

## 📝 Important Notes

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Keep secrets safe** - Kabhi publicly share mat karo
3. **Railway/Render** - Environment variables dashboard se set hoti hain
4. **Local development** - `.env` file use hoti hai

## 🔄 Railway/Render Deployment

Railway ya Render par deploy karte waqt:

1. **Railway/Render Dashboard** → **Variables** tab
2. Same variables add karo (`.env` file se copy karo)
3. `NODE_ENV=production` set karo
4. `PORT` Railway par automatic hai, Render par `10000` set karo

---

**✅ Ab sab set hai! Server start karo aur test karo!**

