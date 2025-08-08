// Simple in-memory server-side cache with TTL, persisted across hot reloads via global

const getGlobalCacheStore = () => {
  if (!global.__SERVER_CACHE__) {
    global.__SERVER_CACHE__ = {
      store: new Map(), // key -> { value, expiresAt }
    };
  }
  return global.__SERVER_CACHE__;
};

export const getServerCache = (key) => {
  try {
    const { store } = getGlobalCacheStore();
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
};

export const setServerCache = (key, value, ttlMs = 60 * 1000) => {
  try {
    const { store } = getGlobalCacheStore();
    const expiresAt = Date.now() + ttlMs;
    store.set(key, { value, expiresAt });
  } catch {
    // no-op on failure
  }
};

export const clearServerCache = (key) => {
  try {
    const { store } = getGlobalCacheStore();
    if (key) {
      store.delete(key);
    } else {
      store.clear();
    }
  } catch {
    // no-op
  }
};

export const clearServerCachePattern = (pattern) => {
  try {
    const { store } = getGlobalCacheStore();
    const keysToDelete = [];
    
    for (const key of store.keys()) {
      if (typeof pattern === 'string' && key.includes(pattern)) {
        keysToDelete.push(key);
      } else if (pattern instanceof RegExp && pattern.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => store.delete(key));
    return keysToDelete.length;
  } catch {
    return 0;
  }
};

