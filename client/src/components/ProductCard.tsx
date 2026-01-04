import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Leaf, Egg } from 'lucide-react';
import { formatPrice } from '@shared/types';
import { ProductCustomizationModal } from './ProductCustomizationModal';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    chineseName?: string | null;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    imageUrl2?: string | null;
    imageUrl3?: string | null;
    instorePrice?: number | null;
    deliveryPrice?: number | null;
    isVegetarian?: boolean;
    isVegan?: boolean;
    containsEgg?: boolean;
    isActive?: boolean;
    isInStock?: boolean;
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
    availableInstore?: boolean;
    availableDelivery?: boolean;
    availablePickup?: boolean;
  };
  isDelivery?: boolean;
  orderType?: 'instore' | 'delivery' | 'pickup';
}

export function ProductCard({ product, subcategory, category, isDelivery = false, orderType = 'instore' }: ProductCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Build array of available images
  const images = [product.imageUrl, product.imageUrl2, product.imageUrl3].filter(Boolean) as string[];
  const hasMultipleImages = images.length > 1;

  // Auto-rotate carousel every 2 seconds
  useEffect(() => {
    if (!hasMultipleImages) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [hasMultipleImages, images.length]);

  // Check availability status
  const isOutOfStock = product.isInStock === false;
  const isInactive = product.isActive === false;
  
  // Check if category is available for current order type
  const isNotAvailableForOrderType = (() => {
    if (!category) return false;
    if (orderType === 'instore' && category.availableInstore === false) return true;
    if (orderType === 'delivery' && category.availableDelivery === false) return true;
    if (orderType === 'pickup' && category.availablePickup === false) return true;
    return false;
  })();
  
  const isUnavailable = isOutOfStock || isInactive || isNotAvailableForOrderType;

  // Check if this is a mochi product (for delivery/pickup, mochis are sold as set of 2)
  const isMochiProduct = subcategory.name.toLowerCase().includes('mochi');

  // Calculate display price (base price without GST - GST added at checkout)
  const getDisplayPrice = () => {
    if (subcategory.hasSizeVariants) {
      // For drinks with size variants, show starting price (Regular with Boba for delivery, Petite with Boba for in-store)
      if (isDelivery) {
        return subcategory.deliveryPriceRegularWithBoba || subcategory.basePriceRegularWithBoba || 0;
      } else {
        return subcategory.basePricePetiteWithBoba || subcategory.basePriceRegularWithBoba || 0;
      }
    } else {
      // For fixed price items (mochis, food, etc.)
      // For mochis in delivery/pickup mode, use deliveryPrice (which is the set of 2 price)
      if (isDelivery && isMochiProduct) {
        return product.deliveryPrice || product.instorePrice || 0;
      } else if (isDelivery) {
        return product.deliveryPrice || product.instorePrice || 0;
      } else {
        return product.instorePrice || 0;
      }
    }
  };

  const displayPrice = getDisplayPrice();
  const hasCustomization = subcategory.hasSizeVariants || subcategory.hasBobaOption;

  // Default placeholder image
  const currentImage = images[currentImageIndex] || product.imageUrl || '/placeholder-drink.jpg';

  return (
    <>
      <Card 
        className={`product-card group ${isUnavailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !isUnavailable && setShowModal(true)}
      >
        {/* Image section - 60% height */}
        <div className="relative h-3/5 overflow-hidden bg-secondary">
          <img
            src={currentImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-drink.jpg';
            }}
          />
          {/* Image carousel dots */}
          {hasMultipleImages && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentImageIndex
                      ? 'bg-white scale-110 shadow-md'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`View image ${idx + 1}`}
                />
              ))}
            </div>
          )}
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
          {/* Mochi set indicator for delivery/pickup */}
          {isDelivery && isMochiProduct && !isUnavailable && (
            <div className="absolute top-2 right-2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                Set of 2
              </span>
            </div>
          )}
          {/* Out of Stock / Inactive / In-store Only overlay */}
          {isUnavailable && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className={`px-3 py-1.5 rounded-full text-sm font-bold shadow-lg ${
                isNotAvailableForOrderType
                  ? 'bg-amber-600 text-white'
                  : isInactive 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-red-600 text-white'
              }`}>
                {isNotAvailableForOrderType 
                  ? 'In-store Only' 
                  : isInactive 
                    ? 'Unavailable' 
                    : 'Out of Stock'}
              </span>
            </div>
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

          <div className="flex items-center justify-between mt-2">
            <div>
              <span className={`price-tag ${isUnavailable ? 'line-through text-muted-foreground' : ''}`}>
                {formatPrice(displayPrice)}
              </span>
              {hasCustomization && !isUnavailable && (
                <span className="text-xs text-muted-foreground ml-1">onwards</span>
              )}
            </div>
            {!isUnavailable && (
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
            )}
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
    </>
  );
}
