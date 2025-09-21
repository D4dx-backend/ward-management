/**
 * Utility to get the proper base URL for the application
 * Prevents localhost redirects in production environments
 */

export function getBaseUrl() {
  // Log current environment details for debugging
  console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    window: typeof window !== 'undefined'
  });

  // Client-side: use window.location.origin
  if (typeof window !== 'undefined') {
    const baseUrl = window.location.origin;
    console.log('Client-side base URL:', baseUrl);
    return baseUrl;
  }

  // Server-side: check environment variables in order of preference
  if (process.env.NEXTAUTH_URL) {
    console.log('Using NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
    return process.env.NEXTAUTH_URL;
  }

  if (process.env.VERCEL_URL) {
    const url = `https://${process.env.VERCEL_URL}`;
    console.log('Using VERCEL_URL:', url);
    return url;
  }

  // Fallback to localhost for development
  const fallback = 'http://localhost:3000';
  console.log('Fallback to localhost for development:', fallback);
  return fallback;
}

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
    } else {
      // Hardcoded fallback for known production domain
      finalBaseUrl = 'https://model.myward.in';
      console.log('Server-side localhost detected, using hardcoded production URL for signout:', finalBaseUrl);
      console.error('URGENT: Please set NEXTAUTH_URL=https://model.myward.in in your production environment variables!');
    }
  }
  
  const signOutUrl = `${finalBaseUrl}/auth/signin`;
  console.log('Sign out redirect URL:', signOutUrl);
  
  // Log environment info for debugging
  console.log('SignOut URL generation details:', {
    originalBaseUrl: baseUrl,
    finalBaseUrl: finalBaseUrl,
    signOutUrl: signOutUrl,
    isClient: typeof window !== 'undefined',
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    vercelUrl: process.env.VERCEL_URL
  });
  
  return signOutUrl;
}
