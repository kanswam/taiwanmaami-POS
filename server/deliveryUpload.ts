import type { Request, Response } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { authenticateClerkRequest } from './_core/clerk';
import { getDb } from './db';
import { deliverySalesUploads, deliveryItemSales } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

// Multer memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const deliveryUploadMiddleware = upload.fields([
  { name: 'itemwiseFile', maxCount: 1 },
  { name: 'summaryFile', maxCount: 1 },
]);

// Admin auth check
async function requireAdmin(req: Request, res: Response): Promise<any> {
  try {
    const user = await authenticateClerkRequest(req as any);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return null;
    }
    return user;
  } catch {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
}

// Normalize product names: remove size/boba variants to get base product name
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

interface ParsedSummaryData {
  totalOrders: number;
  totalAmount: number;
  totalDiscount: number;
  netSales: number;
  totalTax: number;
  grandTotal: number;
  zomatoOrders: number;
  zomatoAmount: number;
  swiggyOrders: number;
  swiggyAmount: number;
  dineInOrders: number;
  dineInAmount: number;
  cashAmount: number;
  cardAmount: number;
  upiAmount: number;
  swiggyDineoutAmount: number;
  zomatoDineoutAmount: number;
  cgst: number;
  sgst: number;
}

// Parse itemwise Excel file using ExcelJS
async function parseItemwiseFile(buffer: Buffer): Promise<ParsedItemData[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.getWorksheet(1);
  if (!ws) return [];

  const items: ParsedItemData[] = [];
  let headerRowIdx = 0;

  // Find header row (contains 'Category', 'Item', 'Qty')
  ws.eachRow((row, rowNumber) => {
    const vals = row.values as any[];
    if (vals && vals.some((v: any) => {
      const s = String(v || '').toLowerCase();
      return s === 'category' || s === 'item' || s.includes('qty');
    })) {
      if (headerRowIdx === 0) headerRowIdx = rowNumber;
    }
  });

  if (headerRowIdx === 0) headerRowIdx = 6; // Default for Petpooja format

  // Parse data rows (skip header + Total/Min/Max/Avg rows)
  let currentCategory = '';
  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIdx) return;

    const colA = row.getCell(1).value != null ? String(row.getCell(1).value).trim() : '';
    const colB = row.getCell(2).value != null ? String(row.getCell(2).value).trim() : '';
    const colC = row.getCell(3).value != null ? String(row.getCell(3).value).trim() : '';
    const qty = Number(row.getCell(5).value) || 0;
    const amt = Number(row.getCell(6).value) || 0;

    // Skip metadata rows
    if (['total', 'min.', 'max.', 'avg.', 'sub total', 'grand total'].includes(colA.toLowerCase())) return;

    // Category + first item on same row
    if (colA && colB && qty > 0) {
      currentCategory = colA;
      items.push({
        category: currentCategory,
        itemName: colB,
        baseProductName: normalizeProductName(colB),
        itemCode: colC,
        quantity: qty,
        amount: Math.round(amt * 100), // Convert to paise
      });
    }
    // Continuation item (empty col A)
    else if (!colA && colB && qty > 0) {
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

// Parse summary Excel file using ExcelJS
async function parseSummaryFile(buffer: Buffer): Promise<ParsedSummaryData> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.getWorksheet(1);
  
  const defaultData: ParsedSummaryData = {
    totalOrders: 0, totalAmount: 0, totalDiscount: 0, netSales: 0,
    totalTax: 0, grandTotal: 0, zomatoOrders: 0, zomatoAmount: 0,
    swiggyOrders: 0, swiggyAmount: 0, dineInOrders: 0, dineInAmount: 0,
    cashAmount: 0, cardAmount: 0, upiAmount: 0,
    swiggyDineoutAmount: 0, zomatoDineoutAmount: 0, cgst: 0, sgst: 0,
  };

  if (!ws) return defaultData;

  // Find header row (contains 'Zomato Orders')
  let headerRowIdx = 0;
  let dataRowIdx = 0;
  const headerMap: Record<string, number> = {};

  ws.eachRow((row, rowNumber) => {
    const vals = row.values as any[];
    if (vals && vals.some((v: any) => String(v || '').toLowerCase().includes('zomato orders'))) {
      if (headerRowIdx === 0) {
        headerRowIdx = rowNumber;
        dataRowIdx = rowNumber + 1;
        // Build column map
        for (let c = 1; c <= row.cellCount; c++) {
          const val = row.getCell(c).value;
          if (val) headerMap[String(val).toLowerCase().trim()] = c;
        }
      }
    }
  });

  if (headerRowIdx === 0 || dataRowIdx === 0) return defaultData;

  const dataRow = ws.getRow(dataRowIdx);
  const getVal = (key: string): number => {
    // Try exact match
    if (headerMap[key]) return Number(dataRow.getCell(headerMap[key]).value) || 0;
    // Try partial match
    for (const [k, colIdx] of Object.entries(headerMap)) {
      if (k.includes(key)) return Number(dataRow.getCell(colIdx).value) || 0;
    }
    return 0;
  };

  const toPaise = (val: number) => Math.round(val * 100);

  return {
    totalOrders: getVal('orders'),
    totalAmount: toPaise(getVal('my amount')),
    totalDiscount: toPaise(getVal('discount')),
    netSales: toPaise(getVal('net sales')),
    totalTax: toPaise(getVal('total tax')),
    grandTotal: toPaise(getVal('total (₹)') || getVal('total')),
    zomatoOrders: getVal('zomato orders'),
    zomatoAmount: toPaise(getVal('zomato other') + getVal('zomato cod')),
    swiggyOrders: getVal('swiggy orders'),
    swiggyAmount: toPaise(getVal('swiggy other') + getVal('swiggy cod')),
    dineInOrders: getVal('dine in orders'),
    dineInAmount: toPaise(getVal('dine in')),
    cashAmount: toPaise(getVal('cash')),
    cardAmount: toPaise(getVal('card')),
    upiAmount: toPaise(getVal('other [upi]')),
    swiggyDineoutAmount: toPaise(getVal('other [swiggy dineout]')),
    zomatoDineoutAmount: toPaise(getVal('other [zomato dineout]')),
    cgst: toPaise(getVal('cgst@2.5')),
    sgst: toPaise(getVal('sgst@2.5')),
  };
}

// Handle delivery data upload (multipart form with files)
export async function handleDeliveryUpload(req: Request, res: Response) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  try {
    const { periodLabel, periodStart, periodEnd } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    if (!periodLabel || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'Period label, start date, and end date are required' });
    }

    const itemwiseFile = files?.['itemwiseFile']?.[0];
    const summaryFile = files?.['summaryFile']?.[0];

    if (!itemwiseFile && !summaryFile) {
      return res.status(400).json({ error: 'Please upload at least one Excel file' });
    }

    const dbInstance = await getDb();
    if (!dbInstance) return res.status(500).json({ error: 'Database not available' });

    // Parse files server-side with ExcelJS
    let itemData: ParsedItemData[] = [];
    let summaryData: ParsedSummaryData = {
      totalOrders: 0, totalAmount: 0, totalDiscount: 0, netSales: 0,
      totalTax: 0, grandTotal: 0, zomatoOrders: 0, zomatoAmount: 0,
      swiggyOrders: 0, swiggyAmount: 0, dineInOrders: 0, dineInAmount: 0,
      cashAmount: 0, cardAmount: 0, upiAmount: 0,
      swiggyDineoutAmount: 0, zomatoDineoutAmount: 0, cgst: 0, sgst: 0,
    };

    if (itemwiseFile) {
      itemData = await parseItemwiseFile(itemwiseFile.buffer);
    }

    if (summaryFile) {
      summaryData = await parseSummaryFile(summaryFile.buffer);
    }

    // Check if data for this period already exists
    const existing = await dbInstance.select()
      .from(deliverySalesUploads)
      .where(eq(deliverySalesUploads.periodLabel, periodLabel));
    
    let uploadId: number;
    const fileName = itemwiseFile?.originalname || summaryFile?.originalname || 'manual';
    
    if (existing.length > 0) {
      uploadId = existing[0].id;
      await dbInstance.update(deliverySalesUploads)
        .set({
          ...summaryData,
          fileName,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          uploadedBy: user.id,
        })
        .where(eq(deliverySalesUploads.id, uploadId));
      
      // Delete old item data
      await dbInstance.delete(deliveryItemSales)
        .where(eq(deliveryItemSales.uploadId, uploadId));
    } else {
      const result = await dbInstance.insert(deliverySalesUploads).values({
        periodLabel,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        fileName,
        ...summaryData,
        uploadedBy: user.id,
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
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      }));
      
      // Insert in batches of 50
      for (let i = 0; i < itemValues.length; i += 50) {
        await dbInstance.insert(deliveryItemSales).values(itemValues.slice(i, i + 50));
      }
    }

    return res.json({
      success: true,
      uploadId,
      itemCount: itemData.length,
      updated: existing.length > 0,
      summary: {
        totalOrders: summaryData.totalOrders,
        grandTotal: summaryData.grandTotal / 100,
        zomatoOrders: summaryData.zomatoOrders,
        swiggyOrders: summaryData.swiggyOrders,
        dineInOrders: summaryData.dineInOrders,
        zomatoAmount: summaryData.zomatoAmount / 100,
        swiggyAmount: summaryData.swiggyAmount / 100,
      }
    });
  } catch (error: any) {
    console.error('Delivery upload error:', error);
    return res.status(500).json({ error: 'Failed to process delivery data: ' + error.message });
  }
}

// Get all delivery uploads
export async function handleGetDeliveryUploads(req: Request, res: Response) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  try {
    const dbInstance = await getDb();
    if (!dbInstance) return res.status(500).json({ error: 'Database not available' });
    const uploads = await dbInstance.select()
      .from(deliverySalesUploads)
      .orderBy(sql`${deliverySalesUploads.periodStart} DESC`);
    
    return res.json(uploads);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch uploads' });
  }
}

// Delete a delivery upload and its items
export async function handleDeleteDeliveryUpload(req: Request, res: Response) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  try {
    const uploadId = parseInt(req.params.id);
    if (!uploadId) return res.status(400).json({ error: 'Invalid upload ID' });

    const dbInstance = await getDb();
    if (!dbInstance) return res.status(400).json({ error: 'Database not available' });
    await dbInstance.delete(deliveryItemSales).where(eq(deliveryItemSales.uploadId, uploadId));
    await dbInstance.delete(deliverySalesUploads).where(eq(deliverySalesUploads.id, uploadId));
    
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete upload' });
  }
}
