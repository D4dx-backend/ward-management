import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { getCache, setCache } from '../lib/simpleCache';

const AppStateContext = createContext();

// Action types
const SET_PAGE_DATA = 'SET_PAGE_DATA';
const SET_LOADING = 'SET_LOADING';
const SET_ERROR = 'SET_ERROR';
const CLEAR_PAGE_DATA = 'CLEAR_PAGE_DATA';

// Initial state
const initialState = {
  pageData: {},
  loading: {},
  errors: {}
};

// Reducer
function appStateReducer(state, action) {
  switch (action.type) {
    case SET_PAGE_DATA:
      return {
        ...state,
        pageData: {
          ...state.pageData,
          [action.payload.key]: action.payload.data
        },
        loading: {
          ...state.loading,
          [action.payload.key]: false
        },
        errors: {
          ...state.errors,
          [action.payload.key]: null
        }
      };
    
    case SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.loading
        }
      };
    
    case SET_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.error
        },
        loading: {
          ...state.loading,
          [action.payload.key]: false
        }
      };
    
    case CLEAR_PAGE_DATA:
      const newPageData = { ...state.pageData };
      const newLoading = { ...state.loading };
      const newErrors = { ...state.errors };
      
      if (action.payload.key) {
        delete newPageData[action.payload.key];
        delete newLoading[action.payload.key];
        delete newErrors[action.payload.key];
      } else {
        // Clear all
        return initialState;
      }
      
      return {
        ...state,
        pageData: newPageData,
        loading: newLoading,
        errors: newErrors
      };
    
    default:
      return state;
  }
}

// Provider component
export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  // Load cached data on mount
  useEffect(() => {
    const cachedState = getCache('app_state');
    if (cachedState) {
      Object.entries(cachedState.pageData || {}).forEach(([key, data]) => {
        dispatch({
          type: SET_PAGE_DATA,
          payload: { key, data }
        });
      });
    }
  }, []);

  // Cache state changes
  useEffect(() => {
    setCache('app_state', state, 2 * 60 * 60 * 1000); // Cache for 2 hours
  }, [state]);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

// Hook to use app state
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

// Hook for page-specific data management
export function usePageData(pageKey, fetcher, options = {}) {
  const { state, dispatch } = useAppState();
  const { ttl = 60 * 60 * 1000, dependencies = [] } = options;

  const data = state.pageData[pageKey];
  const loading = state.loading[pageKey] || false;
  const error = state.errors[pageKey] || null;

  const fetchData = async (force = false) => {
    // If we have data and not forcing, return existing data
    if (!force && data) {
      return data;
    }

    dispatch({
      type: SET_LOADING,
      payload: { key: pageKey, loading: true }
    });

    try {
      const result = await fetcher();
      
      // Cache the result
      setCache(pageKey, result, ttl);
      
      dispatch({
        type: SET_PAGE_DATA,
        payload: { key: pageKey, data: result }
      });
      
      return result;
    } catch (err) {
      dispatch({
        type: SET_ERROR,
        payload: { key: pageKey, error: err }
      });
      throw err;
    }
  };

  // Auto-fetch on mount if no data exists
  useEffect(() => {
    if (!data && !loading && !error) {
      fetchData();
    }
  }, [pageKey, ...dependencies]);

  const refresh = () => fetchData(true);
  
  const clearData = () => {
    dispatch({
      type: CLEAR_PAGE_DATA,
      payload: { key: pageKey }
    });
  };

  return {
    data,
    loading,
    error,
    refresh,
    clearData
  };
}