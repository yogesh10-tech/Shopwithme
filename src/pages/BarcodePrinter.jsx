import { useState, useEffect } from 'react';
import { Ic, Modal } from '../components/UI';
import {
  printBarcodes,
  exportLabelsToPDF,
  getSupportedFormats,
  getLabelTemplates,
} from '../utils/barcodePrinter';

const BarcodePrinter = ({ products = [], onClose, toast }) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('a4-2x3');
  const [selectedFormat, setSelectedFormat] = useState('code128');
  const [showPrice, setShowPrice] = useState(true);
  const [showStock, setShowStock] = useState(true);
  const [busy, setBusy] = useState(false);

  const templates = getLabelTemplates();
  const formats = getSupportedFormats();
  const template = templates.find((t) => t.id === selectedTemplate);

  // Filter products with barcodes
  const barcodedProducts = products.filter((p) => p.barcode);

  const handleSelectProduct = (productId) => {
    setSelectedProducts((prev) => 
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    setSelectedProducts(
      selectedProducts.length === barcodedProducts.length
        ? []
        : barcodedProducts.map((p) => p.id)
    );
  };

  const getSelectedProductsData = () =>
    barcodedProducts.filter((p) => selectedProducts.includes(p.id));

  const handlePrint = () => {
    const data = getSelectedProductsData();
    if (data.length === 0) {
      toast('कम से कम एक उत्पाद चुनें');
      return;
    }

    printBarcodes(data, {
      labelsPerRow: template.labelsPerRow,
      labelWidth: `${template.labelWidth}mm`,
      labelHeight: `${template.labelHeight}mm`,
      showPrice,
      showStock,
      format: selectedFormat,
      thermal: selectedTemplate.includes('thermal'),
    });

    toast(`${data.length} बारकोड प्रिंट हेतु तैयार`);
  };

  const handleExportPDF = async () => {
    const data = getSelectedProductsData();
    if (data.length === 0) {
      toast('कम से कम एक उत्पाद चुनें');
      return;
    }

    setBusy(true);
    try {
      const filename = `barcodes-${Date.now()}.pdf`;
      await exportLabelsToPDF(data, filename, {
        labelsPerRow: template.labelsPerRow,
        labelWidth: template.labelWidth,
        labelHeight: template.labelHeight,
        showPrice,
        showStock,
        format: selectedFormat,
      });
      toast('PDF सफलतापूर्वक डाउनलोड भयो ✓');
    } catch (error) {
      toast('PDF डाउनलोड विफल');
      console.error(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} title="🏷️ बारकोड प्रिंट" width="90%">
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Settings Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>
              📋 टेम्पलेट चुनें
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>
              📊 बारकोड प्रकार
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              {formats.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '12px' }}>💰 मूल्य दिखाएं</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={showStock}
                onChange={(e) => setShowStock(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '12px' }}>📦 स्टॉक दिखाएं</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handlePrint}
            disabled={selectedProducts.length === 0 || busy}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '10px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedProducts.length > 0 && !busy ? 'pointer' : 'not-allowed',
              opacity: selectedProducts.length > 0 && !busy ? 1 : 0.6,
            }}
          >
            🖨️ प्रिंट करें ({selectedProducts.length})
          </button>

          <button
            onClick={handleExportPDF}
            disabled={selectedProducts.length === 0 || busy}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '10px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedProducts.length > 0 && !busy ? 'pointer' : 'not-allowed',
              opacity: selectedProducts.length > 0 && !busy ? 1 : 0.6,
            }}
          >
            📥 PDF डाउनलोड करें
          </button>

          <button
            onClick={handleSelectAll}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '10px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {selectedProducts.length === barcodedProducts.length ? '❌ सभी अनचुनें' : '✅ सभी चुनें'}
          </button>
        </div>

        {/* Product Selection */}
        <div>
          <h4 style={{ marginTop: '0', marginBottom: '15px' }}>
            📦 उत्पाद ({selectedProducts.length}/{barcodedProducts.length})
          </h4>

          {barcodedProducts.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
              ❌ बारकोड वाले उत्पाद नहीं मिले
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '10px',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              {barcodedProducts.map((product) => (
                <label
                  key={product.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '10px',
                    backgroundColor: selectedProducts.includes(product.id) ? '#e8f5e9' : '#fff',
                    border: selectedProducts.includes(product.id) ? '2px solid #4caf50' : '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => handleSelectProduct(product.id)}
                    style={{
                      marginRight: '10px',
                      marginTop: '2px',
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      📊 {product.barcode}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {product.category && `${product.category} • `}
                      ₹{product.sellP || 0}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: '#e3f2fd',
            borderLeft: '4px solid #2196f3',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#1565c0',
          }}
        >
          💡 <strong>सुझाव:</strong> उत्पाद चुनें, टेम्पलेट और प्रकार कॉन्फ़िगर करें, फिर प्रिंट या
          PDF डाउनलोड करें।
        </div>
      </div>
    </Modal>
  );
};

export default BarcodePrinter;
