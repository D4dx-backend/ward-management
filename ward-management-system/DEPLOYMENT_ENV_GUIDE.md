# Deployment Environment Configuration Guide

## SignOut Localhost Redirect Fix

This document outlines the necessary environment variables and configurations to prevent signout redirects to localhost in production.

## Required Environment Variables

### For Production Deployment (Vercel/Other Hosting)

Make sure to set the following environment variables in your hosting platform:

```bash
# Required: Your production domain URL
NEXTAUTH_URL=https://your-production-domain.com

# Required: NextAuth secret (generate a secure random string)
NEXTAUTH_SECRET=your-secure-random-secret-key

# Required: MongoDB connection string
MONGODB_URI=your-mongodb-connection-string
```

### For Local Development

Create a `.env.local` file in the project root:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-development-secret
MONGODB_URI=your-mongodb-connection-string
```

## Key Changes Made

### 1. Added NextAuth Redirect Callback

In `pages/api/auth/[...nextauth].js`, added a redirect callback to ensure proper URL handling:

```javascript
async redirect({ url, baseUrl }) {
  // Ensure redirect uses the correct base URL and prevents localhost redirects in production
  console.log('NextAuth redirect callback - url:', url, 'baseUrl:', baseUrl);
  
  // If url is a relative path, prepend baseUrl
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  
  // If url is already absolute and matches our domain, allow it
  if (url.startsWith(baseUrl)) {
    return url;
  }
  
  // For any other case, redirect to baseUrl (home page)
  return baseUrl;
}
```

### 2. Enhanced SignOut Calls

Updated signOut calls in components to include explicit redirect URLs:

```javascript
signOut({ 
  callbackUrl: getSignOutUrl(),
  redirect: true 
});
```

### 3. Created Base URL Utility

Added `lib/baseUrl.js` to dynamically determine the correct base URL:

```javascript
export function getBaseUrl() {
  // Client-side: use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side: check environment variables
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback to localhost for development
  return 'http://localhost:3000';
}
```

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
