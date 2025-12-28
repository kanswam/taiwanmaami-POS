import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImageCropper } from './ImageCropper';
import { Upload, X, Crop, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiImageUploadProps {
  images: (string | null)[];
  onImagesChange: (images: (string | null)[]) => void;
  onUpload: (file: File, index: number) => Promise<string>;
  maxImages?: number;
  aspectRatio?: number;
  className?: string;
}

export function MultiImageUpload({
  images,
  onImagesChange,
  onUpload,
  maxImages = 3,
  aspectRatio = 1,
  className,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState<number | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [cropperIndex, setCropperIndex] = useState<number>(0);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL for cropping
    const previewUrl = URL.createObjectURL(file);
    setCropperImage(previewUrl);
    setCropperIndex(index);
    setCropperOpen(true);
    
    // Reset input
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    setUploading(cropperIndex);

    try {
      // Convert blob to file
      const file = new File([croppedBlob], `product-image-${cropperIndex + 1}.jpg`, { type: 'image/jpeg' });
      const url = await onUpload(file, cropperIndex);
      
      const newImages = [...images];
      newImages[cropperIndex] = url;
      onImagesChange(newImages);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploading(null);
      if (cropperImage) {
        URL.revokeObjectURL(cropperImage);
        setCropperImage(null);
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages[index] = null;
    onImagesChange(newImages);
  };

  const handleCropExisting = (imageUrl: string, index: number) => {
    setCropperImage(imageUrl);
    setCropperIndex(index);
    setCropperOpen(true);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: maxImages }).map((_, index) => {
          const imageUrl = images[index];
          const isUploading = uploading === index;

          return (
            <div
              key={index}
              className={cn(
                'relative aspect-square rounded-lg border-2 border-dashed',
                'flex items-center justify-center overflow-hidden',
                'transition-colors',
                imageUrl ? 'border-transparent' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                isUploading && 'opacity-50'
              )}
            >
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => handleCropExisting(imageUrl, index)}
                      title="Crop image"
                    >
                      <Crop className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => fileInputRefs.current[index]?.click()}
                      title="Replace image"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => handleRemoveImage(index)}
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {index === 0 && (
                    <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                      Main
                    </span>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[index]?.click()}
                  className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">
                        {index === 0 ? 'Main Image' : `Image ${index + 1}`}
                      </span>
                    </>
                  )}
                </button>
              )}

              <input
                ref={(el) => { fileInputRefs.current[index] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, index)}
              />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Upload up to {maxImages} images. The first image will be the main product image.
        Click on an image to crop, replace, or remove it.
      </p>

      {cropperImage && (
        <ImageCropper
          imageUrl={cropperImage}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setCropperOpen(false);
            if (cropperImage && !images[cropperIndex]) {
              URL.revokeObjectURL(cropperImage);
            }
            setCropperImage(null);
          }}
          aspectRatio={aspectRatio}
          open={cropperOpen}
        />
      )}
    </div>
  );
}
