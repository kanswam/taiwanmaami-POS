/**
 * Bulk Image Migration Script: S3/CloudFront → Cloudinary
 * 
 * This script migrates existing images to Cloudinary while preserving
 * the original S3 URLs as backup. Compresses images before upload.
 * 
 * Usage:
 *   node scripts/migrate-images-to-cloudinary.mjs --test    # Test with 3 images
 *   node scripts/migrate-images-to-cloudinary.mjs --all     # Migrate all images
 */

import crypto from 'crypto';
import sharp from 'sharp';
import { Readable } from 'stream';

// Cloudinary configuration
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('❌ Missing Cloudinary credentials. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL');
  process.exit(1);
}

// Parse command line args
const args = process.argv.slice(2);
const isTestMode = args.includes('--test');
const isAllMode = args.includes('--all');

if (!isTestMode && !isAllMode) {
  console.log('Usage:');
  console.log('  node scripts/migrate-images-to-cloudinary.mjs --test    # Test with 3 images');
  console.log('  node scripts/migrate-images-to-cloudinary.mjs --all     # Migrate all images');
  process.exit(0);
}

console.log(`\n🚀 Starting Cloudinary Migration (${isTestMode ? 'TEST MODE - 3 images' : 'FULL MIGRATION'})\n`);

/**
 * Generate SHA-1 signature for Cloudinary API
 */
function generateSignature(params) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return crypto
    .createHash('sha1')
    .update(sortedParams + API_SECRET)
    .digest('hex');
}

/**
 * Download and compress image
 */
async function downloadAndCompressImage(imageUrl) {
  console.log(`         Downloading image...`);
  
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const originalSize = buffer.length;
  
  console.log(`         Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  
  // Compress with sharp - resize to max 2000px and compress to JPEG quality 85
  const compressedBuffer = await sharp(buffer)
    .resize(2000, 2000, { 
      fit: 'inside', 
      withoutEnlargement: true 
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
  
  const compressedSize = compressedBuffer.length;
  const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
  
  console.log(`         Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${savings}% smaller)`);
  
  return compressedBuffer;
}

/**
 * Upload compressed image buffer to Cloudinary
 */
async function uploadToCloudinary(imageBuffer, folder, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  const params = {
    folder: `taiwan-maami/${folder}`,
    public_id: publicId,
    timestamp,
  };
  
  const signature = generateSignature(params);
  
  // Convert buffer to base64 data URI
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64}`;
  
  const formData = new FormData();
  formData.append('file', dataUri);
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', params.folder);
  formData.append('public_id', publicId);
  
  console.log(`         Uploading to Cloudinary...`);
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  return result.secure_url;
}

/**
 * Execute SQL query using mysql2
 */
async function executeQuery(query) {
  const mysql = await import('mysql2/promise');
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    const [rows] = await connection.execute(query);
    return rows;
  } finally {
    await connection.end();
  }
}

/**
 * Update database with new Cloudinary URL
 */
async function updateImageUrl(table, id, field, newUrl) {
  const mysql = await import('mysql2/promise');
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    await connection.execute(
      `UPDATE ${table} SET ${field} = ? WHERE id = ?`,
      [newUrl, id]
    );
  } finally {
    await connection.end();
  }
}

/**
 * Check if URL is already a Cloudinary URL
 */
function isCloudinaryUrl(url) {
  return url && url.includes('cloudinary.com');
}

/**
 * Main migration function
 */
async function migrateImages() {
  const results = {
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    totalSaved: 0,
  };
  
  // Get all images from database
  console.log('📊 Fetching image URLs from database...\n');
  
  const images = [];
  
  // Get product images
  const products = await executeQuery(`
    SELECT id, name, imageUrl, imageUrl2, imageUrl3 
    FROM products 
    WHERE imageUrl IS NOT NULL AND imageUrl != ''
  `);
  
  for (const p of products) {
    if (p.imageUrl) images.push({ table: 'products', id: p.id, name: p.name, field: 'imageUrl', url: p.imageUrl });
    if (p.imageUrl2) images.push({ table: 'products', id: p.id, name: p.name, field: 'imageUrl2', url: p.imageUrl2 });
    if (p.imageUrl3) images.push({ table: 'products', id: p.id, name: p.name, field: 'imageUrl3', url: p.imageUrl3 });
  }
  
  // Get category images
  const categories = await executeQuery(`
    SELECT id, name, imageUrl 
    FROM categories 
    WHERE imageUrl IS NOT NULL AND imageUrl != ''
  `);
  
  for (const c of categories) {
    if (c.imageUrl) images.push({ table: 'categories', id: c.id, name: c.name, field: 'imageUrl', url: c.imageUrl });
  }
  
  // Get subcategory images
  const subcategories = await executeQuery(`
    SELECT id, name, imageUrl 
    FROM subcategories 
    WHERE imageUrl IS NOT NULL AND imageUrl != ''
  `);
  
  for (const s of subcategories) {
    if (s.imageUrl) images.push({ table: 'subcategories', id: s.id, name: s.name, field: 'imageUrl', url: s.imageUrl });
  }
  
  console.log(`📷 Found ${images.length} images to process\n`);
  
  // Limit to 3 images in test mode
  const imagesToProcess = isTestMode ? images.slice(0, 3) : images;
  
  console.log(`🔄 Processing ${imagesToProcess.length} images...\n`);
  
  for (let i = 0; i < imagesToProcess.length; i++) {
    const img = imagesToProcess[i];
    const progress = `[${i + 1}/${imagesToProcess.length}]`;
    
    // Skip if already a Cloudinary URL
    if (isCloudinaryUrl(img.url)) {
      console.log(`${progress} ⏭️  Skipping ${img.name} (${img.field}) - already on Cloudinary`);
      results.skipped++;
      continue;
    }
    
    try {
      console.log(`${progress} 📤 Processing ${img.name} (${img.field})...`);
      
      // Download and compress image
      const compressedBuffer = await downloadAndCompressImage(img.url);
      
      // Generate a unique public ID
      const publicId = `${img.table}-${img.id}-${img.field.replace('imageUrl', 'img')}-${Date.now()}`;
      const folder = img.table;
      
      // Upload to Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(compressedBuffer, folder, publicId);
      
      // Update database with new URL
      await updateImageUrl(img.table, img.id, img.field, cloudinaryUrl);
      
      console.log(`${progress} ✅ Migrated ${img.name} (${img.field})`);
      console.log(`         New URL: ${cloudinaryUrl.substring(0, 70)}...`);
      
      results.success++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`${progress} ❌ Failed ${img.name} (${img.field}): ${error.message}`);
      results.failed++;
      results.errors.push({ ...img, error: error.message });
    }
    
    console.log(''); // Empty line between images
  }
  
  // Print summary
  console.log('='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully migrated: ${results.success}`);
  console.log(`⏭️  Skipped (already on Cloudinary): ${results.skipped}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Failed images:');
    results.errors.forEach(e => {
      console.log(`   - ${e.name} (${e.table}.${e.field}): ${e.error}`);
    });
  }
  
  if (isTestMode && results.success > 0) {
    console.log('\n✨ Test migration successful! Run with --all to migrate all images.');
  }
  
  console.log('\n');
}

// Run migration
migrateImages().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
