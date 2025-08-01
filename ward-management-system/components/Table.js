import { memo, useMemo, useState, useCallback } from 'react';
import { TableSkeleton } from './Loading';

const Table = memo(({ 
  data = [], 
  columns = [], 
  loading = false,
  error = null,
  emptyMessage = 'No data available',
  className = '',
  striped = false,
  hover = true,
  sortable = false,
  onSort,
  sortConfig = { key: null, direction: 'asc' },
  pagination = false,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  totalItems,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  ...props 
}) => {
  const [internalSortConfig, setInternalSortConfig] = useState(sortConfig);

  // Handle sorting
  const handleSort = useCallback((key) => {
    if (!sortable) return;

    const direction = 
      internalSortConfig.key === key && internalSortConfig.direction === 'asc' 
        ? 'desc' 
        : 'asc';
    
    const newSortConfig = { key, direction };
    setInternalSortConfig(newSortConfig);
    onSort?.(newSortConfig);
  }, [sortable, internalSortConfig, onSort]);

  // Sort data if sortable and no external sort handler
  const sortedData = useMemo(() => {
    if (!sortable || onSort || !internalSortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[internalSortConfig.key];
      const bValue = b[internalSortConfig.key];
      
      if (aValue < bValue) {
        return internalSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return internalSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, internalSortConfig, sortable, onSort]);

  // Paginate data if pagination enabled and no external pagination
  const paginatedData = useMemo(() => {
    if (!pagination || onPageChange) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, pagination, currentPage, pageSize, onPageChange]);

  // Handle row selection
  const handleRowSelect = useCallback((row, index) => {
    if (!selectable) return;

    const rowId = row.id || row._id || index;
    const isSelected = selectedRows.includes(rowId);
    
    let newSelection;
    if (isSelected) {
      newSelection = selectedRows.filter(id => id !== rowId);
    } else {
      newSelection = [...selectedRows, rowId];
    }
    
    onSelectionChange?.(newSelection);
  }, [selectable, selectedRows, onSelectionChange]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!selectable) return;

    const allRowIds = paginatedData.map((row, index) => row.id || row._id || index);
    const allSelected = allRowIds.every(id => selectedRows.includes(id));
    
    let newSelection;
    if (allSelected) {
      newSelection = selectedRows.filter(id => !allRowIds.includes(id));
    } else {
      newSelection = [...new Set([...selectedRows, ...allRowIds])];
    }
    
    onSelectionChange?.(newSelection);
  }, [selectable, paginatedData, selectedRows, onSelectionChange]);

  if (loading) {
    return <TableSkeleton rows={pageSize} columns={columns.length} />;
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-600">Error loading data</p>
        <p className="text-sm text-gray-500 mt-1">{error.message}</p>
      </div>
    );
  }

  if (!paginatedData.length) {
    return (
      <div className="card text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  const isAllSelected = paginatedData.length > 0 && 
    paginatedData.every((row, index) => {
      const rowId = row.id || row._id || index;
      return selectedRows.includes(rowId);
    });

  return (
    <div className={`card overflow-hidden ${className}`} {...props}>
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="table-header">
            <tr>
              {selectable && (
                <th className="table-header-cell w-4">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column, index) => (
                <th 
                  key={column.key || index} 
                  className={`table-header-cell ${
                    sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title || column.label}</span>
                    {sortable && column.sortable !== false && (
                      <div className="flex flex-col">
                        <svg 
                          className={`h-3 w-3 ${
                            internalSortConfig.key === column.key && internalSortConfig.direction === 'asc'
                              ? 'text-primary-600' 
                              : 'text-gray-400'
                          }`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        <svg 
                          className={`h-3 w-3 -mt-1 ${
                            internalSortConfig.key === column.key && internalSortConfig.direction === 'desc'
                              ? 'text-primary-600' 
                              : 'text-gray-400'
                          }`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="table-body">
            {paginatedData.map((row, rowIndex) => {
              const rowId = row.id || row._id || rowIndex;
              const isSelected = selectedRows.includes(rowId);
              
              return (
                <tr 
                  key={rowId}
                  className={`table-row ${
                    striped && rowIndex % 2 === 1 ? 'bg-gray-25' : ''
                  } ${
                    hover ? 'hover:bg-gray-50' : ''
                  } ${
                    isSelected ? 'bg-primary-50' : ''
                  }`}
                >
                  {selectable && (
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelect(row, rowIndex)}
                      />
                    </td>
                  )}
                  {columns.map((column, colIndex) => (
                    <td key={column.key || colIndex} className="table-cell">
                      {column.render 
                        ? column.render(row[column.key], row, rowIndex)
                        : row[column.key]
                      }
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {pagination && (
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems || sortedData.length}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
});

Table.displayName = 'Table';

// Pagination component
const TablePagination = memo(({ 
  currentPage, 
  pageSize, 
  totalItems, 
  onPageChange 
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className="card-footer flex items-center justify-between">
      <div className="text-sm text-gray-700">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-secondary btn-sm disabled:opacity-50"
        >
          Previous
        </button>
        
        {getVisiblePages().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`btn btn-sm ${
              page === currentPage 
                ? 'btn-primary' 
                : 'btn-secondary'
            } ${page === '...' ? 'cursor-default' : ''}`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-secondary btn-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
});

TablePagination.displayName = 'TablePagination';

export default Table;