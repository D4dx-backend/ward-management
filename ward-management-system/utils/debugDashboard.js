/**
 * Debug utilities for dashboard issues
 */

export async function testDashboardAPI() {
  try {
    console.log('Testing dashboard API...');
    
    const response = await fetch('/api/dashboard/stats');
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return { error: `${response.status}: ${errorText}` };
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    
    return { success: true, data };
  } catch (error) {
    console.error('Fetch error:', error);
    return { error: error.message };
  }
}

export function debugCacheState() {
  if (typeof window === 'undefined') return;
  
  console.log('=== CACHE DEBUG ===');
  
  // Check localStorage
  const localStorageKeys = Object.keys(localStorage).filter(k => k.includes('instant') || k.includes('dashboard'));
  console.log('LocalStorage keys:', localStorageKeys);
  
  localStorageKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      const parsed = JSON.parse(value);
      console.log(`${key}:`, parsed);
    } catch (e) {
      console.log(`${key}: (parse error)`, localStorage.getItem(key));
    }
  });
  
  // Check sessionStorage
  const sessionStorageKeys = Object.keys(sessionStorage).filter(k => k.includes('instant') || k.includes('dashboard'));
  console.log('SessionStorage keys:', sessionStorageKeys);
  
  sessionStorageKeys.forEach(key => {
    try {
      const value = sessionStorage.getItem(key);
      const parsed = JSON.parse(value);
      console.log(`${key}:`, parsed);
    } catch (e) {
      console.log(`${key}: (parse error)`, sessionStorage.getItem(key));
    }
  });
}

export function clearAllDashboardCache() {
  if (typeof window === 'undefined') return;
  
  console.log('Clearing all dashboard cache...');
  
  // Clear localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('instant') || key.includes('dashboard')) {
      localStorage.removeItem(key);
      console.log('Removed from localStorage:', key);
    }
  });
  
  // Clear sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('instant') || key.includes('dashboard')) {
      sessionStorage.removeItem(key);
      console.log('Removed from sessionStorage:', key);
    }
  });
  
  console.log('Cache cleared. Refresh the page to fetch fresh data.');
}