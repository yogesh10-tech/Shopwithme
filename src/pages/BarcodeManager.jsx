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

const BarcodeManager = ({ shopId, role, toast }) => {
  const [items, setItems] = useState([]);
  const [cacheStats, setCacheStats] = useState(null);
  const [syncStats, setSyncStats] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newBarcode, setNewBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [showCacheInfo, setShowCacheInfo] = useState(false);
  const [busy, setBusy] = useState(false);

  // Load inventory items with barcodes
  useEffect(() => {
    const r = ref(db, `shops/${shopId}/inventory`);
    const u = onValue(r, s => {
      const data = s.val();
      if (data) {
        const itemList = oa(data).filter(item => item.barcode).sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );
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
        <input
          type="text"
          placeholder="बारकोड वा वस्तुको नाम..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #ddd',
            marginBottom: 16,
            fontSize: 14,
          }}
        />

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
