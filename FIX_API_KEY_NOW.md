# 🔑 IMMEDIATE FIX: Invalid API Key Error

## 🚨 Current Error:
```
[Login] ❌ Database query error: Invalid API key
hint: 'Double check your Supabase `anon` or `service_role` API key.'
```

## ⚡ 2-Minute Fix:

### Step 1: Supabase se Correct Key Lein

1. [Supabase Dashboard](https://app.supabase.com) → Login
2. Project select karo
3. **Settings** (left sidebar) → **API** click karo
4. Scroll down to **Project API keys** section
5. **service_role** key dhundho (wo jo "secret" label ke saath hai, red color)
6. **Copy** button click karo (wo key jo `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` se start hoti hai)

### Step 2: Railway Variables Update Karo

1. [Railway Dashboard](https://railway.app) → Login
2. Apne project ko select karo
3. **Variables** tab (left sidebar) click karo
4. `SUPABASE_SERVICE_ROLE_KEY` variable find karo
5. **Edit** (pencil icon) click karo
6. Purani value delete karo
7. Supabase se copy kiye hue **service_role** key paste karo
8. **Save** click karo

### Step 3: Wait for Redeploy

Railway automatically redeploy karega (2-3 minutes).

### Step 4: Test

1. App URL open karo
2. Login try karo
3. Railway logs check karo - ab "Invalid API key" error nahi aana chahiye

---

## ⚠️ IMPORTANT: Key Types

### ✅ CORRECT: service_role key
- Supabase Dashboard → Settings → API
- **service_role** section
- Label: "service_role" (secret)
- Red color, "secret" mention
- Use this one!

### ❌ WRONG: anon key
- Supabase Dashboard → Settings → API  
- **anon** section
- Label: "anon" (public)
- Public key - mat use karo!

---

## ✅ Verification

Railway logs mein yeh dikhna chahiye:
```
[Supabase Config] ✅ Supabase client created successfully
[Login] ✅ Supabase configured, querying user...
```

Aur yeh nahi dikhna chahiye:
```
❌ Database query error: Invalid API key
```

---

**✅ Bas! Ab login kaam karega!**

