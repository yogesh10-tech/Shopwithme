/**
 * Comprehensive Offline Store
 * Caches ALL app data locally - inventory, parties, transactions, bills
 * Syncs everything when online
 * Complete offline-first architecture
 */

const STORE_KEY = 'meropasal_offline_store';

/**
 * Initialize offline store with all data types
 */
export const initOfflineStore = (shopData) => {
  try {
    const store = loadOfflineStore();
    
    if (shopData.inventory) {
      store.inventory = shopData.inventory;
    }
    if (shopData.parties) {
      store.parties = shopData.parties;
    }
    if (shopData.transactions) {
      store.transactions = shopData.transactions;
    }
    if (shopData.members) {
      store.members = shopData.members;
    }
    if (shopData.settings) {
      store.settings = shopData.settings;
    }
    
    store.lastSync = Date.now();
    saveOfflineStore(store);
    
    return store;
  } catch (e) {
    console.error('Offline store init error:', e);
    return null;
  }
};

/**
 * Load entire offline store
 */
export const loadOfflineStore = () => {
  try {
    const data = localStorage.getItem(STORE_KEY);
    if (!data) {
      return {
        inventory: {},
        parties: {},
        transactions: {},
        members: {},
        settings: {},
        lastSync: null,
        lastModified: Date.now(),
      };
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Offline store load error:', e);
    return {
      inventory: {},
      parties: {},
      transactions: {},
      members: {},
      settings: {},
      lastSync: null,
      lastModified: Date.now(),
    };
  }
};

/**
 * Save entire offline store
 */
export const saveOfflineStore = (store) => {
  try {
    const toSave = {
      ...store,
      lastModified: Date.now(),
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(toSave));
    return true;
  } catch (e) {
    console.error('Offline store save error:', e);
    return false;
  }
};

/**
 * Get inventory from offline store
 */
export const getOfflineInventory = () => {
  const store = loadOfflineStore();
  return store.inventory || {};
};

/**
 * Get parties/customers from offline store
 */
export const getOfflineParties = () => {
  const store = loadOfflineStore();
  return store.parties || {};
};

/**
 * Get transactions from offline store
 */
export const getOfflineTransactions = () => {
  const store = loadOfflineStore();
  return store.transactions || {};
};

/**
 * Get members from offline store
 */
export const getOfflineMembers = () => {
  const store = loadOfflineStore();
  return store.members || {};
};

/**
 * Add/update item in offline inventory
 */
export const updateOfflineInventory = (id, itemData) => {
  const store = loadOfflineStore();
  store.inventory = store.inventory || {};
  store.inventory[id] = {
    ...store.inventory[id],
    ...itemData,
    updatedAt: Date.now(),
  };
  saveOfflineStore(store);
};

/**
 * Add/update party in offline store
 */
export const updateOfflineParty = (id, partyData) => {
  const store = loadOfflineStore();
  store.parties = store.parties || {};
  store.parties[id] = {
    ...store.parties[id],
    ...partyData,
    updatedAt: Date.now(),
  };
  saveOfflineStore(store);
};

/**
 * Add transaction in offline store
 */
export const addOfflineTransaction = (id, txData) => {
  const store = loadOfflineStore();
  store.transactions = store.transactions || {};
  store.transactions[id] = {
    ...txData,
    createdAt: Date.now(),
    _offline: true,
  };
  saveOfflineStore(store);
};

/**
 * Search inventory offline
 */
export const searchOfflineInventory = (query) => {
  const inventory = getOfflineInventory();
  const q = query.toLowerCase();
  
  return Object.values(inventory).filter(item =>
    (item.name && item.name.toLowerCase().includes(q)) ||
    (item.barcode && item.barcode.toLowerCase().includes(q)) ||
    (item.category && item.category.toLowerCase().includes(q))
  );
};

/**
 * Get item by ID offline
 */
export const getOfflineItem = (id) => {
  const inventory = getOfflineInventory();
  return inventory[id] || null;
};

/**
 * Get party by ID offline
 */
export const getOfflineParty = (id) => {
  const parties = getOfflineParties();
  return parties[id] || null;
};

/**
 * Get transaction by ID offline
 */
export const getOfflineTransaction = (id) => {
  const transactions = getOfflineTransactions();
  return transactions[id] || null;
};

/**
 * Get all offline transactions by type
 */
export const getOfflineTransactionsByType = (type) => {
  const transactions = getOfflineTransactions();
  return Object.values(transactions).filter(tx => tx.type === type);
};

/**
 * Calculate totals offline (for dashboard)
 */
export const calculateOfflineTotals = () => {
  const transactions = getOfflineTransactions();
  const sales = Object.values(transactions).filter(tx => tx.type === 'sale');
  const purchases = Object.values(transactions).filter(tx => tx.type === 'purchase');
  
  const totalSales = sales.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
  const totalPurchases = purchases.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
  
  return {
    totalSales,
    totalPurchases,
    saleCount: sales.length,
    purchaseCount: purchases.length,
  };
};

/**
 * Get inventory value offline
 */
export const getOfflineInventoryValue = () => {
  const inventory = getOfflineInventory();
  return Object.values(inventory).reduce((sum, item) => {
    return sum + ((item.stock || 0) * (item.sellP || 0));
  }, 0);
};

/**
 * Low stock items check offline
 */
export const getOfflineLowStock = () => {
  const inventory = getOfflineInventory();
  return Object.values(inventory).filter(item =>
    item.minStock > 0 && (item.stock || 0) <= item.minStock
  );
};

/**
 * Get pending offline changes (for sync)
 */
export const getOfflinePendingChanges = () => {
  const store = loadOfflineStore();
  const pending = [];
  
  // Find inventory items marked as offline
  Object.entries(store.inventory || {}).forEach(([id, item]) => {
    if (item._offline) {
      pending.push({ type: 'inventory', id, data: item });
    }
  });
  
  // Find parties marked as offline
  Object.entries(store.parties || {}).forEach(([id, party]) => {
    if (party._offline) {
      pending.push({ type: 'party', id, data: party });
    }
  });
  
  // Find transactions marked as offline
  Object.entries(store.transactions || {}).forEach(([id, tx]) => {
    if (tx._offline) {
      pending.push({ type: 'transaction', id, data: tx });
    }
  });
  
  return pending;
};

/**
 * Clear offline flag after sync
 */
export const clearOfflineFlags = (ids) => {
  const store = loadOfflineStore();
  
  ids.forEach(id => {
    // Clear from inventory
    if (store.inventory && store.inventory[id]) {
      delete store.inventory[id]._offline;
    }
    // Clear from parties
    if (store.parties && store.parties[id]) {
      delete store.parties[id]._offline;
    }
    // Clear from transactions
    if (store.transactions && store.transactions[id]) {
      delete store.transactions[id]._offline;
    }
  });
  
  store.lastSync = Date.now();
  saveOfflineStore(store);
};

/**
 * Get offline store stats
 */
export const getOfflineStoreStats = () => {
  const store = loadOfflineStore();
  const data = JSON.stringify(store);
  
  return {
    inventoryItems: Object.keys(store.inventory || {}).length,
    parties: Object.keys(store.parties || {}).length,
    transactions: Object.keys(store.transactions || {}).length,
    storageSize: new Blob([data]).size,
    lastSync: store.lastSync,
    lastModified: store.lastModified,
  };
};

/**
 * Export offline data as JSON (backup)
 */
export const exportOfflineData = () => {
  const store = loadOfflineStore();
  return JSON.stringify(store, null, 2);
};

/**
 * Import offline data from JSON (restore)
 */
export const importOfflineData = (jsonData) => {
  try {
    const imported = JSON.parse(jsonData);
    saveOfflineStore(imported);
    return true;
  } catch (e) {
    console.error('Import error:', e);
    return false;
  }
};

/**
 * Clear entire offline store (use with caution)
 */
export const clearOfflineStore = () => {
  try {
    localStorage.removeItem(STORE_KEY);
    return true;
  } catch (e) {
    console.error('Clear store error:', e);
    return false;
  }
};

/**
 * Detect if data is stale (not synced recently)
 */
export const isDataStale = (hoursThreshold = 24) => {
  const store = loadOfflineStore();
  if (!store.lastSync) return true;
  
  const hoursSinceSync = (Date.now() - store.lastSync) / (1000 * 60 * 60);
  return hoursSinceSync > hoursThreshold;
};

/**
 * Get offline mode status
 */
export const getOfflineStatus = () => {
  const isOnline = navigator.onLine;
  const stats = getOfflineStoreStats();
  const stale = isDataStale();
  
  return {
    isOnline,
    hasCachedData: stats.inventoryItems > 0 || stats.parties > 0,
    cacheSize: stats.storageSize,
    lastSync: stats.lastSync,
    isStale: stale,
    pendingChanges: getOfflinePendingChanges().length,
  };
};
