# Deployment Environment Configuration Guide

## SignOut Localhost Redirect Fix - ENHANCED SOLUTION

This document outlines the comprehensive solution to prevent signout redirects to localhost in production environments. The enhanced solution includes multiple layers of protection.

## Required Environment Variables

### For Production Deployment (Vercel/Other Hosting)

Make sure to set the following environment variables in your hosting platform:

```bash
# CRITICAL: Your production domain URL (highest priority)
NEXTAUTH_URL=https://your-production-domain.com

# Required: NextAuth secret (generate a secure random string)
NEXTAUTH_SECRET=your-secure-random-secret-key

# Required: MongoDB connection string
MONGODB_URI=your-mongodb-connection-string

# Optional: Vercel automatically sets VERCEL_URL (used as fallback)
# VERCEL_URL=your-vercel-domain.vercel.app
```

### For Local Development

Create a `.env.local` file in the project root:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-development-secret
MONGODB_URI=your-mongodb-connection-string
```

## Key Changes Made - ENHANCED SOLUTION

### 1. Enhanced NextAuth Redirect Callback

In `pages/api/auth/[...nextauth].js`, implemented a multi-layer redirect callback with production environment detection:

```javascript
async redirect({ url, baseUrl }) {
  // Enhanced redirect handling to prevent localhost redirects in production
  console.log('NextAuth redirect callback - url:', url, 'baseUrl:', baseUrl);
  
  // Get the proper base URL for production environments
  const getProperBaseUrl = () => {
    // Priority 1: Use NEXTAUTH_URL if set and not localhost
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')) {
      return process.env.NEXTAUTH_URL;
    }
    
    // Priority 2: Use VERCEL_URL if available (for Vercel deployments)
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    
    // Priority 3: Warn if production is using localhost
    if (process.env.NODE_ENV === 'production' && baseUrl.includes('localhost')) {
      console.error('WARNING: Production environment is using localhost baseUrl. Please set NEXTAUTH_URL environment variable.');
    }
    
    return baseUrl;
  };
  
  const properBaseUrl = getProperBaseUrl();
  
  // Handle relative URLs
  if (url.startsWith('/')) {
    return `${properBaseUrl}${url}`;
  }
  
  // Validate against proper domains
  const validDomains = [properBaseUrl];
  if (process.env.NEXTAUTH_URL) {
    validDomains.push(process.env.NEXTAUTH_URL);
  }
  
  for (const domain of validDomains) {
    if (url.startsWith(domain)) {
      return url;
    }
  }
  
  return properBaseUrl;
}
```

### 2. Enhanced SignOut Calls with Client-Side Protection

Updated signOut calls in components to include both server-side and client-side protection:

```javascript
const handleSignOut = () => {
  const redirectUrl = getSignOutUrl();
  
  // Client-side safety check: if we're about to redirect to localhost in production, override it
  let safeRedirectUrl = redirectUrl;
  if (typeof window !== 'undefined' && redirectUrl.includes('localhost') && window.location.hostname !== 'localhost') {
    safeRedirectUrl = `${window.location.origin}/auth/signin`;
    console.log('Client-side override: redirecting to current domain instead of localhost:', safeRedirectUrl);
  }
  
  signOut({ 
    callbackUrl: safeRedirectUrl,
    redirect: true 
  });
};
```

### 3. Enhanced Base URL Utility with Production Override

Enhanced `lib/baseUrl.js` with server-side production override capabilities:

```javascript
export function getSignOutUrl() {
  const baseUrl = getBaseUrl();
  
  // Additional check: if we're in production and still getting localhost, 
  // try to use environment variables directly
  let finalBaseUrl = baseUrl;
  
  if (typeof window === 'undefined' && baseUrl.includes('localhost')) {
    // Server-side and we got localhost - check environment variables again
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')) {
      finalBaseUrl = process.env.NEXTAUTH_URL;
      console.log('Overriding localhost with NEXTAUTH_URL for signout:', finalBaseUrl);
    } else if (process.env.VERCEL_URL) {
      finalBaseUrl = `https://${process.env.VERCEL_URL}`;
      console.log('Overriding localhost with VERCEL_URL for signout:', finalBaseUrl);
    }
  }
  
  const signOutUrl = `${finalBaseUrl}/auth/signin`;
  console.log('Sign out redirect URL:', signOutUrl);
  return signOutUrl;
}
```

### 4. Multi-Layer Protection Strategy

The solution implements a **multi-layer protection strategy**:

1. **Environment Variable Priority**: NEXTAUTH_URL → VERCEL_URL → Fallback
2. **NextAuth Redirect Callback**: Server-side URL validation and override
3. **Client-Side Protection**: Browser-based localhost detection and override
4. **Production Environment Detection**: Warnings and automatic overrides
5. **Extensive Logging**: Debug information for troubleshooting

## Verification Steps

1. **Check Environment Variables**: Ensure `NEXTAUTH_URL` is set to your production domain
2. **Test SignOut**: Verify that signing out redirects to your domain's signin page, not localhost
3. **Check Logs**: Monitor console logs for redirect URL information
4. **Browser DevTools**: Check network requests to ensure redirects go to the correct domain

## Troubleshooting

### If still redirecting to localhost:

1. **Verify Environment Variables**: Double-check that `NEXTAUTH_URL` is correctly set in your hosting platform
2. **Clear Browser Cache**: Clear cookies and local storage
3. **Check Console Logs**: Look for log messages showing the redirect URLs being used
4. **Restart Application**: Redeploy or restart your application after setting environment variables

### Common Issues:

- **Missing NEXTAUTH_URL**: The most common cause - ensure this is set in production
- **Incorrect URL Format**: Make sure NEXTAUTH_URL includes the protocol (https://)
- **Cached Environment**: Some hosting platforms require redeployment after environment variable changes

## Logging

The fix includes extensive logging to help debug redirect issues:

- Environment detection logs in `lib/baseUrl.js`
- Redirect callback logs in NextAuth configuration
- SignOut action logs in components

Monitor these logs to ensure the correct URLs are being used in your production environment.
