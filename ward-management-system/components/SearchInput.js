import { memo, useState, useCallback, useRef, useEffect } from 'react';

const SearchInput = memo(({ 
  value = '', 
  onChange, 
  placeholder = 'Search...', 
  className = '',
  debounceMs = 300,
  showClearButton = true,
  autoFocus = false,
  size = 'md',
  ...props 
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const timeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Sync internal value with external value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Auto focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced onChange handler
  const debouncedOnChange = useCallback((newValue) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange?.(newValue);
    }, debounceMs);
  }, [onChange, debounceMs]);

  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    debouncedOnChange(newValue);
  }, [debouncedOnChange]);

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange?.('');
    inputRef.current?.focus();
  }, [onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg 
          className="h-5 w-5 text-gray-400" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`form-input pl-10 ${
          showClearButton && internalValue ? 'pr-10' : ''
        } ${sizes[size]}`}
        {...props}
      />
      
      {showClearButton && internalValue && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-150"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;

// Advanced search component with filters
export const AdvancedSearch = memo(({ 
  onSearch, 
  filters = [], 
  className = '',
  searchPlaceholder = 'Search...',
  showFilters = true,
  collapsible = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const [showFilterPanel, setShowFilterPanel] = useState(!collapsible);

  const handleSearch = useCallback(() => {
    onSearch?.({
      searchTerm,
      filters: filterValues
    });
  }, [searchTerm, filterValues, onSearch]);

  const handleFilterChange = useCallback((filterKey, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterKey]: value
    }));
  }, []);

  const handleReset = useCallback(() => {
    setSearchTerm('');
    setFilterValues({});
    onSearch?.({
      searchTerm: '',
      filters: {}
    });
  }, [onSearch]);

  const hasActiveFilters = Object.values(filterValues).some(value => 
    value !== '' && value !== null && value !== undefined
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={searchPlaceholder}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        
        <div className="flex gap-2">
          {showFilters && collapsible && (
            <button
              type="button"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`btn btn-secondary ${hasActiveFilters ? 'ring-2 ring-primary-500' : ''}`}
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
              Filters
              {hasActiveFilters && (
                <span className="ml-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {Object.values(filterValues).filter(v => v).length}
                </span>
              )}
            </button>
          )}
          
          <button
            type="button"
            onClick={handleSearch}
            className="btn btn-primary"
          >
            Search
          </button>
          
          {(searchTerm || hasActiveFilters) && (
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {showFilters && showFilterPanel && filters.length > 0 && (
        <div className="card animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                {filter.type === 'select' ? (
                  <select
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="form-select"
                  >
                    <option value="">All {filter.label}</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : filter.type === 'date' ? (
                  <input
                    type="date"
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="form-input"
                  />
                ) : (
                  <input
                    type="text"
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    placeholder={filter.placeholder}
                    className="form-input"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

AdvancedSearch.displayName = 'AdvancedSearch';