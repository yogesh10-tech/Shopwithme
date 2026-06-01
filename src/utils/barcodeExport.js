/**
 * Barcode Export/Import Utility
 * CSV, JSON, PDF export and import functionality
 */

/**
 * Export barcodes to CSV
 */
export const exportToCSV = (products, filename = 'barcodes.csv') => {
  const headers = ['ID', 'Product Name', 'Barcode', 'Category', 'Price', 'Stock', 'Unit'];
  const rows = products.map((p) => [
    p.id || '',
    p.name || '',
    p.barcode || '',
    p.category || '',
    p.sellP || '',
    p.stock || '',
    p.unit || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell || '');
          // Escape quotes and wrap in quotes if contains comma
          return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',')
    ),
  ].join('\n');

  downloadFile(csvContent, filename, 'text/csv');
};

/**
 * Export barcodes to JSON
 */
export const exportToJSON = (products, filename = 'barcodes.json') => {
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    totalCount: products.length,
    barcodes: products.map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      category: p.category,
      sellP: p.sellP,
      stock: p.stock,
      unit: p.unit,
    })),
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
};

/**
 * Import barcodes from CSV
 * Returns { success: true, data: [...], errors: [...] }
 */
export const importFromCSV = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter((line) => line.trim());

        if (lines.length < 2) {
          resolve({
            success: false,
            error: 'CSV file must have header and at least one row',
            data: [],
            errors: [],
          });
          return;
        }

        // Parse header
        const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
        const idIndex = headers.indexOf('id');
        const nameIndex = headers.indexOf('product name');
        const barcodeIndex = headers.indexOf('barcode');
        const categoryIndex = headers.indexOf('category');
        const priceIndex = headers.indexOf('price');
        const stockIndex = headers.indexOf('stock');
        const unitIndex = headers.indexOf('unit');

        if (barcodeIndex === -1) {
          resolve({
            success: false,
            error: 'CSV must have "Barcode" column',
            data: [],
            errors: [],
          });
          return;
        }

        const data = [];
        const errors = [];

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
          try {
            const row = parseCSVLine(lines[i]);
            const barcode = row[barcodeIndex]?.trim();

            if (!barcode) {
              errors.push({ row: i + 1, error: 'Barcode is required' });
              continue;
            }

            data.push({
              id: row[idIndex]?.trim(),
              name: row[nameIndex]?.trim() || 'Product',
              barcode: barcode,
              category: row[categoryIndex]?.trim(),
              sellP: parseFloat(row[priceIndex]) || 0,
              stock: parseInt(row[stockIndex]) || 0,
              unit: row[unitIndex]?.trim() || 'पिस',
            });
          } catch (error) {
            errors.push({ row: i + 1, error: error.message });
          }
        }

        resolve({
          success: errors.length === 0,
          data,
          errors,
        });
      } catch (error) {
        resolve({
          success: false,
          error: error.message,
          data: [],
          errors: [],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file',
        data: [],
        errors: [],
      });
    };

    reader.readAsText(file);
  });
};

/**
 * Import barcodes from JSON
 */
export const importFromJSON = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);

        if (!json.barcodes || !Array.isArray(json.barcodes)) {
          resolve({
            success: false,
            error: 'Invalid JSON format: missing barcodes array',
            data: [],
            errors: [],
          });
          return;
        }

        const data = [];
        const errors = [];

        json.barcodes.forEach((item, idx) => {
          if (!item.barcode) {
            errors.push({ index: idx, error: 'Barcode is required' });
            return;
          }

          data.push({
            id: item.id,
            name: item.name || 'Product',
            barcode: item.barcode,
            category: item.category,
            sellP: item.sellP || 0,
            stock: item.stock || 0,
            unit: item.unit || 'पिस',
          });
        });

        resolve({
          success: errors.length === 0,
          data,
          errors,
        });
      } catch (error) {
        resolve({
          success: false,
          error: error.message,
          data: [],
          errors: [],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file',
        data: [],
        errors: [],
      });
    };

    reader.readAsText(file);
  });
};

/**
 * Validate and deduplicate imported barcodes
 */
export const validateAndDeduplicateBarcodes = (imported, existing) => {
  const existingBarcodes = new Set(existing.map((p) => p.barcode));
  const validation = {
    valid: [],
    duplicates: [],
    warnings: [],
  };

  const seenBarcodes = new Set();

  imported.forEach((item) => {
    if (seenBarcodes.has(item.barcode)) {
      validation.duplicates.push({
        barcode: item.barcode,
        name: item.name,
        reason: 'Duplicate in import',
      });
    } else if (existingBarcodes.has(item.barcode)) {
      validation.duplicates.push({
        barcode: item.barcode,
        name: item.name,
        reason: 'Already exists in system',
      });
    } else {
      validation.valid.push(item);
      seenBarcodes.add(item.barcode);
    }
  });

  return validation;
};

/**
 * Generate bulk barcodes for products without them
 */
export const generateBulkBarcodes = (products, existingBarcodes = []) => {
  const existingSet = new Set(existingBarcodes);
  const results = {
    generated: [],
    alreadyHave: [],
  };

  products.forEach((product) => {
    if (product.barcode) {
      results.alreadyHave.push(product);
    } else {
      // Generate EAN-13 based on product ID
      const ean13 = generateEAN13FromID(product.id);
      if (!existingSet.has(ean13)) {
        results.generated.push({
          ...product,
          barcode: ean13,
        });
        existingSet.add(ean13);
      }
    }
  });

  return results;
};

/**
 * Helper: Parse CSV line (handles quoted fields)
 */
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
};

/**
 * Helper: Download file
 */
const downloadFile = (content, filename, type) => {
  const blob = new Blob([content], { type });
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

/**
 * Generate EAN-13 from product ID (simple algorithm)
 * This is for auto-generation; proper EAN-13 should use official prefix
 */
const generateEAN13FromID = (productId) => {
  const { generateEAN13Checksum } = require('./barcodeSync');
  
  // Take first 6 chars of ID, pad with current timestamp
  const idPart = (productId || '').substring(0, 6).padEnd(6, '0');
  const timestamp = Date.now().toString().slice(-5);
  const base = '978' + idPart + timestamp; // 14 digits before checksum
  
  return generateEAN13Checksum(base.substring(0, 12));
};
