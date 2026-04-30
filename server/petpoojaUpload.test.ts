import { describe, it, expect } from 'vitest';

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

describe('Petpooja Quick Upload - PIN Verification', () => {
  it('should reject request without PIN', async () => {
    const res = await fetch(`${BASE_URL}/api/petpooja/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it('should reject incorrect PIN', async () => {
    const res = await fetch(`${BASE_URL}/api/petpooja/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '9999' }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Incorrect PIN');
  });

  it('should accept correct PIN', async () => {
    const res = await fetch(`${BASE_URL}/api/petpooja/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: process.env.PETPOOJA_UPLOAD_PIN }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('should reject upload without PIN', async () => {
    const formData = new FormData();
    formData.append('pin', 'wrong');
    formData.append('outlet', 'palladium-instore');
    formData.append('date', '2026-04-30');

    const res = await fetch(`${BASE_URL}/api/petpooja/upload`, {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(401);
  });

  it('should reject upload with invalid outlet', async () => {
    const formData = new FormData();
    formData.append('pin', process.env.PETPOOJA_UPLOAD_PIN || '');
    formData.append('outlet', 'invalid-outlet');
    formData.append('date', '2026-04-30');

    const res = await fetch(`${BASE_URL}/api/petpooja/upload`, {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid outlet selected');
  });

  it('should reject upload without file', async () => {
    const formData = new FormData();
    formData.append('pin', process.env.PETPOOJA_UPLOAD_PIN || '');
    formData.append('outlet', 'palladium-instore');
    formData.append('date', '2026-04-30');

    const res = await fetch(`${BASE_URL}/api/petpooja/upload`, {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('No file uploaded');
  });
});

describe('Petpooja Quick Upload - History', () => {
  it('should reject history without PIN', async () => {
    const res = await fetch(`${BASE_URL}/api/petpooja/history`);
    expect(res.status).toBe(401);
  });

  it('should reject history with wrong PIN', async () => {
    const res = await fetch(`${BASE_URL}/api/petpooja/history?pin=9999`);
    expect(res.status).toBe(401);
  });

  it('should return history with correct PIN', async () => {
    const res = await fetch(`${BASE_URL}/api/petpooja/history?pin=${process.env.PETPOOJA_UPLOAD_PIN}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.history).toBeDefined();
    expect(Array.isArray(data.history)).toBe(true);
    // Should have at least some uploads from production data
    expect(data.history.length).toBeGreaterThan(0);
    // Each item should have expected fields
    const item = data.history[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('periodLabel');
    expect(item).toHaveProperty('totalAmount');
    expect(item).toHaveProperty('itemCount');
    expect(item).toHaveProperty('createdAt');
  });
});
