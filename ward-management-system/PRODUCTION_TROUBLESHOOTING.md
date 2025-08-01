# Production Troubleshooting Guide

## Common Issues with Instructions and Documents Pages Not Updating

### 1. **Immediate Checks**

#### Access the diagnostic endpoint:
```
GET /api/debug/production-health
```

This will show you:
- Session status
- Database connectivity
- Model accessibility
- Recent updates
- Environment variables

### 2. **Database Connection Issues**

**Symptoms:**
- Pages load but don't show data
- API calls return 500 errors
- Slow response times

**Solutions:**
```bash
# Check MongoDB connection
mongosh "your-mongodb-uri"

# Check connection pooling
# Ensure MONGODB_URI includes proper connection options
MONGODB_URI="mongodb://user:pass@host:port/db?maxPoolSize=10&retryWrites=true"
```

### 3. **Caching Issues**

**Symptoms:**
- Old data persists after updates
- Changes not reflected immediately
- Inconsistent behavior

**Solutions:**
- Added cache control headers to API routes
- Clear browser cache
- Check CDN/proxy caching settings

### 4. **Session/Authentication Problems**

**Symptoms:**
- Users get logged out frequently
- API returns 401 errors
- Session data missing

**Check:**
```javascript
// Verify environment variables
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

### 5. **Model/Schema Issues**

**Symptoms:**
- Database queries fail
- Missing fields in responses
- Type errors

**Solutions:**
```bash
# Check if models are properly indexed
db.instructions.getIndexes()
db.documents.getIndexes()

# Verify schema matches code
db.instructions.findOne()
db.documents.findOne()
```

### 6. **API Route Issues**

**Common Problems:**
- Missing error handling
- Incorrect HTTP methods
- Malformed responses

**Fixed in code:**
- Added proper error handling
- Added cache control headers
- Improved response formatting

### 7. **Frontend State Management**

**Symptoms:**
- UI doesn't update after API calls
- Stale data displayed
- Loading states stuck

**Check:**
```javascript
// Ensure proper state updates
const fetchInstructions = async () => {
  try {
    const response = await axios.get('/api/instructions');
    setInstructions(response.data.instructions || response.data || []);
  } catch (error) {
    console.error('Error:', error);
    setError('Failed to fetch instructions');
  }
};
```

### 8. **Network/Deployment Issues**

**Check:**
- Server logs for errors
- Network connectivity
- Load balancer configuration
- SSL certificate validity

### 9. **Environment-Specific Issues**

**Production vs Development:**
```bash
# Check environment variables
echo $NODE_ENV
echo $MONGODB_URI
echo $NEXTAUTH_SECRET

# Verify build process
npm run build
npm start
```

### 10. **Monitoring and Logging**

**Add logging to API routes:**
```javascript
console.log('API called:', req.method, req.url);
console.log('Session:', session?.user?.id);
console.log('Query:', req.query);
```

## Quick Fix Checklist

1. ✅ **Cache Headers Added** - Prevents browser/proxy caching
2. ✅ **Error Handling Improved** - Better error reporting
3. ✅ **Diagnostic Endpoint Created** - `/api/debug/production-health`
4. ⚠️ **Check Database Connection** - Verify MongoDB connectivity
5. ⚠️ **Verify Environment Variables** - All required vars present
6. ⚠️ **Check Server Logs** - Look for specific error messages
7. ⚠️ **Test API Endpoints Directly** - Use Postman/curl
8. ⚠️ **Clear All Caches** - Browser, CDN, server-side

## Testing Steps

1. **Test API directly:**
```bash
curl -X GET "https://your-domain.com/api/instructions" \
  -H "Cookie: your-session-cookie"
```

2. **Check database directly:**
```javascript
// In MongoDB shell
db.instructions.find().sort({updatedAt: -1}).limit(5)
db.documents.find().sort({updatedAt: -1}).limit(5)
```

3. **Monitor network requests:**
- Open browser DevTools
- Check Network tab for failed requests
- Look for 401, 403, 500 errors

4. **Check server logs:**
```bash
# If using PM2
pm2 logs

# If using Docker
docker logs container-name

# If using systemd
journalctl -u your-service-name
```

## Emergency Fixes

If pages are completely broken:

1. **Restart the application:**
```bash
pm2 restart all
# or
docker-compose restart
```

2. **Clear all caches:**
```bash
# Clear Next.js cache
rm -rf .next/cache

# Rebuild
npm run build
```

3. **Check database connectivity:**
```bash
# Test connection
mongosh "your-mongodb-uri" --eval "db.adminCommand('ping')"
```

4. **Rollback if necessary:**
```bash
git checkout previous-working-commit
npm run build
pm2 restart all
```