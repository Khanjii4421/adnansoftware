# ✅ Deployment Checklist

Use this checklist before deploying to ensure everything is ready!

## Pre-Deployment

- [ ] All code is committed to GitHub
- [ ] `.env` file is NOT committed (check `.gitignore`)
- [ ] Database schema files are ready (`purchasing-schema.sql`, etc.)
- [ ] Tested the application locally
- [ ] All dependencies are in `package.json`

## Database Setup

- [ ] Created Supabase account
- [ ] Created new Supabase project
- [ ] Copied Supabase URL and Service Role Key
- [ ] Ran all SQL schema files in Supabase SQL Editor
- [ ] Verified tables are created (check Supabase Table Editor)

## Deployment Platform Setup

- [ ] Created account on deployment platform (Railway/Render/Vercel)
- [ ] Connected GitHub repository
- [ ] Created new project/service

## Environment Variables

- [ ] `NODE_ENV=production`
- [ ] `PORT=3000` (or `10000` for Render)
- [ ] `SUPABASE_URL` (from Supabase Settings → API)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Settings → API)
- [ ] `JWT_SECRET_KEY` (generate a random secret)
- [ ] `REACT_APP_API_URL` (your backend URL + `/api`)

## Post-Deployment

- [ ] Application is accessible via URL
- [ ] Can log in with admin credentials
- [ ] API endpoints are working
- [ ] Database connection is working
- [ ] Can create/view suppliers
- [ ] Can create/view purchases
- [ ] All features are functional

## Testing Checklist

- [ ] Login/Logout works
- [ ] Dashboard loads correctly
- [ ] Suppliers page works
- [ ] Purchase Entry works
- [ ] Data persists (refresh page, data should remain)
- [ ] No console errors in browser
- [ ] Mobile responsive (test on phone)

## Security

- [ ] `.env` file is in `.gitignore`
- [ ] No sensitive data in code
- [ ] JWT_SECRET_KEY is strong and unique
- [ ] Supabase Service Role Key is kept secret

## Documentation

- [ ] Deployment URL is saved
- [ ] Admin credentials are documented (securely)
- [ ] Environment variables are documented (securely)

---

## Quick Commands

```bash
# Build locally to test
npm run build

# Test production build locally
npm run start:prod

# Check for issues
npm install
npm run build
```

---

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

