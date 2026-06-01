import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebase';
import { oa, fmt } from '../utils/date';
import { Modal, Ic } from '../components/UI';
import {
  loadBarcodeCache,
  getBarcodeCacheStats,
  clearBarcodeCache,
  searchBarcodes,
} from '../utils/barcodeCache';
import {
  generateEAN13Checksum,
  detectBarcodeFormat,
  validateBarcodeIntegrity,
  getBarcodeSyncStats,
} from '../utils/barcodeSync';
import {
  exportToCSV,
  exportToJSON,
  importFromCSV,
  importFromJSON,
  generateBulkBarcodes,
  validateAndDeduplicateBarcodes,
} from '../utils/barcodeExport';

const BarcodeManager = ({ shopId, role, toast }) => {
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [cacheStats, setCacheStats] = useState(null);
  const [syncStats, setSyncStats] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newBarcode, setNewBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [showCacheInfo, setShowCacheInfo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  // Load ALL inventory items (not just ones with barcodes)
  useEffect(() => {
    const r = ref(db, `shops/${shopId}/inventory`);
    const u = onValue(r, s => {
      const data = s.val();
      if (data) {
        const allItemList = oa(data).sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );
        setAllItems(allItemList);
        
        const itemList = allItemList.filter(item => item.barcode);
        setItems(itemList);
      }
    });
    return () => u();
  }, [shopId]);

  // Update cache and sync stats
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(getBarcodeCacheStats());
      setSyncStats(getBarcodeSyncStats());
    }, 2000);
    
    setCacheStats(getBarcodeCacheStats());
    setSyncStats(getBarcodeSyncStats());
    
    return () => clearInterval(interval);
  }, []);

  const handleBarcodeUpdate = async (itemId, oldBarcode, newBarcodeVal) => {
    if (!newBarcodeVal.trim()) {
      toast('बारकोड खाली हुन सक्दैन');
      return;
    }

    if (!validateBarcodeIntegrity(newBarcodeVal)) {
      toast('❌ अमान्य बारकोड ढाँचा');
      return;
    }

    // Check for duplicates
    const isDuplicate = items.some(
      i => i.id !== itemId && i.barcode === newBarcodeVal
    );
    if (isDuplicate) {
      toast('❌ यो बारकोड पहिल्यै प्रयोग भएको छ');
      return;
    }

    setBusy(true);
    try {
      const itemRef = ref(db, `shops/${shopId}/inventory/${itemId}`);
      await update(itemRef, {
        barcode: newBarcodeVal,
        updatedAt: Date.now(),
      });
      toast('बारकोड अपडेट भयो ✓');
      setEditingId(null);
      setNewBarcode('');
    } catch (err) {
      toast('त्रुटि भयो');
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateEAN13 = (itemId) => {
    // Generate a simple EAN-13 based on timestamp and ID
    const prefix = '978'; // ISBN prefix
    const timestamp = Date.now().toString().slice(-6);
    const idNum = itemId.slice(0, 3).padEnd(3, '0');
    const base = prefix + timestamp.substring(0, 3) + idNum;
    const ean13 = generateEAN13Checksum(base.substring(0, 12));
    
    if (ean13) {
      setNewBarcode(ean13);
    }
  };

  // Bulk operations handlers
  const handleBulkGenerateEAN13 = async () => {
    const itemsWithoutBarcodes = allItems.filter(item => !item.barcode);
    if (itemsWithoutBarcodes.length === 0) {
      toast('✓ सभी उत्पादों के पास बारकोड हैं');
      return;
    }

    setBusy(true);
    try {
      let generated = 0;
      for (const item of itemsWithoutBarcodes) {
        const prefix = '978';
        const timestamp = Date.now().toString().slice(-6);
        const idNum = item.id.slice(0, 3).padEnd(3, '0');
        const base = prefix + timestamp.substring(0, 3) + idNum;
        const ean13 = generateEAN13Checksum(base.substring(0, 12));

        if (ean13) {
          const itemRef = ref(db, `shops/${shopId}/inventory/${item.id}`);
          await update(itemRef, { barcode: ean13, updatedAt: Date.now() });
          generated++;
        }
      }
      toast(`✓ ${generated} बारकोड जेनरेट भए`);
      setShowBulkMenu(false);
    } catch (err) {
      toast('त्रुटि भयो');
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(items, `barcodes-${Date.now()}.csv`);
    toast('📥 CSV डाउनलोड भयो');
  };

  const handleExportJSON = () => {
    exportToJSON(items, `barcodes-${Date.now()}.json`);
    toast('📥 JSON डाउनलोड भयो');
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const result = await importFromCSV(file);
      if (!result.success) {
        toast(`त्रुटि: ${result.error}`);
        return;
      }

      const validation = validateAndDeduplicateBarcodes(result.data, items);
      if (validation.valid.length === 0) {
        toast('⚠️ कोई मान्य बारकोड नहीं मिला');
        return;
      }

      let updated = 0;
      for (const item of validation.valid) {
        const existing = allItems.find(p => p.id === item.id);
        if (existing) {
          const itemRef = ref(db, `shops/${shopId}/inventory/${item.id}`);
          await update(itemRef, { barcode: item.barcode, updatedAt: Date.now() });
          updated++;
        }
      }

      toast(`✓ ${updated} बारकोड इम्पोर्ट भए`);
      if (validation.duplicates.length > 0) {
        toast(`⚠️ ${validation.duplicates.length} डुप्लिकेट छोडे गए`);
      }
    } catch (err) {
      toast('इम्पोर्ट विफल');
      console.error(err);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const filteredItems = items.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.barcode?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q)
    );
  });

  if (role !== 'owner') {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--sub)' }}>
        <p>केवल मालिकले यो अनुभाग पहुँच गर्न सक्छन्</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', paddingBottom: 76 }}>
      <div style={{ padding: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 16px', color: 'var(--txt)' }}>
          🏷️ बारकोड व्यवस्थापन
        </h2>

        {/* Cache Status */}
        {cacheStats && (
          <div
            style={{
              background: 'var(--pl)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--sub)' }}>💾 ऑफलाइन क्याश:</span>
              <strong>{cacheStats.total} वस्तु</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--sub)' }}>✓ सिंक भएको:</span>
              <strong style={{ color: '#059669' }}>{cacheStats.synced}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--sub)' }}>⏳ सिंक हुन बाँकी:</span>
              <strong style={{ color: cacheStats.unsynced > 0 ? '#dc2626' : '#059669' }}>
                {cacheStats.unsynced}
              </strong>
            </div>
            <button
              onClick={() => setShowCacheInfo(!showCacheInfo)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--sub)',
              }}
            >
              {showCacheInfo ? '▼' : '▶'} विस्तृत जानकारी
            </button>
            {showCacheInfo && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '4px 0', fontSize: 12, color: 'var(--sub)' }}>
                  आकार: {(cacheStats.cacheSize / 1024).toFixed(2)} KB
                </p>
                {cacheStats.lastSync && (
                  <p style={{ margin: '4px 0', fontSize: 12, color: 'var(--sub)' }}>
                    अन्तिम सिंक: {new Date(cacheStats.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="बारकोड वा वस्तुको नाम..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #ddd',
              fontSize: 14,
            }}
          />
          <button
            onClick={() => setShowBulkMenu(!showBulkMenu)}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#4f46e5',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
            }}
            title="बारकोड संचालन"
          >
            ⚙️ थोक
          </button>
        </div>

        {/* Bulk Operations Menu */}
        {showBulkMenu && (
          <div
            style={{
              background: '#f8f9fa',
              border: '2px solid #4f46e5',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <p style={{ margin: '0 0 12px', fontWeight: 600, color: 'var(--txt)' }}>
              ⚙️ थोक संचालन
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
              <button
                onClick={handleBulkGenerateEAN13}
                disabled={busy || allItems.filter(i => !i.barcode).length === 0}
                style={{
                  padding: '10px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  opacity: busy || allItems.filter(i => !i.barcode).length === 0 ? 0.5 : 1,
                }}
              >
                🔢 सभी EAN-13
              </button>
              <button
                onClick={handleExportCSV}
                disabled={busy}
                style={{
                  padding: '10px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                📥 CSV
              </button>
              <button
                onClick={handleExportJSON}
                disabled={busy}
                style={{
                  padding: '10px',
                  backgroundColor: '#8b5cf6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                📥 JSON
              </button>
              <label
                style={{
                  padding: '10px',
                  backgroundColor: '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'center',
                  opacity: busy ? 0.5 : 1,
                  pointerEvents: busy ? 'none' : 'auto',
                }}
              >
                📤 CSV इम्पोर्ट
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  disabled={busy}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        )}

        {/* Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--sub)', margin: 16 }}>
              कोही वस्तु फेला परेन
            </p>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: '0 0 4px' }}>
                    {item.name}
                  </p>
                  {item.category && (
                    <span
                      style={{
                        fontSize: 11,
                        background: '#f0f0f0',
                        padding: '2px 8px',
                        borderRadius: 8,
                        color: 'var(--sub)',
                      }}
                    >
                      {item.category}
                    </span>
                  )}
                </div>

                {editingId === item.id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={newBarcode}
                        onChange={e => setNewBarcode(e.target.value)}
                        placeholder="बारकोड इनपुट गर्नुहोस्"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid #ddd',
                          fontSize: 13,
                        }}
                      />
                      <small style={{ color: 'var(--sub)', display: 'block', marginTop: 4 }}>
                        ढाँचा: {detectBarcodeFormat(newBarcode) || 'अज्ञात'}
                      </small>
                    </div>
                    <button
                      onClick={() => handleGenerateEAN13(item.id)}
                      style={{
                        padding: '8px 12px',
                        background: '#e0e7ff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#4f46e5',
                      }}
                    >
                      🔢 अटो
                    </button>
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: item.barcode ? '#059669' : '#dc2626',
                      margin: '8px 0',
                    }}
                  >
                    {item.barcode ? `📦 ${item.barcode}` : '❌ कोई बारकोड छैन'}
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setNewBarcode('');
                        }}
                        style={{
                          padding: '8px',
                          background: '#f0f0f0',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                        disabled={busy}
                      >
                        रद्द गर्नुहोस्
                      </button>
                      <button
                        onClick={() => handleBarcodeUpdate(item.id, item.barcode, newBarcode)}
                        style={{
                          padding: '8px',
                          background: 'var(--p2)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                        disabled={busy}
                      >
                        {busy ? '⏳' : '✓'} सेभ गर्नुहोस्
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setNewBarcode(item.barcode || '');
                        }}
                        style={{
                          padding: '8px',
                          background: '#eff6ff',
                          color: '#0369a1',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        ✏️ सम्पादन गर्नुहोस्
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setNewBarcode('');
                        }}
                        style={{
                          padding: '8px',
                          background: '#e0e7ff',
                          color: '#4f46e5',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        🔢 नयाँ बारकोड
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Clear Cache Warning */}
        <div
          style={{
            marginTop: 24,
            padding: 12,
            background: '#fee2e2',
            borderRadius: 12,
            borderLeft: '4px solid #dc2626',
          }}
        >
          <p style={{ fontSize: 12, color: '#991b1b', margin: '0 0 8px', fontWeight: 600 }}>
            ⚠️ उन्नत विकल्प
          </p>
          <button
            onClick={() => {
              if (window.confirm('यो सबै बारकोड क्याश मेटाउनेछ। तपाईँ निश्चित हुनुहुन्छ?')) {
                clearBarcodeCache();
                toast('क्याश मेटाइयो ✓');
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            🗑️ क्याश मेटाउनुहोस्
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeManager;
