// Enhanced client-side cache implementation with React hooks support
import { useState, useEffect, useCallback } from 'react';

const cache = new Map();
const timestamps = new Map();
const listeners = new Map();

// Extended default TTL to 30 minutes to prevent frequent reloading
export const setCache = (key, data, ttl = 30 * 60 * 1000) => {
  if (typeof window === 'undefined') return;
  
  cache.set(key, data);
  timestamps.set(key, Date.now() + ttl);
  
  // Notify listeners
  const keyListeners = listeners.get(key);
  if (keyListeners) {
    keyListeners.forEach(callback => callback(data));
  }
};

export const getCache = (key) => {
  if (typeof window === 'undefined') return null;
  
  const timestamp = timestamps.get(key);
  if (!timestamp || Date.now() > timestamp) {
    cache.delete(key);
    timestamps.delete(key);
    return null;
  }
  
  return cache.get(key);
};

export const clearCache = (key) => {
  if (typeof window === 'undefined') return;
  
  if (key) {
    cache.delete(key);
    timestamps.delete(key);
  } else {
    cache.clear();
    timestamps.clear();
  }
};

export const invalidateCache = (pattern) => {
  if (typeof window === 'undefined') return;
  
  const keysToDelete = [];
  for (const key of cache.keys()) {
    if (pattern instanceof RegExp ? pattern.test(key) : key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    cache.delete(key);
    timestamps.delete(key);
  });
};

// Subscribe to cache changes
export const subscribeCacheChange = (key, callback) => {
  if (typeof window === 'undefined') return () => {};
  
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(callback);
  
  return () => {
    const keyListeners = listeners.get(key);
    if (keyListeners) {
      keyListeners.delete(callback);
      if (keyListeners.size === 0) {
        listeners.delete(key);
      }
    }
  };
};

// React hook for cached data with extended TTL
export const useCachedData = (key, fetcher, options = {}) => {
  const { ttl = 30 * 60 * 1000, enabled = true, staleWhileRevalidate = false } = options;
  const [data, setData] = useState(() => getCache(key));
  const [loading, setLoading] = useState(!data && enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    const cachedData = getCache(key);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    if (fetcher) {
      setLoading(true);
      setError(null);
      
      Promise.resolve(fetcher())
        .then(result => {
          setCache(key, result, ttl);
          setData(result);
          setError(null);
        })
        .catch(err => {
          setError(err);
          setData(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [key, enabled, ttl]);

  useEffect(() => {
    if (!enabled) return;
    
    return subscribeCacheChange(key, (newData) => {
      setData(newData);
    });
  }, [key, enabled]);

  const refetch = useCallback(() => {
    if (!fetcher || !enabled) return;
    
    setLoading(true);
    setError(null);
    
    return Promise.resolve(fetcher())
      .then(result => {
        setCache(key, result, ttl);
        setData(result);
        setError(null);
        return result;
      })
      .catch(err => {
        setError(err);
        throw err;
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, fetcher, ttl, enabled]);

  return { data, loading, error, refetch };
};

// Hook to prevent unnecessary data reloading when navigating back to pages
export const usePersistedData = (key, fetcher, options = {}) => {
  const { 
    ttl = 60 * 60 * 1000, // 1 hour default for persisted data
    forceRefresh = false,
    dependencies = []
  } = options;
  
  const [data, setData] = useState(() => getCache(key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (force = false) => {
    // If we have cached data and not forcing refresh, use cached data
    if (!force && data && getCache(key)) {
      return data;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher();
      setCache(key, result, ttl);
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, data]);

  useEffect(() => {
    const cachedData = getCache(key);
    if (cachedData && !forceRefresh) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    // Only fetch if we don't have data or force refresh is requested
    if (!data || forceRefresh) {
      fetchData(forceRefresh);
    }
  }, [forceRefresh, ...dependencies]);

  useEffect(() => {
    return subscribeCacheChange(key, (newData) => {
      setData(newData);
    });
  }, [key]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refresh };
};

// Auto cleanup expired entries every 15 minutes (increased interval for better performance)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of timestamps.entries()) {
      if (now > timestamp) {
        cache.delete(key);
        timestamps.delete(key);
      }
    }
  }, 15 * 60 * 1000);

  // Add cache size monitoring
  setInterval(() => {
    if (cache.size > 100) { // If cache gets too large
      console.warn('Cache size is large:', cache.size, 'entries');
      // Clear oldest 20% of entries
      const entries = Array.from(timestamps.entries());
      entries.sort((a, b) => a[1] - b[1]);
      const toClear = entries.slice(0, Math.floor(entries.length * 0.2));
      toClear.forEach(([key]) => {
        cache.delete(key);
        timestamps.delete(key);
      });
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}