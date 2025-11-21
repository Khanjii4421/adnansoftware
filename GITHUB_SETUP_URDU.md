# GitHub Push Setup - آسان گائیڈ

## 🎯 کیا کیا شامل ہے؟
آپ کے لیے **Git Push Function** add کیا گیا ہے جو:
- ✅ Main branch کو GitHub پر push کرتا ہے
- ✅ Admin users کے لیے secure ہے
- ✅ API endpoint کے ذریعے استعمال کیا جا سکتا ہے

---

## 📋 Step-by-Step Setup

### Step 1: Git Install کریں
```bash
# Check کریں Git installed ہے یا نہیں
git --version

# اگر نہیں ہے تو یہاں سے download کریں:
# https://git-scm.com/downloads
```

### Step 2: Git Configure کریں
```bash
git config --global user.name "آپ کا نام"
git config --global user.email "your.email@example.com"
```

### Step 3: GitHub Repository بنائیں
1. [GitHub.com](https://github.com) پر جائیں
2. **"+"** icon پر click کریں → **"New repository"**
3. Repository name دیں (مثلاً: `adnansoftware`)
4. **Create repository** click کریں

### Step 4: Project میں Git Setup کریں
```bash
# Project folder میں جائیں
cd C:\adnansoftware-main

# Git initialize کریں (اگر پہلے نہیں کیا)
git init

# GitHub repository add کریں
git remote add origin https://github.com/Khanjii4421/adnansoftware.git

# یا existing remote update کریں
git remote set-url origin https://github.com/Khanjii4421/adnansoftware.git

# Branch main پر switch کریں
git branch -M main
```

### Step 5: GitHub Authentication Setup
#### Personal Access Token بنائیں:
1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **"Generate new token"** click کریں
3. Name: `adnansoftware-push`
4. Scopes: ✅ **repo** select کریں
5. **Generate token** click کریں
6. **Token کو copy کریں** (یہ دوبارہ نہیں دکھایا جائے گا)

### Step 6: پہلی بار Push کریں
```bash
# Files add کریں
git add .

# Commit کریں
git commit -m "Initial commit"

# GitHub پر push کریں
git push -u origin main

# Username: Khanjii4421
# Password: آپ کا Personal Access Token (GitHub password نہیں)

# یا automated script run کریں:
SETUP_GITHUB_COMPLETE.bat
AUTO_PUSH_TO_GITHUB.bat
```

---

## 🚀 API Endpoint استعمال کریں

### Method 1: Postman یا cURL
```bash
POST http://localhost:3000/api/git/push
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json
Body:
{
  "branch": "main"
}
```

### Method 2: Test Script
```bash
# 1. Server start کریں
npm run server

# 2. Admin login کریں اور JWT token لے لیں
# 3. test-git-push-api.js میں token update کریں
# 4. Run کریں:
node test-git-push-api.js
```

### Method 3: Quick Setup Check
```bash
# Windows میں:
QUICK_GITHUB_SETUP.bat run کریں
```

---

## 📡 API Endpoints

### 1. Git Push
```
POST /api/git/push
- Admin only
- Main branch کو GitHub پر push کرتا ہے
- Response میں complete output دیتا ہے
```

### 2. Git Status
```
GET /api/git/status
- Admin only
- Current git status دکھاتا ہے
- Branch, uncommitted changes, last commit
```

---

## ⚠️ Important Notes

1. **Admin Only**: صرف admin users push کر سکتے ہیں
2. **Token Security**: Personal Access Token کبھی commit نہ کریں
3. **First Time**: پہلی بار command line سے push کریں
4. **After Setup**: API endpoint استعمال کر سکتے ہیں

---

## 🔧 Troubleshooting

### Problem: "Not a git repository"
**Solution:**
```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

### Problem: "Authentication failed"
**Solution:**
- Personal Access Token use کریں (GitHub password نہیں)
- Token میں `repo` scope ہونا چاہیے

### Problem: API "Access denied"
**Solution:**
- Admin role check کریں
- Valid JWT token use کریں
- Login دوبارہ کریں

---

## ✅ Checklist

- [ ] Git installed ہے
- [ ] GitHub account بنایا
- [ ] Repository create کیا
- [ ] Remote add کیا
- [ ] Personal Access Token بنایا
- [ ] پہلی بار push کیا
- [ ] API endpoint test کیا

---

## 📚 Complete Guide
تفصیلی guide کے لیے: **GITHUB_PUSH_SETUP_GUIDE.md** دیکھیں

---

**آسان طریقہ:**
1. `QUICK_GITHUB_SETUP.bat` run کریں
2. Instructions follow کریں
3. API endpoint test کریں
4. Done! ✅
