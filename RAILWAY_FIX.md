# Railway Deployment Fix

## Issues Fixed

### 1. **Error Handling**
- Added unhandled promise rejection handler
- Added uncaught exception handler
- Added graceful shutdown handlers (SIGTERM, SIGINT)
- Server startup errors are now caught and logged

### 2. **Server Startup**
- Wrapped `app.listen()` in try-catch
- Added server error event handler
- Better port binding error messages

### 3. **Health Check Endpoint**
- Improved `/api/health` endpoint with error handling
- Added uptime information
- Railway can now properly check server health

### 4. **Input Sanitization**
- Added error handling for sanitization middleware
- Health check and test endpoints bypass sanitization
- Server won't crash if sanitization fails

### 5. **Railway Configuration**
- Updated `railway.json` with health check path
- Changed start command to `node server.js`
- Added health check timeout

## What to Check in Railway

### Environment Variables
Make sure these are set in Railway:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `JWT_SECRET_KEY` - A secure random string for JWT tokens
- `NODE_ENV` - Set to `production`
- `PORT` - Railway will set this automatically

### Build Settings
1. **Build Command**: `npm install && npm run build`
2. **Start Command**: `node server.js`
3. **Health Check Path**: `/api/health`

### Common Issues

1. **Container Restarting**
   - Check Railway logs for errors
   - Verify all environment variables are set
   - Check if port is being used correctly

2. **Build Fails**
   - Check if `npm install` completes successfully
   - Verify `npm run build` works locally
   - Check for missing dependencies

3. **Server Crashes**
   - Check Railway logs
   - Verify database connection
   - Check environment variables

## Testing Locally

Before deploying, test the production build locally:

```bash
# Build the React app
npm run build

# Start the server
node server.js
```

Visit `http://localhost:3000/api/health` to verify it works.

## Deployment Steps

1. Push changes to your repository
2. Railway will automatically detect changes
3. Check Railway dashboard for build logs
4. Monitor deployment logs for any errors
5. Once deployed, check `/api/health` endpoint

## Monitoring

After deployment, monitor:
- Railway logs for any errors
- Health check endpoint response
- Database connection status
- API response times

