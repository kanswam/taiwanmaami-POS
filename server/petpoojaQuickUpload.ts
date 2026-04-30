import type { Request, Response } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { getDb } from './db';
import { deliverySalesUploads, deliveryItemSales } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Multer memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const petpoojaUploadMiddleware = upload.single('file');

// PIN is stored in env var
function getUploadPin(): string {
  return process.env.PETPOOJA_UPLOAD_PIN || '';
}

// Outlet configuration
const OUTLETS: Record<string, { label: string; periodPrefix: string }> = {
  'palladium-instore': { label: 'Palladium Instore', periodPrefix: 'PAL-IN' },
  'palladium-delivery': { label: 'Palladium Delivery', periodPrefix: 'PAL-DEL' },
  'tnagar-delivery': { label: 'T.Nagar Delivery', periodPrefix: 'TN-DEL' },
};

// Normalize product names (same logic as existing deliveryUpload.ts)
function normalizeProductName(itemName: string): string {
  let name = itemName
    .replace(/\s*\(R\)\s*/gi, '')
    .replace(/\s*\(L\)\s*/gi, '')
    .replace(/\s*\(Regular\s*\([^)]*\)\)\s*/gi, '')
    .replace(/\s*\(Large\s*\([^)]*\)\)\s*/gi, '')
    .replace(/\s*\(Regular\)\s*/gi, '')
    .replace(/\s*\(Large\)\s*/gi, '')
    .replace(/\s*-\s*(Regular|Large|Small|Medium)\s*/gi, '')
    .replace(/\s*(Regular|Large)\s*$/gi, '')
    .trim();
  return name;
}

interface ParsedItemData {
  category: string;
  itemName: string;
  baseProductName: string;
  itemCode: string;
  quantity: number;
  amount: number; // in paise
}

// Parse itemwise Excel file
async function parseItemwiseFile(buffer: Buffer): Promise<ParsedItemData[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.getWorksheet(1);
  if (!ws) return [];

  const items: ParsedItemData[] = [];
  let headerRowIdx = 0;

  ws.eachRow((row, rowNumber) => {
    const vals = row.values as any[];
    if (vals && vals.some((v: any) => {
      const s = String(v || '').toLowerCase();
      return s === 'category' || s === 'item' || s.includes('qty');
    })) {
      if (headerRowIdx === 0) headerRowIdx = rowNumber;
    }
  });

  if (headerRowIdx === 0) headerRowIdx = 6;

  let currentCategory = '';
  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIdx) return;

    const colA = row.getCell(1).value != null ? String(row.getCell(1).value).trim() : '';
    const colB = row.getCell(2).value != null ? String(row.getCell(2).value).trim() : '';
    const colC = row.getCell(3).value != null ? String(row.getCell(3).value).trim() : '';
    const qty = Number(row.getCell(5).value) || 0;
    const amt = Number(row.getCell(6).value) || 0;

    if (['total', 'min.', 'max.', 'avg.', 'sub total', 'grand total'].includes(colA.toLowerCase())) return;

    if (colA && colB && qty > 0) {
      currentCategory = colA;
      items.push({
        category: currentCategory,
        itemName: colB,
        baseProductName: normalizeProductName(colB),
        itemCode: colC,
        quantity: qty,
        amount: Math.round(amt * 100),
      });
    } else if (!colA && colB && qty > 0) {
      items.push({
        category: currentCategory,
        itemName: colB,
        baseProductName: normalizeProductName(colB),
        itemCode: colC,
        quantity: qty,
        amount: Math.round(amt * 100),
      });
    }
  });

  return items;
}

// Verify PIN endpoint
export async function handleVerifyPin(req: Request, res: Response) {
  const { pin } = req.body;
  const correctPin = getUploadPin();
  
  if (!correctPin) {
    return res.status(503).json({ error: 'Upload PIN not configured' });
  }
  
  if (pin !== correctPin) {
    return res.status(401).json({ error: 'Incorrect PIN' });
  }
  
  return res.json({ success: true });
}

// Handle the quick upload
export async function handlePetpoojaQuickUpload(req: Request, res: Response) {
  try {
    const { pin, outlet, date } = req.body;
    const correctPin = getUploadPin();
    
    // Verify PIN
    if (!correctPin) {
      return res.status(503).json({ error: 'Upload PIN not configured' });
    }
    if (pin !== correctPin) {
      return res.status(401).json({ error: 'Incorrect PIN' });
    }
    
    // Validate outlet
    const outletConfig = OUTLETS[outlet];
    if (!outletConfig) {
      return res.status(400).json({ error: 'Invalid outlet selected' });
    }
    
    // Validate date
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    // Validate file
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Parse the date for period
    const uploadDate = new Date(date);
    const periodLabel = `${outletConfig.periodPrefix}-${date}`; // e.g., "PAL-IN-2026-04-30"
    const periodStart = new Date(uploadDate);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(uploadDate);
    periodEnd.setHours(23, 59, 59, 999);
    
    const dbInstance = await getDb();
    if (!dbInstance) return res.status(500).json({ error: 'Database not available' });
    
    // Parse the itemwise file
    const itemData = await parseItemwiseFile(file.buffer);
    
    if (itemData.length === 0) {
      return res.status(400).json({ error: 'Could not parse any items from the file. Please ensure it is a Petpooja Item Wise Sales Report (.xlsx)' });
    }
    
    // Calculate totals from items
    const totalQuantity = itemData.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = itemData.reduce((sum, item) => sum + item.amount, 0);
    
    // Check if data for this period+outlet already exists
    const existing = await dbInstance.select()
      .from(deliverySalesUploads)
      .where(eq(deliverySalesUploads.periodLabel, periodLabel));
    
    let uploadId: number;
    
    if (existing.length > 0) {
      uploadId = existing[0].id;
      await dbInstance.update(deliverySalesUploads)
        .set({
          fileName: `${outletConfig.label} - ${date} (quick upload)`,
          grandTotal: totalAmount,
          periodStart,
          periodEnd,
          uploadedBy: 0, // PIN-based upload (no user session)
        })
        .where(eq(deliverySalesUploads.id, uploadId));
      
      // Delete old item data
      await dbInstance.delete(deliveryItemSales)
        .where(eq(deliveryItemSales.uploadId, uploadId));
    } else {
      const result = await dbInstance.insert(deliverySalesUploads).values({
        periodLabel,
        periodStart,
        periodEnd,
        fileName: `${outletConfig.label} - ${date} (quick upload)`,
        grandTotal: totalAmount,
        uploadedBy: 0,
      });
      uploadId = result[0].insertId;
    }
    
    // Insert item-level data
    if (itemData.length > 0) {
      const itemValues = itemData.map(item => ({
        uploadId,
        category: item.category,
        itemName: item.itemName,
        baseProductName: item.baseProductName,
        itemCode: item.itemCode,
        quantity: item.quantity,
        amount: item.amount,
        periodStart,
        periodEnd,
      }));
      
      for (let i = 0; i < itemValues.length; i += 50) {
        await dbInstance.insert(deliveryItemSales).values(itemValues.slice(i, i + 50));
      }
    }
    
    return res.json({
      success: true,
      outlet: outletConfig.label,
      date,
      itemCount: itemData.length,
      totalQuantity,
      totalAmount: totalAmount / 100, // Return in rupees for display
      updated: existing.length > 0,
    });
  } catch (error: any) {
    console.error('Petpooja quick upload error:', error);
    return res.status(500).json({ error: 'Failed to process file: ' + error.message });
  }
}
