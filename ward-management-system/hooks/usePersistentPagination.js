import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';

/**
 * Enhanced pagination hook that persists state across tab switches and page reloads
 * using sessionStorage. This prevents pagination state loss when users navigate away
 * and come back to the page.
 */
export function usePersistentPagination(data, defaultItemsPerPage = 10, options = {}) {
  const router = useRouter();
  const {
    storageKey,
    resetOnRouteChange = false,
    preservePageOnFilter = true,
    minPageSize = 5,
    maxPageSize = 100
  } = options;

  // Track if this is the initial load
  const isInitialLoadRef = useRef(true);

  // Generate unique storage key based on current route if not provided
  const getStorageKey = useCallback(() => {
    if (storageKey) return storageKey;
    return `pagination_${router.pathname.replace(/\//g, '_')}`;
  }, [storageKey, router.pathname]);

  // Load persisted state from sessionStorage
  const loadPersistedState = useCallback(() => {
    if (typeof window === 'undefined') {
      return { currentPage: 1, itemsPerPage: defaultItemsPerPage };
    }

    try {
      const key = getStorageKey();
      const persisted = sessionStorage.getItem(key);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        console.log(`[usePersistentPagination] Loaded persisted state for ${key}:`, parsed);
        return {
          currentPage: parsed.currentPage || 1,
          itemsPerPage: parsed.itemsPerPage || defaultItemsPerPage
        };
      }
    } catch (error) {
      console.warn('[usePersistentPagination] Failed to load persisted state:', error);
    }

    return { currentPage: 1, itemsPerPage: defaultItemsPerPage };
  }, [getStorageKey, defaultItemsPerPage]);

  // Save state to sessionStorage
  const saveState = useCallback((currentPage, itemsPerPage) => {
    if (typeof window === 'undefined') return;

    try {
      const key = getStorageKey();
      const state = { currentPage, itemsPerPage, timestamp: Date.now() };
      sessionStorage.setItem(key, JSON.stringify(state));
      console.log(`[usePersistentPagination] Saved state for ${key}:`, state);
    } catch (error) {
      console.warn('[usePersistentPagination] Failed to save state:', error);
    }
  }, [getStorageKey]);

  // Initialize state with persisted values
  const [paginationState, setPaginationState] = useState(() => {
    const { currentPage, itemsPerPage } = loadPersistedState();
    return { currentPage, itemsPerPage };
  });

  const { currentPage, itemsPerPage } = paginationState;

  // Calculate pagination values
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Auto-adjust current page if it exceeds total pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      const newPage = Math.max(1, totalPages);
      console.log(`[usePersistentPagination] Auto-adjusting page from ${currentPage} to ${newPage}`);
      setPaginationState(prev => ({ ...prev, currentPage: newPage }));
    }
  }, [totalPages, currentPage]);

  // Save state whenever it changes
  useEffect(() => {
    saveState(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, saveState]);

  // Reset pagination when route changes if resetOnRouteChange is true
  useEffect(() => {
    if (resetOnRouteChange && !isInitialLoadRef.current) {
      console.log('[usePersistentPagination] Resetting pagination due to route change');
      setPaginationState({ currentPage: 1, itemsPerPage: defaultItemsPerPage });
    }
  }, [router.pathname, resetOnRouteChange, defaultItemsPerPage]);

  // Mark initial load as complete after first render
  useEffect(() => {
    isInitialLoadRef.current = false;
  }, []);

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    if (totalItems === 0) return [];
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage, totalItems]);

  // Handle page change
  const handlePageChange = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      console.log(`[usePersistentPagination] Changing page to ${page}`);
      setPaginationState(prev => ({ ...prev, currentPage: page }));
    }
  }, [totalPages]);

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((newItemsPerPage) => {
    const clampedSize = Math.max(minPageSize, Math.min(maxPageSize, newItemsPerPage));
    console.log(`[usePersistentPagination] Changing items per page to ${clampedSize}`);
    
    if (preservePageOnFilter && totalItems > 0) {
      // Calculate what page the first item of current page would be on with new items per page
      const firstItemIndex = (currentPage - 1) * itemsPerPage;
      const newPage = Math.floor(firstItemIndex / clampedSize) + 1;
      const maxNewPage = Math.ceil(totalItems / clampedSize);
      const finalPage = Math.max(1, Math.min(newPage, maxNewPage));
      
      setPaginationState({
        currentPage: finalPage,
        itemsPerPage: clampedSize
      });
    } else {
      setPaginationState({
        currentPage: 1,
        itemsPerPage: clampedSize
      });
    }
  }, [currentPage, itemsPerPage, totalItems, preservePageOnFilter, minPageSize, maxPageSize]);

  // Navigation functions
  const goToFirstPage = useCallback(() => {
    console.log('[usePersistentPagination] Going to first page');
    setPaginationState(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const goToLastPage = useCallback(() => {
    if (totalPages > 0) {
      console.log(`[usePersistentPagination] Going to last page: ${totalPages}`);
      setPaginationState(prev => ({ ...prev, currentPage: totalPages }));
    }
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      console.log(`[usePersistentPagination] Going to next page: ${currentPage + 1}`);
      setPaginationState(prev => ({ ...prev, currentPage: currentPage + 1 }));
    }
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      console.log(`[usePersistentPagination] Going to previous page: ${currentPage - 1}`);
      setPaginationState(prev => ({ ...prev, currentPage: currentPage - 1 }));
    }
  }, [currentPage]);

  // Force reset function
  const resetPagination = useCallback(() => {
    console.log('[usePersistentPagination] Resetting pagination');
    setPaginationState({ currentPage: 1, itemsPerPage: defaultItemsPerPage });
  }, [defaultItemsPerPage]);

  // Smart reset that only resets if current page is invalid
  const smartReset = useCallback(() => {
    if (totalPages === 0 || currentPage > totalPages) {
      console.log('[usePersistentPagination] Smart reset triggered');
      setPaginationState(prev => ({ ...prev, currentPage: 1 }));
    }
  }, [totalPages, currentPage]);

  // Conditional reset - only resets if not initial load
  const conditionalReset = useCallback((force = false) => {
    if (force || !isInitialLoadRef.current) {
      console.log('[usePersistentPagination] Conditional reset triggered', { force, isInitial: isInitialLoadRef.current });
      setPaginationState(prev => ({ ...prev, currentPage: 1 }));
    } else {
      console.log('[usePersistentPagination] Conditional reset skipped (initial load)');
    }
  }, []);

  // Get pagination info
  const paginationInfo = useMemo(() => {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    return {
      startItem,
      endItem,
      totalItems,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      isFirstPage: currentPage === 1,
      isLastPage: currentPage === totalPages || totalPages === 0
    };
  }, [currentPage, itemsPerPage, totalItems, totalPages]);

  return {
    // Data
    paginatedData,
    
    // State
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    
    // Actions
    handlePageChange,
    handleItemsPerPageChange,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    resetPagination,
    smartReset,
    conditionalReset,
    
    // Info
    paginationInfo,
    
    // Computed properties for convenience
    hasData: totalItems > 0,
    hasMultiplePages: totalPages > 1,
    isEmpty: totalItems === 0
  };
}

/**
 * Specialized hook for filtered data that preserves pagination state
 * across tab switches and includes filter state persistence
 */
export function usePersistentFilteredPagination(allData, filterFn, defaultItemsPerPage = 10, options = {}) {
  const {
    filtersStorageKey,
    ...paginationOptions
  } = options;

  const router = useRouter();

  // Generate unique storage key for filters
  const getFiltersStorageKey = useCallback(() => {
    if (filtersStorageKey) return filtersStorageKey;
    return `filters_${router.pathname.replace(/\//g, '_')}`;
  }, [filtersStorageKey, router.pathname]);

  // Load persisted filters
  const loadPersistedFilters = useCallback(() => {
    if (typeof window === 'undefined') return {};

    try {
      const key = getFiltersStorageKey();
      const persisted = sessionStorage.getItem(key);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        console.log(`[usePersistentFilteredPagination] Loaded persisted filters for ${key}:`, parsed);
        return parsed.filters || {};
      }
    } catch (error) {
      console.warn('[usePersistentFilteredPagination] Failed to load persisted filters:', error);
    }

    return {};
  }, [getFiltersStorageKey]);

  // Save filters to sessionStorage
  const saveFilters = useCallback((filters) => {
    if (typeof window === 'undefined') return;

    try {
      const key = getFiltersStorageKey();
      const state = { filters, timestamp: Date.now() };
      sessionStorage.setItem(key, JSON.stringify(state));
      console.log(`[usePersistentFilteredPagination] Saved filters for ${key}:`, state);
    } catch (error) {
      console.warn('[usePersistentFilteredPagination] Failed to save filters:', error);
    }
  }, [getFiltersStorageKey]);

  const [filters, setFilters] = useState(() => loadPersistedFilters());
  
  const filteredData = useMemo(() => {
    if (!filterFn) return allData;
    return allData.filter(item => filterFn(item, filters));
  }, [allData, filterFn, filters]);

  const pagination = usePersistentPagination(filteredData, defaultItemsPerPage, {
    preservePageOnFilter: true,
    ...paginationOptions
  });

  // Save filters whenever they change
  useEffect(() => {
    saveFilters(filters);
  }, [filters, saveFilters]);

  const updateFilter = useCallback((key, value) => {
    console.log(`[usePersistentFilteredPagination] Updating filter ${key}:`, value);
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const updateFilters = useCallback((newFilters) => {
    console.log('[usePersistentFilteredPagination] Updating all filters:', newFilters);
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    console.log('[usePersistentFilteredPagination] Clearing all filters');
    setFilters({});
  }, []);

  return {
    ...pagination,
    filters,
    filteredData,
    updateFilter,
    updateFilters,
    clearFilters,
    hasActiveFilters: Object.keys(filters).some(key => filters[key])
  };
}

export default usePersistentPagination;
