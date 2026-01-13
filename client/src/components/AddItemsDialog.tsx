import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductCustomizationModal } from '@/components/ProductCustomizationModal';
import { formatPrice } from '@shared/types';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';

interface AddItemsDialogProps {
  open: boolean;
  order: any;
  products: any[];
  onClose: () => void;
  onAddItem: (orderId: number, items: any[]) => Promise<void>;
}

export function AddItemsDialog({ open, order, products, onClose, onAddItem }: AddItemsDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showCustomization, setShowCustomization] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.chineseName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleClose = () => {
    setSearch('');
    setSelectedProduct(null);
    setShowCustomization(false);
    onClose();
  };

  const handleAddToCart = async (cartItem: any) => {
    try {
      await onAddItem(order.id, [cartItem]);
      toast.success('Item added to order');
      handleClose();
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setShowCustomization(true);
  };

  return (
    <>
      <Dialog open={open && !showCustomization} onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}>
        <DialogContent className="sm:max-w-md max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Items to Order</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Order #{order?.orderNumber} - Table {order?.tableNumber}
            </p>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
              ) : (
                filteredProducts.map(product => (
                  <Button
                    key={product.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowCustomization(true);
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      {product.chineseName && (
                        <p className="text-xs text-muted-foreground">{product.chineseName}</p>
                      )}
                      <p className="text-sm font-semibold mt-1">{formatPrice(product.price)}</p>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showCustomization && selectedProduct && (
        <ProductCustomizationModal
          product={selectedProduct}
          subcategory={selectedProduct.subcategoryId}
          category={selectedProduct.categoryId}
          open={showCustomization}
          onClose={() => {
            setShowCustomization(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </>
  );
}
