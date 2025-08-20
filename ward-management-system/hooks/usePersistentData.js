import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { getCache, setCache, subscribeCacheChange } from '../lib/simpleCache';

/**
 * Enhanced hook for persistent data management that prevents unnecessary reloading
 * when navigating between pages in the app.
 * 
 * Features:
 * - Automatic caching with configurable TTL
 * - Smart refresh logic based on navigation patterns
 * - Background refresh capabilities
 * - Error handling and retry logic
 * - Optimistic updates support
 */
export function usePersistentData(key, fetcher, options = {}) {
  const {
    ttl = 60 * 60 * 1000, // 1 hour default
    staleWhileRevalidate = true,
    retryAttempts = 3,
    retryDelay = 1000,
    backgroundRefresh = false,
    dependencies = [],
    onSuccess,
    onError
  } = options;

  const router = useRouter();
  const [data, setData] = useState(() => getCache(key));
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const retryCount = useRef(0);
  const abortController = useRef(null);

  // Check if data is stale
  const checkStaleData = useCallback(() => {
    const cached = getCache(key);
    if (!cached && data) {
      setIsStale(true);
    }
  }, [key, data]);

  // Fetch data with retry logic
  const fetchData = useCallback(async (force = false, silent = false) => {
    // If we have fresh data and not forcing, return it
    if (!force && data && getCache(key) && !isStale) {
      return data;
    }

    // Cancel any ongoing request
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    const attemptFetch = async (attempt = 0) => {
      try {
        const result = await fetcher({ signal: abortController.current.signal });
        
        // Cache the result
        setCache(key, result, ttl);
        setData(result);
        setIsStale(false);
        setError(null);
        retryCount.current = 0;

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        if (err.name === 'AbortError') {
          return; // Request was cancelled
        }

        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          return attemptFetch(attempt + 1);
        }

        setError(err);
        if (onError) {
          onError(err);
        }
        throw err;
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    };

    return attemptFetch();
  }, [key, fetcher, ttl, data, isStale, retryAttempts, retryDelay, onSuccess, onError]);

  // Initial data fetch
  useEffect(() => {
    const cachedData = getCache(key);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      
      // If stale while revalidate is enabled, fetch fresh data in background
      if (staleWhileRevalidate) {
        fetchData(false, true);
      }
    } else if (!loading) {
      fetchData();
    }
  }, [key, ...dependencies]);

  // Background refresh on focus/visibility change
  useEffect(() => {
    if (!backgroundRefresh) return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible' && isStale) {
        fetchData(false, true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStaleData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [backgroundRefresh, isStale, fetchData, checkStaleData]);

  // Subscribe to cache changes
  useEffect(() => {
    return subscribeCacheChange(key, (newData) => {
      if (newData !== data) {
        setData(newData);
        setIsStale(false);
      }
    });
  }, [key, data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Optimistic update function
  const mutate = useCallback((updater, options = {}) => {
    const { optimistic = true, revalidate = true } = options;
    
    if (optimistic) {
      const newData = typeof updater === 'function' ? updater(data) : updater;
      setData(newData);
      setCache(key, newData, ttl);
    }
    
    if (revalidate) {
      return fetchData(true, true);
    }
  }, [data, key, ttl, fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    refresh,
    mutate,
    isValidating: loading
  };
}

// Specialized hook for list data with CRUD operations
export function usePersistentList(key, fetcher, options = {}) {
  const {
    onCreate,
    onUpdate,
    onDelete,
    ...persistentOptions
  } = options;

  const {
    data: items = [],
    loading,
    error,
    refresh,
    mutate
  } = usePersistentData(key, fetcher, persistentOptions);

  const createItem = useCallback(async (newItem, apiCall) => {
    try {
      // Optimistic update
      mutate(currentItems => [...currentItems, newItem], { revalidate: false });
      
      // Make API call
      const createdItem = await apiCall(newItem);
      
      // Update with real data
      mutate(currentItems => {
        const index = currentItems.findIndex(item => item === newItem);
        if (index !== -1) {
          const newItems = [...currentItems];
          newItems[index] = createdItem;
          return newItems;
        }
        return [...currentItems, createdItem];
      });

      if (onCreate) {
        onCreate(createdItem);
      }

      return createdItem;
    } catch (error) {
      // Revert optimistic update on error
      mutate(currentItems => currentItems.filter(item => item !== newItem));
      throw error;
    }
  }, [mutate, onCreate]);

  const updateItem = useCallback(async (itemId, updates, apiCall) => {
    const originalItems = items;
    
    try {
      // Optimistic update
      mutate(currentItems => 
        currentItems.map(item => 
          item._id === itemId ? { ...item, ...updates } : item
        ), 
        { revalidate: false }
      );
      
      // Make API call
      const updatedItem = await apiCall(itemId, updates);
      
      // Update with real data
      mutate(currentItems => 
        currentItems.map(item => 
          item._id === itemId ? updatedItem : item
        )
      );

      if (onUpdate) {
        onUpdate(updatedItem);
      }

      return updatedItem;
    } catch (error) {
      // Revert optimistic update on error
      mutate(originalItems);
      throw error;
    }
  }, [items, mutate, onUpdate]);

  const deleteItem = useCallback(async (itemId, apiCall) => {
    const originalItems = items;
    
    try {
      // Optimistic update
      mutate(currentItems => currentItems.filter(item => item._id !== itemId), { revalidate: false });
      
      // Make API call
      await apiCall(itemId);

      if (onDelete) {
        onDelete(itemId);
      }
    } catch (error) {
      // Revert optimistic update on error
      mutate(originalItems);
      throw error;
    }
  }, [items, mutate, onDelete]);

  return {
    items,
    loading,
    error,
    refresh,
    createItem,
    updateItem,
    deleteItem
  };
}