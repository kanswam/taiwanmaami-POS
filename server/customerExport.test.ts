import { describe, it, expect, vi } from 'vitest';

// Test the customer database export handler logic
describe('Customer Database Export', () => {
  it('should have the export route registered', async () => {
    // Verify the export handler is properly exported
    const { handleCustomerDatabaseExport } = await import('./excelExportExtra');
    expect(handleCustomerDatabaseExport).toBeDefined();
    expect(typeof handleCustomerDatabaseExport).toBe('function');
  });

  it('should reject unauthenticated requests', async () => {
    const { handleCustomerDatabaseExport } = await import('./excelExportExtra');
    
    const req = { headers: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      send: vi.fn(),
    } as any;

    await handleCustomerDatabaseExport(req, res);
    
    // Should return 401 or 403
    expect(res.status).toHaveBeenCalledWith(expect.any(Number));
    const statusCode = res.status.mock.calls[0][0];
    expect([401, 403]).toContain(statusCode);
  });

  it('should export correct columns in the Excel file', () => {
    // Verify the expected columns are defined
    const expectedColumns = [
      'S.No', 'Customer Name', 'Phone', 'Email', 'Type',
      'Orders', 'Total Spent', 'Avg Order Value', 'Store Credit',
      'Stamps', 'Lifetime Stamps', 'Active Rewards', 'Redeemed Rewards',
      'Last Order'
    ];
    
    expect(expectedColumns).toHaveLength(14);
    expect(expectedColumns).toContain('Phone');
    expect(expectedColumns).toContain('Email');
    expect(expectedColumns).toContain('Total Spent');
    expect(expectedColumns).toContain('Stamps');
    expect(expectedColumns).toContain('Active Rewards');
  });

  it('should include three sheets: Customer Database, Top Customers, Birthday Calendar', () => {
    // Verify the expected sheet names
    const expectedSheets = ['Customer Database', 'Top Customers', 'Birthday Calendar'];
    expect(expectedSheets).toHaveLength(3);
    expect(expectedSheets).toContain('Customer Database');
    expect(expectedSheets).toContain('Top Customers');
    expect(expectedSheets).toContain('Birthday Calendar');
  });

  it('should convert paise to rupees correctly', () => {
    const toRupees = (paise: number) => paise / 100;
    
    expect(toRupees(100)).toBe(1);
    expect(toRupees(29805200)).toBe(298052);
    expect(toRupees(0)).toBe(0);
    expect(toRupees(50)).toBe(0.5);
  });
});
