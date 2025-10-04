import { useState, useEffect, useCallback, useRef } from 'react';
import { getInstantCache, setInstantCache, INSTANT_CACHE_KEYS } from '../lib/instantCache';

/**
 * AGGRESSIVE NO-RELOAD HOOK
 * This hook NEVER shows loading states on page revisits
 * Data is cached aggressively and shown instantly
 */
export function useInstantLoad(key, fetcher, options = {}) {
  const {
    ttl = 60 * 60 * 1000, // 1 hour cache - very long
    enabled = true
  } = options;

  // Always start with cached data if available
  const [data, setData] = useState(() => {
    const cached = getInstantCache(key);
    return cached || null;
  });
  
  // NEVER show loading if we have any cached data
  const [loading, setLoading] = useState(() => {
    const cached = getInstantCache(key);
    return !cached && enabled; // Only loading if no cache AND enabled
  });
  
  const [error, setError] = useState(null);
  const fetchInProgress = useRef(false);
  const hasFetchedOnce = useRef(false);

  // Fetch function that works in background
  const fetchData = useCallback(async (silent = true) => {
    if (!enabled || !fetcher || fetchInProgress.current) return;

    fetchInProgress.current = true;

    try {
      // Only show loading on very first fetch when no data exists
      if (!hasFetchedOnce.current && !silent) {
        setLoading(true);
      }

      const result = await fetcher();
      
      // Cache with very long TTL using instant cache
      setInstantCache(key, result, ttl);
      setData(result);
      setError(null);
      hasFetchedOnce.current = true;

      return result;
    } catch (err) {
      console.error(`Fetch error for ${key}:`, err);
      setError(err);
    } finally {
      fetchInProgress.current = false;
      setLoading(false);
    }
  }, [key, fetcher, enabled, ttl]);

  // Initial effect - check cache first, fetch only if needed
  useEffect(() => {
    // Only run once on mount or when key changes
    if (hasFetchedOnce.current) return;
    
    const cachedData = getInstantCache(key);
    
    if (cachedData) {
      // We have cached data - show it immediately, no loading
      setData(cachedData);
      setLoading(false);
      hasFetchedOnce.current = true;
      
      // Skip background refresh to prevent repeated calls
      // Optionally fetch fresh data in background (silent)
      // setTimeout(() => {
      //   fetchData(true);
      // }, 100);
    } else if (enabled) {
      // No cached data - fetch it (this is the only time we might show loading)
      fetchData(false);
    }
  }, [key, enabled]);

  const refresh = useCallback(() => {
    return fetchData(true); // Always silent refresh
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh
  };
}

/**
 * INSTANT DASHBOARD HOOK
 * Specialized for dashboard data with zero loading on revisits
 */
export function useInstantDashboard(userRole) {
  const cacheKey = INSTANT_CACHE_KEYS.DASHBOARD(userRole);
  
  return useInstantLoad(
    cacheKey,
    async () => {
      // Fetch dashboard data - API doesn't need role parameter, it uses session
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch dashboard data: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      return {
        stats: data.stats || {},
        recentReports: data.recentReports || [],
        recentActivity: data.recentLogs || [],
        recentLogins: data.recentLogins || []
      };
    },
    {
      ttl: 30 * 60 * 1000, // 30 minutes cache (shorter for more frequent updates)
      enabled: !!userRole
    }
  );
}