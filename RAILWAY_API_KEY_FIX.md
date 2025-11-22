# 🔑 Railway API Key Fix: "Invalid API key"

## 🚨 Error: "Invalid API key"

```
[Login] ❌ Database query error: Invalid API key
hint: 'Double check your Supabase `anon` or `service_role` API key.'
```

Yeh error isliye aa raha hai kyunki Railway par `SUPABASE_SERVICE_ROLE_KEY` galat hai ya missing hai.

## ✅ Quick Fix (2 Minutes)

### Step 1: Supabase se Correct Key Lein

1. [Supabase Dashboard](https://app.supabase.com) → Login
2. Apne project ko select karo
3. **Settings** → **API** click karo
4. **API Keys** section mein dekho:

   **⚠️ IMPORTANT:**
   - ❌ **anon key** (public) - Yeh mat use karo
   - ✅ **service_role key** (secret) - Yeh use karo (red color, "secret" label)

5. **service_role** key copy karo (wo jo "secret" hai, red color mein)

### Step 2: Railway Variables Update Karo

1. [Railway Dashboard](https://railway.app) → Login
2. Apne project ko select karo
3. **Variables** tab click karo
4. `SUPABASE_SERVICE_ROLE_KEY` variable find karo
5. **Edit** click karo
6. Supabase se copy kiye hue **service_role** key paste karo
7. **Save** click karo

### Step 3: Verify Karo

Railway Variables tab mein yeh check karo:

```
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHh4eHgiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyfQ.xxxxxxxxxxxxx
```

**Important:**
- ✅ `SUPABASE_SERVICE_ROLE_KEY` start hona chahiye: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- ✅ Key mein `service_role` mention hona chahiye (Supabase dashboard mein)
- ❌ `anon` key mat use karo (wo public key hai)

### Step 4: Redeploy

Variables update karne ke baad Railway automatically redeploy karega. 2-3 minutes wait karo.

### Step 5: Test Karo

1. App URL open karo
2. Login try karo
3. Railway logs check karo:
   - `[Login] ✅ Supabase configured` - Should appear
   - `[Login] ❌ Database query error: Invalid API key` - Should NOT appear

## 🔍 How to Identify Correct Key

### ✅ Correct Key (service_role):
- Supabase Dashboard → Settings → API
- **service_role** section (red color)
- Label: "service_role" (secret)
- Starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Long key (200+ characters)

### ❌ Wrong Key (anon):
- Supabase Dashboard → Settings → API
- **anon** section (public)
- Label: "anon" (public)
- Also starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- But shorter key

## 📝 Complete Railway Variables Checklist

Railway Variables tab mein yeh sab set hone chahiye:

```bash
# Database (Required)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx

# Authentication (Required)
JWT_SECRET_KEY=your-secret-key-minimum-32-chars

# Server (Required)
NODE_ENV=production
PORT=8080
```

## 🚨 Common Mistakes

1. **Wrong Key Type:**
   - ❌ Using `anon` key instead of `service_role` key
   - ✅ Use `service_role` key (secret)

2. **Incomplete Key:**
   - ❌ Key copy karte waqt cut ho gaya
   - ✅ Full key copy karo (200+ characters)

3. **Extra Spaces:**
   - ❌ Key ke aage/peeche spaces
   - ✅ No spaces, exact key paste karo

4. **Wrong Variable Name:**
   - ❌ `SUPABASE_ANON_KEY` use kiya
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` use karo

## ✅ Verification

After fixing, Railway logs mein yeh dikhna chahiye:

```
✅ Database: ✅ Connected
[Login] ✅ Supabase configured, querying user...
```

Aur yeh nahi dikhna chahiye:

```
❌ Database query error: Invalid API key
```

---

**✅ Ab service_role key set karne ke baad login kaam karega!**

