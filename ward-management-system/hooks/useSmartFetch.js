import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { getCache, setCache, clearCache } from '../lib/simpleCache';
import { usePageVisibility, useStableLoading } from './usePageVisibility';

/**
 * Smart data fetching hook that prevents unnecessary loading states
 * and API calls when navigating between pages or switching tabs
 */
export function useSmartFetch(key, fetcher, options = {}) {
  const {
    ttl = 30 * 60 * 1000, // 30 minutes default
    staleWhileRevalidate = true,
    refreshOnFocus = false,
    refreshThreshold = 5 * 60 * 1000, // 5 minutes
    dependencies = [],
    enabled = true,
    onSuccess,
    onError
  } = options;

  const router = useRouter();
  const { isVisible, shouldRefreshData } = usePageVisibility();
  const [data, setData] = useState(() => getCache(key));
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(!data && enabled);
  const { loading, setLoading } = useStableLoading(isLoading);
  
  const abortController = useRef(null);
  const lastFetchTime = useRef(Date.now());
  const isInitialMount = useRef(true);

  // Fetch data function with smart caching
  const fetchData = useCallback(async (force = false, silent = false) => {
    if (!enabled || !fetcher) return;

    // Check if we have fresh cached data and not forcing
    const cachedData = getCache(key);
    if (!force && cachedData && data) {
      return cachedData;
    }

    // Cancel any ongoing request
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      if (!silent) {
        setIsLoading(true);
        setLoading(true);
      }
      setError(null);

      const result = await fetcher({ signal: abortController.current.signal });
      
      // Cache the result
      setCache(key, result, ttl);
      setData(result);
      lastFetchTime.current = Date.now();

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled
      }

      console.error(`Fetch error for ${key}:`, err);
      setError(err);
      
      if (onError) {
        onError(err);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
        setLoading(false);
      }
    }
  }, [key, fetcher, enabled, ttl, data, onSuccess, onError, setLoading]);

  // Initial data fetch
  useEffect(() => {
    if (!enabled) return;

    const cachedData = getCache(key);
    if (cachedData) {
      setData(cachedData);
      setIsLoading(false);
      setLoading(false);
      
      // If stale while revalidate is enabled and it's not initial mount
      if (staleWhileRevalidate && !isInitialMount.current) {
        fetchData(false, true); // Silent background refresh
      }
    } else {
      fetchData();
    }

    isInitialMount.current = false;
  }, [key, enabled, ...dependencies]);

  // Handle page visibility changes
  useEffect(() => {
    if (!refreshOnFocus || !isVisible || !enabled) return;

    // Only refresh if page was hidden for longer than threshold
    if (shouldRefreshData(refreshThreshold)) {
      fetchData(false, true); // Silent refresh
    }
  }, [isVisible, refreshOnFocus, refreshThreshold, shouldRefreshData, fetchData, enabled]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    isStale: data && !getCache(key)
  };
}

/**
 * Hook for dashboard data that prevents loading flicker on tab switches
 */
export function useSmartDashboard(userRole, options = {}) {
  const cacheKey = `dashboard-${userRole}`;
  
  return useSmartFetch(
    cacheKey,
    async ({ signal }) => {
      const response = await fetch(`/api/dashboard/stats?role=${userRole}`, { signal });
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
    {
      ttl: 2 * 60 * 1000, // 2 minutes for dashboard data
      staleWhileRevalidate: true,
      refreshOnFocus: true,
      refreshThreshold: 1 * 60 * 1000, // 1 minute threshold
      ...options
    }
  );
}

/**
 * Request deduplication utility
 */
const pendingRequests = new Map();

export function useDedupedFetch(key, fetcher, options = {}) {
  return useSmartFetch(
    key,
    async (fetchOptions) => {
      // Check if there's already a pending request for this key
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
      }

      // Create new request and store it
      const request = fetcher(fetchOptions);
      pendingRequests.set(key, request);

      try {
        const result = await request;
        pendingRequests.delete(key);
        return result;
      } catch (error) {
        pendingRequests.delete(key);
        throw error;
      }
    },
    options
  );
}