/**
 * Offline Data Sync Manager
 * Syncs ALL app data (inventory, parties, transactions) when online
 * Handles conflict resolution and ensures no data loss
 */

import { ref, onValue, update, push, set } from 'firebase/database';
import { db } from '../firebase';
import {
  loadOfflineStore,
  saveOfflineStore,
  getOfflinePendingChanges,
  clearOfflineFlags,
} from './offlineStore';

const PENDING_SYNC_KEY = 'meropasal_pending_syncs';

/**
 * Track pending sync operation
 */
export const addPendingSync = (operation) => {
  try {
    const pending = getPendingSyncs();
    pending.push({
      ...operation,
      _id: Math.random().toString(36).slice(2),
      _ts: Date.now(),
    });
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
  } catch (e) {
    console.error('Add pending sync error:', e);
  }
};

/**
 * Get all pending syncs
 */
export const getPendingSyncs = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * Clear pending syncs
 */
export const clearPendingSyncs = (ids) => {
  try {
    const pending = getPendingSyncs();
    const idSet = new Set(ids);
    const remaining = pending.filter(op => !idSet.has(op._id));
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
  } catch (e) {
    console.error('Clear pending sync error:', e);
  }
};

/**
 * Setup real-time listeners for ALL data
 */
export const setupAllDataListeners = (shopId) => {
  const unsubscribers = [];

  // Inventory listener
  const invRef = ref(db, `shops/${shopId}/inventory`);
  unsubscribers.push(
    onValue(invRef, (snap) => {
      const store = loadOfflineStore();
      store.inventory = snap.val() || {};
      store.lastSync = Date.now();
      saveOfflineStore(store);
    })
  );

  // Parties listener
  const partRef = ref(db, `shops/${shopId}/parties`);
  unsubscribers.push(
    onValue(partRef, (snap) => {
      const store = loadOfflineStore();
      store.parties = snap.val() || {};
      store.lastSync = Date.now();
      saveOfflineStore(store);
    })
  );

  // Transactions listener
  const txRef = ref(db, `shops/${shopId}/transactions`);
  unsubscribers.push(
    onValue(txRef, (snap) => {
      const store = loadOfflineStore();
      store.transactions = snap.val() || {};
      store.lastSync = Date.now();
      saveOfflineStore(store);
    })
  );

  // Members listener
  const memRef = ref(db, `shops/${shopId}/members`);
  unsubscribers.push(
    onValue(memRef, (snap) => {
      const store = loadOfflineStore();
      store.members = snap.val() || {};
      store.lastSync = Date.now();
      saveOfflineStore(store);
    })
  );

  return () => unsubscribers.forEach(unsub => unsub());
};

/**
 * Sync all pending changes to Firebase
 */
export const syncAllPendingChanges = async (shopId, onToast) => {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const pending = getPendingSyncs();
  let synced = 0;
  let failed = 0;
  const successIds = [];

  for (const op of pending) {
    try {
      if (op.type === 'inventory_update') {
        const invRef = ref(db, `shops/${shopId}/inventory/${op.id}`);
        await update(invRef, { ...op.data, updatedAt: Date.now() });
        successIds.push(op._id);
        synced++;
      } else if (op.type === 'party_update') {
        const parRef = ref(db, `shops/${shopId}/parties/${op.id}`);
        await update(parRef, { ...op.data, updatedAt: Date.now() });
        successIds.push(op._id);
        synced++;
      } else if (op.type === 'transaction_add') {
        const txRef = ref(db, `shops/${shopId}/transactions/${op.id}`);
        await set(txRef, { ...op.data, synced: true });
        successIds.push(op._id);
        synced++;
      }
    } catch (error) {
      console.error(`Sync failed for ${op.type}:`, error);
      failed++;
    }
  }

  if (successIds.length) {
    clearPendingSyncs(successIds);
    clearOfflineFlags(successIds);
  }

  if (synced > 0 && onToast) {
    onToast(`${synced} परिवर्तन सिंक भयो ✓`);
  }

  return { synced, failed };
};

/**
 * Smart operations that work offline & online
 */
export const smartAddInventory = async (shopId, itemData) => {
  if (navigator.onLine) {
    // Online: Add to Firebase directly
    const invRef = ref(db, `shops/${shopId}/inventory`);
    const result = await push(invRef, {
      ...itemData,
      createdAt: Date.now(),
    });
    return result.key;
  } else {
    // Offline: Save to local store and queue
    const id = `offline_${Date.now()}`;
    addPendingSync({
      type: 'inventory_update',
      id,
      data: { ...itemData, createdAt: Date.now() },
    });
    return id;
  }
};

export const smartUpdateInventory = async (shopId, id, itemData) => {
  if (navigator.onLine) {
    // Online: Update Firebase directly
    const invRef = ref(db, `shops/${shopId}/inventory/${id}`);
    await update(invRef, { ...itemData, updatedAt: Date.now() });
  } else {
    // Offline: Queue for later
    addPendingSync({
      type: 'inventory_update',
      id,
      data: { ...itemData, updatedAt: Date.now() },
    });
  }
};

export const smartAddParty = async (shopId, partyData) => {
  if (navigator.onLine) {
    const parRef = ref(db, `shops/${shopId}/parties`);
    const result = await push(parRef, {
      ...partyData,
      createdAt: Date.now(),
    });
    return result.key;
  } else {
    const id = `offline_${Date.now()}`;
    addPendingSync({
      type: 'party_update',
      id,
      data: { ...partyData, createdAt: Date.now() },
    });
    return id;
  }
};

export const smartAddTransaction = async (shopId, txData) => {
  if (navigator.onLine) {
    const txRef = ref(db, `shops/${shopId}/transactions`);
    const result = await push(txRef, {
      ...txData,
      createdAt: Date.now(),
    });
    return result.key;
  } else {
    const id = `offline_${Date.now()}`;
    addPendingSync({
      type: 'transaction_add',
      id,
      data: { ...txData, createdAt: Date.now() },
    });
    return id;
  }
};

/**
 * Get merged data (Firebase + offline cache)
 */
export const getMergedInventory = (fbData) => {
  const store = loadOfflineStore();
  return {
    ...store.inventory,
    ...fbData,
  };
};

export const getMergedParties = (fbData) => {
  const store = loadOfflineStore();
  return {
    ...store.parties,
    ...fbData,
  };
};

export const getMergedTransactions = (fbData) => {
  const store = loadOfflineStore();
  return {
    ...store.transactions,
    ...fbData,
  };
};

/**
 * Get offline mode info
 */
export const getOfflineModeInfo = () => {
  const isOnline = navigator.onLine;
  const pending = getPendingSyncs();
  
  return {
    isOnline,
    pendingChanges: pending.length,
    pendingDetails: pending.map(op => ({
      type: op.type,
      id: op.id,
      timestamp: op._ts,
    })),
  };
};

/**
 * Force sync attempt
 */
export const forceSyncAll = async (shopId, onToast) => {
  if (!navigator.onLine) {
    if (onToast) onToast('📵 इन्टरनेट जडान आवश्यक छ');
    return { synced: 0, failed: 0 };
  }

  const result = await syncAllPendingChanges(shopId, onToast);
  return result;
};
