import { describe, it, expect } from 'vitest';
import { testConnection } from './employeeMaster';

describe('Employee Master API Integration', () => {
  it('should successfully connect to Employee Master API', async () => {
    const result = await testConnection();
    
    // Log the result for debugging
    if (!result.success) {
      console.log('Connection test failed:', result.error);
    }
    
    expect(result.success).toBe(true);
  }, 10000); // 10 second timeout for API call
});
