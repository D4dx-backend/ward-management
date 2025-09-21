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
  const signOutUrl = `${baseUrl}/auth/signin`;
  console.log('Sign out redirect URL:', signOutUrl);
  return signOutUrl;
}
