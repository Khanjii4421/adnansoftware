# ⚡ Quick Deploy Guide (5 Minutes)

## Fastest Way: Railway (Recommended)

### 1. Database (2 minutes)
1. Go to [supabase.com](https://supabase.com) → Create project
2. Copy **Project URL** and **Service Role Key**
3. Run `purchasing-schema.sql` in Supabase SQL Editor

### 2. Deploy (3 minutes)
1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Go to **Variables** tab, add:

```
NODE_ENV=production
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
JWT_SECRET_KEY=any-random-secret
```

5. Wait 3-5 minutes → Done! 🎉

### 3. Update API URL
After first deploy, copy your Railway URL and add:
```
REACT_APP_API_URL=https://your-app.up.railway.app/api
```

**That's it!** Your app is live! 🚀

---

## Alternative: Render

1. Go to [render.com](https://render.com) → Sign up
2. **New** → **Web Service** → Connect GitHub
3. Settings:
   - Build: `npm install && npm run build`
   - Start: `npm run start:prod`
4. Add same environment variables as above
5. Deploy!

---

## Need Help?

See `DEPLOYMENT.md` for detailed instructions.

