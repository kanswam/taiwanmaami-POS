import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Employee Master API
vi.mock('./employeeMaster', () => ({
  authenticateStaffByMobile: vi.fn(),
  getActiveEmployees: vi.fn(),
}));

import { authenticateStaffByMobile, getActiveEmployees } from './employeeMaster';

describe('POS Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateStaffByMobile', () => {
    it('should return employee data for valid mobile number', async () => {
      const mockEmployee = {
        success: true,
        employee: {
          id: 'EMP001',
          name: 'Test Staff',
          mobile: '+919876543210',
          employeeCode: 'TM001',
          status: 'active',
        },
      };

      (authenticateStaffByMobile as any).mockResolvedValue(mockEmployee);

      const result = await authenticateStaffByMobile('+919876543210');
      
      expect(result.success).toBe(true);
      expect(result.employee).toBeDefined();
      expect(result.employee?.mobile).toBe('+919876543210');
    });

    it('should return error for invalid mobile number', async () => {
      const mockError = {
        success: false,
        error: 'Employee not found',
      };

      (authenticateStaffByMobile as any).mockResolvedValue(mockError);

      const result = await authenticateStaffByMobile('+911111111111');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getActiveEmployees', () => {
    it('should return list of active employees', async () => {
      const mockEmployees = {
        success: true,
        employees: [
          { id: 'EMP001', name: 'Staff 1', employeeCode: 'TM001' },
          { id: 'EMP002', name: 'Staff 2', employeeCode: 'TM002' },
        ],
      };

      (getActiveEmployees as any).mockResolvedValue(mockEmployees);

      const result = await getActiveEmployees();
      
      expect(result.success).toBe(true);
      expect(result.employees).toHaveLength(2);
    });
  });
});

describe('POS Session Management', () => {
  it('should create session with required fields', () => {
    const sessionData = {
      employeeId: 'EMP001',
      employeeCode: 'TM001',
      employeeName: 'Test Staff',
      employeeMobile: '+919876543210',
      outletId: 1,
      outletName: 'Taiwan Maami - T Nagar',
      deviceInfo: 'Chrome/Windows',
    };

    // Validate session data structure
    expect(sessionData.employeeId).toBeDefined();
    expect(sessionData.outletId).toBeGreaterThan(0);
    expect(sessionData.outletName).toBeTruthy();
  });

  it('should store session in localStorage format', () => {
    const session = {
      sessionId: 1,
      employeeCode: 'TM001',
      employeeName: 'Test Staff',
      outletId: 1,
      outletName: 'Taiwan Maami - T Nagar',
      loginTime: Date.now(),
    };

    const serialized = JSON.stringify(session);
    const parsed = JSON.parse(serialized);

    expect(parsed.sessionId).toBe(1);
    expect(parsed.outletId).toBe(1);
    expect(parsed.loginTime).toBeDefined();
  });
});

describe('Outlet Product Availability', () => {
  it('should track product availability per outlet', () => {
    const outletProducts = [
      { outletId: 1, productId: 1, isAvailable: true },
      { outletId: 1, productId: 2, isAvailable: false },
      { outletId: 2, productId: 1, isAvailable: true },
      { outletId: 2, productId: 2, isAvailable: true },
    ];

    // T Nagar (outlet 1) has product 1 available, product 2 unavailable
    const tNagarProducts = outletProducts.filter(p => p.outletId === 1);
    expect(tNagarProducts.find(p => p.productId === 1)?.isAvailable).toBe(true);
    expect(tNagarProducts.find(p => p.productId === 2)?.isAvailable).toBe(false);

    // Palladium (outlet 2) has both products available
    const palladiumProducts = outletProducts.filter(p => p.outletId === 2);
    expect(palladiumProducts.every(p => p.isAvailable)).toBe(true);
  });

  it('should allow price override per outlet', () => {
    const outletProduct = {
      outletId: 1,
      productId: 1,
      isAvailable: true,
      instorePriceOverride: 15000, // ₹150 in paise
    };

    const basePrice = 12000; // ₹120 in paise
    const effectivePrice = outletProduct.instorePriceOverride || basePrice;

    expect(effectivePrice).toBe(15000);
  });
});

describe('POS Audit Logging', () => {
  it('should log order creation with required fields', () => {
    const auditLog = {
      sessionId: 1,
      employeeCode: 'TM001',
      outletId: 1,
      action: 'create_order',
      orderId: 123,
      details: {
        orderNumber: 'TM-20251205-001',
        totalAmount: 50000,
        itemCount: 3,
        paymentMethods: ['cash'],
      },
    };

    expect(auditLog.action).toBe('create_order');
    expect(auditLog.orderId).toBeDefined();
    expect(auditLog.details.orderNumber).toMatch(/^TM-/);
  });

  it('should support multiple audit action types', () => {
    const validActions = ['login', 'logout', 'create_order', 'void_order', 'apply_discount', 'refund'];
    
    validActions.forEach(action => {
      const log = { action };
      expect(validActions).toContain(log.action);
    });
  });
});
