/**
 * Client-side Image Optimizer for Taiwan Maami
 * 
 * Automatically optimizes Cloudinary images using URL-based transforms.
 * CloudFront/S3 images are served directly from CDN (no server proxy).
 */

// Get Cloudinary cloud name from environment (set during build)
const CLOUD_NAME = 'drpu1dbqk'; // Taiwan Maami's Cloudinary cloud name

/**
 * Check if a URL is from Cloudinary
 */
export function isCloudinaryUrl(url: string): boolean {
  return url?.includes('cloudinary.com') || url?.includes('res.cloudinary.com');
}

/**
 * Check if a URL is from CloudFront/S3
 */
export function isCloudFrontUrl(url: string): boolean {
  return url?.includes('cloudfront.net') || url?.includes('amazonaws.com');
}

/**
 * Get optimized Cloudinary image URL with transformations.
 * CloudFront/S3 images are returned directly (served from CDN, no proxy).
 * 
 * @param imageUrl - Original image URL
 * @param options - Transformation options
 * @returns Optimized URL (or original if not Cloudinary)
 */
export function getOptimizedImageUrl(
  imageUrl: string | null | undefined,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'crop' | 'limit';
    gravity?: 'auto' | 'face' | 'center';
  } = {}
): string {
  if (!imageUrl) return '/placeholder-drink.jpg';
  
  // CloudFront/S3 images: serve directly from CDN (fast, no server round-trip)
  if (isCloudFrontUrl(imageUrl)) {
    return imageUrl;
  }
  
  // Only transform Cloudinary URLs
  if (!isCloudinaryUrl(imageUrl)) {
    return imageUrl;
  }
  
  // Extract public_id from Cloudinary URL
  // Format: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{public_id}
  const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return imageUrl;
  
  const publicId = match[1];
  
  // Build transformation string
  const transforms: string[] = [];
  
  // Quality - default to auto for best compression
  const quality = options.quality ?? 'auto';
  transforms.push(`q_${quality}`);
  
  // Format - default to auto for WebP/AVIF support
  const format = options.format ?? 'auto';
  transforms.push(`f_${format}`);
  
  // Dimensions
  if (options.width) {
    transforms.push(`w_${options.width}`);
  }
  if (options.height) {
    transforms.push(`h_${options.height}`);
  }
  
  // Crop mode - default to limit (scale down, preserve aspect ratio)
  if (options.crop) {
    transforms.push(`c_${options.crop}`);
  } else if (options.width || options.height) {
    transforms.push('c_limit');
  }
  
  // Gravity for smart cropping
  if (options.gravity) {
    transforms.push(`g_${options.gravity}`);
  }
  
  const transformString = transforms.join(',');
  
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformString}/${publicId}`;
}

/**
 * Get responsive srcset for an image (Cloudinary only)
 * CloudFront images don't support URL-based resizing so no srcset is generated.
 * 
 * @param imageUrl - Original image URL
 * @returns srcset string for responsive images
 */
export function getResponsiveSrcSet(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  
  // Only generate srcset for Cloudinary URLs (they support URL-based transforms)
  if (!isCloudinaryUrl(imageUrl)) {
    return '';
  }
  
  const sizes = [300, 400, 600, 800, 1200];
  const srcset = sizes
    .map(width => {
      const url = getOptimizedImageUrl(imageUrl, { width, crop: 'limit' });
      return `${url} ${width}w`;
    })
    .join(', ');
  
  return srcset;
}

/**
 * Get image URL optimized for specific display context
 */
export function getImageForContext(
  imageUrl: string | null | undefined,
  context: 'thumbnail' | 'card' | 'detail' | 'hero' | 'admin'
): string {
  const contextSettings: Record<string, { width: number; crop?: 'fill' | 'limit' }> = {
    thumbnail: { width: 150, crop: 'limit' },
    card: { width: 400, crop: 'limit' },
    detail: { width: 800, crop: 'limit' },
    hero: { width: 1200, crop: 'limit' },
    admin: { width: 300, crop: 'limit' },
  };
  
  const settings = contextSettings[context] || contextSettings.card;
  return getOptimizedImageUrl(imageUrl, settings);
}

/**
 * Preload critical images for better LCP
 */
export function preloadImage(imageUrl: string, options?: { width?: number }): void {
  if (!imageUrl) return;
  
  const optimizedUrl = getOptimizedImageUrl(imageUrl, {
    width: options?.width || 800,
    format: 'auto',
    quality: 'auto',
  });
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = optimizedUrl;
  document.head.appendChild(link);
}
