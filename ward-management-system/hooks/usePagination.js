import { useState, useMemo, useEffect } from 'react';

const usePagination = (data, defaultItemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Auto-adjust current page if it exceeds total pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    // Calculate what page the first item of current page would be on with new items per page
    const firstItemIndex = (currentPage - 1) * itemsPerPage;
    const newPage = Math.floor(firstItemIndex / newItemsPerPage) + 1;
    setCurrentPage(Math.max(1, Math.min(newPage, Math.ceil(data.length / newItemsPerPage))));
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Smart reset that only resets if current page is invalid
  const smartReset = () => {
    if (totalPages === 0 || currentPage > totalPages) {
      setCurrentPage(1);
    }
  };

  return {
    currentPage,
    itemsPerPage,
    paginatedData,
    totalPages,
    totalItems: data.length,
    handlePageChange,
    handleItemsPerPageChange,
    resetPagination,
    smartReset,
  };
};

export default usePagination;