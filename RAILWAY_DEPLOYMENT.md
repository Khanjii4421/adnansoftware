# Railway Deployment Guide

## Fixes Applied

1. ✅ **Server Binding**: Server ab `0.0.0.0` par bind hoga taake external connections accept ho saken
2. ✅ **Build Directory Check**: Build folder exists karne ka check add kiya
3. ✅ **Production Environment**: Railway environment detection improve kiya

## Railway Dashboard Mein Environment Variables Set Karein

Railway mein aapko yeh environment variables set karne honge:

1. **Railway Dashboard** mein apne project par jao
2. **Variables** tab par click karein
3. In variables ko add/update karein:

```
NODE_ENV=production
PORT=3000 (Railway automatically set kar deta hai)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET_KEY=your-secret-key
```

## Deployment Steps

1. **Git Push**: Code ko GitHub par push karein
   ```bash
   git add .
   git commit -m "Fix Railway deployment issues"
   git push
   ```

2. **Railway Auto-Deploy**: Railway automatically detect karega aur deploy kar dega

3. **Check Logs**: Railway dashboard mein **Logs** tab check karein:
   - Server successfully start hua ya nahi
   - Database connection ho rahi hai ya nahi
   - Build folder properly serve ho raha hai ya nahi

## Common Issues & Solutions

### Issue 1: Server Error 500
**Solution**: Check karein ke Railway mein environment variables properly set hain:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET_KEY`

### Issue 2: Cannot Connect to Database
**Solution**: Supabase credentials verify karein Railway dashboard mein

### Issue 3: Build Folder Not Found
**Solution**: Railway automatically build karega. Check build logs mein koi error to nahi

### Issue 4: Server Not Accessible from Other Devices
**Solution**: Server ab `0.0.0.0` par bind hai, isliye external connections accept honge

## Verification

Deploy ke baad check karein:

1. **Health Check**: `https://your-app.railway.app/api/health`
   - Response: `{"status":"ok","database":"connected","timestamp":"..."}`

2. **API Endpoint**: `https://your-app.railway.app/api/auth/login`
   - Should respond (not error)

3. **Frontend**: `https://your-app.railway.app/`
   - React app load honi chahiye

## Notes

- Railway automatically `PORT` environment variable set kar deta hai
- `NODE_ENV=production` Railway mein automatically set hota hai
- Server ab `0.0.0.0` par listen karta hai taake external requests accept ho saken

