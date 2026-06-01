/**
 * Barcode Inventory Sync Manager
 * Tracks barcode scans and syncs with inventory quantities
 */

const SCAN_HISTORY_KEY = 'meropasal_barcode_scan_history';
const INVENTORY_ALERT_KEY = 'meropasal_barcode_inventory_alerts';

/**
 * Record a barcode scan (incoming/outgoing)
 */
export const recordBarcodeScan = (productId, quantity = 1, type = 'sale') => {
  try {
    const history = getScanHistory();
    
    history.push({
      productId,
      quantity,
      type, // 'sale', 'purchase', 'adjustment', 'return'
      timestamp: Date.now(),
      _id: Math.random().toString(36).slice(2),
    });

    localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Failed to record barcode scan:', error);
    return false;
  }
};

/**
 * Get scan history for a product
 */
export const getProductScanHistory = (productId, daysBack = 30) => {
  const history = getScanHistory();
  const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000;

  return history.filter((scan) => 
    scan.productId === productId && scan.timestamp >= cutoffTime
  );
};

/**
 * Get total scans for a product
 */
export const getProductScanCount = (productId, daysBack = 30) => {
  const history = getProductScanHistory(productId, daysBack);
  const counts = { sale: 0, purchase: 0, adjustment: 0, return: 0 };

  history.forEach((scan) => {
    if (counts.hasOwnProperty(scan.type)) {
      counts[scan.type] += scan.quantity;
    }
  });

  return counts;
};

/**
 * Get all scan history
 */
export const getScanHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(SCAN_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * Clear old scan history (older than specified days)
 */
export const clearOldScanHistory = (daysBack = 90) => {
  try {
    const history = getScanHistory();
    const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000;
    const filtered = history.filter((scan) => scan.timestamp >= cutoffTime);
    localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(filtered));
    return history.length - filtered.length; // Return number deleted
  } catch (error) {
    console.error('Failed to clear scan history:', error);
    return 0;
  }
};

/**
 * Set low stock alert for a product
 */
export const setLowStockAlert = (productId, threshold) => {
  try {
    const alerts = getLowStockAlerts();
    alerts[productId] = {
      threshold,
      createdAt: Date.now(),
      triggered: false,
      lastNotified: null,
    };
    localStorage.setItem(INVENTORY_ALERT_KEY, JSON.stringify(alerts));
    return true;
  } catch (error) {
    console.error('Failed to set alert:', error);
    return false;
  }
};

/**
 * Get low stock alerts
 */
export const getLowStockAlerts = () => {
  try {
    return JSON.parse(localStorage.getItem(INVENTORY_ALERT_KEY) || '{}');
  } catch {
    return {};
  }
};

/**
 * Check stock against alerts
 */
export const checkStockAlerts = (products) => {
  const alerts = getLowStockAlerts();
  const triggered = [];

  products.forEach((product) => {
    if (alerts[product.id]) {
      const { threshold } = alerts[product.id];
      if (product.stock <= threshold) {
        triggered.push({
          productId: product.id,
          productName: product.name,
          currentStock: product.stock,
          threshold: threshold,
          barcode: product.barcode,
        });
      }
    }
  });

  return triggered;
};

/**
 * Get barcode usage statistics
 */
export const getBarcodeUsageStats = (products) => {
  const history = getScanHistory();
  const stats = {
    mostScanned: [],
    leastScanned: [],
    totalScans: history.length,
    scannedProducts: 0,
    unscannedProducts: 0,
  };

  const productScans = {};

  history.forEach((scan) => {
    if (!productScans[scan.productId]) {
      productScans[scan.productId] = 0;
    }
    productScans[scan.productId] += scan.quantity;
  });

  stats.scannedProducts = Object.keys(productScans).length;
  stats.unscannedProducts = products.length - stats.scannedProducts;

  // Get most scanned
  const sorted = Object.entries(productScans)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  stats.mostScanned = sorted.map(([productId, count]) => {
    const product = products.find((p) => p.id === productId);
    return {
      productId,
      productName: product?.name || 'Unknown',
      barcode: product?.barcode || 'N/A',
      scans: count,
    };
  });

  // Get unscanned products
  stats.leastScanned = products
    .filter((p) => !productScans[p.id] && p.barcode)
    .slice(0, 10)
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      barcode: p.barcode,
      scans: 0,
    }));

  return stats;
};

/**
 * Sync barcode scans to Firebase (when online)
 * Returns { synced: count, failed: count }
 */
export const syncBarcodeScanToFirebase = async (shopId, db, ref, update) => {
  try {
    const history = getScanHistory();
    if (history.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    // Group scans by product
    const scansByProduct = {};
    history.forEach((scan) => {
      if (!scansByProduct[scan.productId]) {
        scansByProduct[scan.productId] = [];
      }
      scansByProduct[scan.productId].push(scan);
    });

    // Update inventory with scan data
    for (const [productId, scans] of Object.entries(scansByProduct)) {
      try {
        const totalSales = scans
          .filter((s) => s.type === 'sale')
          .reduce((sum, s) => sum + s.quantity, 0);

        if (totalSales > 0) {
          const productRef = ref(db, `shops/${shopId}/inventory/${productId}`);
          await update(productRef, {
            lastBarcodeSync: Date.now(),
            recentScans: totalSales,
          });
          synced++;
        }
      } catch (error) {
        console.error(`Failed to sync scans for product ${productId}:`, error);
        failed++;
      }
    }

    // Clear after successful sync
    if (synced > 0) {
      localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify([]));
    }

    return { synced, failed };
  } catch (error) {
    console.error('Failed to sync barcode scans:', error);
    return { synced: 0, failed: 0 };
  }
};

/**
 * Get product barcode status summary
 */
export const getProductBarcodeStatus = (productId) => {
  const history = getProductScanHistory(productId, 30);
  const counts = getProductScanCount(productId, 30);

  return {
    productId,
    totalScans: history.length,
    scansByType: counts,
    lastScanned: history.length > 0 ? history[history.length - 1].timestamp : null,
    firstScanned: history.length > 0 ? history[0].timestamp : null,
    averageScansPerDay: history.length > 0 ? Math.round(history.length / 30) : 0,
  };
};

/**
 * Generate inventory report with barcode data
 */
export const generateInventoryBarcodeReport = (products) => {
  const alerts = checkStockAlerts(products);
  const stats = getBarcodeUsageStats(products);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalProducts: products.length,
      productsWithBarcodes: products.filter((p) => p.barcode).length,
      productsWithoutBarcodes: products.filter((p) => !p.barcode).length,
      lowStockAlerts: alerts.length,
      totalScans: stats.totalScans,
    },
    lowStockItems: alerts,
    mostScanned: stats.mostScanned,
    leastScanned: stats.leastScanned,
    unscannedProducts: stats.unscannedProducts,
  };
};

/**
 * Export inventory-barcode report to JSON
 */
export const exportInventoryReport = (products, filename = 'barcode-inventory-report.json') => {
  const report = generateInventoryBarcodeReport(products);
  const jsonContent = JSON.stringify(report, null, 2);

  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
