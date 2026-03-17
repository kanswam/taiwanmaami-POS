import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Tests for Google Customer Reviews integration.
 * Verifies that the Store Widget and Survey Opt-in code are correctly placed.
 */

describe('Google Customer Reviews Integration', () => {
  describe('Part 2: Store Widget in index.html', () => {
    const indexHtml = readFileSync(resolve(__dirname, '../client/index.html'), 'utf-8');

    it('should include the merchant widget script tag', () => {
      expect(indexHtml).toContain('id="merchantWidgetScript"');
      expect(indexHtml).toContain('src="https://www.gstatic.com/shopping/merchant/merchantwidget.js"');
    });

    it('should initialize merchantwidget.start with correct config', () => {
      expect(indexHtml).toContain('merchantwidget.start(');
      expect(indexHtml).toContain("position: 'RIGHT_BOTTOM'");
      expect(indexHtml).toContain('sideMargin: 20');
      expect(indexHtml).toContain('bottomMargin: 20');
      expect(indexHtml).toContain('mobileSideMargin: 16');
      expect(indexHtml).toContain('mobileBottomMargin: 70');
    });

    it('should be placed inside the <head> section', () => {
      const headEnd = indexHtml.indexOf('</head>');
      const widgetPos = indexHtml.indexOf('merchantWidgetScript');
      expect(widgetPos).toBeGreaterThan(0);
      expect(widgetPos).toBeLessThan(headEnd);
    });

    it('should use defer attribute for non-blocking load', () => {
      // Find the script tag for merchantWidgetScript
      const scriptMatch = indexHtml.match(/<script[^>]*id="merchantWidgetScript"[^>]*>/);
      expect(scriptMatch).not.toBeNull();
      expect(scriptMatch![0]).toContain('defer');
    });
  });

  describe('Part 1: Survey Opt-in in OrderConfirmation component', () => {
    const orderConfirmation = readFileSync(
      resolve(__dirname, '../client/src/pages/OrderConfirmation.tsx'),
      'utf-8'
    );

    it('should import useEffect and useRef', () => {
      expect(orderConfirmation).toContain('useEffect');
      expect(orderConfirmation).toContain('useRef');
    });

    it('should include the correct Google Merchant ID', () => {
      expect(orderConfirmation).toContain('merchant_id: 5406585787');
    });

    it('should use the order number for order_id', () => {
      expect(orderConfirmation).toContain('order_id: order.orderNumber');
    });

    it('should use customer email from order data', () => {
      expect(orderConfirmation).toContain('email: order.customerEmail');
    });

    it('should set delivery_country to IN', () => {
      expect(orderConfirmation).toContain("delivery_country: 'IN'");
    });

    it('should use BOTTOM_RIGHT_DIALOG opt-in style', () => {
      expect(orderConfirmation).toContain("opt_in_style: 'BOTTOM_RIGHT_DIALOG'");
    });

    it('should calculate different delivery dates for delivery vs pickup/dine-in', () => {
      expect(orderConfirmation).toContain("if (order.orderType === 'delivery')");
      expect(orderConfirmation).toContain('deliveryDate.setDate(today.getDate() + 1)');
    });

    it('should load the Google platform script dynamically', () => {
      expect(orderConfirmation).toContain("script.src = 'https://apis.google.com/js/platform.js?onload=renderOptIn'");
    });

    it('should guard against loading the script multiple times', () => {
      expect(orderConfirmation).toContain('googleReviewScriptLoaded.current');
      expect(orderConfirmation).toContain('googleReviewScriptLoaded.current = true');
    });

    it('should only run when order has customer email', () => {
      expect(orderConfirmation).toContain('if (!order || !order.customerEmail');
    });

    it('should clean up script on unmount', () => {
      expect(orderConfirmation).toContain('script.parentNode.removeChild(script)');
      expect(orderConfirmation).toContain('delete (window as any).renderOptIn');
    });
  });
});
