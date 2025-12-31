// Script to upload images directly to S3 using the storage API
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error('Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY');
  process.exit(1);
}

// Image to subcategory mapping
const imageMapping = [
  { file: 'Cherry&GreenAppleSlush.jpg', subcategoryId: 30003, name: 'Slush' },
  { file: 'ClassicTaiwanMilkTea.jpg', subcategoryId: 1, name: 'Organic Black Tea' },
  { file: 'VirginPinaColadaGreenTea.jpg', subcategoryId: 3, name: 'Organic Green Tea' },
  { file: 'RoseMatcha.jpg', subcategoryId: 4, name: 'Matcha Blend' },
  { file: 'ButterscotchTaro.jpg', subcategoryId: 5, name: 'Taro Blend' },
];

async function uploadToS3(imagePath, subcategoryId) {
  const imageBuffer = fs.readFileSync(imagePath);
  const timestamp = Date.now();
  const key = `subcategories/${subcategoryId}-${timestamp}.jpg`;
  
  const baseUrl = FORGE_API_URL.replace(/\/+$/, '');
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', key);
  
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('file', blob, path.basename(imagePath));
  
  console.log(`  Uploading to S3: ${key}`);
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FORGE_API_KEY}`
    },
    body: form,
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${text}`);
  }
  
  const result = await response.json();
  console.log(`  S3 URL: ${result.url}`);
  return result.url;
}

async function main() {
  console.log('Starting direct S3 upload...\n');
  console.log(`API URL: ${FORGE_API_URL}`);
  console.log('');
  
  const results = [];
  
  for (const mapping of imageMapping) {
    const imagePath = path.join('/home/ubuntu/taiwan-maami', mapping.file);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`File not found: ${imagePath}`);
      continue;
    }
    
    console.log(`Processing ${mapping.name} (ID: ${mapping.subcategoryId})...`);
    console.log(`  File: ${imagePath}`);
    
    try {
      const url = await uploadToS3(imagePath, mapping.subcategoryId);
      results.push({
        id: mapping.subcategoryId,
        name: mapping.name,
        url: url
      });
      console.log(`  SUCCESS\n`);
    } catch (error) {
      console.log(`  ERROR: ${error.message}\n`);
    }
  }
  
  console.log('\n--- SQL UPDATE Statements ---');
  console.log('Copy and run these in the database:\n');
  
  for (const r of results) {
    console.log(`UPDATE subcategories SET image_url = '${r.url}' WHERE id = ${r.id};`);
  }
  
  console.log('\n--- Results Summary ---');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
