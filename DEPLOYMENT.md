# 🚀 Deployment Guide - Adnan Khaddar Portal

This guide will help you deploy your full-stack application (Frontend + Backend + Database) to the internet for **FREE**.

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup (Supabase)](#database-setup-supabase)
3. [Deployment Options](#deployment-options)
   - [Option 1: Railway (Recommended - Easiest)](#option-1-railway-recommended---easiest)
   - [Option 2: Render](#option-2-render)
   - [Option 3: Vercel (Frontend) + Railway/Render (Backend)](#option-3-vercel-frontend--railwayrender-backend)
4. [Post-Deployment](#post-deployment)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, make sure you have:
- ✅ A GitHub account (free)
- ✅ A Supabase account (free) - [supabase.com](https://supabase.com)
- ✅ Your project code pushed to GitHub

---

## Database Setup (Supabase)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"New Project"**
3. Sign up/login with GitHub
4. Create a new project:
   - **Name**: `adnan-khaddar-portal` (or any name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
   - Click **"Create new project"**
5. Wait 2-3 minutes for the project to be created

### Step 2: Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Service Role Key** (click "Reveal" to see it - keep this secret!)

### Step 3: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Open the file `purchasing-schema.sql` from your project
4. Copy all the SQL code
5. Paste it into the SQL Editor
6. Click **"Run"** or press `Ctrl+Enter`
7. You should see "Success. No rows returned"

### Step 4: Run Other Schema Files (if needed)

Repeat Step 3 for these files if they exist:
- `complete-database-schema.sql`
- `supabase-schema.sql`
- `ledger-schema.sql`
- Any other `.sql` files in your project

---

## Deployment Options

## Option 1: Railway (Recommended - Easiest) ⭐

Railway is the easiest option - it deploys both frontend and backend together.

### Step 1: Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Sign up with GitHub
4. Authorize Railway to access your GitHub

### Step 2: Deploy Your Project

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Select your repository
4. Railway will automatically detect it's a Node.js project

### Step 3: Configure Environment Variables

1. In your Railway project, go to **Variables** tab
2. Add these environment variables:

```
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET_KEY=your-very-secret-jwt-key-change-this
REACT_APP_API_URL=https://your-app-name.up.railway.app/api
```

**Important Notes:**
- Replace `SUPABASE_URL` with your actual Supabase project URL
- Replace `SUPABASE_SERVICE_ROLE_KEY` with your actual service role key
- Replace `JWT_SECRET_KEY` with a random secret string (you can generate one at [randomkeygen.com](https://randomkeygen.com))
- Replace `REACT_APP_API_URL` with your Railway app URL (you'll get this after first deploy)

### Step 4: Deploy

1. Railway will automatically start building and deploying
2. Wait 3-5 minutes for the build to complete
3. Once deployed, Railway will give you a URL like: `https://your-app-name.up.railway.app`
4. Click on the URL to open your deployed app!

### Step 5: Update REACT_APP_API_URL

1. After first deployment, copy your Railway URL
2. Go back to **Variables** in Railway
3. Update `REACT_APP_API_URL` to: `https://your-app-name.up.railway.app/api`
4. Railway will automatically redeploy

**✅ Done!** Your app is now live on the internet!

---

## Option 2: Render

### Step 1: Sign Up for Render

1. Go to [render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with GitHub

### Step 2: Create Web Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Render will auto-detect settings

### Step 3: Configure Settings

- **Name**: `adnan-khaddar-portal` (or any name)
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`
- **Plan**: Select **"Free"**

### Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add:

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET_KEY=your-very-secret-jwt-key-change-this
REACT_APP_API_URL=https://your-app-name.onrender.com/api
```

**Note:** Render uses port 10000 by default (already configured in `render.yaml`)

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for the first deployment
3. Your app will be available at: `https://your-app-name.onrender.com`

**✅ Done!** Your app is live!

---

## Option 3: Vercel (Frontend) + Railway/Render (Backend)

This option separates frontend and backend for better performance.

### Part A: Deploy Backend (Railway or Render)

Follow **Option 1** or **Option 2** above, but:
- Only deploy the backend
- Don't set `REACT_APP_API_URL` in backend environment variables

### Part B: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Create React App
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

6. Add Environment Variables:
   ```
   REACT_APP_API_URL=https://your-backend-url.com/api
   ```
   (Replace with your actual backend URL from Railway/Render)

7. Click **"Deploy"**
8. Wait 2-3 minutes
9. Your frontend will be live at: `https://your-app-name.vercel.app`

**✅ Done!** Frontend and backend are deployed separately!

---

## Post-Deployment

### 1. Test Your Application

1. Visit your deployed URL
2. Try logging in (use your admin credentials)
3. Test key features:
   - Create a supplier
   - Add a purchase entry
   - View dashboard
   - Test API endpoints

### 2. Set Up Custom Domain (Optional)

**Railway:**
- Go to your service → **Settings** → **Domains**
- Add your custom domain

**Render:**
- Go to your service → **Settings** → **Custom Domains**
- Add your custom domain

**Vercel:**
- Go to your project → **Settings** → **Domains**
- Add your custom domain

### 3. Monitor Your Application

- **Railway**: Check **Metrics** tab for logs and performance
- **Render**: Check **Logs** tab
- **Vercel**: Check **Deployments** tab

---

## Troubleshooting

### Issue: "Database connection failed"

**Solution:**
- Check if Supabase credentials are correct in environment variables
- Make sure you're using **Service Role Key**, not the anon key
- Verify Supabase project is active

### Issue: "Build failed"

**Solution:**
- Check build logs in your deployment platform
- Make sure all dependencies are in `package.json`
- Try running `npm install` locally to check for errors

### Issue: "API calls not working"

**Solution:**
- Check `REACT_APP_API_URL` is set correctly
- Make sure backend URL includes `/api` at the end
- Check CORS settings in `server.js` (should allow your frontend domain)

### Issue: "404 on page refresh"

**Solution:**
- This is normal for React Router
- The server should handle this (already configured in `server.js`)
- If using Vercel, the `vercel.json` should handle routing

### Issue: "Environment variables not working"

**Solution:**
- Make sure variable names are exactly correct (case-sensitive)
- Restart/redeploy after adding new variables
- For React, variables must start with `REACT_APP_`

### Issue: "App is slow to start (Render)"

**Solution:**
- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Consider upgrading to paid plan or use Railway (faster free tier)

---

## Quick Reference: Environment Variables

```bash
# Required for all deployments
NODE_ENV=production
PORT=3000  # or 10000 for Render
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET_KEY=your-secret-key

# Required for frontend (if deployed separately)
REACT_APP_API_URL=https://your-backend-url.com/api
```

---

## Support

If you encounter any issues:
1. Check the deployment platform logs
2. Verify all environment variables are set correctly
3. Make sure database schema is imported to Supabase
4. Check that your GitHub repository is up to date

---

## 🎉 Congratulations!

Your application is now live on the internet! Share your URL with users and start using your portal from anywhere in the world!

**Recommended Platform:** Railway (easiest, fastest, best free tier)

---

**Last Updated:** 2024
**Maintained by:** Your Development Team

