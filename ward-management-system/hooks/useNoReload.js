import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { getCache, setCache } from '../lib/simpleCache';

/**
 * Hook that prevents unnecessary reloading and maintains state across tab switches
 * Specifically designed to solve the reload issue in the Ward Management System
 */
export function useNoReload(key, fetcher, options = {}) {
  const {
    ttl = 10 * 60 * 1000, // 10 minutes default - longer cache
    staleTime = 5 * 60 * 1000, // 5 minutes stale time
    dependencies = [],
    enabled = true
  } = options;

  const router = useRouter();
  const [data, setData] = useState(() => getCache(key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(Date.now());
  const mountTime = useRef(Date.now());

  // Check if data is stale
  const isDataStale = useCallback(() => {
    if (!data) return true;
    const now = Date.now();
    return (now - lastFetchTime.current) > staleTime;
  }, [data, staleTime]);

  // Fetch data with smart loading management
  const fetchData = useCallback(async (force = false, silent = false) => {
    if (!enabled || !fetcher || fetchInProgress.current) return;

    // If we have fresh data and not forcing, return it
    const cachedData = getCache(key);
    if (!force && cachedData && !isDataStale()) {
      if (!data) {
        setData(cachedData);
        setLoading(false);
      }
      return cachedData;
    }

    fetchInProgress.current = true;

    try {
      // Only show loading if we don't have any data or it's been more than 30 seconds since mount
      const timeSinceMount = Date.now() - mountTime.current;
      const shouldShowLoading = !data || (timeSinceMount > 30000 && !silent);
      
      if (shouldShowLoading && !silent) {
        setLoading(true);
      }
      
      setError(null);

      const result = await fetcher();
      
      // Cache the result with longer TTL
      setCache(key, result, ttl);
      setData(result);
      setIsStale(false);
      lastFetchTime.current = Date.now();

      return result;
    } catch (err) {
      console.error(`Fetch error for ${key}:`, err);
      setError(err);
      
      // If we have cached data, mark as stale but keep showing it
      if (data) {
        setIsStale(true);
      }
    } finally {
      fetchInProgress.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  }, [key, fetcher, enabled, data, isDataStale, ttl]);

  // Initial fetch - only if no cached data
  useEffect(() => {
    const cachedData = getCache(key);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      
      // Check if cached data is stale and fetch in background
      if (isDataStale()) {
        fetchData(false, true); // Silent background fetch
      }
    } else {
      fetchData();
    }
  }, [key, ...dependencies]);

  // Handle page visibility for smart refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isDataStale()) {
        // Only refresh if data is actually stale and page became visible
        setTimeout(() => {
          fetchData(false, true); // Silent refresh after short delay
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData, isDataStale]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    refresh
  };
}

/**
 * Specialized hook for dashboard data that never shows loading on tab switch
 */
export function useNoReloadDashboard(userRole) {
  const cacheKey = `dashboard-${userRole}-no-reload`;
  
  return useNoReload(
    cacheKey,
    async () => {
      const refreshParam = Math.random() > 0.8 ? '?refresh=true' : ''; // 20% chance of fresh data
      
      const endpoints = {
        stateAdmin: [`/api/dashboard/stats${refreshParam}`],
        coordinator: [`/api/dashboard/stats${refreshParam}`],
        wardAdmin: [`/api/dashboard/stats${refreshParam}`]
      };

      const requests = endpoints[userRole] || [];
      if (requests.length === 0) return {};

      const responses = await Promise.allSettled(
        requests.map(url => fetch(url).then(res => res.json()))
      );

      const [statsRes] = responses;
      const statsData = statsRes.status === 'fulfilled' ? statsRes.value : {};

      return {
        stats: statsData.stats || statsData,
        recentReports: statsData.recentReports || [],
        recentActivity: statsData.recentLogs || [],
        recentLogins: statsData.recentLogins || []
      };
    },
    {
      ttl: 15 * 60 * 1000, // 15 minutes cache
      staleTime: 5 * 60 * 1000, // 5 minutes stale time
      dependencies: [userRole]
    }
  );
}