import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Non-Veg Dietary Label', () => {
  let schemaContent: string;
  let routersContent: string;
  let productCardContent: string;
  let indexCssContent: string;
  let productsTabContent: string;

  beforeAll(() => {
    schemaContent = readFileSync(resolve(__dirname, '../drizzle/schema.ts'), 'utf-8');
    routersContent = readFileSync(resolve(__dirname, './routers.ts'), 'utf-8');
    productCardContent = readFileSync(resolve(__dirname, '../client/src/components/ProductCard.tsx'), 'utf-8');
    indexCssContent = readFileSync(resolve(__dirname, '../client/src/index.css'), 'utf-8');
    // After Admin.tsx was split into tabs, the products-related code is in ProductsTab.tsx
    productsTabContent = readFileSync(resolve(__dirname, '../client/src/pages/admin/tabs/ProductsTab.tsx'), 'utf-8');
  });

  describe('Database Schema', () => {
    it('should have isNonVeg boolean field in products table', () => {
      expect(schemaContent).toContain('isNonVeg');
      expect(schemaContent).toContain("boolean(\"isNonVeg\")");
    });

    it('should default isNonVeg to false', () => {
      expect(schemaContent).toContain('.default(false)');
    });
  });

  describe('Server Routers', () => {
    it('should accept isNonVeg in createProduct procedure', () => {
      // Find the createProduct section and check it has isNonVeg
      const createIdx = routersContent.indexOf('createProduct');
      const updateIdx = routersContent.indexOf('updateProduct');
      const createSection = routersContent.substring(createIdx, updateIdx);
      expect(createSection).toContain('isNonVeg');
    });

    it('should accept isNonVeg in updateProduct procedure', () => {
      const updateIdx = routersContent.indexOf('updateProduct');
      const updateSection = routersContent.substring(updateIdx, updateIdx + 1500);
      expect(updateSection).toContain('isNonVeg');
    });
  });

  describe('ProductCard Component', () => {
    it('should import Drumstick icon from lucide-react', () => {
      expect(productCardContent).toContain('Drumstick');
      expect(productCardContent).toContain("from 'lucide-react'");
    });

    it('should have isNonVeg in product interface', () => {
      expect(productCardContent).toContain('isNonVeg');
    });

    it('should render Non-Veg badge with badge-nonveg class', () => {
      expect(productCardContent).toContain('badge-nonveg');
      expect(productCardContent).toContain('Non-Veg');
    });

    it('should conditionally render Non-Veg badge based on product.isNonVeg', () => {
      expect(productCardContent).toContain('product.isNonVeg');
    });
  });

  describe('CSS Styling', () => {
    it('should have .badge-nonveg class defined', () => {
      expect(indexCssContent).toContain('.badge-nonveg');
    });

    it('should use red background color (#dc2626) for Non-Veg badge', () => {
      expect(indexCssContent).toContain('#dc2626');
    });

    it('should use white text color for Non-Veg badge', () => {
      // Extract the badge-nonveg CSS block
      const badgeIdx = indexCssContent.indexOf('.badge-nonveg');
      const badgeBlock = indexCssContent.substring(badgeIdx, badgeIdx + 300);
      expect(badgeBlock).toContain('color: white');
    });
  });

  describe('Admin Panel (ProductsTab)', () => {
    it('should have isNonVeg in edit product form state', () => {
      expect(productsTabContent).toContain('isNonVeg: product.isNonVeg');
    });

    it('should have isNonVeg in create product form state', () => {
      // Check that the create form has isNonVeg: false default
      expect(productsTabContent).toContain('isNonVeg: false');
    });

    it('should have Non-Veg switch in edit product dialog', () => {
      expect(productsTabContent).toContain('formData.isNonVeg');
    });

    it('should have Non-Veg switch in create product dialog', () => {
      expect(productsTabContent).toContain('create-nonveg');
    });

    it('should include isNonVeg in mutation calls', () => {
      expect(productsTabContent).toContain('isNonVeg: formData.isNonVeg');
    });
  });
});
