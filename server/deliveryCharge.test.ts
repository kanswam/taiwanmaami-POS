import { describe, it, expect } from 'vitest';
import { getChargeForDistance, DELIVERY_TIERS } from './deliveryCharge';

describe('Delivery Charge Tiers', () => {
  it('should have 4 tiers defined', () => {
    expect(DELIVERY_TIERS).toHaveLength(4);
  });

  it('should charge ₹100 (10000 paise) for distances within 10km', () => {
    expect(getChargeForDistance(0).chargePaise).toBe(10000);
    expect(getChargeForDistance(5).chargePaise).toBe(10000);
    expect(getChargeForDistance(9.9).chargePaise).toBe(10000);
    expect(getChargeForDistance(10).chargePaise).toBe(10000);
  });

  it('should charge ₹200 (20000 paise) for distances 10+ to 15km', () => {
    expect(getChargeForDistance(10.1).chargePaise).toBe(20000);
    expect(getChargeForDistance(12).chargePaise).toBe(20000);
    expect(getChargeForDistance(15).chargePaise).toBe(20000);
  });

  it('should charge ₹300 (30000 paise) for distances 15+ to 25km', () => {
    expect(getChargeForDistance(15.1).chargePaise).toBe(30000);
    expect(getChargeForDistance(20).chargePaise).toBe(30000);
    expect(getChargeForDistance(25).chargePaise).toBe(30000);
  });

  it('should charge ₹400 (40000 paise) for distances over 25km', () => {
    expect(getChargeForDistance(25.1).chargePaise).toBe(40000);
    expect(getChargeForDistance(30).chargePaise).toBe(40000);
    expect(getChargeForDistance(50).chargePaise).toBe(40000);
    expect(getChargeForDistance(100).chargePaise).toBe(40000);
  });

  it('should return correct tier labels', () => {
    expect(getChargeForDistance(5).tierLabel).toBe('₹100');
    expect(getChargeForDistance(12).tierLabel).toBe('₹200');
    expect(getChargeForDistance(20).tierLabel).toBe('₹300');
    expect(getChargeForDistance(30).tierLabel).toBe('₹400');
  });

  it('should return rounded distance in km', () => {
    const result = getChargeForDistance(12.345);
    expect(result.distanceKm).toBe(12.3);
  });

  it('should handle zero distance', () => {
    const result = getChargeForDistance(0);
    expect(result.chargePaise).toBe(10000);
    expect(result.distanceKm).toBe(0);
  });

  it('should handle exact boundary values correctly', () => {
    // At exactly 10km → ₹100 (within 10km tier)
    expect(getChargeForDistance(10).chargePaise).toBe(10000);
    // At exactly 15km → ₹200 (within 15km tier)
    expect(getChargeForDistance(15).chargePaise).toBe(20000);
    // At exactly 25km → ₹300 (within 25km tier)
    expect(getChargeForDistance(25).chargePaise).toBe(30000);
  });
});
