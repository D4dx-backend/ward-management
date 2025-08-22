import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

/**
 * A generic hook for persisting any state value across tab switches and page reloads
 * using sessionStorage. This is useful for maintaining UI state like pagination,
 * form values, selected filters, etc.
 */
export function usePersistentState(key, defaultValue, options = {}) {
  const router = useRouter();
  const {
    storageType = 'session', // 'session' or 'local'
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    validator = null // Optional function to validate loaded values
  } = options;

  // Generate unique storage key based on current route if key doesn't include it
  const getStorageKey = useCallback(() => {
    if (key.includes('_')) return key; // Assume it already has a unique identifier
    return `${key}_${router.pathname.replace(/\//g, '_')}`;
  }, [key, router.pathname]);

  // Get the appropriate storage object
  const storage = storageType === 'local' ? localStorage : sessionStorage;

  // Load persisted state
  const loadPersistedState = useCallback(() => {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const storageKey = getStorageKey();
      const persisted = storage.getItem(storageKey);
      if (persisted !== null) {
        const parsed = deserialize(persisted);
        
        // Validate the loaded value if validator is provided
        if (validator && !validator(parsed)) {
          console.warn(`[usePersistentState] Invalid persisted value for ${storageKey}, using default`);
          return defaultValue;
        }
        
        console.log(`[usePersistentState] Loaded persisted state for ${storageKey}:`, parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('[usePersistentState] Failed to load persisted state:', error);
    }

    return defaultValue;
  }, [getStorageKey, defaultValue, deserialize, validator, storage]);

  // Save state to storage
  const saveState = useCallback((value) => {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = getStorageKey();
      const serialized = serialize(value);
      storage.setItem(storageKey, serialized);
      console.log(`[usePersistentState] Saved state for ${storageKey}:`, value);
    } catch (error) {
      console.warn('[usePersistentState] Failed to save state:', error);
    }
  }, [getStorageKey, serialize, storage]);

  // Initialize state with persisted value
  const [state, setState] = useState(() => loadPersistedState());

  // Save state whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state, saveState]);

  // Enhanced setState that logs the change
  const setPersistentState = useCallback((newState) => {
    console.log(`[usePersistentState] Updating state for ${getStorageKey()}:`, newState);
    setState(newState);
  }, [getStorageKey]);

  return [state, setPersistentState];
}

/**
 * Hook specifically for persisting pagination state manually
 * This is useful for pages that implement pagination without using pagination hooks
 */
export function usePersistentPaginationState(defaultPage = 1, defaultItemsPerPage = 10, options = {}) {
  const { 
    pageKey = 'currentPage',
    itemsPerPageKey = 'itemsPerPage',
    ...storageOptions 
  } = options;

  const [currentPage, setCurrentPage] = usePersistentState(
    pageKey, 
    defaultPage, 
    { 
      ...storageOptions,
      validator: (value) => typeof value === 'number' && value >= 1
    }
  );

  const [itemsPerPage, setItemsPerPage] = usePersistentState(
    itemsPerPageKey, 
    defaultItemsPerPage,
    { 
      ...storageOptions,
      validator: (value) => typeof value === 'number' && value >= 1 && value <= 1000
    }
  );

  // Enhanced page change handler that validates the page number
  const handlePageChange = useCallback((page, maxPages = Infinity) => {
    if (typeof page === 'number' && page >= 1 && page <= maxPages) {
      console.log(`[usePersistentPaginationState] Changing page to ${page}`);
      setCurrentPage(page);
    } else {
      console.warn(`[usePersistentPaginationState] Invalid page number: ${page}, max: ${maxPages}`);
    }
  }, [setCurrentPage]);

  // Enhanced items per page change handler
  const handleItemsPerPageChange = useCallback((newItemsPerPage) => {
    if (typeof newItemsPerPage === 'number' && newItemsPerPage >= 1 && newItemsPerPage <= 1000) {
      setItemsPerPage(newItemsPerPage);
      // Reset to first page when changing items per page
      setCurrentPage(1);
    } else {
      console.warn(`[usePersistentPaginationState] Invalid items per page: ${newItemsPerPage}`);
    }
  }, [setItemsPerPage, setCurrentPage]);

  return {
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    handlePageChange,
    handleItemsPerPageChange
  };
}

/**
 * Hook for persisting search/filter state
 */
export function usePersistentFilterState(defaultFilters = {}, options = {}) {
  const { filterKey = 'filters', ...storageOptions } = options;

  const [filters, setFilters] = usePersistentState(
    filterKey,
    defaultFilters,
    {
      ...storageOptions,
      validator: (value) => typeof value === 'object' && value !== null
    }
  );

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, [setFilters]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(newFilters);
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [setFilters, defaultFilters]);

  return {
    filters,
    setFilters,
    updateFilter,
    updateFilters,
    clearFilters,
    hasActiveFilters: Object.keys(filters).some(key => 
      filters[key] && filters[key] !== defaultFilters[key]
    )
  };
}

export default usePersistentState;
