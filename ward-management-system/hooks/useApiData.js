import { useState, useEffect, useCallback } from 'react';
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
      if (transform && typeof transform === 'function') {
        result = transform(result);
      }

      // Cache the result
      if (cacheKey) {
        setCache(cacheKey, result, cacheTTL);
      }

      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      console.error(`API Error for ${url}:`, err);
      setError(err);
      
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, enabled, cacheKey, cacheTTL, transform, onSuccess, onError]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

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

// Hook for dashboard data with multiple endpoints
export const useDashboardData = (userRole) => {
  const [stats, setStats] = useState({});
  const [recentReports, setRecentReports] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = `dashboard-${userRole}`;
      
      // Skip cache if force refresh is requested
      if (!forceRefresh) {
        const cachedData = getCache(cacheKey);
        
        if (cachedData) {
          setStats(cachedData.stats || {});
          setRecentReports(cachedData.recentReports || []);
          setRecentActivity(cachedData.recentActivity || []);
          setRecentLogins(cachedData.recentLogins || []);
          setLoading(false);
          return;
        }
      }

      // Fetch dashboard data based on role (prefer optimized single endpoint)
      // For ward admins, add refresh parameter to bypass cache
      const refreshParam = userRole === 'wardAdmin' || forceRefresh ? '?refresh=true' : '';
      
      const endpoints = {
        stateAdmin: [
          `/api/dashboard/stats${refreshParam}`
        ],
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
        setLoading(false);
        return;
      }
      
      const responses = await Promise.allSettled(
        requests.map(url => {
          console.log(`Fetching dashboard data from: ${url}`);
          return axios.get(url);
        })
      );
      
      // Log any failed requests
      responses.forEach((response, index) => {
        if (response.status === 'rejected') {
          console.error(`Failed to fetch from ${requests[index]}:`, response.reason);
        }
      });

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
        const reportsData = reportsRes.status === 'fulfilled' ? reportsRes.value.data : [];
        
        // For ward admin, prioritize the dashboard stats API recent reports
        // For coordinator, use the separate responses API as fallback
        let recentReportsData = [];
        if (userRole === 'wardAdmin') {
          // Ward admin: use dashboard stats API recent reports (properly formatted)
          recentReportsData = statsData.recentReports || [];
          console.log(`Ward admin recent reports from dashboard stats: ${recentReportsData.length}`);
        } else {
          // Coordinator: use separate responses API or dashboard stats as fallback
          recentReportsData = statsData.recentReports || reportsData;
        }
        
        dashboardData = {
          stats: statsData.stats || statsData,
          recentReports: recentReportsData,
          recentActivity: statsData.recentLogs || [],
          recentLogins: statsData.recentLogins || []
        };
      }

      // Cache the result for a shorter time to ensure fresh data
      // Use very short cache time for ward admin to ensure fresh data after form submissions
      const cacheTime = userRole === 'wardAdmin' ? 5 * 1000 : 30 * 1000; // 5 seconds for ward admin, 30 for others
      
      // For ward admin, don't cache if we just fetched fresh data
      if (userRole === 'wardAdmin' && forceRefresh) {
        console.log('Skipping cache for ward admin force refresh');
      } else {
        setCache(cacheKey, dashboardData, cacheTime);
      }

      setStats(dashboardData.stats);
      setRecentReports(dashboardData.recentReports);
      setRecentActivity(dashboardData.recentActivity);
      setRecentLogins(dashboardData.recentLogins);

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

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
    refetch: () => fetchDashboardData(true) // Always force refresh when manually called
  };
};