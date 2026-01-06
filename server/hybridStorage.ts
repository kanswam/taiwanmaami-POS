/**
 * Hybrid Storage Module for Taiwan Maami
 * 
 * Implements dual storage strategy:
 * 1. Manus S3 - Original high-res backup (you control)
 * 2. Cloudinary - Optimized delivery (fast loading)
 * 
 * Benefits:
 * - Originals always safe on your storage
 * - Customers get optimized, fast-loading images
 * - No vendor lock-in
 */

import { storagePut } from './storage';
import { uploadToCloudinary, getOptimizedImageUrl, isCloudinaryConfigured } from './cloudinary';

export interface HybridUploadResult {
  // Manus S3 URL (original backup)
  backupUrl: string;
  // Cloudinary URL (optimized delivery) - falls back to backupUrl if Cloudinary not configured
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
 * Upload image to both Manus S3 (backup) and Cloudinary (delivery)
 * 
 * @param fileBuffer - The image file as Buffer
 * @param options - Upload options
 * @returns URLs for both storage locations
 */
export async function hybridUpload(
  fileBuffer: Buffer,
  options: {
    folder: string;        // e.g., 'products', 'categories', 'subcategories'
    fileName: string;      // e.g., 'product-123-img1-1234567890.jpg'
    mimeType: string;      // e.g., 'image/jpeg'
    tags?: string[];       // Optional tags for Cloudinary
  }
): Promise<HybridUploadResult> {
  const { folder, fileName, mimeType, tags } = options;
  
  // Step 1: Upload to Manus S3 (backup - always do this first)
  const s3Key = `${folder}/${fileName}`;
  console.log(`[hybridUpload] Uploading to Manus S3: ${s3Key}`);
  
  const { url: backupUrl } = await storagePut(s3Key, fileBuffer, mimeType);
  console.log(`[hybridUpload] Manus S3 upload complete: ${backupUrl}`);
  
  // Step 2: Upload to Cloudinary (delivery) if configured
  if (isCloudinaryConfigured()) {
    try {
      console.log(`[hybridUpload] Uploading to Cloudinary...`);
      
      const cloudinaryResult = await uploadToCloudinary(fileBuffer, {
        folder: `taiwan-maami/${folder}`,
        publicId: fileName.replace(/\.[^.]+$/, ''), // Remove extension
        tags: tags || [folder],
      });
      
      console.log(`[hybridUpload] Cloudinary upload complete: ${cloudinaryResult.secureUrl}`);
      
      return {
        backupUrl,
        deliveryUrl: cloudinaryResult.secureUrl,
        cloudinaryPublicId: cloudinaryResult.publicId,
        format: cloudinaryResult.format,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        bytes: cloudinaryResult.bytes,
      };
    } catch (error) {
      // If Cloudinary fails, fall back to S3 URL
      console.error('[hybridUpload] Cloudinary upload failed, using S3 URL:', error);
      return {
        backupUrl,
        deliveryUrl: backupUrl, // Fall back to S3
        format: mimeType.split('/')[1] || 'jpeg',
        bytes: fileBuffer.length,
      };
    }
  } else {
    // Cloudinary not configured, use S3 only
    console.log('[hybridUpload] Cloudinary not configured, using S3 only');
    return {
      backupUrl,
      deliveryUrl: backupUrl,
      format: mimeType.split('/')[1] || 'jpeg',
      bytes: fileBuffer.length,
    };
  }
}

/**
 * Get optimized URL for an image
 * 
 * If the URL is from Cloudinary, applies transformations.
 * If the URL is from S3/CloudFront, returns as-is (no optimization available).
 * 
 * @param imageUrl - The image URL (can be Cloudinary or S3)
 * @param options - Transformation options
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
  
  // Check if this is a Cloudinary URL
  if (imageUrl.includes('cloudinary.com') || imageUrl.includes('res.cloudinary.com')) {
    return getOptimizedImageUrl(imageUrl, options);
  }
  
  // For S3/CloudFront URLs, return as-is (no server-side optimization)
  return imageUrl;
}

/**
 * Get responsive image srcset for an image
 * 
 * @param imageUrl - The image URL
 * @returns srcset string for responsive images
 */
export function getResponsiveSrcSet(imageUrl: string): string {
  if (!imageUrl) return '';
  
  // Only generate srcset for Cloudinary URLs
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
