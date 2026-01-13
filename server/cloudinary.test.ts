import { describe, it, expect } from 'vitest';
import { isCloudinaryConfigured, validateCloudinaryCredentials, getOptimizedImageUrl, getResponsiveImageUrls } from './cloudinary';

describe('Cloudinary Integration', () => {
  describe('Configuration', () => {
    it('should have Cloudinary configured with credentials', () => {
      const isConfigured = isCloudinaryConfigured();
      expect(isConfigured).toBe(true);
    });
  });

  describe('Credential Validation', () => {
    it('should validate Cloudinary credentials successfully', async () => {
      const isValid = await validateCloudinaryCredentials();
      expect(isValid).toBe(true);
    }, 10000); // 10 second timeout for API call
  });

  describe('URL Generation', () => {
    it('should generate optimized image URL with default settings', () => {
      const publicId = 'taiwan-maami/test-image';
      const url = getOptimizedImageUrl(publicId);
      
      expect(url).toContain('res.cloudinary.com');
      expect(url).toContain('q_auto'); // Auto quality
      expect(url).toContain('f_auto'); // Auto format
      expect(url).toContain(publicId);
    });

    it('should generate optimized image URL with custom width', () => {
      const publicId = 'taiwan-maami/test-image';
      const url = getOptimizedImageUrl(publicId, { width: 400 });
      
      expect(url).toContain('w_400');
    });

    it('should generate optimized image URL with crop settings', () => {
      const publicId = 'taiwan-maami/test-image';
      const url = getOptimizedImageUrl(publicId, { 
        width: 400, 
        height: 500, 
        crop: 'fill',
        gravity: 'auto'
      });
      
      expect(url).toContain('w_400');
      expect(url).toContain('h_500');
      expect(url).toContain('c_fill');
      expect(url).toContain('g_auto');
    });

    it('should return original URL for non-Cloudinary URLs', () => {
      const cloudFrontUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/image.jpg';
      const url = getOptimizedImageUrl(cloudFrontUrl);
      
      expect(url).toBe(cloudFrontUrl);
    });

    it('should generate responsive image URLs', () => {
      const publicId = 'taiwan-maami/test-image';
      const urls = getResponsiveImageUrls(publicId);
      
      expect(urls.thumbnail).toContain('w_150');
      expect(urls.mobile).toContain('w_400');
      expect(urls.tablet).toContain('w_600');
      expect(urls.desktop).toContain('w_800');
      expect(urls.original).toContain('q_auto');
    });
  });
});
