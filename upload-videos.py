#!/usr/bin/env python3
import os
import sys
import json
import subprocess

videos = [
    {'local': 'client/public/videos/hero-banner.mp4', 's3_key': 'taiwan-maami/videos/hero-banner.mp4'},
    {'local': 'client/public/videos/bubble-tea-coffee.mp4', 's3_key': 'taiwan-maami/videos/bubble-tea-coffee.mp4'},
    {'local': 'client/public/videos/hot-beverages.mp4', 's3_key': 'taiwan-maami/videos/hot-beverages.mp4'},
    {'local': 'client/public/videos/asian-food.mp4', 's3_key': 'taiwan-maami/videos/asian-food.mp4'},
    {'local': 'client/public/videos/sweet-bites.mp4', 's3_key': 'taiwan-maami/videos/sweet-bites.mp4'},
    {'local': 'client/public/videos/palladium-outlet.mp4', 's3_key': 'taiwan-maami/videos/palladium-outlet.mp4'},
    {'local': 'client/public/videos/tnagar-outlet.mp4', 's3_key': 'taiwan-maami/videos/tnagar-outlet.mp4'},
]

print("Starting video uploads to S3...\n")

results = {}

for video in videos:
    local_path = video['local']
    s3_key = video['s3_key']
    
    if not os.path.exists(local_path):
        print(f"✗ File not found: {local_path}")
        sys.exit(1)
    
    file_size_mb = os.path.getsize(local_path) / (1024 * 1024)
    print(f"Uploading {local_path} ({file_size_mb:.1f} MB)...")
    
    try:
        # Use manus-upload-file command
        result = subprocess.run(
            ['manus-upload-file', local_path],
            capture_output=True,
            text=True,
            timeout=180
        )
        
        if result.returncode == 0:
            # Parse the URL from output
            url = result.stdout.strip()
            if url:
                results[s3_key] = url
                print(f"✓ Uploaded: {url}\n")
            else:
                print(f"✗ No URL returned for {local_path}")
                sys.exit(1)
        else:
            print(f"✗ Upload failed: {result.stderr}")
            sys.exit(1)
            
    except subprocess.TimeoutExpired:
        print(f"✗ Upload timed out for {local_path}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error uploading {local_path}: {str(e)}")
        sys.exit(1)

print("\n=== All videos uploaded successfully ===\n")
print("Video URLs:")
print(json.dumps(results, indent=2))

# Save URLs to file
with open('video-urls.json', 'w') as f:
    json.dump(results, f, indent=2)
print("\nURLs saved to video-urls.json")
