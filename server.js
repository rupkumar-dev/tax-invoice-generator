const express = require('express');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const app = express();
app.use(express.json());

// Log client errors directly to server stdout
app.post('/api/log-error', (req, res) => {
  console.error("\n❌ CLIENT ERROR:");
  console.error(req.body.error);
  if (req.body.stack) console.error(req.body.stack);
  console.error("----------------------------------------------------\n");
  res.json({ success: true });
});

// Serve static index.html
app.use(express.static(__dirname));

// Ensure directory layout
const BASE_DIR = path.join(__dirname, 'saved_templates');
const JSON_DIR = path.join(BASE_DIR, 'json');
const EXCEL_DIR = path.join(BASE_DIR, 'excel');

[BASE_DIR, JSON_DIR, EXCEL_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Save template endpoint
app.post('/api/save-template', async (req, res) => {
  try {
    const tpl = req.body;
    if (!tpl || !tpl.name) {
      return res.status(400).json({ success: false, error: "Invalid template data" });
    }

    const safeName = tpl.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `template_${safeName}_${Date.now()}`;

    // 1. Save JSON file
    const jsonPath = path.join(JSON_DIR, `${filename}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(tpl, null, 2), 'utf-8');

    // 2. Generate Excel sheet using ExcelJS
    const excelPath = path.join(EXCEL_DIR, `${filename}.xlsx`);
    await generateExcelInvoice(tpl, excelPath);

    res.json({
      success: true,
      jsonFile: path.relative(__dirname, jsonPath),
      excelFile: path.relative(__dirname, excelPath)
    });
  } catch (error) {
    console.error("Error saving template:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Beautiful Excel Generator Helper
async function generateExcelInvoice(tpl, filePath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Invoice');

  // Page layout gridlines
  worksheet.views = [{ showGridLines: true }];

  // Column definitions and widths
  worksheet.columns = [
    { header: '', key: 'A', width: 6 },   // Sl
    { header: '', key: 'B', width: 34 },  // Description
    { header: '', key: 'C', width: 12 },  // HSN
    { header: '', key: 'D', width: 10 },  // Qty
    { header: '', key: 'E', width: 8 },   // Per
    { header: '', key: 'F', width: 12 },  // Rate
    { header: '', key: 'G', width: 10 },  // GST %
    { header: '', key: 'H', width: 10 },  // Disc
    { header: '', key: 'I', width: 16 }   // Amount
  ];

  // Dynamic Theme Color & Font Mapping from Template Settings
  const rawTheme = tpl.invThemeColor || '#C32027'; // Crimson Red default
  const hexColor = rawTheme.replace('#', '').toUpperCase();
  
  const rawFont = tpl.invFontFamily || 'Arial';
  const cleanFont = rawFont.split(',')[0].replace(/['"]/g, '').trim();
  const layoutPreset = tpl.layoutPreset || 'modern';

  // Styles definitions
  const FONT_TITLE = { name: cleanFont, size: 14, bold: true, color: { argb: 'FFFFFF' } };
  const FONT_SECTION = { name: cleanFont, size: 9, bold: true, color: { argb: '64748B' } };
  const FONT_BOLD = { name: cleanFont, size: 10, bold: true };
  const FONT_REGULAR = { name: cleanFont, size: 9 };
  const FONT_MUTED = { name: cleanFont, size: 8.5, color: { argb: '64748B' } };
  
  const FILL_PRIMARY = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexColor } }; 
  const FILL_HEADER = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
  
  // Custom borders mapping according to Layout Presets
  const isElegant = layoutPreset === 'elegant';
  const BORDER_THIN = isElegant ? {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } }
  } : {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } }
  };
  
  const ALIGN_CENTER = { vertical: 'middle', horizontal: 'center' };
  const ALIGN_LEFT = { vertical: 'middle', horizontal: 'left' };
  const ALIGN_RIGHT = { vertical: 'middle', horizontal: 'right' };

  // Row 1: Document Topstrip Header (e.g. TAX INVOICE)
  worksheet.mergeCells('A1:I1');
  const r1 = worksheet.getRow(1);
  r1.height = 28;
  const c1 = worksheet.getCell('A1');
  c1.value = (tpl.docType || 'TAX INVOICE').toUpperCase();
  c1.font = FONT_TITLE;
  c1.fill = FILL_PRIMARY;
  c1.alignment = ALIGN_CENTER;

  // Row 2: Empty
  worksheet.getRow(2).height = 10;

  // Row 3-7: Seller Profile & Invoice Meta
  worksheet.mergeCells('A3:E3');
  const cellSellerTitle = worksheet.getCell('A3');
  cellSellerTitle.value = tpl.forName || tpl.sellerName || 'My Business';
  cellSellerTitle.font = { name: cleanFont, size: 12, bold: true, color: { argb: hexColor } };
  
  worksheet.getCell('A4').value = tpl.sellerAddr || '';
  worksheet.getCell('A4').font = FONT_REGULAR;
  worksheet.getCell('A5').value = `Phone: ${tpl.sellerPhone || ''} | Email: ${tpl.sellerEmail || ''}`;
  worksheet.getCell('A5').font = FONT_REGULAR;
  worksheet.getCell('A6').value = `GSTIN: ${tpl.sellerGST || ''} | PAN: ${tpl.sellerPAN || ''}`;
  worksheet.getCell('A6').font = FONT_BOLD;

  // Invoice details (Right)
  worksheet.getCell('F3').value = 'Invoice No:';
  worksheet.getCell('F3').font = FONT_BOLD;
  worksheet.getCell('G3').value = tpl.invNo || 'DRAFT';
  worksheet.getCell('G3').font = FONT_REGULAR;

  worksheet.getCell('F4').value = 'Date:';
  worksheet.getCell('F4').font = FONT_BOLD;
  worksheet.getCell('G4').value = tpl.invDate || '';
  worksheet.getCell('G4').font = FONT_REGULAR;

  worksheet.getCell('F5').value = 'Payment Mode:';
  worksheet.getCell('F5').font = FONT_BOLD;
  worksheet.getCell('G5').value = tpl.payMode || '';
  worksheet.getCell('G5').font = FONT_REGULAR;

  worksheet.getCell('F6').value = 'Buyer Order No:';
  worksheet.getCell('F6').font = FONT_BOLD;
  worksheet.getCell('G6').value = tpl.buyerOrderNo || '';
  worksheet.getCell('G6').font = FONT_REGULAR;

  // Add borders and outline to seller/meta block
  for (let r = 3; r <= 7; r++) {
    for (let c = 1; c <= 9; c++) {
      worksheet.getCell(r, c).border = {
        bottom: r === 7 ? { style: 'medium', color: { argb: 'CBD5E1' } } : null
      };
    }
  }

  // Row 8: Empty gap
  worksheet.getRow(8).height = 10;

  // Row 9-13: Buyer / Billing Details
  worksheet.getCell('A9').value = 'BILL TO (BUYER):';
  worksheet.getCell('A9').font = FONT_SECTION;

  worksheet.mergeCells('A10:E10');
  worksheet.getCell('A10').value = tpl.buyerName || 'Client Name';
  worksheet.getCell('A10').font = FONT_BOLD;

  worksheet.mergeCells('A11:E11');
  worksheet.getCell('A11').value = tpl.buyerAddr || '';
  worksheet.getCell('A11').font = FONT_REGULAR;

  worksheet.getCell('A12').value = `Phone: ${tpl.buyerPhone || ''}`;
  worksheet.getCell('A12').font = FONT_REGULAR;

  worksheet.getCell('A13').value = `GSTIN: ${tpl.buyerGST || ''}`;
  worksheet.getCell('A13').font = FONT_BOLD;

  // Terms of Delivery on the right
  worksheet.getCell('F9').value = 'TERMS OF DELIVERY:';
  worksheet.getCell('F9').font = FONT_SECTION;
  worksheet.mergeCells('F10:I13');
  worksheet.getCell('F10').value = tpl.termsDelivery || '';
  worksheet.getCell('F10').font = FONT_REGULAR;
  worksheet.getCell('F10').alignment = { wrapText: true, vertical: 'top' };

  // Draw medium border under buyer block
  for (let c = 1; c <= 9; c++) {
    worksheet.getCell(14, c).border = {
      bottom: { style: 'medium', color: { argb: 'CBD5E1' } }
    };
  }
  worksheet.getRow(14).height = 8;

  // Row 15: Empty
  worksheet.getRow(15).height = 10;

  // Row 16: Table Headers
  const tableHeaders = ['Sl.', 'Product / Service Description', 'HSN/SAC', 'Qty', 'Per', 'Rate', 'GST', 'Disc', 'Amount'];
  const r16 = worksheet.getRow(16);
  r16.height = 24;
  tableHeaders.forEach((th, idx) => {
    const cell = r16.getCell(idx + 1);
    cell.value = th;
    cell.font = FONT_BOLD;
    // Elegant layout table headers use white background with underline, others use slate-gray fill
    cell.fill = isElegant ? { type: 'pattern', pattern: 'none' } : FILL_HEADER;
    cell.alignment = ALIGN_CENTER;
    cell.border = isElegant ? {
      top: { style: 'medium', color: { argb: hexColor } },
      bottom: { style: 'medium', color: { argb: hexColor } }
    } : BORDER_THIN;
  });

  // Table Body Rows
  let curRow = 17;
  const items = tpl.items || [];
  
  items.forEach((item, idx) => {
    const row = worksheet.getRow(curRow);
    row.height = 20;

    const cSl = row.getCell(1);
    cSl.value = idx + 1;
    cSl.alignment = ALIGN_CENTER;

    const cDesc = row.getCell(2);
    cDesc.value = item.desc || '';
    cDesc.alignment = ALIGN_LEFT;

    const cHsn = row.getCell(3);
    cHsn.value = item.hsn || '';
    cHsn.alignment = ALIGN_CENTER;

    const cQty = row.getCell(4);
    cQty.value = item.qty !== undefined && item.qty !== '' ? +item.qty : '';
    cQty.alignment = ALIGN_CENTER;

    const cPer = row.getCell(5);
    cPer.value = item.per || 'Nos';
    cPer.alignment = ALIGN_CENTER;

    const cRate = row.getCell(6);
    cRate.value = item.rate !== undefined && item.rate !== '' ? +item.rate : '';
    cRate.numFmt = '#,##0.00';
    cRate.alignment = ALIGN_RIGHT;

    const cGst = row.getCell(7);
    cGst.value = item.gst !== undefined && item.gst !== '' ? `${item.gst}%` : '';
    cGst.alignment = ALIGN_CENTER;

    const cDisc = row.getCell(8);
    cDisc.value = item.disc || '';
    cDisc.alignment = ALIGN_CENTER;

    const amt = item.amount !== undefined ? item.amount : ((+item.qty || 0) * (+item.rate || 0));
    const cAmt = row.getCell(9);
    cAmt.value = amt;
    cAmt.numFmt = '#,##0.00';
    cAmt.alignment = ALIGN_RIGHT;
    cAmt.font = FONT_BOLD;

    for (let c = 1; c <= 9; c++) {
      row.getCell(c).border = BORDER_THIN;
      row.getCell(c).font = row.getCell(c).font || FONT_REGULAR;
    }

    curRow++;
  });

  // Calculate Totals block
  const byGST = {};
  items.forEach(item => {
    const amt = item.amount !== undefined ? item.amount : ((+item.qty || 0) * (+item.rate || 0));
    const g = item.gst || 0;
    if (!byGST[g]) byGST[g] = {taxable: 0};
    byGST[g].taxable += amt;
  });

  let subtotal = 0;
  Object.values(byGST).forEach(v => subtotal += v.taxable);
  const discount = +(tpl.discount || 0);
  const addChrg = +(tpl.addCharges || 0);
  const taxableAfterDisc = Math.max(0, subtotal - discount);
  
  let totalTax = 0;
  Object.entries(byGST).forEach(([g, v]) => {
    const ratio = subtotal > 0 ? v.taxable / subtotal : 0;
    const taxBase = taxableAfterDisc * ratio;
    v.cgst = Math.round(((taxBase * (+g) / 100) / 2) * 100) / 100;
    v.sgst = v.cgst;
    totalTax += v.cgst + v.sgst;
  });
  
  const grand = taxableAfterDisc + totalTax + addChrg;

  // Subtotal row
  worksheet.mergeCells(`A${curRow}:H${curRow}`);
  worksheet.getCell(`A${curRow}`).value = 'Total Amount Before Tax';
  worksheet.getCell(`A${curRow}`).font = FONT_BOLD;
  worksheet.getCell(`A${curRow}`).alignment = ALIGN_RIGHT;
  worksheet.getCell(`I${curRow}`).value = subtotal;
  worksheet.getCell(`I${curRow}`).numFmt = '#,##0.00';
  worksheet.getCell(`I${curRow}`).font = FONT_BOLD;
  worksheet.getCell(`I${curRow}`).alignment = ALIGN_RIGHT;
  worksheet.getRow(curRow).getCell(9).border = BORDER_THIN;
  curRow++;

  if (discount > 0) {
    worksheet.mergeCells(`A${curRow}:H${curRow}`);
    worksheet.getCell(`A${curRow}`).value = 'Discount (-)';
    worksheet.getCell(`A${curRow}`).font = FONT_BOLD;
    worksheet.getCell(`A${curRow}`).alignment = ALIGN_RIGHT;
    worksheet.getCell(`I${curRow}`).value = discount;
    worksheet.getCell(`I${curRow}`).numFmt = '#,##0.00';
    worksheet.getCell(`I${curRow}`).font = FONT_BOLD;
    worksheet.getCell(`I${curRow}`).alignment = ALIGN_RIGHT;
    curRow++;
  }

  // Draw individual taxes
  Object.entries(byGST).sort(([a],[b])=>+a-+b).forEach(([g, v]) => {
    if (+g === 0) return;
    const h = (+g === 5) ? 5 : (+g / 2);
    
    worksheet.mergeCells(`A${curRow}:H${curRow}`);
    worksheet.getCell(`A${curRow}`).value = `CGST @${h}%`;
    worksheet.getCell(`A${curRow}`).font = FONT_REGULAR;
    worksheet.getCell(`A${curRow}`).alignment = ALIGN_RIGHT;
    worksheet.getCell(`I${curRow}`).value = v.cgst;
    worksheet.getCell(`I${curRow}`).numFmt = '#,##0.00';
    worksheet.getCell(`I${curRow}`).alignment = ALIGN_RIGHT;
    curRow++;

    worksheet.mergeCells(`A${curRow}:H${curRow}`);
    worksheet.getCell(`A${curRow}`).value = `SGST @${h}%`;
    worksheet.getCell(`A${curRow}`).font = FONT_REGULAR;
    worksheet.getCell(`A${curRow}`).alignment = ALIGN_RIGHT;
    worksheet.getCell(`I${curRow}`).value = v.sgst;
    worksheet.getCell(`I${curRow}`).numFmt = '#,##0.00';
    worksheet.getCell(`I${curRow}`).alignment = ALIGN_RIGHT;
    curRow++;
  });

  if (addChrg > 0) {
    worksheet.mergeCells(`A${curRow}:H${curRow}`);
    worksheet.getCell(`A${curRow}`).value = tpl.chargesNote || 'Additional Charges';
    worksheet.getCell(`A${curRow}`).font = FONT_REGULAR;
    worksheet.getCell(`A${curRow}`).alignment = ALIGN_RIGHT;
    worksheet.getCell(`I${curRow}`).value = addChrg;
    worksheet.getCell(`I${curRow}`).numFmt = '#,##0.00';
    worksheet.getCell(`I${curRow}`).alignment = ALIGN_RIGHT;
    curRow++;
  }

  // Grand Total Row
  worksheet.mergeCells(`A${curRow}:H${curRow}`);
  const gtLabel = worksheet.getCell(`A${curRow}`);
  gtLabel.value = 'GRAND TOTAL';
  gtLabel.font = { name: cleanFont, size: 10, bold: true, color: { argb: 'FFFFFF' } };
  gtLabel.alignment = ALIGN_RIGHT;
  gtLabel.fill = FILL_PRIMARY;

  const gtVal = worksheet.getCell(`I${curRow}`);
  gtVal.value = grand;
  gtVal.numFmt = '₹#,##0.00';
  gtVal.font = { name: cleanFont, size: 11, bold: true, color: { argb: 'FFFFFF' } };
  gtVal.alignment = ALIGN_RIGHT;
  gtVal.fill = FILL_PRIMARY;
  curRow++;

  curRow += 1;

  // Bank Info & Notes block
  const startBankRow = curRow;
  worksheet.getCell(`A${startBankRow}`).value = 'BANK & PAYMENT DETAILS:';
  worksheet.getCell(`A${startBankRow}`).font = FONT_SECTION;
  
  worksheet.getCell(`A${startBankRow+1}`).value = `Bank Name: ${tpl.bankName || ''}`;
  worksheet.getCell(`A${startBankRow+1}`).font = FONT_REGULAR;

  worksheet.getCell(`A${startBankRow+2}`).value = `A/c Holder: ${tpl.bankHolder || ''}`;
  worksheet.getCell(`A${startBankRow+2}`).font = FONT_REGULAR;

  worksheet.getCell(`A${startBankRow+3}`).value = `A/c No: ${tpl.bankAcc || ''}`;
  worksheet.getCell(`A${startBankRow+3}`).font = FONT_BOLD;

  worksheet.getCell(`A${startBankRow+4}`).value = `IFSC Code: ${tpl.bankIFSC || ''} | Branch: ${tpl.bankBranch || ''}`;
  worksheet.getCell(`A${startBankRow+4}`).font = FONT_REGULAR;

  // Notes on the right
  worksheet.getCell(`F${startBankRow}`).value = 'TERMS & DECLARATION:';
  worksheet.getCell(`F${startBankRow}`).font = FONT_SECTION;
  worksheet.mergeCells(`F${startBankRow+1}:I${startBankRow+4}`);
  
  let declText = tpl.declText || 'Declaration';
  if (tpl.invNotes) declText = `Notes: ${tpl.invNotes}\n\nDeclaration: ${declText}`;
  worksheet.getCell(`F${startBankRow+1}`).value = declText;
  worksheet.getCell(`F${startBankRow+1}`).font = FONT_MUTED;
  worksheet.getCell(`F${startBankRow+1}`).alignment = { wrapText: true, vertical: 'top' };

  for (let r = startBankRow; r <= startBankRow + 5; r++) {
    for (let c = 1; c <= 9; c++) {
      worksheet.getCell(r, c).border = {
        top: r === startBankRow ? { style: 'thin', color: { argb: 'CBD5E1' } } : null,
        bottom: r === startBankRow + 5 ? { style: 'thin', color: { argb: 'CBD5E1' } } : null
      };
    }
  }

  // Save the workbook
  await workbook.xlsx.writeFile(filePath);
}

// Start local server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Billing Desktop Server started on http://localhost:${PORT}`);
  console.log(`📂 Saved Templates will be generated in:`);
  console.log(`   📁 JSON:   ${JSON_DIR}`);
  console.log(`   📁 Excel:  ${EXCEL_DIR}`);
  console.log(`====================================================`);
});
