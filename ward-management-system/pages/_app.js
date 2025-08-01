import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import ErrorBoundary from '../components/ErrorBoundary';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle route changes for better UX
  useEffect(() => {
    const handleRouteChangeStart = (url) => {
      if (url !== router.asPath) {
        setIsNavigating(true);
      }
    };

    const handleRouteChangeComplete = () => {
      setIsNavigating(false);
    };

    const handleRouteChangeError = () => {
      setIsNavigating(false);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router]);

  // Handle page visibility changes for better caching
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible again - store timestamp for cache management
        sessionStorage.setItem('lastVisible', Date.now().toString());
      } else {
        // Page became hidden - store timestamp
        sessionStorage.setItem('lastHidden', Date.now().toString());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SessionProvider session={session}>
        {isNavigating && (
          <div className="fixed top-0 left-0 w-full h-1 bg-green-600 z-50 animate-pulse" />
        )}
        <Component {...pageProps} />
      </SessionProvider>
    </ErrorBoundary>
  );
}

export default MyApp;