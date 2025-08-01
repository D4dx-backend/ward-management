import axios from 'axios';
import cacheManager from './cache';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for caching and loading states
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching for mutations
    if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
      config.params = { ...config.params, _t: Date.now() };
    }

    // Check cache for GET requests
    if (config.method === 'get' && !config.skipCache) {
      const cacheKey = `${config.url}_${JSON.stringify(config.params)}`;
      const cachedData = cacheManager.get(cacheKey);
      
      if (cachedData) {
        // Return cached response
        return Promise.resolve({
          ...config,
          adapter: () => Promise.resolve({
            data: cachedData,
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          })
        });
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for caching and error handling
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get' && !response.config.skipCache) {
      const cacheKey = `${response.config.url}_${JSON.stringify(response.config.params)}`;
      const ttl = response.config.cacheTTL || 5 * 60 * 1000; // 5 minutes default
      
      cacheManager.set(cacheKey, response.data, ttl);
    }

    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Redirect to login or refresh token
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
    }

    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error);
    }

    return Promise.reject(error);
  }
);

// API methods with caching support
export const apiMethods = {
  // GET with caching
  get: async (url, options = {}) => {
    const { cache = true, cacheTTL, ...config } = options;
    
    try {
      const response = await api.get(url, {
        ...config,
        skipCache: !cache,
        cacheTTL,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // POST
  post: async (url, data, options = {}) => {
    try {
      const response = await api.post(url, data, options);
      
      // Invalidate related cache entries
      invalidateCache(url);
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // PUT
  put: async (url, data, options = {}) => {
    try {
      const response = await api.put(url, data, options);
      
      // Invalidate related cache entries
      invalidateCache(url);
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // PATCH
  patch: async (url, data, options = {}) => {
    try {
      const response = await api.patch(url, data, options);
      
      // Invalidate related cache entries
      invalidateCache(url);
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // DELETE
  delete: async (url, options = {}) => {
    try {
      const response = await api.delete(url, options);
      
      // Invalidate related cache entries
      invalidateCache(url);
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },
};

// Cache invalidation helper
const invalidateCache = (url) => {
  // Get base resource from URL
  const baseResource = url.split('/')[1];
  
  // Clear all cache entries related to this resource
  const cacheKeys = Array.from(cacheManager.cache.keys());
  cacheKeys.forEach(key => {
    if (key.includes(baseResource)) {
      cacheManager.delete(key);
    }
  });
};

// Specific API endpoints
export const wardAPI = {
  getAll: (options) => apiMethods.get('/wards', options),
  getById: (id, options) => apiMethods.get(`/wards/${id}`, options),
  create: (data) => apiMethods.post('/wards', data),
  update: (id, data) => apiMethods.put(`/wards/${id}`, data),
  delete: (id) => apiMethods.delete(`/wards/${id}`),
};

export const clusterAPI = {
  getAll: (options) => apiMethods.get('/clusters', options),
  getById: (id, options) => apiMethods.get(`/clusters/${id}`, options),
  getByWard: (wardId, options) => apiMethods.get(`/clusters?wardId=${wardId}`, options),
  create: (data) => apiMethods.post('/clusters', data),
  update: (id, data) => apiMethods.put(`/clusters/${id}`, data),
  delete: (id) => apiMethods.delete(`/clusters/${id}`),
};

export const userAPI = {
  getAll: (options) => apiMethods.get('/users', options),
  getById: (id, options) => apiMethods.get(`/users/${id}`, options),
  create: (data) => apiMethods.post('/users', data),
  update: (id, data) => apiMethods.put(`/users/${id}`, data),
  delete: (id) => apiMethods.delete(`/users/${id}`),
  resetPassword: (id, data) => apiMethods.post(`/users/${id}/reset-password`, data),
};

export const formAPI = {
  getAll: (options) => apiMethods.get('/forms', options),
  getById: (id, options) => apiMethods.get(`/forms/${id}`, options),
  create: (data) => apiMethods.post('/forms', data),
  update: (id, data) => apiMethods.put(`/forms/${id}`, data),
  delete: (id) => apiMethods.delete(`/forms/${id}`),
  getResponses: (id, options) => apiMethods.get(`/forms/${id}/responses`, options),
  submitResponse: (id, data) => apiMethods.post(`/forms/${id}/responses`, data),
};

export const reportAPI = {
  getAll: (options) => apiMethods.get('/reports', options),
  getById: (id, options) => apiMethods.get(`/reports/${id}`, options),
  export: (format, filters) => apiMethods.post(`/reports/export/${format}`, filters),
  getStatistics: (options) => apiMethods.get('/reports/statistics', options),
};

// React hooks for API calls
import { useState, useEffect, useCallback } from 'react';

export const useAPI = (apiCall, dependencies = [], options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { 
    enabled = true, 
    onSuccess, 
    onError,
    refetchInterval,
  } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await apiCall();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      setError(err);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [apiCall, enabled, onSuccess, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  // Auto refetch interval
  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(fetchData, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchData, refetchInterval]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
};

// Mutation hook
export const useMutation = (mutationFn, options = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { onSuccess, onError } = options;

  const mutate = useCallback(async (variables) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await mutationFn(variables);
      onSuccess?.(result, variables);
      return result;
    } catch (err) {
      setError(err);
      onError?.(err, variables);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, onSuccess, onError]);

  return { mutate, loading, error };
};

export default api;