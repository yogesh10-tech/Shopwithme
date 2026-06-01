/**
 * Barcode Cache Manager
 * Stores barcode data locally for offline access and syncs when online
 * Ensures data safety with versioning and checksums
 */

const CACHE_KEY = 'meropasal_barcode_cache';

/**
 * Generate checksum for data integrity verification
 */
const generateChecksum = (data) => {
  const str = JSON.stringify(Object.values(data).sort((a, b) => a.id.localeCompare(b.id)));
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

/**
 * Load barcode cache from localStorage
 */
export const loadBarcodeCache = () => {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    
    if (!parsed.entries || typeof parsed.entries !== 'object') return [];
    
    return Object.values(parsed.entries);
  } catch (e) {
    console.error('Barcode cache load error:', e);
    return [];
  }
};

/**
 * Save barcode cache to localStorage
 */
export const saveBarcodeCache = (entries) => {
  try {
    const entriesMap = {};
    entries.forEach(e => {
      entriesMap[e.id] = e;
    });

    const cacheData = {
      version: 1,
      lastSync: Date.now(),
      entries: entriesMap,
      checksum: generateChecksum(entriesMap),
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    return true;
  } catch (e) {
    console.error('Barcode cache save error:', e);
    return false;
  }
};

/**
 * Update a single barcode entry in cache
 */
export const updateBarcodeCacheEntry = (entry) => {
  const cache = loadBarcodeCache();
  const index = cache.findIndex(e => e.id === entry.id);
  
  if (index >= 0) {
    cache[index] = { ...entry, synced: false };
  } else {
    cache.push({ ...entry, synced: false });
  }
  
  saveBarcodeCache(cache);
};

/**
 * Get all synced entries (updates from server)
 */
export const getSyncedBarcodes = () => {
  return loadBarcodeCache().filter(e => e.synced !== false);
};

/**
 * Get all unsynced entries (local changes)
 */
export const getUnsyncedBarcodes = () => {
  return loadBarcodeCache().filter(e => e.synced === false);
};

/**
 * Search barcodes in cache
 */
export const searchBarcodes = (query) => {
  const cache = loadBarcodeCache();
  const q = query.toLowerCase();
  
  return cache.filter(entry =>
    entry.barcode.toLowerCase().includes(q) ||
    entry.name.toLowerCase().includes(q) ||
    (entry.category && entry.category.toLowerCase().includes(q))
  );
};

/**
 * Find barcode entry by barcode code
 */
export const findByBarcode = (barcode) => {
  const cache = loadBarcodeCache();
  return cache.find(e => e.barcode === barcode) || null;
};

/**
 * Find barcode entry by product ID
 */
export const findById = (id) => {
  const cache = loadBarcodeCache();
  return cache.find(e => e.id === id) || null;
};

/**
 * Clear all barcode cache (use with caution)
 */
export const clearBarcodeCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    return true;
  } catch (e) {
    console.error('Barcode cache clear error:', e);
    return false;
  }
};

/**
 * Get cache statistics
 */
export const getBarcodeCacheStats = () => {
  const cache = loadBarcodeCache();
  const data = localStorage.getItem(CACHE_KEY);
  const parsed = data ? JSON.parse(data) : {};
  
  return {
    total: cache.length,
    synced: cache.filter(e => e.synced !== false).length,
    unsynced: cache.filter(e => e.synced === false).length,
    lastSync: parsed.lastSync || null,
    checksum: parsed.checksum || null,
    cacheSize: data ? new Blob([data]).size : 0,
  };
};

/**
 * Mark entries as synced (after successful sync with Firebase)
 */
export const markAsSynced = (ids) => {
  const cache = loadBarcodeCache();
  const idSet = new Set(ids);
  
  cache.forEach(entry => {
    if (idSet.has(entry.id)) {
      entry.synced = true;
    }
  });
  
  saveBarcodeCache(cache);
};

/**
 * Initialize cache from inventory items (from Firebase)
 */
export const initBarcodeCache = (items) => {
  const cache = loadBarcodeCache();
  const cacheMap = new Map(cache.map(e => [e.id, e]));
  
  items.forEach(item => {
    if (item.barcode) {
      cacheMap.set(item.id, {
        id: item.id,
        barcode: item.barcode,
        name: item.name,
        category: item.category,
        sellP: item.sellP || 0,
        stock: item.stock || 0,
        unit: item.unit || 'पिस',
        buyP: item.buyP || 0,
        minStock: item.minStock || 0,
        updatedAt: item.updatedAt || Date.now(),
        synced: true,
      });
    }
  });
  
  saveBarcodeCache(Array.from(cacheMap.values()));
};

/**
 * Get cache sync status
 */
export const getCacheSyncStatus = () => {
  const stats = getBarcodeCacheStats();
  return {
    isSynced: stats.unsynced === 0,
    pendingCount: stats.unsynced,
    totalCount: stats.total,
    lastSync: stats.lastSync,
  };
};
