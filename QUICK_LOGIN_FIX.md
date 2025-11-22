# 🚨 Quick Login Fix: "Invalid email or password"

## ⚡ 5-Minute Fix

### Step 1: Railway Logs Check Karo

1. Railway Dashboard → Project → **Deployments** → Latest → **View Logs**
2. Login attempt karo
3. Logs mein dekho:
   - `[Login] ✅ Supabase configured` - Database connected
   - `[Login] User query result` - User found ya nahi
   - `[Login] ❌ User not found` - User database mein nahi hai

### Step 2: Supabase mein User Check Karo

1. [Supabase Dashboard](https://app.supabase.com) → **Table Editor** → `users`
2. Check karo:
   - ✅ User exist karta hai
   - ✅ Email sahi hai (lowercase)
   - ✅ `is_active` = `true`
   - ✅ `password` field mein hash hai

### Step 3: Agar User Nahi Hai - Create Karo

**Supabase SQL Editor** mein run karo:

```sql
-- First, password hash generate karo (Node.js se)
-- Terminal mein: node -e "const bcrypt=require('bcryptjs');bcrypt.hash('your-password',10).then(h=>console.log(h))"

-- Phir user create karo
INSERT INTO users (email, password, name, role, is_active)
VALUES (
  'admin@example.com',
  '$2a$10$PASTE_GENERATED_HASH_HERE',
  'Admin User',
  'admin',
  true
);
```

### Step 4: Password Hash Generate Karo

**Terminal mein:**

```bash
node -e "const bcrypt=require('bcryptjs');bcrypt.hash('admin123',10).then(h=>console.log('Hash:',h))"
```

Output copy karo aur SQL query mein paste karo.

### Step 5: Test Login

1. Email: `admin@example.com`
2. Password: `admin123` (ya jo password use kiya)
3. Login try karo

---

## 🔍 Common Issues

| Error | Solution |
|-------|----------|
| User not found | Supabase mein user create karo |
| Invalid password | Password hash regenerate karo |
| Account deactivated | `is_active = true` set karo |
| Database not configured | Railway Variables check karo |

---

## ✅ Checklist

- [ ] Railway logs check kiye
- [ ] Supabase users table check kiya
- [ ] User exist karta hai
- [ ] Password hash sahi format mein hai
- [ ] `is_active = true` hai
- [ ] Login test kiya

---

**Agar abhi bhi error aaye, Railway logs share karo!**

