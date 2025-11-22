# 🚨 Railway Error Fix: Database not configured

## Quick Fix (5 Minutes)

### Step 1: Railway Dashboard Mein Jao
1. [railway.app](https://railway.app) → Login
2. Apne project ko select karo
3. **Variables** tab click karo (left sidebar)

### Step 2: Ye 3 Variables Add Karo (Required)

Railway Variables tab mein **"New Variable"** click karke ye add karo:

```
Variable Name: SUPABASE_URL
Value: https://your-project.supabase.co
```

```
Variable Name: SUPABASE_SERVICE_ROLE_KEY  
Value: your-service-role-key-here
```

```
Variable Name: JWT_SECRET_KEY
Value: your-secret-key-minimum-32-characters
```

### Step 3: Supabase Credentials Kaise Lein

1. [Supabase Dashboard](https://app.supabase.com) → Login
2. Apne project ko select karo
3. **Settings** → **API** click karo
4. Copy karo:
   - **Project URL** → `SUPABASE_URL` mein paste
   - **service_role** key (secret, red color) → `SUPABASE_SERVICE_ROLE_KEY` mein paste

### Step 4: JWT Secret Generate Karo

[randomkeygen.com](https://randomkeygen.com) se ek random key copy karo aur `JWT_SECRET_KEY` mein paste karo.

### Step 5: Optional Variables (Agar zarurat ho)

```
NODE_ENV=production
PORT=3000
```

### Step 6: Redeploy

Variables add karne ke baad Railway automatically redeploy karega. 2-3 minutes wait karo.

---

## ✅ Verification

1. Railway **Deployments** tab mein jao
2. Latest deployment check karo
3. **View Logs** click karo
4. Agar "Supabase configured" dikhe to sab theek hai!

---

## 🔍 Agar Abhi Bhi Error Aaye

1. **Railway Logs Check Karo**: Deployments → View Logs
2. **Variables Verify Karo**: Variables tab mein sab values sahi hain ya nahi
3. **Supabase Check Karo**: Supabase project active hai ya nahi

---

**✅ Bas! Ab app kaam karega!**

