import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCache, setCache } from '../lib/simpleCache';

// Track visited pages and their data freshness
export function useNavigationState() {
  const router = useRouter();
  const [visitedPages, setVisitedPages] = useState(() => {
    return getCache('visited_pages') || new Set();
  });

  useEffect(() => {
    const currentPath = router.asPath;
    
    // Add current page to visited pages
    setVisitedPages(prev => {
      const newSet = new Set(prev);
      newSet.add(currentPath);
      setCache('visited_pages', Array.from(newSet), 24 * 60 * 60 * 1000); // Cache for 24 hours
      return newSet;
    });
  }, [router.asPath]);

  const hasVisited = (path) => visitedPages.has(path);
  
  const clearVisitedPages = () => {
    setVisitedPages(new Set());
    setCache('visited_pages', [], 24 * 60 * 60 * 1000);
  };

  return {
    visitedPages: Array.from(visitedPages),
    hasVisited,
    clearVisitedPages
  };
}

// Hook to prevent data refetch on revisit
export function useSmartDataFetch(key, fetcher, options = {}) {
  const { ttl = 60 * 60 * 1000, forceRefreshOnFirstVisit = false } = options;
  const { hasVisited } = useNavigationState();
  const router = useRouter();
  
  const [data, setData] = useState(() => getCache(key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isFirstVisit = !hasVisited(router.asPath);
  
  const fetchData = async (force = false) => {
    // Skip fetch if we have cached data and this is a revisit (unless forced)
    if (!force && data && !isFirstVisit) {
      return data;
    }

    // Skip fetch if we have cached data and it's not the first visit and we don't force refresh on first visit
    if (!force && data && isFirstVisit && !forceRefreshOnFirstVisit) {
      return data;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setCache(key, result, ttl);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we don't have data or if it's configured to refresh on first visit
    if (!data || (isFirstVisit && forceRefreshOnFirstVisit)) {
      fetchData();
    }
  }, [key]);

  const refresh = () => fetchData(true);

  return {
    data,
    loading,
    error,
    refresh,
    isFirstVisit
  };
}