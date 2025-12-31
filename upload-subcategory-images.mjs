// Script to upload images to subcategories
import fs from 'fs';
import path from 'path';

// Image to subcategory mapping
const imageMapping = [
  { file: 'Cherry&GreenAppleSlush.jpg', subcategoryId: 30003, name: 'Slush' },
  { file: 'ClassicTaiwanMilkTea.jpg', subcategoryId: 1, name: 'Organic Black Tea' },
  { file: 'CrèmeBrûléeOolongLatte.jpg', subcategoryId: 2, name: 'Organic Oolong' },
  { file: 'VirginPinaColadaGreenTea.jpg', subcategoryId: 3, name: 'Organic Green Tea' },
  { file: 'RoseMatcha.jpg', subcategoryId: 4, name: 'Matcha Blend' },
  { file: 'ButterscotchTaro.jpg', subcategoryId: 5, name: 'Taro Blend' },
];

async function uploadImage(subcategoryId, imagePath, name) {
  try {
    // Read image and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    console.log(`Uploading image for ${name} (ID: ${subcategoryId})...`);
    console.log(`  File: ${imagePath}`);
    console.log(`  Size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
    
    // Make tRPC mutation call
    const response = await fetch('http://localhost:3000/api/trpc/admin.updateSubcategory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          id: subcategoryId,
          imageData: dataUrl,
        }
      }),
    });
    
    const result = await response.json();
    
    if (result.error) {
      console.log(`  ERROR: ${result.error.json?.message || JSON.stringify(result.error)}`);
      return false;
    } else {
      console.log(`  SUCCESS: Image uploaded for ${name}`);
      return true;
    }
  } catch (error) {
    console.log(`  ERROR: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Starting subcategory image upload...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const mapping of imageMapping) {
    const imagePath = path.join('/home/ubuntu/taiwan-maami', mapping.file);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`File not found: ${imagePath}`);
      failCount++;
      continue;
    }
    
    const success = await uploadImage(mapping.subcategoryId, imagePath, mapping.name);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    console.log('');
  }
  
  console.log(`\n--- Upload Complete ---`);
  console.log(`Success: ${successCount}, Failed: ${failCount}`);
}

main().catch(console.error);
