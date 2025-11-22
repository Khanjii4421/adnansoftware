# 🔐 Login Error Fix: "Invalid email or password"

## 🚨 Error: 401 Unauthorized - "Invalid email or password"

Yeh error Railway par deploy ke baad aa raha hai. Possible causes:

## ✅ Step 1: Railway Logs Check Karo

1. **Railway Dashboard** → Apne project ko select karo
2. **Deployments** tab → Latest deployment click karo
3. **View Logs** button click karo
4. Login attempt karte waqt logs check karo

**Dekho:**
- `[Login] ✅ Supabase configured` - Database connected hai ya nahi
- `[Login] User query result` - User database mein hai ya nahi
- `[Login] ❌ User not found` - User exist nahi karta
- `[Login] ❌ Invalid password` - Password match nahi ho raha

## ✅ Step 2: Database Check Karo

### Supabase mein User Verify Karo

1. [Supabase Dashboard](https://app.supabase.com) → Login
2. Apne project ko select karo
3. **Table Editor** → `users` table open karo
4. Check karo:
   - User exist karta hai ya nahi
   - Email sahi hai ya nahi (case-sensitive nahi, lowercase check karo)
   - `is_active` = `true` hai ya nahi
   - `password` field mein hash hai ya nahi

## ✅ Step 3: User Create Karo (Agar nahi hai)

Agar database mein user nahi hai, to create karo:

### Option 1: Supabase SQL Editor se

```sql
-- Create admin user
INSERT INTO users (email, password, name, role, is_active)
VALUES (
  'admin@example.com',
  '$2a$10$YourHashedPasswordHere', -- bcrypt hash
  'Admin User',
  'admin',
  true
);
```

### Option 2: Server se Create User Endpoint (Agar hai)

Agar `/api/auth/register` endpoint hai to use karo.

### Option 3: Password Hash Generate Karo

Node.js se password hash generate karo:

```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('your-password', 10);
console.log('Password hash:', hash);
```

Phir Supabase SQL Editor mein:

```sql
INSERT INTO users (email, password, name, role, is_active)
VALUES (
  'admin@example.com',
  '$2a$10$generated-hash-here',
  'Admin User',
  'admin',
  true
);
```

## ✅ Step 4: Environment Variables Verify Karo

Railway Variables tab mein check karo:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET_KEY=your-secret-key
```

**Important:**
- `SUPABASE_SERVICE_ROLE_KEY` sahi hai ya nahi
- Supabase project active hai ya nahi

## ✅ Step 5: Email Case Sensitivity

Login attempt mein email lowercase ho:
- ✅ `admin@example.com` (correct)
- ❌ `Admin@Example.com` (will be converted to lowercase)

## 🔍 Common Issues & Solutions

### Issue 1: "User not found"
**Solution:**
- Supabase `users` table check karo
- Email exact match karo (lowercase)
- User create karo agar nahi hai

### Issue 2: "Invalid password"
**Solution:**
- Password hash verify karo
- Fresh password set karo with new hash
- Password field database mein sahi format mein hai ya nahi check karo

### Issue 3: "Account is deactivated"
**Solution:**
- Supabase mein `users` table mein `is_active` = `true` set karo

### Issue 4: "Database not configured"
**Solution:**
- Railway Variables mein `SUPABASE_URL` aur `SUPABASE_SERVICE_ROLE_KEY` set karo
- Railway redeploy karo

## 📝 Quick Test

### Test User Create Karo

Supabase SQL Editor mein run karo:

```sql
-- Test admin user (password: admin123)
INSERT INTO users (email, password, name, role, is_active)
VALUES (
  'admin@test.com',
  '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq',
  'Test Admin',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;
```

**Note:** Password hash generate karna hoga. Use this command:

```bash
node -e "const bcrypt=require('bcryptjs');bcrypt.hash('admin123',10).then(h=>console.log(h))"
```

## ✅ Verification Steps

1. ✅ Railway logs check kiye
2. ✅ Supabase users table check kiya
3. ✅ User exist karta hai
4. ✅ Email sahi format mein hai
5. ✅ Password hash sahi hai
6. ✅ `is_active` = `true` hai
7. ✅ Environment variables set hain
8. ✅ Railway redeploy kiya

---

**Agar abhi bhi error aaye, to Railway logs share karo!**

