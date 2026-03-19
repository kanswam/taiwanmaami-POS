import ExcelJS from 'exceljs';

// ============================================================
// SHARED EXCEL FORMATTING UTILITIES
// Professional, branded styling for all Taiwan Maami reports
// ============================================================

// Brand palette
export const BRAND = {
  PRIMARY: 'FF8B0000',       // Dark red (brand)
  PRIMARY_LIGHT: 'FFB22222', // Lighter red for accents
  HEADER_BG: 'FF8B0000',    // Header background
  HEADER_TEXT: 'FFFFFFFF',   // White header text
  TITLE_COLOR: 'FF8B0000',  // Title text color
  ALT_ROW: 'FFFFF5F0',      // Light rose for alternating rows
  TOTAL_BG: 'FF8B0000',     // Totals row background
  TOTAL_TEXT: 'FFFFFFFF',   // Totals row text
  SUBTOTAL_BG: 'FFFFF0E0',  // Warm beige for subtotals
  BORDER_LIGHT: 'FFE0D0D0', // Light border for data rows
  BORDER_HEADER: 'FF8B0000', // Header border
  WORKSHOP_BG: 'FFF0F8FF',  // Light blue for workshop rows
  EVENT_BG: 'FFF0FFF0',     // Light green for event rows
  MUTED_TEXT: 'FF888888',   // Muted gray text
  DARK_TEXT: 'FF333333',    // Dark text for data
};

// Indian number format for currency (₹1,23,456.00)
// ExcelJS uses Excel's number format codes
// For Indian numbering, we use a custom format
export const FMT = {
  CURRENCY: '#,##0.00',           // Standard comma format (Excel handles display)
  CURRENCY_SYMBOL: '"₹ "#,##0.00', // With rupee symbol
  PERCENTAGE: '0.0"%"',           // e.g., 41.1%
  INTEGER: '#,##0',               // Whole numbers with commas
  DATE: 'DD/MM/YYYY',             // Indian date format
};

// Font definitions
const FONTS = {
  title: { bold: true, size: 16, color: { argb: BRAND.TITLE_COLOR }, name: 'Calibri' } as Partial<ExcelJS.Font>,
  subtitle: { size: 11, italic: true, color: { argb: BRAND.MUTED_TEXT }, name: 'Calibri' } as Partial<ExcelJS.Font>,
  header: { bold: true, size: 11, color: { argb: BRAND.HEADER_TEXT }, name: 'Calibri' } as Partial<ExcelJS.Font>,
  data: { size: 10.5, color: { argb: BRAND.DARK_TEXT }, name: 'Calibri' } as Partial<ExcelJS.Font>,
  dataBold: { bold: true, size: 10.5, color: { argb: BRAND.DARK_TEXT }, name: 'Calibri' } as Partial<ExcelJS.Font>,
  total: { bold: true, size: 11, color: { argb: BRAND.TOTAL_TEXT }, name: 'Calibri' } as Partial<ExcelJS.Font>,
  subtotal: { bold: true, size: 11, color: { argb: BRAND.DARK_TEXT }, name: 'Calibri' } as Partial<ExcelJS.Font>,
  sectionTitle: { bold: true, size: 12, color: { argb: BRAND.TITLE_COLOR }, name: 'Calibri' } as Partial<ExcelJS.Font>,
  footer: { size: 9, italic: true, color: { argb: BRAND.MUTED_TEXT }, name: 'Calibri' } as Partial<ExcelJS.Font>,
};

// Border definitions
const BORDERS = {
  header: {
    top: { style: 'thin' as const, color: { argb: BRAND.BORDER_HEADER } },
    bottom: { style: 'medium' as const, color: { argb: BRAND.BORDER_HEADER } },
    left: { style: 'thin' as const, color: { argb: BRAND.BORDER_HEADER } },
    right: { style: 'thin' as const, color: { argb: BRAND.BORDER_HEADER } },
  },
  data: {
    top: { style: 'thin' as const, color: { argb: BRAND.BORDER_LIGHT } },
    bottom: { style: 'thin' as const, color: { argb: BRAND.BORDER_LIGHT } },
    left: { style: 'thin' as const, color: { argb: BRAND.BORDER_LIGHT } },
    right: { style: 'thin' as const, color: { argb: BRAND.BORDER_LIGHT } },
  },
  total: {
    top: { style: 'medium' as const, color: { argb: BRAND.BORDER_HEADER } },
    bottom: { style: 'medium' as const, color: { argb: BRAND.BORDER_HEADER } },
    left: { style: 'thin' as const, color: { argb: BRAND.BORDER_HEADER } },
    right: { style: 'thin' as const, color: { argb: BRAND.BORDER_HEADER } },
  },
  subtotal: {
    top: { style: 'medium' as const },
    bottom: { style: 'double' as const },
    left: { style: 'thin' as const, color: { argb: BRAND.BORDER_LIGHT } },
    right: { style: 'thin' as const, color: { argb: BRAND.BORDER_LIGHT } },
  },
};

/**
 * Add a professional branded title block to a worksheet.
 * Row 1: Title (merged, large, brand color)
 * Row 2: Subtitle/period (merged, italic, muted)
 * Row 3: Spacer
 * Data starts at row 4 (header row).
 */
export function addTitleBlock(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  colCount: number,
) {
  // Title row
  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = FONTS.title;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 36;

  // Subtitle row
  sheet.mergeCells(2, 1, 2, colCount);
  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value = subtitle;
  subtitleCell.font = FONTS.subtitle;
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 22;

  // Spacer row
  sheet.getRow(3).height = 8;
}

/**
 * Style a header row with brand colors, bold text, and borders.
 */
export function styleHeaderRow(row: ExcelJS.Row, colCount: number) {
  row.height = 30;
  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col);
    cell.font = FONTS.header;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND.HEADER_BG },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDERS.header;
  }
}

/**
 * Style a data row with proper borders, fonts, and optional alternating background.
 * 
 * @param row - The ExcelJS row
 * @param colCount - Number of columns
 * @param isAlternate - Whether this is an alternate (shaded) row
 * @param options - Column-specific formatting options
 */
export function styleDataRow(
  row: ExcelJS.Row,
  colCount: number,
  isAlternate: boolean,
  options?: {
    currencyCols?: number[];       // Columns to format as currency (₹ #,##0.00)
    percentCols?: number[];        // Columns to format as percentage
    centerCols?: number[];         // Columns to center-align
    rightCols?: number[];          // Columns to right-align
    integerCols?: number[];        // Columns to format as integers with commas
    customBg?: string;             // Override background color (e.g., for workshop/event rows)
  },
) {
  row.height = 22;
  const { currencyCols = [], percentCols = [], centerCols = [], rightCols = [], integerCols = [], customBg } = options || {};

  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col);
    cell.font = FONTS.data;
    cell.border = BORDERS.data;

    // Background
    if (customBg) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: customBg } };
    } else if (isAlternate) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.ALT_ROW } };
    }

    // Number formatting
    if (currencyCols.includes(col)) {
      cell.numFmt = FMT.CURRENCY_SYMBOL;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (percentCols.includes(col)) {
      cell.numFmt = FMT.PERCENTAGE;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (integerCols.includes(col)) {
      cell.numFmt = FMT.INTEGER;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (centerCols.includes(col)) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (rightCols.includes(col)) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  }
}

/**
 * Style a grand totals row with brand background and bold white text.
 */
export function styleTotalsRow(
  row: ExcelJS.Row,
  colCount: number,
  options?: {
    currencyCols?: number[];
    percentCols?: number[];
    centerCols?: number[];
    integerCols?: number[];
  },
) {
  row.height = 30;
  const { currencyCols = [], percentCols = [], centerCols = [], integerCols = [] } = options || {};

  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col);
    cell.font = FONTS.total;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND.TOTAL_BG },
    };
    cell.border = BORDERS.total;
    cell.alignment = { vertical: 'middle' };

    if (currencyCols.includes(col)) {
      cell.numFmt = FMT.CURRENCY_SYMBOL;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (percentCols.includes(col)) {
      cell.numFmt = FMT.PERCENTAGE;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (integerCols.includes(col) || centerCols.includes(col)) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }
}

/**
 * Style a subtotals row (lighter than grand total, dark text).
 */
export function styleSubtotalRow(
  row: ExcelJS.Row,
  colCount: number,
  options?: {
    currencyCols?: number[];
    percentCols?: number[];
    centerCols?: number[];
  },
) {
  row.height = 28;
  const { currencyCols = [], percentCols = [], centerCols = [] } = options || {};

  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col);
    cell.font = FONTS.subtotal;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND.SUBTOTAL_BG },
    };
    cell.border = BORDERS.subtotal;
    cell.alignment = { vertical: 'middle' };

    if (currencyCols.includes(col)) {
      cell.numFmt = FMT.CURRENCY_SYMBOL;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (percentCols.includes(col)) {
      cell.numFmt = FMT.PERCENTAGE;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (centerCols.includes(col)) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }
}

/**
 * Add a section title row (e.g., "GST Breakdown", "Payment Method Breakdown").
 */
export function addSectionTitle(
  sheet: ExcelJS.Worksheet,
  rowNum: number,
  title: string,
  colCount: number,
): number {
  sheet.mergeCells(rowNum, 1, rowNum, colCount);
  const cell = sheet.getCell(rowNum, 1);
  cell.value = title;
  cell.font = FONTS.sectionTitle;
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(rowNum).height = 28;
  return rowNum + 1;
}

/**
 * Add a footer note row.
 */
export function addFooterNote(
  sheet: ExcelJS.Worksheet,
  rowNum: number,
  text: string,
  colCount: number,
): number {
  sheet.mergeCells(rowNum, 1, rowNum, colCount);
  const cell = sheet.getCell(rowNum, 1);
  cell.value = text;
  cell.font = FONTS.footer;
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  return rowNum + 1;
}

/**
 * Apply standard sheet setup: freeze panes, print layout, default font.
 */
export function applySheetSetup(
  sheet: ExcelJS.Worksheet,
  freezeRow: number = 4,
) {
  // Freeze panes at header row
  sheet.views = [{ state: 'frozen', ySplit: freezeRow }];

  // Print setup - landscape, fit to width
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9, // A4
  };
}

/**
 * Create a new workbook with standard metadata.
 */
export function createWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Taiwan Maami';
  workbook.created = new Date();
  workbook.properties.date1904 = false;
  return workbook;
}

/**
 * Set column widths from an array of [columnIndex, width] pairs.
 */
export function setColumnWidths(sheet: ExcelJS.Worksheet, widths: [number, number][]) {
  for (const [col, width] of widths) {
    sheet.getColumn(col).width = width;
  }
}

/**
 * Format date as DD/MM/YYYY.
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Paise to Rupees conversion.
 */
export function toRupees(paise: number): number {
  return paise / 100;
}

/**
 * Round to 2 decimal places.
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Add a legend block with colored cells and labels.
 */
export function addLegend(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  items: { color: string; label: string }[],
): number {
  let rowNum = startRow;
  const legendTitle = sheet.getRow(rowNum);
  legendTitle.getCell(1).value = 'Legend:';
  legendTitle.getCell(1).font = { bold: true, size: 10, italic: true, name: 'Calibri' };
  rowNum++;

  for (const item of items) {
    const row = sheet.getRow(rowNum);
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: item.color },
    };
    row.getCell(1).border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
    row.getCell(2).value = item.label;
    row.getCell(2).font = { size: 10, italic: true, name: 'Calibri' };
    rowNum++;
  }

  return rowNum;
}
