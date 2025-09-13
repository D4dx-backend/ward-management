/**
 * Configuration for preventing reload issues across the application
 */

// Cache durations for different types of data
export const CACHE_DURATIONS = {
  DASHBOARD: 15 * 60 * 1000,    // 15 minutes for dashboard data
  USER_DATA: 30 * 60 * 1000,    // 30 minutes for user data
  STATIC_DATA: 60 * 60 * 1000,  // 1 hour for static data (wards, etc.)
  REPORTS: 10 * 60 * 1000,      // 10 minutes for reports
  REAL_TIME: 2 * 60 * 1000      // 2 minutes for real-time data
};

// Stale time - when to consider data stale but still usable
export const STALE_TIMES = {
  DASHBOARD: 5 * 60 * 1000,     // 5 minutes
  USER_DATA: 15 * 60 * 1000,    // 15 minutes
  STATIC_DATA: 30 * 60 * 1000,  // 30 minutes
  REPORTS: 3 * 60 * 1000,       // 3 minutes
  REAL_TIME: 1 * 60 * 1000      // 1 minute
};

// Pages that should never show loading on revisit
export const NO_RELOAD_PAGES = [
  '/coordinator',
  '/ward',
  '/admin',
  '/coordinator/wards',
  '/coordinator/users',
  '/ward/reports',
  '/admin/users',
  '/admin/wards'
];

// Cache keys for consistent caching
export const CACHE_KEYS = {
  DASHBOARD: (role) => `dashboard-${role}-v2`,
  USER_PROFILE: (userId) => `user-${userId}`,
  WARDS_LIST: 'wards-list',
  REPORTS_LIST: (role) => `reports-${role}`,
  INSTRUCTIONS: 'instructions-list',
  STATISTICS: (role) => `stats-${role}`
};

// Default options for no-reload hook
export const DEFAULT_NO_RELOAD_OPTIONS = {
  ttl: CACHE_DURATIONS.DASHBOARD,
  staleTime: STALE_TIMES.DASHBOARD,
  retryAttempts: 3,
  retryDelay: 1000,
  backgroundRefresh: true
};

// Configuration for different user roles
export const ROLE_CONFIGS = {
  wardAdmin: {
    dashboardRefreshInterval: 2 * 60 * 1000, // 2 minutes
    cacheTime: CACHE_DURATIONS.DASHBOARD,
    staleTime: STALE_TIMES.DASHBOARD
  },
  coordinator: {
    dashboardRefreshInterval: 5 * 60 * 1000, // 5 minutes
    cacheTime: CACHE_DURATIONS.DASHBOARD,
    staleTime: STALE_TIMES.DASHBOARD
  },
  stateAdmin: {
    dashboardRefreshInterval: 10 * 60 * 1000, // 10 minutes
    cacheTime: CACHE_DURATIONS.DASHBOARD,
    staleTime: STALE_TIMES.DASHBOARD
  }
};

/**
 * Get configuration for a specific role
 */
export function getRoleConfig(role) {
  return ROLE_CONFIGS[role] || ROLE_CONFIGS.coordinator;
}

/**
 * Check if a page should use no-reload behavior
 */
export function shouldUseNoReload(pathname) {
  return NO_RELOAD_PAGES.some(page => pathname.startsWith(page));
}

/**
 * Get cache key for a specific data type
 */
export function getCacheKey(type, ...params) {
  if (typeof CACHE_KEYS[type] === 'function') {
    return CACHE_KEYS[type](...params);
  }
  return CACHE_KEYS[type] || `${type}-${params.join('-')}`;
}