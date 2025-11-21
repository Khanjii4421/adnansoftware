# GitHub Quick Reference - Adnan Software

## 🎯 Repository Information

- **Repository URL**: https://github.com/Khanjii4421/adnansoftware.git
- **GitHub Username**: Khanjii4421
- **Git User**: khalil
- **Git Email**: khanjii4421@gmail.com
- **Branch**: main

## ⚡ Quick Commands

### Setup (One Time)
```bash
# Run automated setup
SETUP_GITHUB_COMPLETE.bat

# Or manually:
git config --global user.name "khalil"
git config --global user.email "khanjii4421@gmail.com"
git config --global credential.helper wincred
git remote add origin https://github.com/Khanjii4421/adnansoftware.git
git branch -M main
```

### Push to GitHub
```bash
# Method 1: Automated script
AUTO_PUSH_TO_GITHUB.bat

# Method 2: Manual commands
git add .
git commit -m "Your commit message"
git push -u origin main

# Method 3: API endpoint (Admin only)
POST http://localhost:3000/api/git/push
Headers: Authorization: Bearer YOUR_JWT_TOKEN
Body: { "branch": "main" }
```

### Check Status
```bash
# Git status
git status

# Remote info
git remote -v

# Branch info
git branch

# API endpoint
GET http://localhost:3000/api/git/status
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔐 Authentication

### Personal Access Token Setup
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: `adnansoftware-push`
4. Scope: ✅ **repo** (Full control)
5. Generate and **COPY** the token
6. Use token as password when pushing

### Credentials
- **Username**: Khanjii4421
- **Password**: [Your Personal Access Token]

## 📋 Available Scripts

1. **SETUP_GITHUB_COMPLETE.bat** - Complete setup (run once)
2. **AUTO_PUSH_TO_GITHUB.bat** - Auto push to GitHub
3. **QUICK_GITHUB_SETUP.bat** - Quick setup checker
4. **test-git-push-api.js** - Test API endpoints

## 🚀 API Endpoints

### POST `/api/git/push`
Push main branch to GitHub
- **Auth**: Admin only (JWT token required)
- **Body**: `{ "branch": "main", "force": false }`
- **Response**: Success/error with git output

### GET `/api/git/status`
Check git status
- **Auth**: Admin only (JWT token required)
- **Response**: Branch, uncommitted changes, last commit

## 📝 Regular Workflow

```bash
# 1. Make changes to code
# 2. Stage changes
git add .

# 3. Commit
git commit -m "Description of changes"

# 4. Push (choose one)
git push origin main
# OR use API: POST /api/git/push
```

## 🔗 Useful Links

- Repository: https://github.com/Khanjii4421/adnansoftware
- Create Token: https://github.com/settings/tokens
- GitHub Settings: https://github.com/settings/profile

## ⚠️ Important Notes

1. Always use **Personal Access Token** as password (not GitHub password)
2. Token must have **repo** scope for push permissions
3. API endpoints require **admin role** in your application
4. Run `SETUP_GITHUB_COMPLETE.bat` first time setup
5. Use `AUTO_PUSH_TO_GITHUB.bat` for regular pushes

## 🆘 Troubleshooting

### Authentication Failed
```bash
# Clear stored credentials
git credential-manager-core erase
# Then push again and enter token
```

### Remote Already Exists
```bash
# Update remote URL
git remote set-url origin https://github.com/Khanjii4421/adnansoftware.git
```

### Push Rejected
```bash
# Pull latest first
git pull origin main --rebase
# Then push
git push origin main
```

---
**Last Updated**: Auto-generated with repository details
