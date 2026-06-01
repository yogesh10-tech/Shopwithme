/**
 * Barcode Printer Utility
 * Generates printable barcode labels with product details
 * Supports PDF export and thermal printer formats
 */

import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate SVG barcode
 */
export const generateBarcodeSVG = (barcode, format = 'code128') => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  
  try {
    JsBarcode(svg, barcode, {
      format: format,
      width: 2,
      height: 50,
      displayValue: true,
      fontSize: 12,
    });
    return svg.outerHTML;
  } catch (error) {
    console.error('Barcode generation error:', error);
    return null;
  }
};

/**
 * Create HTML label for a single barcode
 */
export const createBarcodeLabel = (product, options = {}) => {
  const {
    showPrice = true,
    showStock = true,
    format = 'code128',
    labelWidth = '80mm',
    labelHeight = '60mm',
  } = options;

  const container = document.createElement('div');
  container.style.width = labelWidth;
  container.style.height = labelHeight;
  container.style.padding = '5mm';
  container.style.border = '1px solid #000';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';
  container.style.backgroundColor = '#fff';

  // Product name
  const nameDiv = document.createElement('div');
  nameDiv.style.fontSize = '10px';
  nameDiv.style.fontWeight = 'bold';
  nameDiv.style.overflow = 'hidden';
  nameDiv.style.textOverflow = 'ellipsis';
  nameDiv.style.whiteSpace = 'nowrap';
  nameDiv.textContent = product.name || 'Product';
  container.appendChild(nameDiv);

  // Barcode SVG
  const barcodeDiv = document.createElement('div');
  barcodeDiv.style.textAlign = 'center';
  barcodeDiv.style.margin = '3px 0';
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, product.barcode, {
      format: format,
      width: 1.5,
      height: 35,
      displayValue: true,
      fontSize: 10,
    });
    barcodeDiv.appendChild(svg);
  } catch (error) {
    barcodeDiv.textContent = 'Invalid barcode';
  }
  container.appendChild(barcodeDiv);

  // Product details
  const detailsDiv = document.createElement('div');
  detailsDiv.style.fontSize = '8px';
  detailsDiv.style.textAlign = 'center';

  let details = `SKU: ${product.id || 'N/A'}`;
  if (showPrice && product.sellP) {
    details += ` | ₹${product.sellP}`;
  }
  if (showStock && product.stock) {
    details += ` | Stock: ${product.stock}`;
  }

  detailsDiv.textContent = details;
  container.appendChild(detailsDiv);

  return container;
};

/**
 * Create multi-label sheet for printing
 */
export const createLabelSheet = (products, options = {}) => {
  const {
    labelsPerRow = 2,
    labelWidth = '80mm',
    labelHeight = '60mm',
    pageWidth = '210mm', // A4
    pageHeight = '297mm',
    showPrice = true,
    showStock = true,
    format = 'code128',
  } = options;

  const sheet = document.createElement('div');
  sheet.id = 'barcode-label-sheet';
  sheet.style.width = pageWidth;
  sheet.style.height = pageHeight;
  sheet.style.padding = '10mm';
  sheet.style.display = 'grid';
  sheet.style.gridTemplateColumns = `repeat(${labelsPerRow}, 1fr)`;
  sheet.style.gap = '5mm';
  sheet.style.backgroundColor = '#fff';
  sheet.style.pageBreakInside = 'avoid';

  products.forEach((product) => {
    if (product.barcode) {
      const label = createBarcodeLabel(product, {
        showPrice,
        showStock,
        format,
        labelWidth,
        labelHeight,
      });
      sheet.appendChild(label);
    }
  });

  return sheet;
};

/**
 * Export labels to PDF
 */
export const exportLabelsToPDF = async (products, filename = 'barcodes.pdf', options = {}) => {
  const {
    labelsPerRow = 2,
    labelWidth = 80, // mm
    labelHeight = 60, // mm
    showPrice = true,
    showStock = true,
    format = 'code128',
  } = options;

  return new Promise((resolve, reject) => {
    const sheet = createLabelSheet(products, {
      labelsPerRow,
      labelWidth: `${labelWidth}mm`,
      labelHeight: `${labelHeight}mm`,
      showPrice,
      showStock,
      format,
    });

    // Temporarily append to DOM
    document.body.appendChild(sheet);

    html2canvas(sheet, {
      scale: 2,
      backgroundColor: '#ffffff',
      allowTaint: true,
      useCORS: true,
    })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const imgWidth = 210; // A4 width
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297; // A4 height

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= 297;
        }

        pdf.save(filename);
        document.body.removeChild(sheet);
        resolve(true);
      })
      .catch((error) => {
        document.body.removeChild(sheet);
        reject(error);
      });
  });
};

/**
 * Generate thermal printer format (80mm width)
 */
export const createThermalLabel = (product, options = {}) => {
  const {
    showPrice = true,
    showStock = true,
    format = 'code128',
  } = options;

  const container = document.createElement('div');
  container.style.width = '80mm';
  container.style.fontFamily = 'monospace';
  container.style.fontSize = '12px';
  container.style.padding = '5mm';
  container.style.backgroundColor = '#fff';
  container.style.textAlign = 'center';

  // Header
  const header = document.createElement('div');
  header.style.borderBottom = '1px solid #000';
  header.style.marginBottom = '3mm';
  header.style.paddingBottom = '2mm';
  header.textContent = '════════════════';
  container.appendChild(header);

  // Product name (centered, bold)
  const name = document.createElement('div');
  name.style.fontWeight = 'bold';
  name.style.fontSize = '14px';
  name.style.marginBottom = '2mm';
  name.style.wordWrap = 'break-word';
  name.textContent = product.name || 'Product';
  container.appendChild(name);

  // Barcode
  const barcodeDiv = document.createElement('div');
  barcodeDiv.style.margin = '3mm 0';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, product.barcode, {
      format: format,
      width: 1.2,
      height: 40,
      displayValue: true,
      fontSize: 11,
    });
    barcodeDiv.appendChild(svg);
  } catch (error) {
    barcodeDiv.textContent = 'INVALID';
  }
  container.appendChild(barcodeDiv);

  // Details row
  const detailsDiv = document.createElement('div');
  detailsDiv.style.fontSize = '11px';
  detailsDiv.style.marginTop = '3mm';
  detailsDiv.style.borderTop = '1px solid #000';
  detailsDiv.style.paddingTop = '2mm';

  let details = '';
  if (showPrice && product.sellP) {
    details += `Price: ₹${product.sellP}`;
  }
  if (showStock && product.stock) {
    if (details) details += ' | ';
    details += `Stock: ${product.stock}`;
  }

  detailsDiv.textContent = details || `SKU: ${product.id}`;
  container.appendChild(detailsDiv);

  // Footer
  const footer = document.createElement('div');
  footer.style.marginTop = '3mm';
  footer.style.borderTop = '1px solid #000';
  footer.style.paddingTop = '2mm';
  footer.textContent = '════════════════';
  container.appendChild(footer);

  return container;
};

/**
 * Print directly to browser
 */
export const printBarcodes = (products, options = {}) => {
  const {
    labelsPerRow = 2,
    labelWidth = '80mm',
    labelHeight = '60mm',
    showPrice = true,
    showStock = true,
    format = 'code128',
    thermal = false,
  } = options;

  const printWindow = window.open('', '_blank');
  printWindow.document.write('<html><head><title>Print Barcodes</title>');
  printWindow.document.write(`
    <style>
      body {
        margin: 0;
        padding: 10mm;
        font-family: Arial, sans-serif;
      }
      @media print {
        body {
          margin: 0;
          padding: 5mm;
        }
        .page-break {
          page-break-before: always;
        }
      }
      .label-sheet {
        display: grid;
        grid-template-columns: repeat(${labelsPerRow}, 1fr);
        gap: 5mm;
        page-break-inside: avoid;
      }
      .label {
        width: ${labelWidth};
        height: ${labelHeight};
        border: 1px solid #ddd;
        padding: 5mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
      }
      .label-name {
        font-size: 10px;
        font-weight: bold;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .label-barcode {
        text-align: center;
        flex-grow: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .label-details {
        font-size: 8px;
        text-align: center;
        border-top: 1px solid #ddd;
        padding-top: 2mm;
      }
    </style>
  `);
  printWindow.document.write('</head><body>');

  if (!thermal) {
    printWindow.document.write('<div class="label-sheet">');
    products.forEach((product) => {
      if (product.barcode) {
        const label = createBarcodeLabel(product, {
          showPrice,
          showStock,
          format,
          labelWidth,
          labelHeight,
        });
        printWindow.document.write(label.outerHTML);
      }
    });
    printWindow.document.write('</div>');
  } else {
    products.forEach((product, idx) => {
      if (product.barcode) {
        const label = createThermalLabel(product, { showPrice, showStock, format });
        if (idx > 0) printWindow.document.write('<div class="page-break"></div>');
        printWindow.document.write(label.outerHTML);
      }
    });
  }

  printWindow.document.write('</body></html>');
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

/**
 * Get supported barcode formats
 */
export const getSupportedFormats = () => [
  { value: 'code128', label: 'CODE-128 (Recommended)' },
  { value: 'ean13', label: 'EAN-13' },
  { value: 'ean8', label: 'EAN-8' },
  { value: 'upca', label: 'UPC-A' },
  { value: 'codabar', label: 'Codabar' },
];

/**
 * Get label template options
 */
export const getLabelTemplates = () => [
  {
    id: 'a4-2x3',
    name: 'A4 2x3 (6 labels)',
    labelsPerRow: 2,
    labelWidth: 100,
    labelHeight: 80,
    pageWidth: 210,
    pageHeight: 297,
  },
  {
    id: 'a4-2x4',
    name: 'A4 2x4 (8 labels)',
    labelsPerRow: 2,
    labelWidth: 100,
    labelHeight: 70,
    pageWidth: 210,
    pageHeight: 297,
  },
  {
    id: 'thermal-80',
    name: 'Thermal 80mm',
    labelsPerRow: 1,
    labelWidth: 80,
    labelHeight: 60,
    pageWidth: 80,
    pageHeight: 297,
  },
  {
    id: 'thermal-58',
    name: 'Thermal 58mm',
    labelsPerRow: 1,
    labelWidth: 58,
    labelHeight: 50,
    pageWidth: 58,
    pageHeight: 297,
  },
];
