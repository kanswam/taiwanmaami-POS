/**
 * Cloudinary Integration for Taiwan Maami
 * 
 * Provides image upload and optimization with automatic:
 * - Format conversion (WebP/AVIF)
 * - Responsive sizing
 * - Quality optimization
 * - Secure signed uploads
 */

import { ENV } from './_core/env';
import crypto from 'crypto';

// Cloudinary configuration
const CLOUD_NAME = ENV.cloudinaryCloudName;
const API_KEY = ENV.cloudinaryApiKey;
const API_SECRET = ENV.cloudinaryApiSecret;

// Base URLs
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const DELIVERY_URL = `https://res.cloudinary.com/${CLOUD_NAME}`;

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(CLOUD_NAME && API_KEY && API_SECRET);
}

/**
 * Generate SHA-1 signature for Cloudinary API
 */
function generateSignature(params: Record<string, string | number>): string {
  // Sort parameters alphabetically and create string to sign
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  // Generate SHA-1 hash with API secret
  return crypto
    .createHash('sha1')
    .update(sortedParams + API_SECRET)
    .digest('hex');
}

/**
 * Upload image to Cloudinary
 * 
 * @param fileBuffer - The image file as Buffer
 * @param options - Upload options
 * @returns Cloudinary upload response with URLs
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  options: {
    folder?: string;
    publicId?: string;
    resourceType?: 'image' | 'video' | 'raw';
    tags?: string[];
  } = {}
): Promise<{
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options.folder || 'taiwan-maami';
  
  // Parameters for signature (must match form data)
  const signatureParams: Record<string, string | number> = {
    timestamp,
    folder,
  };
  
  if (options.publicId) {
    signatureParams.public_id = options.publicId;
  }
  
  if (options.tags && options.tags.length > 0) {
    signatureParams.tags = options.tags.join(',');
  }

  const signature = generateSignature(signatureParams);

  // Create form data for upload
  const formData = new FormData();
  // Convert Buffer to base64 for upload
  const base64Data = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
  formData.append('file', base64Data);
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);
  
  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }
  
  if (options.tags && options.tags.length > 0) {
    formData.append('tags', options.tags.join(','));
  }

  // Upload to Cloudinary
  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  return {
    publicId: result.public_id,
    url: result.url,
    secureUrl: result.secure_url,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
}

/**
 * Generate optimized image URL with transformations
 * 
 * @param publicIdOrUrl - Cloudinary public_id or full URL
 * @param options - Transformation options
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  publicIdOrUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'crop';
    gravity?: 'auto' | 'face' | 'center';
  } = {}
): string {
  if (!CLOUD_NAME) {
    // If Cloudinary not configured, return original URL
    return publicIdOrUrl;
  }

  // Extract public_id from full URL if needed
  let publicId = publicIdOrUrl;
  if (publicIdOrUrl.includes('cloudinary.com')) {
    // Already a Cloudinary URL, extract and rebuild with transformations
    const match = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (match) {
      publicId = match[1];
    }
  } else if (publicIdOrUrl.includes('cloudfront.net')) {
    // This is a Manus S3/CloudFront URL, can't optimize
    return publicIdOrUrl;
  }

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
  
  // Crop mode
  if (options.crop) {
    transforms.push(`c_${options.crop}`);
  }
  
  // Gravity for smart cropping
  if (options.gravity) {
    transforms.push(`g_${options.gravity}`);
  }

  const transformString = transforms.join(',');
  
  return `${DELIVERY_URL}/image/upload/${transformString}/${publicId}`;
}

/**
 * Get responsive image URLs for different device sizes
 * 
 * @param publicIdOrUrl - Cloudinary public_id or URL
 * @returns Object with URLs for different sizes
 */
export function getResponsiveImageUrls(publicIdOrUrl: string): {
  thumbnail: string;  // 150px - for small previews
  mobile: string;     // 400px - for mobile devices
  tablet: string;     // 600px - for tablets
  desktop: string;    // 800px - for desktop
  original: string;   // Full quality
} {
  return {
    thumbnail: getOptimizedImageUrl(publicIdOrUrl, { width: 150, crop: 'fill' }),
    mobile: getOptimizedImageUrl(publicIdOrUrl, { width: 400, crop: 'fill' }),
    tablet: getOptimizedImageUrl(publicIdOrUrl, { width: 600, crop: 'fill' }),
    desktop: getOptimizedImageUrl(publicIdOrUrl, { width: 800, crop: 'fill' }),
    original: getOptimizedImageUrl(publicIdOrUrl, {}),
  };
}

/**
 * Validate Cloudinary credentials by making a test API call
 */
export async function validateCloudinaryCredentials(): Promise<boolean> {
  if (!isCloudinaryConfigured()) {
    return false;
  }

  try {
    // Use Basic Auth for the ping endpoint
    const authString = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    
    // Use the ping endpoint to validate credentials
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/ping`,
      { 
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`
        }
      }
    );
    
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete image from Cloudinary
 * 
 * @param publicId - The public_id of the image to delete
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  if (!isCloudinaryConfigured()) {
    return false;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature({ public_id: publicId, timestamp });

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    return false;
  }

  const result = await response.json();
  return result.result === 'ok';
}
