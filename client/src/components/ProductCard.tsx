import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Plus, Leaf, Egg, Star, Play, X } from 'lucide-react';
import { formatPrice, GST_RATE } from '@shared/types';
import { ProductCustomizationModal } from './ProductCustomizationModal';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    chineseName?: string | null;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    instorePrice?: number | null;
    deliveryPrice?: number | null;
    isVegetarian?: boolean;
    isVegan?: boolean;
    containsEgg?: boolean;
    videoUrl?: string | null;
  };
  subcategory: {
    id: number;
    name: string;
    hasSizeVariants?: boolean;
    hasBobaOption?: boolean;
    basePricePetiteWithBoba?: number | null;
    basePricePetiteNoBoba?: number | null;
    basePriceRegularWithBoba?: number | null;
    basePriceRegularNoBoba?: number | null;
    basePriceLargeWithBoba?: number | null;
    basePriceLargeNoBoba?: number | null;
    deliveryPriceRegularWithBoba?: number | null;
    deliveryPriceRegularNoBoba?: number | null;
    deliveryPriceLargeWithBoba?: number | null;
    deliveryPriceLargeNoBoba?: number | null;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  isDelivery?: boolean;
  rating?: { averageRating: number | null; reviewCount: number } | null;
}

export function ProductCard({ product, subcategory, category, isDelivery = false, rating }: ProductCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Calculate display price (with GST)
  const getDisplayPrice = () => {
    if (subcategory.hasSizeVariants) {
      // For drinks with size variants, show starting price (Regular with Boba for delivery, Petite with Boba for in-store)
      if (isDelivery) {
        const basePrice = subcategory.deliveryPriceRegularWithBoba || subcategory.basePriceRegularWithBoba || 0;
        return Math.round(basePrice * (1 + GST_RATE));
      } else {
        const basePrice = subcategory.basePricePetiteWithBoba || subcategory.basePriceRegularWithBoba || 0;
        return Math.round(basePrice * (1 + GST_RATE));
      }
    } else {
      // For fixed price items
      const basePrice = isDelivery ? (product.deliveryPrice || product.instorePrice || 0) : (product.instorePrice || 0);
      return Math.round(basePrice * (1 + GST_RATE));
    }
  };

  const displayPrice = getDisplayPrice();
  const hasCustomization = subcategory.hasSizeVariants || subcategory.hasBobaOption;

  // Default placeholder image
  const imageUrl = product.imageUrl || '/placeholder-drink.jpg';
  
  // Check if this is a mochi product (for delivery, mochis are sold as set of 2)
  const isMochiProduct = subcategory.name.toLowerCase().includes('mochi');

  return (
    <>
      <Card 
        className="product-card cursor-pointer group"
        onClick={() => setShowModal(true)}
      >
        {/* Image section - 60% height */}
        <div className="relative h-3/5 overflow-hidden bg-secondary">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-drink.jpg';
            }}
          />
          {/* Dietary badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {product.isVegan && (
              <span className="badge-vegan">
                <Leaf className="w-3 h-3 mr-1" />
                Vegan
              </span>
            )}
            {product.isVegetarian && !product.isVegan && (
              <span className="badge-veg">
                <Leaf className="w-3 h-3 mr-1" />
                Veg
              </span>
            )}
            {product.containsEgg && (
              <span className="badge-egg">
                <Egg className="w-3 h-3 mr-1" />
                Egg
              </span>
            )}
          </div>
          {/* Mochi set indicator for delivery */}
          {isDelivery && isMochiProduct && (
            <div className="absolute top-2 right-2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                Set of 2
              </span>
            </div>
          )}
          {/* Video badge - clickable to play video */}
          {product.videoUrl && (
            <button
              className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm flex items-center gap-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowVideo(true);
              }}
            >
              <Play className="w-3 h-3 fill-white" />
              Video
            </button>
          )}
        </div>

        {/* Content section - 40% height */}
        <div className="product-card-content">
          <div>
            <h3 className="font-semibold text-foreground line-clamp-2 text-sm sm:text-base">
              {product.name}
            </h3>
            {product.chineseName && (
              <p className="text-xs text-muted-foreground mt-0.5">{product.chineseName}</p>
            )}
          </div>

          {/* Rating display */}
          {rating && rating.averageRating && rating.reviewCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{rating.averageRating}</span>
              <span className="text-xs text-muted-foreground">({rating.reviewCount})</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="price-tag">{formatPrice(displayPrice)}</span>
              {hasCustomization && (
                <span className="text-xs text-muted-foreground ml-1">onwards</span>
              )}
            </div>
            <Button
              size="sm"
              className="rounded-full w-8 h-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {showModal && (
        <ProductCustomizationModal
          product={product}
          subcategory={subcategory}
          category={category}
          isDelivery={isDelivery}
          open={showModal}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Video Player Modal */}
      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black">
          <VisuallyHidden>
            <DialogTitle>{product.name} - Video</DialogTitle>
          </VisuallyHidden>
          <button
            onClick={() => setShowVideo(false)}
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {product.videoUrl && (
            <video
              src={product.videoUrl}
              controls
              autoPlay
              className="w-full max-h-[80vh]"
            />
          )}
          <div className="p-4 bg-background">
            <h3 className="font-semibold text-lg">{product.name}</h3>
            {product.chineseName && (
              <p className="text-sm text-muted-foreground">{product.chineseName}</p>
            )}
            <Button
              className="w-full mt-3"
              onClick={() => {
                setShowVideo(false);
                setShowModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
