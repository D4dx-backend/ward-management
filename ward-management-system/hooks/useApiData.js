import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { getCache, setCache, clearCache, invalidateCache } from '../lib/simpleCache';

export const useApiData = (url, options = {}) => {
  const {
    cacheKey = url,
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    enabled = true,
    dependencies = [],
    onSuccess,
    onError,
    transform
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Store callbacks in refs to avoid recreating fetchData
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const transformRef = useRef(transform);
  
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    transformRef.current = transform;
  });

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled || !url) {
      setLoading(false);
      return;
    }

    try {
      // Check cache first unless force refresh
      if (!forceRefresh && cacheKey) {
        const cachedData = getCache(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return cachedData;
        }
      }

      setLoading(true);
      setError(null);

      const response = await axios.get(url);
      let result = response.data;

      // Apply transform if provided
      if (transformRef.current && typeof transformRef.current === 'function') {
        result = transformRef.current(result);
      }

      // Cache the result
      if (cacheKey) {
        setCache(cacheKey, result, cacheTTL);
      }

      setData(result);
      
      if (onSuccessRef.current) {
        onSuccessRef.current(result);
      }

      return result;
    } catch (err) {
      console.error(`API Error for ${url}:`, err);
      setError(err);
      
      if (onErrorRef.current) {
        onErrorRef.current(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, enabled, cacheKey, cacheTTL]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);
  
  // Track if initial fetch has been done
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Only fetch once on mount or when key dependencies change
    if (!hasFetchedRef.current || dependencies.length > 0) {
      hasFetchedRef.current = true;
      fetchData();
    }
  }, [url, enabled, cacheKey, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch
  };
};

export const useApiMutation = (url, options = {}) => {
  const {
    method = 'POST',
    onSuccess,
    onError,
    invalidateCache = []
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios({
        method,
        url,
        data
      });

      // Invalidate related cache entries
      if (invalidateCache.length > 0) {
        invalidateCache.forEach(key => {
          if (typeof key === 'string') {
            clearCache(key);
          } else if (key instanceof RegExp) {
            invalidateCache(key);
          }
        });
      }

      if (onSuccess) {
        onSuccess(response.data);
      }

      return response.data;
    } catch (err) {
      console.error(`Mutation Error for ${url}:`, err);
      setError(err);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, method, onSuccess, onError, invalidateCache]);

  return {
    mutate,
    loading,
    error
  };
};

// Enhanced hook for dashboard data with smart caching and loading management
export const useDashboardData = (userRole) => {
  const [stats, setStats] = useState({});
  const [recentReports, setRecentReports] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);

  const fetchDashboardData = useCallback(async (forceRefresh = false, silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const cacheKey = `dashboard-${userRole}`;
      
      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cachedData = getCache(cacheKey);
        
        if (cachedData) {
          setStats(cachedData.stats || {});
          setRecentReports(cachedData.recentReports || []);
          setRecentActivity(cachedData.recentActivity || []);
          setRecentLogins(cachedData.recentLogins || []);
          setIsStale(false);
          
          if (!silent) {
            setLoading(false);
          }
          return cachedData;
        }
      }

      // Determine cache time based on role and refresh type
      const cacheTime = userRole === 'wardAdmin' ? 
        (forceRefresh ? 10 * 1000 : 30 * 1000) : // Ward admin: 10s for force refresh, 30s normal
        (forceRefresh ? 30 * 1000 : 2 * 60 * 1000); // Others: 30s for force refresh, 2min normal

      // Build endpoint URLs
      const refreshParam = forceRefresh ? '?refresh=true' : '';
      const endpoints = {
        stateAdmin: [`/api/dashboard/stats${refreshParam}`],
        coordinator: [
          `/api/dashboard/stats${refreshParam}`,
          '/api/responses?limit=5'
        ],
        wardAdmin: [
          `/api/dashboard/stats${refreshParam}`,
          '/api/responses?limit=5',
          '/api/instructions?limit=5'
        ]
      };

      const requests = endpoints[userRole] || [];
      
      if (requests.length === 0) {
        console.warn(`No endpoints defined for user role: ${userRole}`);
        if (!silent) setLoading(false);
        return;
      }
      
      // Fetch data with error handling
      const responses = await Promise.allSettled(
        requests.map(url => axios.get(url))
      );
      
      // Process responses based on role
      let dashboardData = {};
      
      if (userRole === 'stateAdmin') {
        const [statsRes] = responses;
        const statsData = statsRes.status === 'fulfilled' ? statsRes.value.data : {};
        dashboardData = {
          stats: statsData.stats || statsData,
          recentReports: statsData.recentReports || [],
          recentActivity: statsData.recentLogs || [],
          recentLogins: statsData.recentLogins || []
        };
      } else {
        const [statsRes, reportsRes] = responses;
        const statsData = statsRes.status === 'fulfilled' ? statsRes.value.data : {};
        const reportsData = reportsRes?.status === 'fulfilled' ? reportsRes.value.data : [];
        
        let recentReportsData = [];
        if (userRole === 'wardAdmin') {
          recentReportsData = statsData.recentReports || [];
        } else {
          recentReportsData = statsData.recentReports || reportsData;
        }
        
        dashboardData = {
          stats: statsData.stats || statsData,
          recentReports: recentReportsData,
          recentActivity: statsData.recentLogs || [],
          recentLogins: statsData.recentLogins || []
        };
      }

      // Cache the result
      setCache(cacheKey, dashboardData, cacheTime);

      // Update state
      setStats(dashboardData.stats);
      setRecentReports(dashboardData.recentReports);
      setRecentActivity(dashboardData.recentActivity);
      setRecentLogins(dashboardData.recentLogins);
      setIsStale(false);

      return dashboardData;

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err);
      
      // If we have cached data, mark it as stale but keep showing it
      const cachedData = getCache(`dashboard-${userRole}`);
      if (cachedData) {
        setIsStale(true);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [userRole]);

  // Handle page visibility changes for smart refresh
  useEffect(() => {
    const handlePageVisible = (event) => {
      const { timestamp } = event.detail;
      const lastHidden = sessionStorage.getItem('lastHidden');
      
      if (lastHidden) {
        const hiddenDuration = timestamp - parseInt(lastHidden);
        // Refresh if page was hidden for more than 2 minutes
        if (hiddenDuration > 2 * 60 * 1000) {
          fetchDashboardData(false, true); // Silent refresh
        }
      }
    };

    window.addEventListener('pageVisible', handlePageVisible);
    return () => window.removeEventListener('pageVisible', handlePageVisible);
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    recentReports,
    recentActivity,
    recentLogins,
    loading,
    error,
    isStale,
    refetch: () => fetchDashboardData(true), // Force refresh
    silentRefresh: () => fetchDashboardData(false, true) // Silent refresh
  };
};