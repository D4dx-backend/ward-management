/**
 * INSTANT CACHE SYSTEM
 * Aggressive caching that eliminates ALL loading states on page revisits
 */

// Use both memory and localStorage for maximum persistence
const memoryCache = new Map();
const cacheTimestamps = new Map();

// Cache keys for different data types
export const INSTANT_CACHE_KEYS = {
  DASHBOARD: (role) => `instant_dashboard_${role}`,
  USER_DATA: (userId) => `instant_user_${userId}`,
  INSTRUCTIONS: 'instant_instructions',
  WARD_VISITS: (wardId) => `instant_ward_visits_${wardId}`
};

/**
 * Set data in instant cache with very long TTL
 */
export function setInstantCache(key, data, ttl = 4 * 60 * 60 * 1000) { // 4 hours default
  if (typeof window === 'undefined') return;
  
  try {
    // Store in memory cache
    memoryCache.set(key, data);
    cacheTimestamps.set(key, Date.now() + ttl);
    
    // Store in localStorage for persistence across sessions
    const cacheData = {
      data,
      timestamp: Date.now() + ttl,
      version: '1.0'
    };
    
    localStorage.setItem(`instant_${key}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to set instant cache:', error);
  }
}

/**
 * Get data from instant cache - checks memory first, then localStorage
 */
export function getInstantCache(key) {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check memory cache first (fastest)
    const memoryData = memoryCache.get(key);
    const memoryTimestamp = cacheTimestamps.get(key);
    
    if (memoryData && memoryTimestamp && Date.now() < memoryTimestamp) {
      return memoryData;
    }
    
    // Check localStorage (persistent across sessions)
    const stored = localStorage.getItem(`instant_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      if (parsed.timestamp && Date.now() < parsed.timestamp) {
        // Restore to memory cache
        memoryCache.set(key, parsed.data);
        cacheTimestamps.set(key, parsed.timestamp);
        return parsed.data;
      } else {
        // Expired - clean up
        localStorage.removeItem(`instant_${key}`);
      }
    }
  } catch (error) {
    console.warn('Failed to get instant cache:', error);
  }
  
  return null;
}

/**
 * Clear specific cache entry
 */
export function clearInstantCache(key) {
  if (typeof window === 'undefined') return;
  
  memoryCache.delete(key);
  cacheTimestamps.delete(key);
  
  try {
    localStorage.removeItem(`instant_${key}`);
  } catch (error) {
    console.warn('Failed to clear instant cache:', error);
  }
}

/**
 * Pre-load dashboard data for all roles
 */
export function preloadDashboardData() {
  if (typeof window === 'undefined') return;
  
  const roles = ['coordinator', 'wardAdmin', 'stateAdmin'];
  
  roles.forEach(role => {
    const cacheKey = INSTANT_CACHE_KEYS.DASHBOARD(role);
    const cached = getInstantCache(cacheKey);
    
    if (!cached) {
      // Pre-fetch in background
      fetch(`/api/dashboard/stats?role=${role}`)
        .then(res => res.json())
        .then(data => {
          const dashboardData = {
            stats: data.stats || data,
            recentReports: data.recentReports || [],
            recentActivity: data.recentLogs || [],
            recentLogins: data.recentLogins || []
          };
          
          setInstantCache(cacheKey, dashboardData);
        })
        .catch(err => console.warn(`Failed to preload ${role} dashboard:`, err));
    }
  });
}

/**
 * Initialize instant cache system
 */
export function initInstantCache() {
  if (typeof window === 'undefined') return;
  
  // Clean up expired entries on startup
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('instant_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.timestamp && Date.now() > data.timestamp) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('Failed to clean instant cache:', error);
  }
  
  // Pre-load common data
  setTimeout(preloadDashboardData, 1000);
}

/**
 * Get cache statistics for debugging
 */
export function getInstantCacheStats() {
  if (typeof window === 'undefined') return {};
  
  const memorySize = memoryCache.size;
  const localStorageKeys = Object.keys(localStorage).filter(k => k.startsWith('instant_'));
  
  return {
    memoryEntries: memorySize,
    localStorageEntries: localStorageKeys.length,
    totalSize: memorySize + localStorageKeys.length
  };
}

// Initialize on load
if (typeof window !== 'undefined') {
  // Initialize immediately
  initInstantCache();
  
  // Re-initialize on page visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(preloadDashboardData, 500);
    }
  });
}