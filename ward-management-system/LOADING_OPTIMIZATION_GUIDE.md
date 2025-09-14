# Loading Optimization Guide

## Problem Solved
This guide addresses the loading issues that occur when users switch between browser tabs, navigate away from pages, or return to previously visited pages. The main issues were:

1. **Unnecessary loading states** when switching tabs
2. **Data refetching** on every page focus
3. **Loading flicker** during quick navigation
4. **Poor user experience** with constant loading indicators

## Solutions Implemented

### 1. Smart Page Visibility Management (`hooks/usePageVisibility.js`)

**Purpose**: Prevents unnecessary loading states when switching tabs or windows.

**Key Features**:
- Tracks page visibility state
- Calculates hidden duration
- Determines when data should be refreshed
- Prevents loading flicker on quick tab switches

**Usage**:
```javascript
import { usePageVisibility, useStableLoading } from '../hooks/usePageVisibility';

function MyComponent() {
  const { isVisible, shouldRefreshData } = usePageVisibility();
  const { loading, setLoading } = useStableLoading(false);
  
  // Only refresh if page was hidden for more than 5 minutes
  if (isVisible && shouldRefreshData(5 * 60 * 1000)) {
    // Refresh data
  }
}
```

### 2. Smart Data Fetching (`hooks/useSmartFetch.js`)

**Purpose**: Intelligent data fetching that prevents unnecessary API calls and loading states.

**Key Features**:
- Smart caching with configurable TTL
- Request deduplication
- Stale-while-revalidate pattern
- Silent background refresh
- Automatic retry logic

**Usage**:
```javascript
import { useSmartFetch, useSmartDashboard } from '../hooks/useSmartFetch';

// For general data fetching
const { data, loading, error, refresh } = useSmartFetch(
  'my-data-key',
  async ({ signal }) => {
    const response = await fetch('/api/data', { signal });
    return response.json();
  },
  {
    ttl: 30 * 60 * 1000, // 30 minutes
    staleWhileRevalidate: true,
    refreshOnFocus: true
  }
);

// For dashboard data (optimized)
const { data, loading, error } = useSmartDashboard('wardAdmin');
```

### 3. Enhanced Loading Context (`contexts/LoadingContext.js`)

**Purpose**: Centralized loading state management to prevent conflicts and provide better debugging.

**Key Features**:
- Global loading state management
- Component-specific loading states
- Loading state debugging
- Automatic cleanup

**Usage**:
```javascript
import { useLoading, useComponentLoading } from '../contexts/LoadingContext';

// Global loading management
function MyComponent() {
  const { setLoading, isLoading } = useLoading();
  
  const fetchData = async () => {
    setLoading('my-component', true);
    try {
      // Fetch data
    } finally {
      setLoading('my-component', false);
    }
  };
}

// Component-specific loading
function MyOtherComponent() {
  const { loading, setLoading } = useComponentLoading('my-other-component');
  
  // Use loading state directly
}
```

### 4. Enhanced App Component (`pages/_app.js`)

**Improvements**:
- Debounced navigation indicators
- Better visibility change handling
- Custom events for page visibility
- Smoother loading transitions

### 5. Optimized Dashboard Hook (`hooks/useApiData.js`)

**Improvements**:
- Smart caching based on user role
- Silent background refresh
- Stale data handling
- Better error recovery

## Best Practices for Developers

### 1. Use Smart Fetching for All Data
Replace traditional `useState` + `useEffect` patterns:

```javascript
// ❌ Old way (causes loading issues)
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchData();
}, []);

// ✅ New way (optimized)
const { data, loading, error } = useSmartFetch('cache-key', fetcher, options);
```

### 2. Configure Appropriate Cache TTL
Different data types need different cache durations:

```javascript
// Frequently changing data (dashboard stats)
const options = { ttl: 2 * 60 * 1000 }; // 2 minutes

// Moderately changing data (reports, users)
const options = { ttl: 30 * 60 * 1000 }; // 30 minutes

// Rarely changing data (wards, settings)
const options = { ttl: 2 * 60 * 60 * 1000 }; // 2 hours
```

### 3. Use Stable Loading for UI Components
Prevent loading flicker in components:

```javascript
const { loading } = useStableLoading(initialLoading);

// This loading state won't flicker on quick tab switches
if (loading) {
  return <LoadingSpinner />;
}
```

### 4. Implement Silent Refresh for Background Updates
Keep data fresh without showing loading states:

```javascript
const { data, silentRefresh } = useSmartFetch(key, fetcher, {
  staleWhileRevalidate: true,
  refreshOnFocus: true
});

// Data updates in background without loading indicators
```

## Testing the Fixes

### 1. Tab Switching Test
1. Navigate to any dashboard page
2. Switch to another browser tab for 10 seconds
3. Return to the dashboard tab
4. **Expected**: No loading spinner should appear

### 2. Page Navigation Test
1. Navigate to a data-heavy page (e.g., `/admin/users`)
2. Go to another page
3. Return to the original page
4. **Expected**: Data should load instantly from cache

### 3. Background Refresh Test
1. Stay on a dashboard page for 5+ minutes
2. Switch tabs and return
3. **Expected**: Data refreshes silently in background

### 4. Network Error Recovery Test
1. Disconnect internet
2. Try to refresh data
3. Reconnect internet
4. **Expected**: Automatic retry and recovery

## Performance Improvements

### Before Optimization
- ❌ Loading spinner on every tab switch
- ❌ API calls on every page focus
- ❌ Data refetch on page revisit
- ❌ Multiple simultaneous requests
- ❌ Poor user experience

### After Optimization
- ✅ No loading flicker on tab switches
- ✅ Smart cache-based data loading
- ✅ Background refresh without loading states
- ✅ Request deduplication
- ✅ Smooth, responsive user experience

## Monitoring and Debugging

### Loading State Debugging
Use the loading context to debug loading states:

```javascript
const { getLoadingStates } = useLoading();

// In development, log loading states
console.log('Current loading states:', getLoadingStates());
```

### Cache Debugging
Monitor cache effectiveness:

```javascript
// Check cache hit/miss ratio
const cachedData = getCache('my-key');
console.log('Cache hit:', !!cachedData);
```

### Performance Monitoring
Track loading performance:

```javascript
const startTime = performance.now();
// ... data loading
const endTime = performance.now();
console.log('Loading time:', endTime - startTime, 'ms');
```

## Migration Checklist

For existing components, follow this checklist:

- [ ] Replace `useState` + `useEffect` with `useSmartFetch`
- [ ] Configure appropriate cache TTL
- [ ] Use `useStableLoading` for UI loading states
- [ ] Implement error handling
- [ ] Add loading state debugging
- [ ] Test tab switching behavior
- [ ] Test page navigation behavior
- [ ] Verify background refresh works

## Common Issues and Solutions

### Issue: Loading state still shows on tab switch
**Solution**: Use `useStableLoading` instead of direct loading state

### Issue: Data not refreshing when needed
**Solution**: Reduce cache TTL or implement manual refresh

### Issue: Multiple API calls for same data
**Solution**: Use `useDedupedFetch` for request deduplication

### Issue: Loading flicker during navigation
**Solution**: Ensure proper cache key management and TTL configuration

## Conclusion

These optimizations transform the app from a "reload-heavy" experience to a smooth, responsive application that intelligently manages data freshness while providing instant access to previously loaded content. Users can now navigate freely without worrying about losing their place or waiting for data to reload unnecessarily.