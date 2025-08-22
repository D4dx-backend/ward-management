import { useState, useMemo, useEffect, useCallback } from 'react';
import { usePersistentPagination, usePersistentFilteredPagination } from './usePersistentPagination';

/**
 * Smart pagination hook that preserves current page when possible
 * and only resets when absolutely necessary
 */
export function useSmartPagination(data, defaultItemsPerPage = 10, options = {}) {
  const {
    preservePageOnFilter = true,
    resetOnDataChange = false,
    minPageSize = 5,
    maxPageSize = 100,
    persistent = true
  } = options;

  // Use persistent pagination by default for better user experience
  if (persistent) {
    console.log('[useSmartPagination] Using persistent pagination mode');
    return usePersistentPagination(data, defaultItemsPerPage, {
      preservePageOnFilter,
      minPageSize,
      maxPageSize,
      resetOnRouteChange: resetOnDataChange
    });
  }

  console.log('[useSmartPagination] Using non-persistent pagination mode');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [previousDataLength, setPreviousDataLength] = useState(0);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const totalItems = data.length;

  // Smart page adjustment logic
  useEffect(() => {
    const shouldReset = 
      // Reset if no data
      totalItems === 0 ||
      // Reset if current page is beyond available pages
      (totalPages > 0 && currentPage > totalPages) ||
      // Reset if data changed significantly and resetOnDataChange is true
      (resetOnDataChange && Math.abs(data.length - previousDataLength) > itemsPerPage);

    if (shouldReset) {
      setCurrentPage(1);
    } else if (totalPages > 0 && currentPage > totalPages) {
      // Adjust to last available page if current page is beyond range
      setCurrentPage(totalPages);
    }

    setPreviousDataLength(data.length);
  }, [data.length, totalPages, currentPage, itemsPerPage, resetOnDataChange, previousDataLength, totalItems]);

  const paginatedData = useMemo(() => {
    if (totalItems === 0) return [];
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage, totalItems]);

  const handlePageChange = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const handleItemsPerPageChange = useCallback((newItemsPerPage) => {
    const clampedSize = Math.max(minPageSize, Math.min(maxPageSize, newItemsPerPage));
    setItemsPerPage(clampedSize);
    
    if (preservePageOnFilter && totalItems > 0) {
      // Calculate what page the first item of current page would be on with new items per page
      const firstItemIndex = (currentPage - 1) * itemsPerPage;
      const newPage = Math.floor(firstItemIndex / clampedSize) + 1;
      const maxNewPage = Math.ceil(totalItems / clampedSize);
      setCurrentPage(Math.max(1, Math.min(newPage, maxNewPage)));
    } else {
      setCurrentPage(1);
    }
  }, [currentPage, itemsPerPage, totalItems, preservePageOnFilter, minPageSize, maxPageSize]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    if (totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  // Force reset function for when you really need to go back to page 1
  const forceReset = useCallback(() => {
    setCurrentPage(1);
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
    forceReset,
    
    // Info
    paginationInfo,
    
    // Computed properties for convenience
    hasData: totalItems > 0,
    hasMultiplePages: totalPages > 1,
    isEmpty: totalItems === 0
  };
}

// Specialized hook for filtered data that preserves pagination state
export function useFilteredPagination(allData, filterFn, defaultItemsPerPage = 10, options = {}) {
  const { persistent = true, ...otherOptions } = options;

  // Use persistent filtered pagination by default for better user experience
  if (persistent) {
    console.log('[useFilteredPagination] Using persistent filtered pagination mode');
    return usePersistentFilteredPagination(allData, filterFn, defaultItemsPerPage, otherOptions);
  }

  console.log('[useFilteredPagination] Using non-persistent filtered pagination mode');
  const [filters, setFilters] = useState({});
  
  const filteredData = useMemo(() => {
    if (!filterFn) return allData;
    return allData.filter(item => filterFn(item, filters));
  }, [allData, filterFn, filters]);

  const pagination = useSmartPagination(filteredData, defaultItemsPerPage, {
    preservePageOnFilter: true,
    resetOnDataChange: false,
    persistent: false // Disable persistence for the inner hook when outer hook is non-persistent
  });

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const updateFilters = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
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