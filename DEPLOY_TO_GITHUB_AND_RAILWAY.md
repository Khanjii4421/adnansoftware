# 🚀 Complete Guide: Deploy to GitHub & Railway with Automation

This guide will help you upload your code to GitHub and deploy it to Railway with automatic deployments.

## 📋 Prerequisites

1. **GitHub Account** - Sign up at [github.com](https://github.com)
2. **Railway Account** - Sign up at [railway.app](https://railway.app)
3. **Git Installed** - Check with `git --version`
4. **Node.js Installed** - Check with `node --version`

---

## 🔧 Step 1: Initialize Git Repository (If not already done)

Open terminal/command prompt in your project folder and run:

```bash
# Initialize git repository (skip if already initialized)
git init

# Check current status
git status

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Complete seller admin portal"
```

---

## 📤 Step 2: Create GitHub Repository

1. **Go to GitHub**: [github.com/new](https://github.com/new)
2. **Create New Repository**:
   - Repository name: `adnan-software-portal` (or any name you prefer)
   - Description: "Seller Admin Portal - Complete Order Management System"
   - Visibility: **Private** (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
   - Click **"Create repository"**

3. **Copy the repository URL** (e.g., `https://github.com/yourusername/adnan-software-portal.git`)

---

## 🔗 Step 3: Connect Local Repository to GitHub

In your project terminal, run:

```bash
# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/adnan-software-portal.git

# Verify remote was added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

If prompted for credentials:
- **Username**: Your GitHub username
- **Password**: Use a **Personal Access Token** (not your GitHub password)
  - Create token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  - Generate new token with `repo` scope
  - Copy and use it as password

---

## 🚂 Step 4: Deploy to Railway

### 4.1: Create Railway Project

1. **Go to Railway**: [railway.app/new](https://railway.app/new)
2. **Sign in with GitHub** (recommended for automatic deployments)
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Select your repository** from the list
6. Railway will automatically detect your Node.js project

### 4.2: Configure Environment Variables

1. In your Railway project, click on your **service**
2. Go to **Variables** tab
3. Add the following environment variables:

```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET_KEY=your-secret-key-min-32-chars
PORT=3000
NODE_ENV=production
```

**Important Variables to Set:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (found in Supabase dashboard → Settings → API)
- `JWT_SECRET_KEY`: A strong random string (minimum 32 characters)
- `PORT`: Railway will set this automatically, but you can keep it

### 4.3: Configure Build Settings

Railway should automatically detect:
- **Root Directory**: `.` (root)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node server.js`

If not, manually set in Railway → Settings → Deploy:
- Build Command: `npm install && npm run build`
- Start Command: `node server.js`

### 4.4: Enable Automatic Deployments

Railway will automatically deploy when you push to GitHub:
- **Default Branch**: `main` (deploys automatically)
- **Pull Request**: Creates preview deployments (optional)

---

## 🔄 Step 5: Set Up Automation

### 5.1: Automatic GitHub Push Script

Create a file `push-to-github.bat` (Windows) or `push-to-github.sh` (Mac/Linux):

**Windows (`push-to-github.bat`):**
```batch
@echo off
echo Adding all changes...
git add .

echo Enter commit message:
set /p commit_msg="> "

echo Committing changes...
git commit -m "%commit_msg%"

echo Pushing to GitHub...
git push origin main

echo Done! Railway will automatically deploy.
pause
```

**Mac/Linux (`push-to-github.sh`):**
```bash
#!/bin/bash
echo "Adding all changes..."
git add .

echo "Enter commit message:"
read commit_msg

echo "Committing changes..."
git commit -m "$commit_msg"

echo "Pushing to GitHub..."
git push origin main

echo "Done! Railway will automatically deploy."
```

### 5.2: Quick Push Script

For quick pushes, create `quick-push.bat` (Windows):

```batch
@echo off
git add .
git commit -m "Update: %date% %time%"
git push origin main
echo Pushed to GitHub!
pause
```

---

## 🌐 Step 6: Access Your Live Portal

After Railway deploys:

1. **Get Your Live URL**:
   - Go to Railway project → Your service
   - Click **"Settings"** → **"Generate Domain"**
   - Railway will give you a URL like: `https://your-project-name.up.railway.app`

2. **Access the Portal**:
   - Frontend: `https://your-project-name.up.railway.app`
   - API: `https://your-project-name.up.railway.app/api`

3. **Update Frontend API URL** (if needed):
   - Railway automatically serves both frontend and backend
   - The frontend should automatically connect to the backend API

---

## 🔒 Step 7: Security Checklist

- [ ] Change `JWT_SECRET_KEY` to a strong random string
- [ ] Keep `.env` file out of Git (already in `.gitignore`)
- [ ] Use Railway environment variables, not `.env` file in production
- [ ] Set Supabase RLS (Row Level Security) policies
- [ ] Use HTTPS (Railway provides this automatically)
- [ ] Review CORS settings in `server.js`

---

## 📝 Step 8: Making Changes and Deploying

### Method 1: Manual Push (Recommended)
```bash
# Make your changes to code

# Add changes
git add .

# Commit with message
git commit -m "Description of changes"

# Push to GitHub (Railway will auto-deploy)
git push origin main
```

### Method 2: Use Push Script
```bash
# Windows
push-to-github.bat

# Mac/Linux
chmod +x push-to-github.sh
./push-to-github.sh
```

---

## 🐛 Troubleshooting

### Railway Build Fails
1. Check **Railway Logs**: Railway dashboard → Deployments → View logs
2. Check **Build Command**: Should be `npm install && npm run build`
3. Check **Node Version**: Railway uses Node 18+ by default
4. Check **Environment Variables**: All required variables must be set

### Application Won't Start
1. Check **Start Command**: Should be `node server.js`
2. Check **Port**: Railway sets `PORT` automatically, don't hardcode it
3. Check **Health Check**: Railway checks `/api/health` endpoint
4. Check **Logs**: Railway dashboard → Deployments → View logs

### GitHub Push Fails
1. Check **Git Remote**: `git remote -v`
2. Check **Authentication**: Use Personal Access Token, not password
3. Check **Branch**: Ensure you're on `main` branch: `git branch`

### Environment Variables Not Working
1. Railway **restarts** service after variable changes
2. Check **variable names**: Must match exactly (case-sensitive)
3. No spaces around `=` in Railway variables
4. Check **Railway Logs** for variable loading errors

---

## 📊 Railway Dashboard Features

- **Deployments**: View all deployments and logs
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Variables**: Manage environment variables
- **Settings**: Configure domain, build settings
- **Activity**: View all project activity

---

## 🔄 Automated Workflow

```
1. Make code changes locally
   ↓
2. Commit changes: git commit -m "message"
   ↓
3. Push to GitHub: git push origin main
   ↓
4. GitHub triggers Railway webhook
   ↓
5. Railway automatically:
   - Clones repository
   - Runs: npm install && npm run build
   - Starts: node server.js
   - Deploys to: https://your-project.up.railway.app
   ↓
6. Your portal is live with latest changes!
```

---

## 📞 Support

If you encounter issues:
1. Check Railway logs: Railway Dashboard → Deployments → Logs
2. Check GitHub Actions: GitHub → Actions (if using GitHub Actions)
3. Verify environment variables are set correctly
4. Check server.js health endpoint: `/api/health`

---

## ✅ Quick Checklist

- [ ] Git repository initialized
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Railway account created
- [ ] Railway project connected to GitHub
- [ ] Environment variables configured in Railway
- [ ] Build settings configured
- [ ] Automatic deployments enabled
- [ ] Live URL obtained and tested
- [ ] Security checklist completed

---

## 🎉 You're All Set!

Your portal is now:
- ✅ Version controlled on GitHub
- ✅ Automatically deployed on Railway
- ✅ Accessible via live URL
- ✅ Auto-deploys on every push

**Happy Deploying!** 🚀

