import React, { createContext, useContext, useReducer, useCallback } from 'react';

const LoadingContext = createContext();

// Action types
const SET_LOADING = 'SET_LOADING';
const CLEAR_LOADING = 'CLEAR_LOADING';
const CLEAR_ALL_LOADING = 'CLEAR_ALL_LOADING';

// Initial state
const initialState = {
  loadingStates: {}
};

// Reducer
function loadingReducer(state, action) {
  switch (action.type) {
    case SET_LOADING:
      return {
        ...state,
        loadingStates: {
          ...state.loadingStates,
          [action.payload.key]: {
            loading: action.payload.loading,
            timestamp: Date.now(),
            source: action.payload.source || 'unknown'
          }
        }
      };
    
    case CLEAR_LOADING:
      const newLoadingStates = { ...state.loadingStates };
      delete newLoadingStates[action.payload.key];
      return {
        ...state,
        loadingStates: newLoadingStates
      };
    
    case CLEAR_ALL_LOADING:
      return {
        ...state,
        loadingStates: {}
      };
    
    default:
      return state;
  }
}

// Provider component
export function LoadingProvider({ children }) {
  const [state, dispatch] = useReducer(loadingReducer, initialState);

  const setLoading = useCallback((key, loading, source = 'component') => {
    dispatch({
      type: SET_LOADING,
      payload: { key, loading, source }
    });
  }, []);

  const clearLoading = useCallback((key) => {
    dispatch({
      type: CLEAR_LOADING,
      payload: { key }
    });
  }, []);

  const clearAllLoading = useCallback(() => {
    dispatch({ type: CLEAR_ALL_LOADING });
  }, []);

  const isLoading = useCallback((key) => {
    return state.loadingStates[key]?.loading || false;
  }, [state.loadingStates]);

  const hasAnyLoading = useCallback(() => {
    return Object.values(state.loadingStates).some(state => state.loading);
  }, [state.loadingStates]);

  // Get loading states for debugging
  const getLoadingStates = useCallback(() => {
    return state.loadingStates;
  }, [state.loadingStates]);

  const value = {
    setLoading,
    clearLoading,
    clearAllLoading,
    isLoading,
    hasAnyLoading,
    getLoadingStates
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

// Hook to use loading context
export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Hook for component-specific loading management
export function useComponentLoading(componentKey) {
  const { setLoading, clearLoading, isLoading } = useLoading();

  const setComponentLoading = useCallback((loading) => {
    setLoading(componentKey, loading, componentKey);
  }, [componentKey, setLoading]);

  const clearComponentLoading = useCallback(() => {
    clearLoading(componentKey);
  }, [componentKey, clearLoading]);

  const componentLoading = isLoading(componentKey);

  return {
    loading: componentLoading,
    setLoading: setComponentLoading,
    clearLoading: clearComponentLoading
  };
}