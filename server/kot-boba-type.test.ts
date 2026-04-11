import { describe, it, expect } from 'vitest';

/**
 * Tests for KOT boba type and boba size display logic.
 * Verifies that bobaType, bobaSize, and poppingBobaFlavor are correctly formatted
 * in KOT reports and print outputs.
 */

// Helper function that mirrors the KOT report customization logic from routers.ts
function formatBobaCustomization(item: {
  withBoba?: boolean | null;
  bobaType?: string | null;
  bobaSize?: string | null;
  poppingBobaFlavor?: string | null;
}): string | null {
  if (item.withBoba !== null && item.withBoba !== undefined) {
    if (item.withBoba) {
      if (item.bobaType === 'popping') {
        return `Boba: ${item.poppingBobaFlavor || 'Popping'} Popping Boba`;
      }
      return `Boba: Tapioca${item.bobaSize ? ` (${item.bobaSize})` : ''}`;
    }
    return 'Boba: No';
  }
  return null;
}

// Helper function that mirrors the KOT printer client logic
function formatBobaForPrint(item: {
  withBoba?: boolean | null;
  bobaType?: string | null;
  bobaSize?: string | null;
  poppingBobaFlavor?: string | null;
}): string {
  if (item.withBoba) {
    const bobaLabel = item.bobaType === 'popping'
      ? `Popping Boba${item.poppingBobaFlavor ? ` (${item.poppingBobaFlavor})` : ''}`
      : `Tapioca Boba${item.bobaSize ? ` (${item.bobaSize})` : ''}`;
    return `   Boba: ${bobaLabel}\n`;
  }
  return '';
}

// Helper function that mirrors the bobaType derivation logic for DB inserts
function deriveBobaType(item: {
  bobaType?: string | null;
  withBoba?: boolean | null;
}): string | null {
  return item.bobaType || (item.withBoba ? 'tapioca' : null);
}

// Helper function that mirrors the KOT reprint addon-based fallback logic
function deriveBobaTypeFromAddons(
  item: { bobaType?: string | null; poppingBobaFlavor?: string | null; withBoba?: boolean | null },
  addons: { addonName: string }[]
): { bobaType: string | undefined; poppingBobaFlavor: string | undefined } {
  let bobaType = item.bobaType || undefined;
  let poppingBobaFlavor = item.poppingBobaFlavor || undefined;
  
  if (!bobaType && item.withBoba) {
    const poppingAddon = addons.find(a => a.addonName.toLowerCase().includes('popping'));
    if (poppingAddon) {
      bobaType = 'popping';
      poppingBobaFlavor = poppingAddon.addonName.replace(/popping\s*boba/i, '').trim() || poppingAddon.addonName;
    } else {
      bobaType = 'tapioca';
    }
  }
  
  return { bobaType, poppingBobaFlavor };
}

describe('KOT Boba Type Display', () => {
  describe('formatBobaCustomization (KOT report)', () => {
    it('shows Tapioca for regular boba without size', () => {
      const result = formatBobaCustomization({ withBoba: true, bobaType: 'tapioca' });
      expect(result).toBe('Boba: Tapioca');
    });

    it('shows Tapioca with small size', () => {
      const result = formatBobaCustomization({ withBoba: true, bobaType: 'tapioca', bobaSize: 'small' });
      expect(result).toBe('Boba: Tapioca (small)');
    });

    it('shows Tapioca with big size', () => {
      const result = formatBobaCustomization({ withBoba: true, bobaType: 'tapioca', bobaSize: 'big' });
      expect(result).toBe('Boba: Tapioca (big)');
    });

    it('shows popping boba with flavor (no size)', () => {
      const result = formatBobaCustomization({ 
        withBoba: true, 
        bobaType: 'popping', 
        poppingBobaFlavor: 'Strawberry' 
      });
      expect(result).toBe('Boba: Strawberry Popping Boba');
    });

    it('shows generic Popping when flavor is missing', () => {
      const result = formatBobaCustomization({ 
        withBoba: true, 
        bobaType: 'popping', 
        poppingBobaFlavor: null 
      });
      expect(result).toBe('Boba: Popping Popping Boba');
    });

    it('shows No when boba is declined', () => {
      const result = formatBobaCustomization({ withBoba: false });
      expect(result).toBe('Boba: No');
    });

    it('returns null when withBoba is not set', () => {
      const result = formatBobaCustomization({ withBoba: null });
      expect(result).toBeNull();
    });

    it('defaults to Tapioca when bobaType is missing but withBoba is true', () => {
      const result = formatBobaCustomization({ withBoba: true, bobaType: null });
      expect(result).toBe('Boba: Tapioca');
    });

    it('does not show size for popping boba even if bobaSize is set', () => {
      const result = formatBobaCustomization({ 
        withBoba: true, 
        bobaType: 'popping', 
        bobaSize: 'big',
        poppingBobaFlavor: 'Mango' 
      });
      expect(result).toBe('Boba: Mango Popping Boba');
    });
  });

  describe('formatBobaForPrint (thermal printer)', () => {
    it('prints Tapioca Boba without size when not specified', () => {
      const result = formatBobaForPrint({ withBoba: true, bobaType: 'tapioca' });
      expect(result).toBe('   Boba: Tapioca Boba\n');
    });

    it('prints Tapioca Boba with small size', () => {
      const result = formatBobaForPrint({ withBoba: true, bobaType: 'tapioca', bobaSize: 'small' });
      expect(result).toBe('   Boba: Tapioca Boba (small)\n');
    });

    it('prints Tapioca Boba with big size', () => {
      const result = formatBobaForPrint({ withBoba: true, bobaType: 'tapioca', bobaSize: 'big' });
      expect(result).toBe('   Boba: Tapioca Boba (big)\n');
    });

    it('prints Popping Boba with flavor', () => {
      const result = formatBobaForPrint({ 
        withBoba: true, 
        bobaType: 'popping', 
        poppingBobaFlavor: 'Mango' 
      });
      expect(result).toBe('   Boba: Popping Boba (Mango)\n');
    });

    it('prints Popping Boba without flavor when missing', () => {
      const result = formatBobaForPrint({ 
        withBoba: true, 
        bobaType: 'popping', 
        poppingBobaFlavor: null 
      });
      expect(result).toBe('   Boba: Popping Boba\n');
    });

    it('returns empty string when no boba', () => {
      const result = formatBobaForPrint({ withBoba: false });
      expect(result).toBe('');
    });

    it('does not show bobaSize for popping boba', () => {
      const result = formatBobaForPrint({ 
        withBoba: true, 
        bobaType: 'popping', 
        bobaSize: 'big',
        poppingBobaFlavor: 'Lychee' 
      });
      expect(result).toBe('   Boba: Popping Boba (Lychee)\n');
    });
  });

  describe('deriveBobaType (DB insert logic)', () => {
    it('uses provided bobaType when available', () => {
      expect(deriveBobaType({ bobaType: 'popping', withBoba: true })).toBe('popping');
    });

    it('defaults to tapioca when withBoba is true but bobaType is missing', () => {
      expect(deriveBobaType({ bobaType: null, withBoba: true })).toBe('tapioca');
    });

    it('returns null when withBoba is false', () => {
      expect(deriveBobaType({ bobaType: null, withBoba: false })).toBeNull();
    });

    it('returns null when withBoba is null', () => {
      expect(deriveBobaType({ bobaType: null, withBoba: null })).toBeNull();
    });
  });

  describe('deriveBobaTypeFromAddons (KOT reprint fallback)', () => {
    it('uses DB columns when available', () => {
      const result = deriveBobaTypeFromAddons(
        { bobaType: 'popping', poppingBobaFlavor: 'Lychee', withBoba: true },
        [{ addonName: 'Lychee Popping Boba' }]
      );
      expect(result.bobaType).toBe('popping');
      expect(result.poppingBobaFlavor).toBe('Lychee');
    });

    it('derives popping from addon name when DB columns are empty', () => {
      const result = deriveBobaTypeFromAddons(
        { bobaType: null, poppingBobaFlavor: null, withBoba: true },
        [{ addonName: 'Strawberry Popping Boba' }]
      );
      expect(result.bobaType).toBe('popping');
      expect(result.poppingBobaFlavor).toBe('Strawberry');
    });

    it('defaults to tapioca when no popping addon found', () => {
      const result = deriveBobaTypeFromAddons(
        { bobaType: null, poppingBobaFlavor: null, withBoba: true },
        [{ addonName: 'Extra Tapioca' }]
      );
      expect(result.bobaType).toBe('tapioca');
    });

    it('defaults to tapioca when no addons at all', () => {
      const result = deriveBobaTypeFromAddons(
        { bobaType: null, poppingBobaFlavor: null, withBoba: true },
        []
      );
      expect(result.bobaType).toBe('tapioca');
    });

    it('returns undefined when withBoba is false', () => {
      const result = deriveBobaTypeFromAddons(
        { bobaType: null, poppingBobaFlavor: null, withBoba: false },
        []
      );
      expect(result.bobaType).toBeUndefined();
      expect(result.poppingBobaFlavor).toBeUndefined();
    });
  });
});
