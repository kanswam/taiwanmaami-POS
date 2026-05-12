/**
 * Hybrid Storage Module for Taiwan Maami
 *
 * Now uses Cloudinary as the sole storage backend.
 * The "hybrid" name is kept for backward compatibility with all import sites.
 *
 * Benefits:
 * - Customers get optimized, fast-loading images via Cloudinary CDN
 * - Automatic format conversion (WebP/AVIF) and responsive sizing
 */

import { uploadToCloudinary, getOptimizedImageUrl, isCloudinaryConfigured } from './cloudinary';

export interface HybridUploadResult {
  // backupUrl kept for backward compat — same as deliveryUrl now
  backupUrl: string;
  // Cloudinary URL (optimized delivery)
  deliveryUrl: string;
  // Cloudinary public_id for transformations
  cloudinaryPublicId?: string;
  // File metadata
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

/**
 * Upload image to Cloudinary
 *
 * @param fileBuffer - The image file as Buffer
 * @param options - Upload options
 * @returns URLs and metadata
 */
export async function hybridUpload(
  fileBuffer: Buffer,
  options: {
    folder: string;
    fileName: string;
    mimeType: string;
    tags?: string[];
  }
): Promise<HybridUploadResult> {
  const { folder, fileName, mimeType, tags } = options;

  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  console.log(`[hybridUpload] Uploading to Cloudinary: taiwan-maami/${folder}/${fileName}`);

  const cloudinaryResult = await uploadToCloudinary(fileBuffer, {
    folder: `taiwan-maami/${folder}`,
    publicId: fileName.replace(/\.[^.]+$/, ''),
    tags: tags || [folder],
  });

  console.log(`[hybridUpload] Cloudinary upload complete: ${cloudinaryResult.secureUrl}`);

  return {
    backupUrl: cloudinaryResult.secureUrl,
    deliveryUrl: cloudinaryResult.secureUrl,
    cloudinaryPublicId: cloudinaryResult.publicId,
    format: cloudinaryResult.format,
    width: cloudinaryResult.width,
    height: cloudinaryResult.height,
    bytes: cloudinaryResult.bytes,
  };
}

/**
 * Get optimized URL for an image
 *
 * If the URL is from Cloudinary, applies transformations.
 * Otherwise returns as-is.
 */
export function getOptimizedUrl(
  imageUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'crop';
  } = {}
): string {
  if (!imageUrl) return imageUrl;

  if (imageUrl.includes('cloudinary.com') || imageUrl.includes('res.cloudinary.com')) {
    return getOptimizedImageUrl(imageUrl, options);
  }

  return imageUrl;
}

/**
 * Get responsive image srcset for an image
 */
export function getResponsiveSrcSet(imageUrl: string): string {
  if (!imageUrl) return '';

  if (!imageUrl.includes('cloudinary.com')) {
    return imageUrl;
  }

  const sizes = [300, 400, 600, 800, 1200];
  const srcset = sizes
    .map(width => {
      const url = getOptimizedImageUrl(imageUrl, { width, crop: 'fill' });
      return `${url} ${width}w`;
    })
    .join(', ');

  return srcset;
}

/**
 * Helper to determine optimal image size based on display context
 */
export function getOptimalImageSize(context: 'thumbnail' | 'card' | 'detail' | 'hero'): {
  width: number;
  height?: number;
} {
  switch (context) {
    case 'thumbnail':
      return { width: 150 };
    case 'card':
      return { width: 400 };
    case 'detail':
      return { width: 800 };
    case 'hero':
      return { width: 1200 };
    default:
      return { width: 400 };
  }
}
