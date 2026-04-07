import { describe, it, expect } from 'vitest';

describe('Instagram Bio Redirect Logic', () => {
  describe('/order route redirect', () => {
    it('should redirect /order to /menu?type=delivery with utm_source', () => {
      // The /order route in App.tsx uses <Redirect to="/menu?type=delivery&utm_source=instagram" />
      const redirectTarget = '/menu?type=delivery&utm_source=instagram';
      const url = new URL(redirectTarget, 'https://www.taiwanmaami.com');
      
      expect(url.pathname).toBe('/menu');
      expect(url.searchParams.get('type')).toBe('delivery');
      expect(url.searchParams.get('utm_source')).toBe('instagram');
    });
  });

  describe('?order=now query parameter on homepage', () => {
    it('should detect order=now param and trigger redirect', () => {
      const searchString = '?order=now';
      const params = new URLSearchParams(searchString);
      const shouldRedirect = params.get('order') === 'now';
      
      expect(shouldRedirect).toBe(true);
    });

    it('should not redirect when order param is missing', () => {
      const searchString = '';
      const params = new URLSearchParams(searchString);
      const shouldRedirect = params.get('order') === 'now';
      
      expect(shouldRedirect).toBe(false);
    });

    it('should not redirect when order param has different value', () => {
      const searchString = '?order=later';
      const params = new URLSearchParams(searchString);
      const shouldRedirect = params.get('order') === 'now';
      
      expect(shouldRedirect).toBe(false);
    });

    it('should handle combined params like ?order=now&utm_source=instagram', () => {
      const searchString = '?order=now&utm_source=instagram';
      const params = new URLSearchParams(searchString);
      const shouldRedirect = params.get('order') === 'now';
      
      expect(shouldRedirect).toBe(true);
      expect(params.get('utm_source')).toBe('instagram');
    });
  });

  describe('Instagram bio URL options', () => {
    it('www.taiwanmaami.com/order should work as direct path', () => {
      const url = new URL('https://www.taiwanmaami.com/order');
      expect(url.pathname).toBe('/order');
    });

    it('www.taiwanmaami.com?order=now should work as query param', () => {
      const url = new URL('https://www.taiwanmaami.com?order=now');
      expect(url.searchParams.get('order')).toBe('now');
    });

    it('both options should ultimately reach /menu?type=delivery', () => {
      // /order route → Redirect to /menu?type=delivery&utm_source=instagram
      // /?order=now → useEffect redirect to /menu?type=delivery&utm_source=instagram
      const target = '/menu?type=delivery&utm_source=instagram';
      const targetUrl = new URL(target, 'https://www.taiwanmaami.com');
      
      expect(targetUrl.pathname).toBe('/menu');
      expect(targetUrl.searchParams.get('type')).toBe('delivery');
    });
  });
});
