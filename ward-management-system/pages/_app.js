import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import ErrorBoundary from '../components/ErrorBoundary';
import SafeErrorBoundary from '../components/SafeErrorBoundary';
import { LoadingProvider } from '../contexts/LoadingContext';
import { initInstantCache } from '../lib/instantCache';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const navigationTimeout = useRef(null);

  useEffect(() => {
    setMounted(true);
    // Initialize instant cache system for zero-reload experience
    initInstantCache();
  }, []);

  // Enhanced route change handling with debouncing
  useEffect(() => {
    const handleRouteChangeStart = (url) => {
      if (url !== router.asPath) {
        // Debounce navigation indicator to prevent flicker on quick navigation
        if (navigationTimeout.current) {
          clearTimeout(navigationTimeout.current);
        }
        
        navigationTimeout.current = setTimeout(() => {
          setIsNavigating(true);
        }, 100); // 100ms delay to prevent flicker
      }
    };

    const handleRouteChangeComplete = () => {
      if (navigationTimeout.current) {
        clearTimeout(navigationTimeout.current);
        navigationTimeout.current = null;
      }
      setIsNavigating(false);
    };

    const handleRouteChangeError = () => {
      if (navigationTimeout.current) {
        clearTimeout(navigationTimeout.current);
        navigationTimeout.current = null;
      }
      setIsNavigating(false);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
      
      if (navigationTimeout.current) {
        clearTimeout(navigationTimeout.current);
      }
    };
  }, [router]);

  // Enhanced page visibility management
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let visibilityTimer = null;
    
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.visibilityState === 'visible') {
        // Page became visible - store timestamp and clear any pending timers
        sessionStorage.setItem('lastVisible', now.toString());
        
        if (visibilityTimer) {
          clearTimeout(visibilityTimer);
          visibilityTimer = null;
        }
        
        // Dispatch custom event for components to handle visibility changes
        window.dispatchEvent(new CustomEvent('pageVisible', { 
          detail: { timestamp: now } 
        }));
      } else {
        // Page became hidden - store timestamp with delay to avoid rapid switches
        visibilityTimer = setTimeout(() => {
          sessionStorage.setItem('lastHidden', now.toString());
          
          window.dispatchEvent(new CustomEvent('pageHidden', { 
            detail: { timestamp: now } 
          }));
        }, 500); // 500ms delay to avoid rapid tab switching issues
      }
    };

    // Handle browser focus/blur for additional stability
    const handleFocus = () => {
      sessionStorage.setItem('lastFocus', Date.now().toString());
    };

    const handleBlur = () => {
      sessionStorage.setItem('lastBlur', Date.now().toString());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      if (visibilityTimer) {
        clearTimeout(visibilityTimer);
      }
    };
  }, []);

  // Prevent flash of loading on mount
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SafeErrorBoundary>
        <SessionProvider session={session}>
          <LoadingProvider>
            {/* Enhanced navigation indicator with smoother animation */}
            {isNavigating && (
              <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-green-600 to-blue-600 z-50">
                <div className="h-full bg-white opacity-30 animate-pulse"></div>
              </div>
            )}
            <Component {...pageProps} />
          </LoadingProvider>
        </SessionProvider>
      </SafeErrorBoundary>
    </ErrorBoundary>
  );
}

export default MyApp;