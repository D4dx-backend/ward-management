/**
 * Safe data access utilities to prevent null reference errors
 * Especially useful for preventing runtime errors during loading states
 */

/**
 * Safely access array properties with fallback
 */
export function safeArray(data, fallback = []) {
  return Array.isArray(data) ? data : fallback;
}

/**
 * Safely access object properties with fallback
 */
export function safeObject(data, fallback = {}) {
  return data && typeof data === 'object' && !Array.isArray(data) ? data : fallback;
}

/**
 * Safely find item in array
 */
export function safeFind(array, predicate, fallback = null) {
  const safeArr = safeArray(array);
  try {
    return safeArr.find(predicate) || fallback;
  } catch (error) {
    console.warn('Safe find error:', error);
    return fallback;
  }
}

/**
 * Safely filter array
 */
export function safeFilter(array, predicate, fallback = []) {
  const safeArr = safeArray(array);
  try {
    return safeArr.filter(predicate);
  } catch (error) {
    console.warn('Safe filter error:', error);
    return fallback;
  }
}

/**
 * Safely map array
 */
export function safeMap(array, mapper, fallback = []) {
  const safeArr = safeArray(array);
  try {
    return safeArr.map(mapper);
  } catch (error) {
    console.warn('Safe map error:', error);
    return fallback;
  }
}

/**
 * Safely access nested object properties
 */
export function safeGet(obj, path, fallback = null) {
  try {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result == null || typeof result !== 'object') {
        return fallback;
      }
      result = result[key];
    }
    
    return result !== undefined ? result : fallback;
  } catch (error) {
    console.warn('Safe get error:', error);
    return fallback;
  }
}

/**
 * Safe length check for arrays
 */
export function safeLength(array) {
  return safeArray(array).length;
}

/**
 * Safe check if array has items
 */
export function hasItems(array) {
  return safeLength(array) > 0;
}

/**
 * Create a safe component wrapper that handles loading states
 */
export function withSafeData(Component) {
  return function SafeComponent(props) {
    // Ensure all array props are safe
    const safeProps = Object.keys(props).reduce((acc, key) => {
      const value = props[key];
      if (Array.isArray(value) || value === null || value === undefined) {
        acc[key] = safeArray(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});

    return <Component {...safeProps} />;
  };
}

/**
 * Hook for safe data access in components
 */
export function useSafeData(data) {
  if (Array.isArray(data)) {
    return safeArray(data);
  }
  if (typeof data === 'object') {
    return safeObject(data);
  }
  return data;
}