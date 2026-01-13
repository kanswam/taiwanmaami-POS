import { describe, it, expect, vi } from 'vitest';
import { getOptimizedUrl, getResponsiveSrcSet, getOptimalImageSize } from './hybridStorage';

describe('Hybrid Storage', () => {
  describe('getOptimizedUrl', () => {
    it('should return original URL for non-Cloudinary URLs', () => {
      const s3Url = 'https://d2xsxph8kpxj0f.cloudfront.net/products/test.jpg';
      const result = getOptimizedUrl(s3Url, { width: 400 });
      expect(result).toBe(s3Url);
    });

    it('should add transformations to Cloudinary URLs', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/drpu1dbqk/image/upload/v1234567890/taiwan-maami/products/test.jpg';
      const result = getOptimizedUrl(cloudinaryUrl, { width: 400 });
      
      expect(result).toContain('w_400');
      expect(result).toContain('q_auto');
      expect(result).toContain('f_auto');
    });

    it('should handle empty URLs gracefully', () => {
      const result = getOptimizedUrl('', { width: 400 });
      expect(result).toBe('');
    });
  });

  describe('getResponsiveSrcSet', () => {
    it('should return empty string for non-Cloudinary URLs', () => {
      const s3Url = 'https://d2xsxph8kpxj0f.cloudfront.net/products/test.jpg';
      const result = getResponsiveSrcSet(s3Url);
      expect(result).toBe(s3Url);
    });

    it('should generate srcset for Cloudinary URLs', () => {
      const cloudinaryUrl = 'https://res.cloudinary.com/drpu1dbqk/image/upload/taiwan-maami/products/test.jpg';
      const result = getResponsiveSrcSet(cloudinaryUrl);
      
      expect(result).toContain('300w');
      expect(result).toContain('400w');
      expect(result).toContain('600w');
      expect(result).toContain('800w');
      expect(result).toContain('1200w');
    });

    it('should return empty string for empty URLs', () => {
      const result = getResponsiveSrcSet('');
      expect(result).toBe('');
    });
  });

  describe('getOptimalImageSize', () => {
    it('should return correct size for thumbnail context', () => {
      const result = getOptimalImageSize('thumbnail');
      expect(result.width).toBe(150);
    });

    it('should return correct size for card context', () => {
      const result = getOptimalImageSize('card');
      expect(result.width).toBe(400);
    });

    it('should return correct size for detail context', () => {
      const result = getOptimalImageSize('detail');
      expect(result.width).toBe(800);
    });

    it('should return correct size for hero context', () => {
      const result = getOptimalImageSize('hero');
      expect(result.width).toBe(1200);
    });
  });
});
