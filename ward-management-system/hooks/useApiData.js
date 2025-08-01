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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = `dashboard-${userRole}`;
      const cachedData = getCache(cacheKey);
      
      if (cachedData) {
        setStats(cachedData.stats || {});
        setRecentReports(cachedData.recentReports || []);
        setRecentActivity(cachedData.recentActivity || []);
        setLoading(false);
        return;
      }

      // Fetch dashboard data based on role
      const endpoints = {
        stateAdmin: [
          '/api/wards',
          '/api/clusters', 
          '/api/users',
          '/api/forms'
        ],
        coordinator: [
          '/api/dashboard/stats',
          '/api/responses?limit=5'
        ],
        wardAdmin: [
          '/api/dashboard/stats',
          '/api/responses?limit=5',
          '/api/instructions?limit=5'
        ]
      };

      const requests = endpoints[userRole] || [];
      const responses = await Promise.allSettled(
        requests.map(url => axios.get(url))
      );

      // Process responses based on role
      let dashboardData = {};
      
      if (userRole === 'stateAdmin') {
        const [wardsRes, clustersRes, usersRes, formsRes] = responses;
        dashboardData = {
          stats: {
            totalWards: wardsRes.status === 'fulfilled' ? wardsRes.value.data.length : 0,
            totalClusters: clustersRes.status === 'fulfilled' ? clustersRes.value.data.length : 0,
            totalUsers: usersRes.status === 'fulfilled' ? usersRes.value.data.length : 0,
            totalForms: formsRes.status === 'fulfilled' ? formsRes.value.data.length : 0
          },
          recentReports: [],
          recentActivity: []
        };
      } else {
        const [statsRes, reportsRes] = responses;
        const statsData = statsRes.status === 'fulfilled' ? statsRes.value.data : {};
        const reportsData = reportsRes.status === 'fulfilled' ? reportsRes.value.data : [];
        
        dashboardData = {
          stats: statsData.stats || statsData,
          recentReports: statsData.recentReports || reportsData,
          recentActivity: statsData.recentActivity || []
        };
      }

      // Cache the result
      setCache(cacheKey, dashboardData, 2 * 60 * 1000); // 2 minutes cache

      setStats(dashboardData.stats);
      setRecentReports(dashboardData.recentReports);
      setRecentActivity(dashboardData.recentActivity);

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
    loading,
    error,
    refetch: fetchDashboardData
  };
};