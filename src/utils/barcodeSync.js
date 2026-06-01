/**
 * Barcode Sync Manager
 * Handles syncing barcode data between local cache and Firebase
 */

import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebase';
import {
  loadBarcodeCache,
  saveBarcodeCache,
  initBarcodeCache,
  markAsSynced,
  getUnsyncedBarcodes,
} from './barcodeCache';

const PENDING_SYNC_KEY = 'meropasal_barcode_pending_sync';

/**
 * Get pending sync operations
 */
export const getPendingSyncOps = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * Add pending sync operation
 */
const addPendingSyncOp = (op) => {
  const ops = getPendingSyncOps();
  ops.push({ ...op, _id: Math.random().toString(36).slice(2), _ts: Date.now() });
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(ops));
};

/**
 * Clear pending sync operations
 */
const clearPendingSyncOps = (opIds) => {
  const ops = getPendingSyncOps();
  const opIdSet = new Set(opIds);
  const remaining = ops.filter(op => !opIdSet.has(op._id));
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
};

/**
 * Track barcode update locally for later sync
 */
export const trackBarcodeUpdate = (shopId, productId, barcodeData) => {
  addPendingSyncOp({
    type: 'barcode_update',
    shopId,
    productId,
    data: barcodeData,
    createdAt: Date.now(),
  });
};

/**
 * Setup real-time barcode inventory sync from Firebase
 * Initializes cache and sets up listener
 */
export const setupBarcodeSyncListener = (shopId) => {
  const invRef = ref(db, `shops/${shopId}/inventory`);

  const unsubscribe = onValue(
    invRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const items = Object.entries(data).map(([id, item]) => ({
          id,
          ...item,
        }));

        // Update cache with server data
        initBarcodeCache(items);
        
        // Mark items as synced
        const ids = items.map(item => item.id);
        markAsSynced(ids);
      }
    },
    (error) => {
      console.error('Barcode sync listener error:', error);
    }
  );

  return unsubscribe;
};

/**
 * Flush pending barcode syncs to Firebase (when online)
 */
export const flushBarcodeSyncs = async (shopId, onToast) => {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const ops = getPendingSyncOps().filter(op => op.shopId === shopId);
  if (!ops.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const successOpIds = [];

  for (const op of ops) {
    try {
      if (op.type === 'barcode_update') {
        const invRef = ref(db, `shops/${shopId}/inventory/${op.productId}`);
        await update(invRef, {
          barcode: op.data.barcode,
          updatedAt: Date.now(),
        });
        successOpIds.push(op._id);
        synced++;
      }
    } catch (error) {
      console.error('Barcode sync failed:', error);
      failed++;
    }
  }

  if (successOpIds.length) {
    clearPendingSyncOps(successOpIds);
  }

  if (synced && onToast) {
    onToast(`${synced} बारकोड सिंक भयो ✓`);
  }

  return { synced, failed };
};

/**
 * Validate barcode data integrity
 */
export const validateBarcodeIntegrity = (barcode) => {
  if (!barcode) return false;
  
  // EAN-13 checksum validation
  if (/^\d{13}$/.test(barcode)) {
    const digits = barcode.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === digits[12];
  }

  // EAN-8 checksum validation
  if (/^\d{8}$/.test(barcode)) {
    const digits = barcode.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === digits[7];
  }

  // Accept other formats (CODE128, CODE39, etc.) as valid
  return barcode.length >= 3 && barcode.length <= 30;
};

/**
 * Detect barcode format
 */
export const detectBarcodeFormat = (barcode) => {
  const len = barcode.length;
  const isNumeric = /^\d+$/.test(barcode);

  if (isNumeric) {
    if (len === 13) return 'EAN-13';
    if (len === 12) return 'UPC-A';
    if (len === 8) return 'EAN-8';
    if (len === 5 || len === 2) return 'Supplement';
  }

  if (/^[0-9A-Z\-. $/+%]+$/.test(barcode)) {
    if (len >= 4 && len <= 20) return 'CODE-128';
    if (len >= 5 && len <= 80) return 'CODE-39';
  }

  return 'Unknown';
};

/**
 * Generate EAN-13 barcode checksum
 */
export const generateEAN13Checksum = (barcode12) => {
  if (barcode12.length !== 12 || !/^\d+$/.test(barcode12)) {
    return null;
  }

  const digits = barcode12.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return barcode12 + checkDigit;
};

/**
 * Get sync status for a product
 */
export const getProductBarcodeStatus = (productId) => {
  const cache = loadBarcodeCache();
  const entry = cache.find(e => e.id === productId);
  
  return {
    exists: !!entry,
    barcode: entry?.barcode || null,
    synced: entry?.synced !== false,
    lastUpdated: entry?.updatedAt || null,
  };
};

/**
 * Clear all barcode sync operations (use with caution)
 */
export const clearBarcodeSyncQueue = () => {
  localStorage.removeItem(PENDING_SYNC_KEY);
};

/**
 * Get queue statistics
 */
export const getBarcodeSyncStats = () => {
  const pendingOps = getPendingSyncOps();
  const cache = loadBarcodeCache();
  const unsynced = cache.filter(e => e.synced === false);

  return {
    pendingOps: pendingOps.length,
    unsyncedEntries: unsynced.length,
    totalCacheSize: new Blob([JSON.stringify(cache)]).size,
    queueSize: new Blob([JSON.stringify(pendingOps)]).size,
  };
};
