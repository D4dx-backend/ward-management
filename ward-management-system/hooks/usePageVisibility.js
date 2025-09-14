import { useState, useEffect, useRef } from 'react';

/**
 * Enhanced page visibility hook that prevents unnecessary loading states
 * when switching between tabs or windows
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(true);
  const [wasHidden, setWasHidden] = useState(false);
  const hiddenTime = useRef(null);
  const visibleTime = useRef(Date.now());

  useEffect(() => {
    // Initialize visibility state
    setIsVisible(!document.hidden);

    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        // Page became hidden
        setIsVisible(false);
        setWasHidden(true);
        hiddenTime.current = now;
      } else {
        // Page became visible
        setIsVisible(true);
        visibleTime.current = now;
        
        // Reset wasHidden after a short delay to prevent immediate refetches
        setTimeout(() => setWasHidden(false), 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Calculate how long the page was hidden
  const getHiddenDuration = () => {
    if (!hiddenTime.current || !visibleTime.current) return 0;
    return visibleTime.current - hiddenTime.current;
  };

  // Determine if data should be refreshed based on hidden duration
  const shouldRefreshData = (threshold = 5 * 60 * 1000) => { // 5 minutes default
    return getHiddenDuration() > threshold;
  };

  return {
    isVisible,
    wasHidden,
    getHiddenDuration,
    shouldRefreshData
  };
}

/**
 * Hook that prevents loading states when quickly switching tabs
 */
export function useStableLoading(initialLoading = false) {
  const [loading, setLoading] = useState(initialLoading);
  const [stableLoading, setStableLoading] = useState(initialLoading);
  const { isVisible, wasHidden } = usePageVisibility();
  const loadingTimeout = useRef(null);

  useEffect(() => {
    if (loading) {
      // If page was recently hidden and became visible, delay showing loading
      if (wasHidden && isVisible) {
        // Don't show loading immediately after tab switch
        loadingTimeout.current = setTimeout(() => {
          setStableLoading(true);
        }, 200);
      } else {
        setStableLoading(true);
      }
    } else {
      // Clear timeout and hide loading
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
        loadingTimeout.current = null;
      }
      setStableLoading(false);
    }

    return () => {
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
    };
  }, [loading, wasHidden, isVisible]);

  return {
    loading: stableLoading,
    setLoading,
    isVisible,
    wasHidden
  };
}