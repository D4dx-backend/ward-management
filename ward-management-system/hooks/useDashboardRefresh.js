import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

export const useDashboardRefresh = (refetchFunction, userRole, autoRefresh = true) => {
  const router = useRouter();

  const forceRefresh = useCallback(() => {
    console.log('Force refreshing dashboard data...');
    
    // Clear all relevant cache
    try {
      const { clearCache, invalidateCache } = require('../lib/simpleCache');
      
      // Clear all cache for immediate refresh
      clearCache();
      
      // Clear specific patterns
      invalidateCache('dashboard');
      invalidateCache('user-');
      invalidateCache('responses');
      invalidateCache('forms');
      
      console.log('Cache cleared, triggering refetch...');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
    
    // Force refetch
    if (refetchFunction) {
      refetchFunction();
    }
  }, [refetchFunction]);

  useEffect(() => {
    if (userRole !== 'wardAdmin' || !autoRefresh) return;

    // Check for form submission completion indicators
    const checkFormSubmission = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const formSubmitted = urlParams.get('submitted') === 'true';
      const localStorageFlag = localStorage.getItem('formSubmitted') === 'true';
      const lastSubmissionTime = localStorage.getItem('lastSubmissionTime');
      
      // Check if form was submitted recently (within last 5 minutes)
      const recentSubmission = lastSubmissionTime && 
        (Date.now() - parseInt(lastSubmissionTime)) < 5 * 60 * 1000;

      if (formSubmitted || localStorageFlag || recentSubmission) {
        console.log('Form submission detected, refreshing dashboard...', {
          urlFlag: formSubmitted,
          localFlag: localStorageFlag,
          recentSubmission
        });

        // Clear flags
        localStorage.removeItem('formSubmitted');
        if (urlParams.get('submitted')) {
          urlParams.delete('submitted');
          const newUrl = window.location.pathname + 
            (urlParams.toString() ? '?' + urlParams.toString() : '');
          window.history.replaceState({}, '', newUrl);
        }

        // Force refresh
        setTimeout(() => forceRefresh(), 100);
      }
    };

    // Check on mount
    checkFormSubmission();

    // Listen for storage changes (in case of multiple tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'formSubmitted' && e.newValue === 'true') {
        console.log('Form submission detected via storage event');
        setTimeout(() => forceRefresh(), 100);
      }
    };

    // Listen for page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, checking for updates...');
        checkFormSubmission();
        // Always refresh when page becomes visible for ward admin
        setTimeout(() => forceRefresh(), 200);
      }
    };

    // Listen for window focus
    const handleFocus = () => {
      console.log('Window focused, refreshing dashboard...');
      forceRefresh();
    };

    // Listen for router events (navigation)
    const handleRouteChange = (url) => {
      if (url === '/' || url.startsWith('/?')) {
        console.log('Navigated to dashboard, checking for refresh...');
        setTimeout(() => checkFormSubmission(), 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [userRole, forceRefresh, router, autoRefresh]);

  // Periodic refresh for ward admin (every 2 minutes)
  useEffect(() => {
    if (userRole !== 'wardAdmin' || !autoRefresh) return;

    const interval = setInterval(() => {
      console.log('Periodic dashboard refresh for ward admin...');
      forceRefresh();
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [userRole, forceRefresh, autoRefresh]);

  return { forceRefresh };
};