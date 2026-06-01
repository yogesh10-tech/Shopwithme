import { useState, useEffect, useRef } from 'react';
import Quagga from 'quagga';
import { Modal, Ic } from '../components/UI';
import { fmt } from '../utils/date';
import { loadBarcodeCache, findByBarcode, updateBarcodeCacheEntry } from '../utils/barcodeCache';

export default function BarcodeScanner({ products, onSelect, onClose }) {
  const [detected, setDetected] = useState(null);
  const [matches, setMatches] = useState([]);
  const [quantity, setQuantity] = useState('1');
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cacheHit, setCacheHit] = useState(false);
  const videoRef = useRef(null);
  const scannedCodesRef = useRef(new Set());

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!scanning) return;

    const initQuagga = async () => {
      try {
        await Quagga.init(
          {
            inputStream: {
              type: 'LiveStream',
              constraints: {
                width: { min: 640 },
                height: { min: 480 },
                facingMode: 'environment',
              },
              target: videoRef.current,
            },
            decoder: {
              readers: [
                'code_128_reader',
                'ean_reader',
                'ean_8_reader',
                'upc_reader',
                'upc_e_reader',
                'codabar_reader',
                'code_39_reader',
              ],
              debug: false,
            },
            locator: {
              halfSample: true,
            },
            numOfWorkers: navigator.hardwareConcurrency || 1,
            frequency: 10,
          },
          err => {
            if (err) {
              setError('कैमरा खोल्न सकिएन। कृपया अनुमति दिनुहोस्।');
              setScanning(false);
            } else {
              Quagga.start();
            }
          }
        );

        Quagga.onDetected(handleDetection);
      } catch (err) {
        setError('कैमरा खोल्न सकिएन। कृपया अनुमति दिनुहोस्।');
        setScanning(false);
      }
    };

    initQuagga();

    return () => {
      try {
        Quagga.offDetected(handleDetection);
        Quagga.stop();
      } catch (err) {
        // Cleanup error, ignore
      }
    };
  }, [scanning]);

  const handleDetection = result => {
    if (!result.codeResult || !result.codeResult.code) return;

    const code = result.codeResult.code;
    if (scannedCodesRef.current.has(code)) return;

    scannedCodesRef.current.add(code);

    // Try exact barcode match first
    let exactMatch = products.find(p => p.barcode === code);

    // If not found in products, check cache for offline data
    let fromCache = false;
    if (!exactMatch && isOffline) {
      const cacheEntry = findByBarcode(code);
      if (cacheEntry) {
        // Convert cache entry to product format
        exactMatch = {
          id: cacheEntry.id,
          barcode: cacheEntry.barcode,
          name: cacheEntry.name,
          category: cacheEntry.category,
          sellP: cacheEntry.sellP,
          stock: cacheEntry.stock,
          unit: cacheEntry.unit,
        };
        fromCache = true;
        setCacheHit(true);
      }
    }

    if (exactMatch) {
      setDetected(exactMatch);
      setMatches([exactMatch]);
      setScanning(false);
      return;
    }

    // Try fuzzy name match
    const nameMatches = products.filter(p => {
      const searchTerm = code.toLowerCase();
      return (
        p.name?.toLowerCase().includes(searchTerm) ||
        p.category?.toLowerCase().includes(searchTerm)
      );
    });

    if (nameMatches.length > 0) {
      setDetected(nameMatches[0]);
      setMatches(nameMatches);
      setScanning(false);
    } else {
      // Show error and continue scanning
      setError(`वस्तु नफेला - कोड: ${code}${isOffline ? ' (ऑफलाइन)' : ''}`);
      setTimeout(() => setError(null), 2000);
    }
  };

  const handleSelect = product => {
    setDetected(product);
    setMatches([product]);
  };

  const handleConfirm = () => {
    const qty = parseFloat(quantity) || 1;
    if (detected && qty > 0) {
      // Update cache if this was a cache hit
      if (cacheHit && detected.id) {
        updateBarcodeCacheEntry({
          id: detected.id,
          barcode: detected.barcode,
          name: detected.name,
          category: detected.category,
          sellP: detected.sellP,
          stock: detected.stock,
          unit: detected.unit,
          updatedAt: Date.now(),
        });
      }
      onSelect({
        product: detected,
        quantity: qty,
      });
    }
  };

  const handleRetry = () => {
    scannedCodesRef.current.clear();
    setDetected(null);
    setMatches([]);
    setQuantity('1');
    setError(null);
    setCacheHit(false);
    setScanning(true);
  };

  return (
    <Modal onClose={onClose} title={`📸 बारकोड स्क्यान्न${isOffline ? ' (📵 ऑफलाइन)' : ''}`}>
      {error && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '12px',
            marginBottom: 12,
            color: '#dc2626',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {cacheHit && (
        <div
          style={{
            background: '#dbeafe',
            border: '1px solid #7dd3fc',
            borderRadius: 12,
            padding: '12px',
            marginBottom: 12,
            color: '#0369a1',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          💾 यो डेटा ऑफलाइन क्याशबाट आयो
        </div>
      )}

      {!detected ? (
        <>
          <div
            ref={videoRef}
            style={{
              width: '100%',
              height: 300,
              background: '#000',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 12,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {!scanning && (
              <div style={{ textAlign: 'center', color: '#fff' }}>
                <p style={{ fontSize: 14, margin: '0 0 8px' }}>
                  {error ? '❌ कैमरा अनुपलब्ध' : '📸 कैमरा तैयार'}
                </p>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <p
              style={{
                fontSize: 13,
                color: 'var(--sub)',
                margin: 0,
              }}
            >
              {scanning
                ? 'बारकोड क्यामेराको सामने राख्नुहोस्'
                : 'कोड पढ्न सकिएन'}
            </p>
          </div>

          {error && (
            <button
              onClick={handleRetry}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--p2)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              🔄 फेरि प्रयास गर्नुहोस्
            </button>
          )}
        </>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                background: 'var(--pl)',
                borderRadius: 12,
                padding: '14px',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  📦
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--txt)',
                      margin: '0 0 4px',
                    }}
                  >
                    {detected.name}
                  </p>
                  {detected.category && (
                    <span
                      style={{
                        fontSize: 11,
                        background: '#fff',
                        color: 'var(--sub)',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontWeight: 600,
                      }}
                    >
                      {detected.category}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <div>
                      <p
                        style={{
                          fontSize: 10,
                          color: 'var(--sub)',
                          margin: '0 0 2px',
                        }}
                      >
                        मूल्य
                      </p>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--p2)',
                          margin: 0,
                        }}
                      >
                        {fmt(detected.sellP || 0)}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 10,
                          color: 'var(--sub)',
                          margin: '0 0 2px',
                        }}
                      >
                        स्टक
                      </p>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--txt)',
                          margin: 0,
                        }}
                      >
                        {detected.stock || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {matches.length > 1 && (
              <div style={{ marginBottom: 12 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--sub)',
                    margin: '0 0 8px',
                  }}
                >
                  अन्य मेल ({matches.length - 1})
                </p>
                {matches.slice(1).map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      marginBottom: 6,
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--txt)',
                      cursor: 'pointer',
                    }}
                  >
                    {m.name} • {fmt(m.sellP || 0)}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: 'var(--sub)',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                मात्रा
              </label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="1"
                step="1"
                className="inp"
                style={{ marginBottom: 12 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={handleRetry}
              className="btn Bo"
            >
              फेरि स्क्यान गर्नुहोस्
            </button>
            <button
              onClick={handleConfirm}
              className="btn Bp"
            >
              थप्नुहोस्
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
