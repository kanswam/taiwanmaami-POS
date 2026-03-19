import { describe, it, expect } from 'vitest';
import {
  BRAND, FMT,
  addTitleBlock, styleHeaderRow, styleDataRow, styleTotalsRow, styleSubtotalRow,
  addSectionTitle, addFooterNote, applySheetSetup, createWorkbook,
  setColumnWidths, formatDate, toRupees, round2, addLegend,
} from './excelStyles';

describe('Excel Styles Utility Module', () => {
  it('should export all expected brand colors', () => {
    expect(BRAND.PRIMARY).toBe('FF8B0000');
    expect(BRAND.HEADER_BG).toBe('FF8B0000');
    expect(BRAND.HEADER_TEXT).toBe('FFFFFFFF');
    expect(BRAND.ALT_ROW).toBe('FFFFF5F0');
    expect(BRAND.TOTAL_BG).toBe('FF8B0000');
    expect(BRAND.TOTAL_TEXT).toBe('FFFFFFFF');
    expect(BRAND.WORKSHOP_BG).toBe('FFF0F8FF');
    expect(BRAND.EVENT_BG).toBe('FFF0FFF0');
  });

  it('should export correct number format strings', () => {
    expect(FMT.CURRENCY_SYMBOL).toContain('₹');
    expect(FMT.CURRENCY_SYMBOL).toContain('#,##0.00');
    expect(FMT.PERCENTAGE).toContain('%');
    expect(FMT.INTEGER).toBe('#,##0');
  });

  it('should convert paise to rupees correctly', () => {
    expect(toRupees(10000)).toBe(100);
    expect(toRupees(54359448)).toBe(543594.48);
    expect(toRupees(0)).toBe(0);
  });

  it('should round to 2 decimal places', () => {
    expect(round2(123.456)).toBe(123.46);
    expect(round2(123.454)).toBe(123.45);
    expect(round2(100)).toBe(100);
  });

  it('should format dates as DD/MM/YYYY', () => {
    // Use full ISO dates to avoid timezone offset issues
    expect(formatDate('2026-01-15T12:00:00')).toBe('15/01/2026');
    expect(formatDate('2026-02-28T12:00:00')).toBe('28/02/2026');
    expect(formatDate(new Date('2026-03-01T12:00:00'))).toBe('01/03/2026');
  });

  it('should create a workbook with correct metadata', () => {
    const wb = createWorkbook();
    expect(wb.creator).toBe('Taiwan Maami');
    expect(wb.created).toBeInstanceOf(Date);
  });

  it('should add title block with merged cells and proper styling', () => {
    const wb = createWorkbook();
    const sheet = wb.addWorksheet('Test');
    addTitleBlock(sheet, 'Test Title', 'Test Subtitle', 5);

    // Title cell
    const titleCell = sheet.getCell('A1');
    expect(titleCell.value).toBe('Test Title');
    expect(titleCell.font?.bold).toBe(true);
    expect(titleCell.font?.size).toBe(16);
    expect(titleCell.alignment?.horizontal).toBe('center');

    // Subtitle cell
    const subtitleCell = sheet.getCell('A2');
    expect(subtitleCell.value).toBe('Test Subtitle');
    expect(subtitleCell.font?.italic).toBe(true);

    // Row heights
    expect(sheet.getRow(1).height).toBe(36);
    expect(sheet.getRow(2).height).toBe(22);
    expect(sheet.getRow(3).height).toBe(8);
  });

  it('should style header row with brand colors', () => {
    const wb = createWorkbook();
    const sheet = wb.addWorksheet('Test');
    const row = sheet.getRow(4);
    row.values = ['A', 'B', 'C'];
    styleHeaderRow(row, 3);

    expect(row.height).toBe(30);
    const cell = row.getCell(1);
    expect(cell.font?.bold).toBe(true);
    expect(cell.font?.color?.argb).toBe(BRAND.HEADER_TEXT);
    expect((cell.fill as any)?.fgColor?.argb).toBe(BRAND.HEADER_BG);
    expect(cell.alignment?.horizontal).toBe('center');
    expect(cell.alignment?.wrapText).toBe(true);
  });

  it('should style data rows with alternating backgrounds', () => {
    const wb = createWorkbook();
    const sheet = wb.addWorksheet('Test');

    // Normal row
    const row1 = sheet.getRow(5);
    row1.values = [1, 'Item', 100];
    styleDataRow(row1, 3, false, { currencyCols: [3], centerCols: [1] });
    expect(row1.getCell(3).numFmt).toBe(FMT.CURRENCY_SYMBOL);
    expect(row1.getCell(1).alignment?.horizontal).toBe('center');

    // Alternate row
    const row2 = sheet.getRow(6);
    row2.values = [2, 'Item 2', 200];
    styleDataRow(row2, 3, true);
    expect((row2.getCell(1).fill as any)?.fgColor?.argb).toBe(BRAND.ALT_ROW);
  });

  it('should style totals row with brand background', () => {
    const wb = createWorkbook();
    const sheet = wb.addWorksheet('Test');
    const row = sheet.getRow(10);
    row.values = ['TOTAL', 500, 100];
    styleTotalsRow(row, 3, { currencyCols: [2], percentCols: [3] });

    expect(row.height).toBe(30);
    expect(row.getCell(1).font?.bold).toBe(true);
    expect(row.getCell(1).font?.color?.argb).toBe(BRAND.TOTAL_TEXT);
    expect((row.getCell(1).fill as any)?.fgColor?.argb).toBe(BRAND.TOTAL_BG);
    expect(row.getCell(2).numFmt).toBe(FMT.CURRENCY_SYMBOL);
    expect(row.getCell(3).numFmt).toBe(FMT.PERCENTAGE);
  });

  it('should style subtotal row with beige background', () => {
    const wb = createWorkbook();
    const sheet = wb.addWorksheet('Test');
    const row = sheet.getRow(10);
    row.values = ['Subtotal', 300];
    styleSubtotalRow(row, 2, { currencyCols: [2] });

    expect(row.height).toBe(28);
    expect(row.getCell(1).font?.bold).toBe(true);
    expect((row.getCell(1).fill as any)?.fgColor?.argb).toBe(BRAND.SUBTOTAL_BG);
  });

  it('should set column widths correctly', () => {
    const wb = createWorkbook();
    const sheet = wb.addWorksheet('Test');
    setColumnWidths(sheet, [[1, 10], [2, 25], [3, 18]]);

    expect(sheet.getColumn(1).width).toBe(10);
    expect(sheet.getColumn(2).width).toBe(25);
    expect(sheet.getColumn(3).width).toBe(18);
  });

  it('should apply sheet setup with freeze panes and print layout', () => {
    const wb = createWorkbook();
    const sheet = wb.addWorksheet('Test');
    applySheetSetup(sheet, 4);

    expect(sheet.views).toEqual([{ state: 'frozen', ySplit: 4 }]);
    expect(sheet.pageSetup.orientation).toBe('landscape');
    expect(sheet.pageSetup.fitToPage).toBe(true);
  });

  it('should add section title with merged cells', () => {
    const wb = createWorkbook();
    const sheet = wb.addWorksheet('Test');
    const nextRow = addSectionTitle(sheet, 10, 'GST Breakdown', 5);

    expect(nextRow).toBe(11);
    expect(sheet.getCell(10, 1).value).toBe('GST Breakdown');
    expect(sheet.getCell(10, 1).font?.bold).toBe(true);
    expect(sheet.getCell(10, 1).font?.size).toBe(12);
  });

  it('should add footer note', () => {
    const wb = createWorkbook();
    const sheet = wb.addWorksheet('Test');
    const nextRow = addFooterNote(sheet, 20, 'Test footer note', 5);

    expect(nextRow).toBe(21);
    expect(sheet.getCell(20, 1).value).toBe('Test footer note');
    expect(sheet.getCell(20, 1).font?.italic).toBe(true);
  });

  it('should add legend with colored cells', () => {
    const wb = createWorkbook();
    const sheet = wb.addWorksheet('Test');
    const nextRow = addLegend(sheet, 15, [
      { color: BRAND.ALT_ROW, label: 'Regular Order' },
      { color: BRAND.WORKSHOP_BG, label: 'Workshop' },
    ]);

    expect(nextRow).toBe(18); // 15 (title) + 1 + 2 items
    expect(sheet.getRow(15).getCell(1).value).toBe('Legend:');
    expect(sheet.getRow(16).getCell(2).value).toBe('Regular Order');
    expect(sheet.getRow(17).getCell(2).value).toBe('Workshop');
  });

  it('should handle custom background in data rows', () => {
    const wb = createWorkbook();
    const sheet = wb.addWorksheet('Test');
    const row = sheet.getRow(5);
    row.values = [1, 'Workshop item', 500];
    styleDataRow(row, 3, false, { customBg: BRAND.WORKSHOP_BG });

    expect((row.getCell(1).fill as any)?.fgColor?.argb).toBe(BRAND.WORKSHOP_BG);
  });
});
