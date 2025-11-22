# Railway Environment Variables Setup Guide

## ⚠️ Error: "Database not configured"

Yeh error Railway par environment variables set nahi hone ki wajah se aa raha hai.

## ✅ Solution: Railway par Environment Variables Set Karo

### Step 1: Railway Dashboard Mein Jao

1. [railway.app](https://railway.app) par login karo
2. Apne project ko select karo
3. Left sidebar mein **"Variables"** tab click karo

### Step 2: Environment Variables Add Karo

Railway Variables tab mein yeh variables add karo:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET_KEY=your-very-secret-jwt-key-change-this
NODE_ENV=production
PORT=3000
```

### Step 3: Supabase Credentials Kaise Lein

1. [Supabase Dashboard](https://app.supabase.com) par jao
2. Apne project ko select karo
3. Left sidebar mein **"Settings"** → **"API"** click karo
4. Wahan se copy karo:
   - **Project URL** → `SUPABASE_URL` mein paste karo
   - **service_role key** (secret) → `SUPABASE_SERVICE_ROLE_KEY` mein paste karo

### Step 4: JWT Secret Key Generate Karo

1. [randomkeygen.com](https://randomkeygen.com) par jao
2. "CodeIgniter Encryption Keys" section se ek key copy karo
3. `JWT_SECRET_KEY` mein paste karo

### Step 5: REACT_APP_API_URL Set Karo (Optional - Frontend ke liye)

Agar frontend separately deploy ho raha hai:

1. Railway deployment ke baad apna URL milega: `https://your-app-name.up.railway.app`
2. Variables mein add karo:
   ```
   REACT_APP_API_URL=https://your-app-name.up.railway.app/api
   ```

### Step 6: Redeploy Karo

1. Variables add karne ke baad Railway automatically redeploy karega
2. Ya manually **"Deployments"** tab mein **"Redeploy"** button click karo
3. 2-3 minutes wait karo

### Step 7: Verify Karo

1. Deployment complete hone ke baad app URL open karo
2. Login try karo
3. Agar abhi bhi error aaye, to:
   - Railway logs check karo (Deployments → View Logs)
   - Environment variables verify karo (Variables tab mein)

## 📋 Complete Environment Variables List

Railway Variables tab mein yeh sab add karo:

```bash
# Required - Database
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx

# Required - Authentication
JWT_SECRET_KEY=your-very-secret-jwt-key-minimum-32-characters-long

# Required - Server
NODE_ENV=production
PORT=3000

# Optional - Frontend API URL (if frontend separate hai)
REACT_APP_API_URL=https://your-app-name.up.railway.app/api
```

## 🔍 Troubleshooting

### Error: "Database not configured"
- ✅ Check karo ki `SUPABASE_URL` aur `SUPABASE_SERVICE_ROLE_KEY` dono set hain
- ✅ Supabase credentials sahi hain ya nahi verify karo
- ✅ Railway logs check karo

### Error: "Invalid API key"
- ✅ `SUPABASE_SERVICE_ROLE_KEY` sahi hai ya nahi check karo
- ✅ Supabase dashboard se fresh key copy karo

### Error: "Connection refused"
- ✅ Supabase project active hai ya nahi check karo
- ✅ Database schema run kiya hai ya nahi verify karo

## 📝 Important Notes

1. **Never commit `.env` file** - Railway automatically environment variables use karta hai
2. **Service Role Key is secret** - Kabhi bhi publicly share mat karo
3. **After adding variables** - Railway automatically redeploy karega
4. **Check logs** - Agar koi issue ho to Railway logs mein error dikhega

## ✅ Verification Checklist

- [ ] `SUPABASE_URL` set hai
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set hai
- [ ] `JWT_SECRET_KEY` set hai
- [ ] `NODE_ENV=production` set hai
- [ ] `PORT=3000` set hai
- [ ] Railway redeploy ho chuka hai
- [ ] App successfully start ho raha hai
- [ ] Login page load ho raha hai
- [ ] Database connection working hai

## 🚀 Quick Fix Commands (Railway CLI - Optional)

Agar Railway CLI install hai:

```bash
# Login
railway login

# Link project
railway link

# Add variables
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-key-here
railway variables set JWT_SECRET_KEY=your-secret-here
railway variables set NODE_ENV=production
railway variables set PORT=3000
```

---

**✅ Ab Railway par environment variables set karne ke baad app properly kaam karega!**

