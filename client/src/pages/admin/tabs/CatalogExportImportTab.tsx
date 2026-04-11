/**
 * Admin Catalog Export/Import Tab
 * 
 * Export: Downloads all products with descriptions as a nicely formatted Excel file.
 * Import: Upload the updated Excel to bulk-update product descriptions.
 */

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Download, Upload, FileSpreadsheet, CheckCircle, AlertTriangle,
  Loader2, Info, FileDown, FileUp, ArrowRight,
} from 'lucide-react';
import ExcelJS from 'exceljs';

export default function CatalogExportImportTab() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    updated: number; skipped: number; total: number;
    errors: { id: number; error: string }[];
  } | null>(null);
  const [previewData, setPreviewData] = useState<{
    total: number;
    changed: number;
    updates: { id: number; name: string; oldDesc: string; newDesc: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading } = trpc.catalog.exportProducts.useQuery();
  const importMutation = trpc.catalog.importDescriptions.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      setPreviewData(null);
      setIsImporting(false);
      if (result.updated > 0) {
        toast.success(`Updated ${result.updated} product description${result.updated > 1 ? 's' : ''}`);
      }
      if (result.skipped > 0) {
        toast.warning(`${result.skipped} product${result.skipped > 1 ? 's' : ''} skipped`);
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Import failed');
      setIsImporting(false);
    },
  });

  // ─── Export to Excel ──────────────────────────────────────────────

  const handleExport = async () => {
    if (!products || products.length === 0) {
      toast.error('No products to export');
      return;
    }

    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Taiwan Maami™ Admin';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Product Catalog', {
        properties: { defaultColWidth: 20 },
      });

      // Define columns
      sheet.columns = [
        { header: 'Product ID', key: 'id', width: 12 },
        { header: 'Product Name', key: 'name', width: 35 },
        { header: 'Chinese Name', key: 'chineseName', width: 20 },
        { header: 'Category', key: 'categoryName', width: 20 },
        { header: 'Subcategory', key: 'subcategoryName', width: 20 },
        { header: 'Regular Price (₹)', key: 'regularPrice', width: 16 },
        { header: 'Large Price (₹)', key: 'largePrice', width: 16 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Current Description', key: 'description', width: 60 },
        { header: 'New Description (Edit Here)', key: 'newDescription', width: 60 },
      ];

      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC0392B' }, // Taiwan Maami red
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.height = 30;

      // Add data rows
      products.forEach((product) => {
        const row = sheet.addRow({
          id: product.id,
          name: product.name,
          chineseName: product.chineseName || '',
          categoryName: product.categoryName,
          subcategoryName: product.subcategoryName,
          regularPrice: product.instorePrice
            ? (product.instorePrice / 100).toFixed(0)
            : product.basePriceRegularWithBoba
              ? (product.basePriceRegularWithBoba / 100).toFixed(0)
              : '-',
          largePrice: product.basePriceLargeWithBoba ? (product.basePriceLargeWithBoba / 100).toFixed(0) : '-',
          status: product.isActive ? 'Active' : 'Inactive',
          description: product.description || '',
          newDescription: '', // Blank for user to fill
        });

        row.alignment = { vertical: 'top', wrapText: true };
        row.height = 40;
      });

      // Style the "New Description" column with yellow highlight
      sheet.getColumn('newDescription').eachCell((cell, rowNumber) => {
        if (rowNumber > 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF9C4' }, // Light yellow
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          };
        }
      });

      // Lock the ID column (read-only visual cue)
      sheet.getColumn('id').eachCell((cell, rowNumber) => {
        if (rowNumber > 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' }, // Light gray
          };
          cell.font = { color: { argb: 'FF666666' } };
        }
      });

      // Add alternating row colors for readability
      for (let i = 2; i <= products.length + 1; i++) {
        const row = sheet.getRow(i);
        if (i % 2 === 0) {
          row.eachCell((cell, colNumber) => {
            if (colNumber !== 10 && colNumber !== 1) { // Skip newDescription and ID columns
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFAFAFA' },
              };
            }
          });
        }
      }

      // Add instructions row at the bottom
      const instrRow = sheet.addRow([]);
      sheet.addRow([]);
      const noteRow = sheet.addRow(['INSTRUCTIONS:']);
      noteRow.font = { bold: true, size: 10, color: { argb: 'FFC0392B' } };
      sheet.addRow(['1. Fill in the "New Description (Edit Here)" column (Column J) with updated descriptions.']);
      sheet.addRow(['2. Leave the "New Description" cell blank for products you do NOT want to update.']);
      sheet.addRow(['3. Do NOT modify the "Product ID" column — it is used to match products.']);
      sheet.addRow(['4. Save the file and upload it back using the Import button.']);

      // Auto-filter on headers
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 10 },
      };

      // Freeze header row
      sheet.views = [{ state: 'frozen', ySplit: 1 }];

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Taiwan_Maami_Product_Catalog_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${products.length} products to Excel`);
    } catch (err: any) {
      toast.error('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  // ─── Import from Excel ────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset
    setImportResult(null);
    setPreviewData(null);

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const sheet = workbook.getWorksheet('Product Catalog') || workbook.getWorksheet(1);
      if (!sheet) {
        toast.error('Could not find "Product Catalog" sheet in the file');
        return;
      }

      // Find column indices from header row
      const headerRow = sheet.getRow(1);
      let idCol = -1;
      let nameCol = -1;
      let currentDescCol = -1;
      let newDescCol = -1;

      headerRow.eachCell((cell, colNumber) => {
        const val = String(cell.value || '').toLowerCase().trim();
        if (val.includes('product id')) idCol = colNumber;
        if (val.includes('product name')) nameCol = colNumber;
        if (val.includes('current description')) currentDescCol = colNumber;
        if (val.includes('new description')) newDescCol = colNumber;
      });

      if (idCol === -1 || newDescCol === -1) {
        toast.error('Invalid file format. Required columns: "Product ID" and "New Description (Edit Here)"');
        return;
      }

      // Parse rows
      const updates: { id: number; name: string; oldDesc: string; newDesc: string }[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 1) return; // Skip header

        const id = Number(row.getCell(idCol).value);
        if (!id || isNaN(id)) return; // Skip non-product rows (instructions, etc.)

        const newDesc = String(row.getCell(newDescCol).value || '').trim();
        if (!newDesc) return; // Skip blank new descriptions

        const name = String(row.getCell(nameCol).value || '');
        const oldDesc = String(row.getCell(currentDescCol).value || '');

        // Only include if the description actually changed
        if (newDesc !== oldDesc.trim()) {
          updates.push({ id, name, oldDesc, newDesc });
        }
      });

      if (updates.length === 0) {
        toast.info('No description changes found. Make sure you filled in the "New Description" column.');
        return;
      }

      setPreviewData({
        total: sheet.rowCount - 1,
        changed: updates.length,
        updates,
      });

    } catch (err: any) {
      toast.error('Failed to read file: ' + (err.message || 'Unknown error'));
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    if (!previewData) return;
    setIsImporting(true);
    importMutation.mutate({
      updates: previewData.updates.map(u => ({ id: u.id, description: u.newDesc })),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Product Catalog Export / Import
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Export your product catalog to Excel, update descriptions in the spreadsheet, then import it back to apply changes in bulk.
        </p>
      </div>

      {/* Workflow Steps */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">How it works:</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-white border-blue-300">
                <FileDown className="w-3 h-3 mr-1" /> Step 1: Export
              </Badge>
              <ArrowRight className="w-4 h-4 text-blue-400" />
              <Badge variant="outline" className="bg-white border-blue-300">
                <FileSpreadsheet className="w-3 h-3 mr-1" /> Step 2: Edit in Excel
              </Badge>
              <ArrowRight className="w-4 h-4 text-blue-400" />
              <Badge variant="outline" className="bg-white border-blue-300">
                <FileUp className="w-3 h-3 mr-1" /> Step 3: Import
              </Badge>
              <ArrowRight className="w-4 h-4 text-blue-400" />
              <Badge variant="outline" className="bg-emerald-50 border-emerald-300 text-emerald-700">
                <CheckCircle className="w-3 h-3 mr-1" /> Done!
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Export Section */}
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              Export Product Catalog
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Downloads an Excel file with all {products?.length || '...'} products. 
              The yellow "New Description" column is where you type updated descriptions.
            </p>
          </div>
          <Button onClick={handleExport} disabled={isExporting || isLoading} className="shrink-0">
            {isExporting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Export to Excel</>
            )}
          </Button>
        </div>
      </Card>

      {/* Import Section */}
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              Import Updated Descriptions
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload the edited Excel file. Only rows with a filled "New Description" column will be updated.
            </p>
          </div>
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload className="w-4 h-4 mr-2" /> Choose Excel File
            </Button>
          </div>
        </div>
      </Card>

      {/* Preview Section */}
      {previewData && (
        <Card className="p-5 border-amber-200 bg-amber-50">
          <h3 className="font-semibold flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            Preview Changes — {previewData.changed} description{previewData.changed > 1 ? 's' : ''} to update
          </h3>
          <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-amber-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-amber-100 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium">ID</th>
                  <th className="text-left p-2 font-medium">Product</th>
                  <th className="text-left p-2 font-medium">Current Description</th>
                  <th className="text-left p-2 font-medium">New Description</th>
                </tr>
              </thead>
              <tbody>
                {previewData.updates.map((u) => (
                  <tr key={u.id} className="border-t border-amber-100">
                    <td className="p-2 text-muted-foreground">{u.id}</td>
                    <td className="p-2 font-medium">{u.name}</td>
                    <td className="p-2 text-muted-foreground max-w-[200px] truncate">{u.oldDesc || '(empty)'}</td>
                    <td className="p-2 text-emerald-700 max-w-[200px] truncate">{u.newDesc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" /> Confirm & Update {previewData.changed} Products</>
              )}
            </Button>
            <Button variant="outline" onClick={() => setPreviewData(null)} disabled={isImporting}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card className={`p-5 ${importResult.errors.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <h3 className={`font-semibold flex items-center gap-2 ${importResult.errors.length > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
            <CheckCircle className="w-4 h-4" />
            Import Complete
          </h3>
          <div className="mt-2 text-sm space-y-1">
            <p><strong>{importResult.updated}</strong> descriptions updated successfully</p>
            {importResult.skipped > 0 && (
              <p className="text-amber-700"><strong>{importResult.skipped}</strong> skipped</p>
            )}
            {importResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-amber-700">Errors:</p>
                <ul className="list-disc pl-4 text-amber-600">
                  {importResult.errors.map((e, i) => (
                    <li key={i}>Product ID {e.id}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
