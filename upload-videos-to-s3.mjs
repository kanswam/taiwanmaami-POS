import { readFileSync } from 'fs';
import { storagePut } from './storage/index.js';

const videos = [
  { local: 'client/public/videos/hero-banner.mp4', s3Key: 'videos/hero-banner.mp4' },
  { local: 'client/public/videos/bubble-tea-coffee.mp4', s3Key: 'videos/bubble-tea-coffee.mp4' },
  { local: 'client/public/videos/hot-beverages.mp4', s3Key: 'videos/hot-beverages.mp4' },
  { local: 'client/public/videos/asian-food.mp4', s3Key: 'videos/asian-food.mp4' },
  { local: 'client/public/videos/sweet-bites.mp4', s3Key: 'videos/sweet-bites.mp4' },
  { local: 'client/public/videos/palladium-outlet.mp4', s3Key: 'videos/palladium-outlet.mp4' },
  { local: 'client/public/videos/tnagar-outlet.mp4', s3Key: 'videos/tnagar-outlet.mp4' },
];

console.log('Starting video upload to S3...\n');

const results = {};

for (const video of videos) {
  try {
    console.log(`Uploading ${video.local}...`);
    const fileBuffer = readFileSync(video.local);
    const { url } = await storagePut(video.s3Key, fileBuffer, 'video/mp4');
    results[video.s3Key] = url;
    console.log(`✓ Uploaded: ${url}\n`);
  } catch (error) {
    console.error(`✗ Failed to upload ${video.local}:`, error.message);
    process.exit(1);
  }
}

console.log('\n=== All videos uploaded successfully ===\n');
console.log('Video URLs:');
console.log(JSON.stringify(results, null, 2));
