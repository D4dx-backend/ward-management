/**
 * Safe array operations to prevent null/undefined errors
 * These utilities ensure arrays are always valid before operations
 */

/**
 * Safely ensure a value is an array
 */
export function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

/**
 * Safely filter an array with null checks
 */
export function safeFilter(array, predicate) {
  const safeArray = ensureArray(array);
  if (safeArray.length === 0) return [];
  
  try {
    return safeArray.filter(predicate);
  } catch (error) {
    console.warn('Safe filter error:', error);
    return [];
  }
}

/**
 * Safely map an array with null checks
 */
export function safeMap(array, mapper) {
  const safeArray = ensureArray(array);
  if (safeArray.length === 0) return [];
  
  try {
    return safeArray.map(mapper);
  } catch (error) {
    console.warn('Safe map error:', error);
    return [];
  }
}

/**
 * Safely find in an array with null checks
 */
export function safeFind(array, predicate) {
  const safeArray = ensureArray(array);
  if (safeArray.length === 0) return undefined;
  
  try {
    return safeArray.find(predicate);
  } catch (error) {
    console.warn('Safe find error:', error);
    return undefined;
  }
}

/**
 * Safely get property from object with fallback
 */
export function safeGet(obj, path, fallback = null) {
  if (!obj || typeof obj !== 'object') return fallback;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return fallback;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Safely sort an array with null checks
 */
export function safeSort(array, compareFn) {
  const safeArray = ensureArray(array);
  if (safeArray.length === 0) return [];
  
  try {
    return [...safeArray].sort(compareFn);
  } catch (error) {
    console.warn('Safe sort error:', error);
    return safeArray;
  }
}

/**
 * Create safe filter functions for common use cases
 */
export const createSafeFilters = {
  byProperty: (property, value) => (item) => safeGet(item, property) === value,
  bySearch: (searchFields, searchTerm) => (item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return searchFields.some(field => {
      const fieldValue = safeGet(item, field, '');
      return String(fieldValue).toLowerCase().includes(term);
    });
  },
  byActive: (isActive) => (item) => safeGet(item, 'isActive', false) === isActive
};

/**
 * Safe pagination helper
 */
export function safePaginate(array, page = 1, itemsPerPage = 10) {
  const safeArray = ensureArray(array);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  return {
    items: safeArray.slice(startIndex, endIndex),
    totalItems: safeArray.length,
    totalPages: Math.ceil(safeArray.length / itemsPerPage),
    currentPage: page,
    hasNext: endIndex < safeArray.length,
    hasPrev: page > 1
  };
}