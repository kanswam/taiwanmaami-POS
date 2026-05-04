/**
 * Employee Master API Integration Service
 * 
 * Provides server-side integration with the Employee Master system
 * for POS staff authentication and employee data retrieval.
 */
import { ENV } from './_core/env';

const EMP_MASTER_API_URL = ENV.empMasterApiUrl;
const EMP_MASTER_API_KEY = ENV.empMasterApiKey;

if (!EMP_MASTER_API_URL) {
  throw new Error('EMP_MASTER_API_URL is not set. Check your environment config.');
}
if (!EMP_MASTER_API_URL.startsWith('https://')) {
  throw new Error('EMP_MASTER_API_URL must use HTTPS to prevent cleartext credential transmission.');
}
if (!EMP_MASTER_API_KEY) {
  throw new Error('EMP_MASTER_API_KEY is not set. Check your environment config.');
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email?: string;
  phone: string;
  primaryOutlet?: string;
  department?: string;
  role?: string;
  status: 'active' | 'inactive' | 'terminated';
}

export interface AuthResult {
  success: boolean;
  employee?: Employee;
  error?: string;
}

/**
 * Authenticate staff member by mobile number
 * Used for POS login
 */
export async function authenticateStaffByMobile(mobile: string): Promise<AuthResult> {
  console.log('[EMP_MASTER] URL configured:', !!EMP_MASTER_API_URL, 'Key configured:', !!EMP_MASTER_API_KEY);
  
  if (!EMP_MASTER_API_URL || !EMP_MASTER_API_KEY) {
    console.error('Employee Master API credentials not configured. URL:', EMP_MASTER_API_URL ? '[SET]' : '[NOT SET]', 'Key:', EMP_MASTER_API_KEY ? '[SET]' : '[NOT SET]');
    return {
      success: false,
      error: 'Employee authentication service not configured'
    };
  }

  try {
    // Clean mobile number (remove spaces, country code if present)
    const cleanMobile = mobile.replace(/\s+/g, '').replace(/^\+91/, '');
    
    const response = await fetch(
      `${EMP_MASTER_API_URL}/api/v1/employees/by-mobile/${cleanMobile}`,
      {
        headers: {
          'X-API-Key': EMP_MASTER_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 404) {
      return {
        success: false,
        error: 'Employee not found. Please check your mobile number.'
      };
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    const employee = result.data;

    // Validate employee status
    if (employee.status !== 'active') {
      return {
        success: false,
        error: `Your account is ${employee.status}. Please contact HR.`
      };
    }

    return {
      success: true,
      employee: {
        id: String(employee.id), // Ensure id is always a string
        employeeCode: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        primaryOutlet: employee.primaryOutlet,
        department: employee.department,
        role: employee.role,
        status: employee.status
      }
    };
  } catch (error) {
    console.error('Employee Master API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // v2.1 - Force redeploy to pick up new env vars - Dec 13 2025
    return {
      success: false,
      error: `Auth failed (v2): ${errorMessage}. URL: ${EMP_MASTER_API_URL ? 'SET' : 'MISSING'}, Key: ${EMP_MASTER_API_KEY ? 'SET' : 'MISSING'}`
    };
  }
}

/**
 * Get employee by ID
 * Used for fetching full employee details including commission structure
 */
export async function getEmployeeById(employeeId: string): Promise<Employee | null> {
  if (!EMP_MASTER_API_URL || !EMP_MASTER_API_KEY) {
    console.error('Employee Master API credentials not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${EMP_MASTER_API_URL}/api/v1/employees/${employeeId}`,
      {
        headers: {
          'X-API-Key': EMP_MASTER_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Employee Master API error:', error);
    return null;
  }
}

/**
 * Get all active employees
 * Used for admin team directory
 */
export async function getActiveEmployees(): Promise<Employee[]> {
  if (!EMP_MASTER_API_URL || !EMP_MASTER_API_KEY) {
    console.error('Employee Master API credentials not configured');
    return [];
  }

  try {
    const response = await fetch(
      `${EMP_MASTER_API_URL}/api/v1/employees?status=active&limit=100`,
      {
        headers: {
          'X-API-Key': EMP_MASTER_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Employee Master API error:', error);
    return [];
  }
}

/**
 * Check if an email belongs to an active employee
 * Used for auto-granting staff role on OAuth login
 */
export async function isEmployeeEmail(email: string): Promise<boolean> {
  if (!email || !EMP_MASTER_API_URL || !EMP_MASTER_API_KEY) {
    return false;
  }

  try {
    // Get all active employees and check if email matches
    const employees = await getActiveEmployees();
    const normalizedEmail = email.toLowerCase().trim();
    return employees.some(emp => emp.email?.toLowerCase().trim() === normalizedEmail);
  } catch (error) {
    console.error('Error checking employee email:', error);
    return false;
  }
}

/**
 * Test API connectivity
 * Used for health checks and credential validation
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  if (!EMP_MASTER_API_URL || !EMP_MASTER_API_KEY) {
    return {
      success: false,
      error: 'Employee Master API credentials not configured'
    };
  }

  try {
    const response = await fetch(
      `${EMP_MASTER_API_URL}/api/v1/employees?limit=1`,
      {
        headers: {
          'X-API-Key': EMP_MASTER_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: 'Invalid API key'
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `API returned status ${response.status}`
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}
