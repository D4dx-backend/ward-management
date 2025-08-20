// Global cache configuration for the Ward Management System
// This file centralizes cache settings to prevent unnecessary data reloading

export const CACHE_KEYS = {
  // Coordinator data
  COORDINATOR_WARD_REPORTS: 'coordinator_ward_reports',
  COORDINATOR_WARD_VISITS: 'coordinator_ward_visits',
  COORDINATOR_WARDS: 'coordinator_wards',
  COORDINATOR_WARDS_DETAILED: 'coordinator_wards_detailed',
  
  // Admin data
  ADMIN_WARD_VISITS: 'admin_ward_visits',
  ADMIN_COORDINATORS: 'admin_coordinators',
  ADMIN_WARDS: 'admin_wards',
  ADMIN_CLUSTERS: 'admin_clusters',
  ADMIN_WARD_VISITS_STATISTICS: 'admin_ward_visits_statistics',
  ADMIN_WARDS_FOR_CLUSTERS: 'admin_wards_for_clusters',
  
  // Ward Admin data
  WARD_ADMIN_REPORTS: 'ward_admin_reports',
  WARD_ADMIN_VISITS: 'ward_admin_visits',
  WARD_ADMIN_PROFILE: 'ward_admin_profile',
  
  // Shared data
  USERS: 'users',
  FORMS: 'forms',
  RESPONSES: 'responses',
  
  // Navigation state
  VISITED_PAGES: 'visited_pages',
  APP_STATE: 'app_state'
};

export const CACHE_DURATIONS = {
  // Short-term cache (30 minutes) - for frequently changing data
  SHORT: 30 * 60 * 1000,
  
  // Medium-term cache (2 hours) - for moderately changing data
  MEDIUM: 2 * 60 * 60 * 1000,
  
  // Long-term cache (24 hours) - for rarely changing data
  LONG: 24 * 60 * 60 * 1000,
  
  // Session cache (until browser close) - for user-specific data
  SESSION: null // Will use session storage instead of memory
};

export const DEFAULT_CACHE_OPTIONS = {
  // Default TTL for most data
  ttl: CACHE_DURATIONS.MEDIUM,
  
  // Enable stale-while-revalidate by default
  staleWhileRevalidate: true,
  
  // Enable background refresh when page becomes visible
  backgroundRefresh: true,
  
  // Retry failed requests up to 3 times
  retryAttempts: 3,
  retryDelay: 1000
};

// Specific cache configurations for different data types
export const CACHE_CONFIGS = {
  [CACHE_KEYS.COORDINATOR_WARD_REPORTS]: {
    ...DEFAULT_CACHE_OPTIONS,
    ttl: CACHE_DURATIONS.MEDIUM
  },
  
  [CACHE_KEYS.COORDINATOR_WARD_VISITS]: {
    ...DEFAULT_CACHE_OPTIONS,
    ttl: CACHE_DURATIONS.MEDIUM
  },
  
  [CACHE_KEYS.COORDINATOR_WARDS]: {
    ...DEFAULT_CACHE_OPTIONS,
    ttl: CACHE_DURATIONS.LONG // Wards don't change frequently
  },
  
  [CACHE_KEYS.ADMIN_WARD_VISITS_STATISTICS]: {
    ...DEFAULT_CACHE_OPTIONS,
    ttl: CACHE_DURATIONS.SHORT, // Statistics change more frequently
    backgroundRefresh: true
  },
  
  [CACHE_KEYS.ADMIN_CLUSTERS]: {
    ...DEFAULT_CACHE_OPTIONS,
    ttl: CACHE_DURATIONS.MEDIUM
  },
  
  [CACHE_KEYS.VISITED_PAGES]: {
    ttl: CACHE_DURATIONS.LONG,
    staleWhileRevalidate: false,
    backgroundRefresh: false
  }
};

// Helper function to get cache config for a specific key
export function getCacheConfig(key) {
  return CACHE_CONFIGS[key] || DEFAULT_CACHE_OPTIONS;
}

// Helper function to invalidate related caches
export function getRelatedCacheKeys(operation, entityType) {
  const relationships = {
    ward: [
      CACHE_KEYS.COORDINATOR_WARDS,
      CACHE_KEYS.COORDINATOR_WARDS_DETAILED,
      CACHE_KEYS.ADMIN_WARDS,
      CACHE_KEYS.ADMIN_WARDS_FOR_CLUSTERS
    ],
    visit: [
      CACHE_KEYS.COORDINATOR_WARD_VISITS,
      CACHE_KEYS.ADMIN_WARD_VISITS,
      CACHE_KEYS.ADMIN_WARD_VISITS_STATISTICS
    ],
    cluster: [
      CACHE_KEYS.ADMIN_CLUSTERS
    ],
    report: [
      CACHE_KEYS.COORDINATOR_WARD_REPORTS,
      CACHE_KEYS.WARD_ADMIN_REPORTS
    ]
  };
  
  return relationships[entityType] || [];
}