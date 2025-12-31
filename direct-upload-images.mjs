// Script to upload images directly to S3 and update database
import fs from 'fs';
import path from 'path';
import { storagePut } from './server/storage.js';

// Image to subcategory mapping
const imageMapping = [
  { file: 'Cherry&GreenAppleSlush.jpg', subcategoryId: 30003, name: 'Slush' },
  { file: 'ClassicTaiwanMilkTea.jpg', subcategoryId: 1, name: 'Organic Black Tea' },
  { file: 'CrèmeBrûléeOolongLatte.jpg', subcategoryId: 2, name: 'Organic Oolong' },
  { file: 'VirginPinaColadaGreenTea.jpg', subcategoryId: 3, name: 'Organic Green Tea' },
  { file: 'RoseMatcha.jpg', subcategoryId: 4, name: 'Matcha Blend' },
  { file: 'ButterscotchTaro.jpg', subcategoryId: 5, name: 'Taro Blend' },
];

async function uploadToS3(imagePath, subcategoryId) {
  const imageBuffer = fs.readFileSync(imagePath);
  const timestamp = Date.now();
  const key = `subcategories/${subcategoryId}-${timestamp}.jpg`;
  
  console.log(`  Uploading to S3: ${key}`);
  const result = await storagePut(key, imageBuffer, 'image/jpeg');
  console.log(`  S3 URL: ${result.url}`);
  return result.url;
}

async function main() {
  console.log('Starting direct S3 upload...\n');
  
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
  console.log('Run these in the database:\n');
  
  for (const r of results) {
    console.log(`UPDATE subcategories SET image_url = '${r.url}' WHERE id = ${r.id};`);
  }
}

main().catch(console.error);
