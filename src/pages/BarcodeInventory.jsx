import { useState, useEffect } from 'react';
import { Modal, Ic } from '../components/UI';
import {
  recordBarcodeScan,
  getProductScanCount,
  getBarcodeUsageStats,
  checkStockAlerts,
  setLowStockAlert,
  getLowStockAlerts,
  generateInventoryBarcodeReport,
  exportInventoryReport,
} from '../utils/barcodeInventory';

const BarcodeInventory = ({ products = [], onClose, toast }) => {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertThresholds, setAlertThresholds] = useState({});

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStats = () => {
    const newStats = getBarcodeUsageStats(products);
    setStats(newStats);

    const newAlerts = checkStockAlerts(products);
    setAlerts(newAlerts);

    const thresholds = getLowStockAlerts();
    setAlertThresholds(thresholds);
  };

  const handleSetAlert = (productId, threshold) => {
    if (threshold > 0) {
      setLowStockAlert(productId, threshold);
      updateStats();
      toast('⚠️ अलर्ट सेट भयो');
    }
  };

  const handleExportReport = () => {
    exportInventoryReport(products);
    toast('📊 रिपोर्ट डाउनलोड भयो');
  };

  if (!stats) {
    return (
      <Modal onClose={onClose} title="📦 बारकोड इन्वेंटरी">
        <div style={{ padding: '20px', textAlign: 'center' }}>लोड हो रहा है...</div>
      </Modal>
    );
  }

  const filteredMost = stats.mostScanned.filter((p) =>
    p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode.includes(searchQuery)
  );

  const filteredLeast = stats.leastScanned.filter((p) =>
    p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode.includes(searchQuery)
  );

  return (
    <Modal onClose={onClose} title="📦 बारकोड इन्वेंटरी डैशबोर्ड" width="95%">
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '25px',
          }}
        >
          <div
            style={{
              padding: '15px',
              backgroundColor: '#e8f5e9',
              borderRadius: '8px',
              border: '2px solid #4caf50',
            }}
          >
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>कुल स्कैन</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
              {stats.totalScans}
            </div>
          </div>

          <div
            style={{
              padding: '15px',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              border: '2px solid #2196f3',
            }}
          >
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              स्कैन किए गए उत्पाद
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1565c0' }}>
              {stats.scannedProducts}
            </div>
          </div>

          <div
            style={{
              padding: '15px',
              backgroundColor: '#fff3e0',
              borderRadius: '8px',
              border: '2px solid #ff9800',
            }}
          >
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              बिना स्कैन के उत्पाद
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>
              {stats.unscannedProducts}
            </div>
          </div>

          <div
            style={{
              padding: '15px',
              backgroundColor: '#fce4ec',
              borderRadius: '8px',
              border: '2px solid #e91e63',
            }}
          >
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>कम स्टॉक</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ad1457' }}>
              {alerts.length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
          <button
            onClick={() => setActiveTab('summary')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'summary' ? '#007bff' : '#f5f5f5',
              color: activeTab === 'summary' ? '#fff' : '#333',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              marginRight: '5px',
            }}
          >
            📊 सारांश
          </button>
          <button
            onClick={() => setActiveTab('mostScanned')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'mostScanned' ? '#28a745' : '#f5f5f5',
              color: activeTab === 'mostScanned' ? '#fff' : '#333',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              marginRight: '5px',
            }}
          >
            ⬆️ सबसे स्कैन किए गए
          </button>
          <button
            onClick={() => setActiveTab('leastScanned')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'leastScanned' ? '#ffc107' : '#f5f5f5',
              color: activeTab === 'leastScanned' ? '#000' : '#333',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              marginRight: '5px',
            }}
          >
            ⬇️ कम स्कैन किए गए
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'alerts' ? '#dc3545' : '#f5f5f5',
              color: activeTab === 'alerts' ? '#fff' : '#333',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
            }}
          >
            ⚠️ कम स्टॉक ({alerts.length})
          </button>
        </div>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div>
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ marginTop: 0 }}>📈 सारांश विश्लेषण</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <strong>कुल उत्पाद:</strong> {stats.totalScans && products.length > 0 ? products.length : 0}
                </div>
                <div>
                  <strong>बारकोड वाले:</strong>{' '}
                  {products.filter((p) => p.barcode).length}
                </div>
                <div>
                  <strong>बारकोड के बिना:</strong>{' '}
                  {products.filter((p) => !p.barcode).length}
                </div>
                <div>
                  <strong>कवरेज:</strong>{' '}
                  {products.length > 0
                    ? Math.round(
                        (products.filter((p) => p.barcode).length / products.length) * 100
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button
                onClick={handleExportReport}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                📥 रिपोर्ट डाउनलोड करें
              </button>
            </div>
          </div>
        )}

        {/* Most Scanned Tab */}
        {activeTab === 'mostScanned' && (
          <div>
            <input
              type="text"
              placeholder="🔍 खोजें..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '15px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '15px',
              }}
            >
              {filteredMost.length > 0 ? (
                filteredMost.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      padding: '15px',
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                      backgroundColor: '#f1f8f6',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      {item.productName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      📊 {item.barcode}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2e7d32' }}>
                      🔢 {item.scans} स्कैन
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#999' }}>
                  कोई परिणाम नहीं
                </div>
              )}
            </div>
          </div>
        )}

        {/* Least Scanned Tab */}
        {activeTab === 'leastScanned' && (
          <div>
            <input
              type="text"
              placeholder="🔍 खोजें..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '15px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '15px',
              }}
            >
              {filteredLeast.length > 0 ? (
                filteredLeast.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      padding: '15px',
                      border: '2px solid #ff9800',
                      borderRadius: '8px',
                      backgroundColor: '#fff8f0',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      {item.productName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      📊 {item.barcode}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e65100' }}>
                      🔢 {item.scans} स्कैन
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#999' }}>
                  कोई परिणाम नहीं
                </div>
              )}
            </div>
          </div>
        )}

        {/* Low Stock Alerts Tab */}
        {activeTab === 'alerts' && (
          <div>
            {alerts.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '15px',
                }}
              >
                {alerts.map((alert) => (
                  <div
                    key={alert.productId}
                    style={{
                      padding: '15px',
                      border: '2px solid #dc3545',
                      borderRadius: '8px',
                      backgroundColor: '#ffe6e6',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#c92a2a' }}>
                      ⚠️ {alert.productName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      📊 {alert.barcode}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#d9534f' }}>
                      📦 वर्तमान: {alert.currentStock} | थ्रेशोल्ड: {alert.threshold}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                ✅ सभी उत्पादों का स्टॉक ठीक है
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BarcodeInventory;
