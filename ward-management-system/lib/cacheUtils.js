/**
 * COMPREHENSIVE CACHE CLEARING UTILITIES
 * Handles all cache systems in the application
 */

import { clearCache, invalidateCache } from './simpleCache';
import { clearInstantCache, INSTANT_CACHE_KEYS } from './instantCache';

/**
 * Clear all cache systems completely
 */
export function clearAllCaches() {
  console.log('🧹 Clearing all cache systems...');
  
  try {
    // Clear simple cache
    clearCache();
    invalidateCache('dashboard');
    invalidateCache('user-');
    invalidateCache('responses');
    invalidateCache('forms');
    invalidateCache('api');
    
    // Clear instant cache for all roles
    const roles = ['coordinator', 'wardAdmin', 'stateAdmin'];
    roles.forEach(role => {
      const cacheKey = INSTANT_CACHE_KEYS.DASHBOARD(role);
      clearInstantCache(cacheKey);
    });
    
    // Clear localStorage cache entries
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      let clearedCount = 0;
      
      keys.forEach(key => {
        if (
          key.startsWith('instant_') || 
          key.includes('dashboard') || 
          key.includes('user-') ||
          key.includes('cache_') ||
          key.includes('api_')
        ) {
          localStorage.removeItem(key);
          clearedCount++;
        }
      });
      
      console.log(`🗑️ Cleared ${clearedCount} localStorage entries`);
    }
    
    // Clear sessionStorage as well
    if (typeof window !== 'undefined') {
      const sessionKeys = Object.keys(sessionStorage);
      let sessionClearedCount = 0;
      
      sessionKeys.forEach(key => {
        if (
          key.startsWith('instant_') || 
          key.includes('dashboard') || 
          key.includes('user-') ||
          key.includes('cache_')
        ) {
          sessionStorage.removeItem(key);
          sessionClearedCount++;
        }
      });
      
      console.log(`🗑️ Cleared ${sessionClearedCount} sessionStorage entries`);
    }
    
    console.log('✅ All cache systems cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear caches:', error);
    return false;
  }
}

/**
 * Clear cache for specific user role
 */
export function clearCacheForRole(role) {
  console.log(`🧹 Clearing cache for role: ${role}`);
  
  try {
    // Clear role-specific instant cache
    const cacheKey = INSTANT_CACHE_KEYS.DASHBOARD(role);
    clearInstantCache(cacheKey);
    
    // Clear role-specific patterns
    invalidateCache(`dashboard_${role}`);
    invalidateCache(`user-${role}`);
    
    // Clear localStorage for this role
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes(role) || key.includes(`instant_dashboard_${role}`)) {
          localStorage.removeItem(key);
        }
      });
    }
    
    console.log(`✅ Cache cleared for role: ${role}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to clear cache for role ${role}:`, error);
    return false;
  }
}

/**
 * Force refresh with complete cache clearing
 */
export function forceRefresh(refetchFunction) {
  console.log('🔄 Force refreshing with complete cache clear...');
  
  // Clear all caches first
  const cleared = clearAllCaches();
  
  if (cleared && refetchFunction) {
    // Small delay to ensure cache clearing is complete
    setTimeout(() => {
      refetchFunction();
      console.log('✅ Force refresh completed');
    }, 100);
  }
  
  return cleared;
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats() {
  if (typeof window === 'undefined') return {};
  
  const localStorageKeys = Object.keys(localStorage).filter(k => 
    k.startsWith('instant_') || 
    k.includes('dashboard') || 
    k.includes('user-') ||
    k.includes('cache_')
  );
  
  const sessionStorageKeys = Object.keys(sessionStorage).filter(k => 
    k.startsWith('instant_') || 
    k.includes('dashboard') || 
    k.includes('user-') ||
    k.includes('cache_')
  );
  
  return {
    localStorage: localStorageKeys.length,
    sessionStorage: sessionStorageKeys.length,
    total: localStorageKeys.length + sessionStorageKeys.length
  };
}

/**
 * Clear cache and show user feedback
 */
export function clearCacheWithFeedback(refetchFunction, showMessage = true) {
  const cleared = clearAllCaches();
  
  if (cleared && showMessage && typeof window !== 'undefined') {
    // Show temporary success message
    const message = document.createElement('div');
    message.textContent = '✅ Cache cleared successfully';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 9999;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }
  
  if (cleared && refetchFunction) {
    setTimeout(refetchFunction, 100);
  }
  
  return cleared;
}

