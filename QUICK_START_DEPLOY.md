# ⚡ Quick Start: Deploy to GitHub & Railway

## 🚀 Fast Deployment (5 Minutes)

### Step 1: Setup GitHub (2 minutes)

1. **Create GitHub Repository**
   - Go to: https://github.com/new
   - Name: `adnan-software-portal`
   - Click "Create repository"

2. **Push Your Code**
   ```bash
   # Run the setup script
   setup-github-and-railway.bat
   ```
   
   OR manually:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/adnan-software-portal.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Railway (3 minutes)

1. **Go to Railway**: https://railway.app/new
2. **Sign in with GitHub**
3. **Click "New Project" → "Deploy from GitHub repo"**
4. **Select your repository**
5. **Add Environment Variables**:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   JWT_SECRET_KEY=your-secret-key-min-32-chars
   ```
6. **Generate Domain**: Railway → Settings → Generate Domain
7. **Done!** Your portal is live at `https://your-project.up.railway.app`

---

## 📝 Daily Updates

After making code changes:

1. **Use Quick Push**:
   ```bash
   quick-push.bat
   ```

2. **Railway automatically deploys** in ~2 minutes

---

## 🔗 Your Live URLs

- **Portal**: `https://your-project.up.railway.app`
- **API**: `https://your-project.up.railway.app/api`
- **Health Check**: `https://your-project.up.railway.app/api/health`

---

## 📚 Full Guide

For detailed instructions, see: `DEPLOY_TO_GITHUB_AND_RAILWAY.md`

---

## ❓ Troubleshooting

**Build Fails?**
- Check Railway logs: Railway Dashboard → Deployments → Logs
- Verify environment variables are set

**App Won't Start?**
- Check health endpoint: `/api/health`
- Verify all environment variables are set
- Check Railway logs for errors

**Need Help?**
- Railway Docs: https://docs.railway.app
- GitHub Docs: https://docs.github.com

