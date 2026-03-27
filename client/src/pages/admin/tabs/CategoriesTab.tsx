import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice, GST_RATE } from '@shared/types';
import { 
  Home, Package, ShoppingCart, Tag, Upload, LogOut, 
  Plus, Edit, Trash2, ImageIcon, RefreshCw, Check, X, Search,
  ChevronDown, ChevronUp, Eye, EyeOff, Star, MessageSquare, Reply, Printer,
  ClipboardList, RotateCcw, History, Filter, BarChart3, UtensilsCrossed, AlertCircle, DollarSign, CreditCard, Users,
  Settings, Layers, FileText, TrendingUp, Calendar, Ticket, Mail, Phone, MapPin, Clock, UserCheck, BookOpen, GitMerge, ArrowRight, AlertTriangle, Download, Bot, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCategory, SortableSubcategory } from '@/components/SortableCategory';

export default function CategoriesTab() {
  // Use admin-specific query that returns ALL categories/subcategories/products
  // regardless of availability flags (so staff toggling availability doesn't hide items from admin)
  const { data: menuData, refetch } = trpc.admin.getFullMenuAdmin.useQuery();
  const { data: allProducts } = trpc.admin.getAllProducts.useQuery();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryData, setNewSubcategoryData] = useState({ name: '', categoryId: 0 });
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null);

  const updateCategory = trpc.admin.updateCategory.useMutation({
    onSuccess: () => { 
      toast.success('Category updated'); 
      setEditingCategoryId(null); // Close dialog on success
      refetch(); 
    },
    onError: (err) => toast.error(err.message),
  });

  const createCategory = trpc.admin.createCategory.useMutation({
    onSuccess: () => { toast.success('Category created'); refetch(); setNewCategoryName(''); },
    onError: (err) => toast.error(err.message),
  });

  const deleteCategory = trpc.admin.deleteCategory.useMutation({
    onSuccess: () => { toast.success('Category deleted'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateSubcategory = trpc.admin.updateSubcategory.useMutation({
    onSuccess: (data) => { 
      console.log('[updateSubcategory] Success:', data);
      toast.success('Subcategory updated successfully'); 
      setEditingSubcategoryId(null); // Close dialog on success
      refetch(); 
    },
    onError: (err) => {
      console.error('[updateSubcategory] Error:', err);
      toast.error(err.message);
    },
  });

  const createSubcategory = trpc.admin.createSubcategory.useMutation({
    onSuccess: () => { toast.success('Subcategory created'); refetch(); setNewSubcategoryData({ name: '', categoryId: 0 }); },
    onError: (err) => toast.error(err.message),
  });

  const deleteSubcategory = trpc.admin.deleteSubcategory.useMutation({
    onSuccess: () => { toast.success('Subcategory deleted'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateCategoryOrder = trpc.admin.updateCategoryOrder.useMutation({
    onSuccess: () => { toast.success('Category order updated'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateSubcategoryOrder = trpc.admin.updateSubcategoryOrder.useMutation({
    onSuccess: () => { toast.success('Subcategory order updated'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Handle category drag end
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !menuData?.categories) return;

    const sortedCategories = [...menuData.categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const oldIndex = sortedCategories.findIndex(c => c.id === active.id);
    const newIndex = sortedCategories.findIndex(c => c.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(sortedCategories, oldIndex, newIndex);
      const newOrders = reordered.map((c, i) => ({ id: c.id, displayOrder: i + 1 }));
      updateCategoryOrder.mutate({ categoryOrders: newOrders });
    }
  };

  // Handle subcategory drag end
  const handleSubcategoryDragEnd = (categoryId: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !menuData?.subcategories) return;

    const categorySubs = menuData.subcategories.filter(s => s.categoryId === categoryId).sort((a, b) => a.displayOrder - b.displayOrder);
    const oldIndex = categorySubs.findIndex(s => s.id === active.id);
    const newIndex = categorySubs.findIndex(s => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(categorySubs, oldIndex, newIndex);
      const newOrders = reordered.map((s, i) => ({ id: s.id, displayOrder: i + 1 }));
      updateSubcategoryOrder.mutate({ subcategoryOrders: newOrders });
    }
  };

  // Move category up or down
  const moveCategoryOrder = (catId: number, direction: 'up' | 'down') => {
    if (!menuData?.categories) return;
    const sorted = [...menuData.categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex(c => c.id === catId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    // Swap display orders
    const newOrders = sorted.map((c, i) => {
      if (i === idx) return { id: c.id, displayOrder: sorted[swapIdx].displayOrder };
      if (i === swapIdx) return { id: c.id, displayOrder: sorted[idx].displayOrder };
      return { id: c.id, displayOrder: c.displayOrder };
    });
    updateCategoryOrder.mutate({ categoryOrders: newOrders });
  };

  // Move subcategory up or down within its category
  const moveSubcategoryOrder = (subId: number, categoryId: number, direction: 'up' | 'down') => {
    if (!menuData?.subcategories) return;
    const categorySubs = menuData.subcategories.filter(s => s.categoryId === categoryId).sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = categorySubs.findIndex(s => s.id === subId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === categorySubs.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    // Swap display orders
    const newOrders = categorySubs.map((s, i) => {
      if (i === idx) return { id: s.id, displayOrder: categorySubs[swapIdx].displayOrder };
      if (i === swapIdx) return { id: s.id, displayOrder: categorySubs[idx].displayOrder };
      return { id: s.id, displayOrder: s.displayOrder };
    });
    updateSubcategoryOrder.mutate({ subcategoryOrders: newOrders });
  };

  return (
    <div className="space-y-6">
      {/* Categories Section */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Categories <span className="text-xs font-normal text-muted-foreground">(drag to reorder)</span></h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
          <SortableContext items={menuData?.categories.map(c => c.id).sort((a, b) => {
            const catA = menuData?.categories.find(c => c.id === a);
            const catB = menuData?.categories.find(c => c.id === b);
            return (catA?.displayOrder || 0) - (catB?.displayOrder || 0);
          }) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {[...menuData?.categories || []].sort((a, b) => a.displayOrder - b.displayOrder).map((cat) => {
                const categoryProducts = allProducts?.filter(p => {
                  const sub = menuData?.subcategories.find(s => s.id === p.subcategoryId);
                  return sub?.categoryId === cat.id;
                }) || [];
                const isExpanded = expandedCategory === cat.id;
                return (
                  <SortableCategory key={cat.id} id={cat.id}>
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/80"
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">({categoryProducts.length} products)</span>
                      </div>
                      <div className="flex gap-2">
                  <Dialog open={editingCategoryId === cat.id} onOpenChange={(open) => setEditingCategoryId(open ? cat.id : null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingCategoryId(cat.id); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Category Image</Label>
                          <div className="mt-2 flex items-center gap-4">
                            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border overflow-hidden bg-secondary flex items-center justify-center">
                              <img 
                                src={cat.imageUrl || ''} 
                                alt="" 
                                loading="lazy"
                                decoding="async"
                                className={`w-full h-full object-cover ${!cat.imageUrl ? 'hidden' : ''}`} 
                                id={`cat-img-preview-${cat.id}`} 
                              />
                              {!cat.imageUrl && <ImageIcon className="w-8 h-8 text-muted-foreground" id={`cat-img-placeholder-${cat.id}`} />}
                            </div>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id={`cat-img-upload-${cat.id}`}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    const preview = document.getElementById(`cat-img-preview-${cat.id}`) as HTMLImageElement;
                                    const placeholder = document.getElementById(`cat-img-placeholder-${cat.id}`);
                                    if (preview) {
                                      preview.src = reader.result as string;
                                      preview.classList.remove('hidden');
                                    }
                                    if (placeholder) placeholder.classList.add('hidden');
                                    const dataInput = document.getElementById(`cat-img-data-${cat.id}`) as HTMLInputElement;
                                    if (dataInput) dataInput.value = reader.result as string;
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                              <input type="hidden" id={`cat-img-data-${cat.id}`} />
                              <label htmlFor={`cat-img-upload-${cat.id}`}>
                                <Button variant="outline" size="sm" asChild>
                                  <span className="cursor-pointer"><Upload className="w-4 h-4 mr-2" />Upload</span>
                                </Button>
                              </label>
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label>Category Name</Label>
                          <Input
                            defaultValue={cat.name}
                            id={`cat-name-${cat.id}`}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            defaultValue={cat.description || ''}
                            id={`cat-desc-${cat.id}`}
                            placeholder="Optional description"
                          />
                        </div>
                        <div className="space-y-3 p-3 bg-muted rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground">Menu Availability</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`cat-instore-${cat.id}`}
                                defaultChecked={(cat as any).availableInstore !== false}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`cat-instore-${cat.id}`} className="text-sm cursor-pointer">
                                In-store
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`cat-delivery-${cat.id}`}
                                defaultChecked={(cat as any).availableDelivery !== false}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`cat-delivery-${cat.id}`} className="text-sm cursor-pointer">
                                Delivery
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`cat-pickup-${cat.id}`}
                                defaultChecked={(cat as any).availablePickup !== false}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`cat-pickup-${cat.id}`} className="text-sm cursor-pointer">
                                Pickup
                              </Label>
                            </div>
                          </div>
                        </div>
                        <Button onClick={async () => {
                          const name = (document.getElementById(`cat-name-${cat.id}`) as HTMLInputElement).value;
                          const description = (document.getElementById(`cat-desc-${cat.id}`) as HTMLInputElement).value;
                          const imageData = (document.getElementById(`cat-img-data-${cat.id}`) as HTMLInputElement)?.value;
                          const availableInstore = (document.getElementById(`cat-instore-${cat.id}`) as HTMLInputElement)?.checked ?? true;
                          const availableDelivery = (document.getElementById(`cat-delivery-${cat.id}`) as HTMLInputElement)?.checked ?? true;
                          const availablePickup = (document.getElementById(`cat-pickup-${cat.id}`) as HTMLInputElement)?.checked ?? true;
                          updateCategory.mutate({ id: cat.id, name, description, imageBase64: imageData || undefined, availableInstore, availableDelivery, availablePickup } as any);
                        }} disabled={updateCategory.isPending}>
                          {updateCategory.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                    if (confirm('Delete this category? All subcategories must be removed first.')) {
                      deleteCategory.mutate({ id: cat.id });
                    }
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                      </div>
                    </div>
                    {isExpanded && categoryProducts.length > 0 && (
                      <div className="border-t bg-background/50 p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Products in this category:</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {categoryProducts.slice(0, 12).map(p => (
                            <div key={p.id} className="text-sm p-2 bg-background rounded border">
                              {p.name}
                            </div>
                          ))}
                          {categoryProducts.length > 12 && (
                            <div className="text-sm p-2 text-muted-foreground">+{categoryProducts.length - 12} more...</div>
                          )}
                        </div>
                      </div>
                    )}
                  </SortableCategory>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <Button onClick={() => {
            if (newCategoryName) {
              createCategory.mutate({ name: newCategoryName, slug: generateSlug(newCategoryName) });
            }
          }}>
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </Button>
        </div>
      </Card>

      {/* Subcategories Section */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Subcategories <span className="text-xs font-normal text-muted-foreground">(drag to reorder within category)</span></h3>
        <div className="space-y-4">
          {[...menuData?.categories || []].sort((a, b) => a.displayOrder - b.displayOrder).map((cat) => {
            const categorySubs = menuData?.subcategories.filter(sub => sub.categoryId === cat.id).sort((a, b) => a.displayOrder - b.displayOrder) || [];
            return (
              <div key={cat.id} className="border rounded-lg p-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">{cat.name}</h4>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubcategoryDragEnd(cat.id)}>
                  <SortableContext items={categorySubs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {categorySubs.map((sub) => {
                        const subProducts = allProducts?.filter(p => p.subcategoryId === sub.id) || [];
                        const isSubExpanded = expandedSubcategory === sub.id;
                        return (
                          <SortableSubcategory key={sub.id} id={sub.id}>
                            <div 
                              className="flex items-center justify-between p-2 cursor-pointer hover:bg-secondary/70"
                              onClick={() => setExpandedSubcategory(isSubExpanded ? null : sub.id)}
                            >
                              <div className="flex items-center gap-2">
                                <ChevronDown className={`w-3 h-3 transition-transform ${isSubExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                <span>{sub.name}</span>
                                {sub.chineseName && <span className="text-xs text-muted-foreground ml-2">{sub.chineseName}</span>}
                                <span className="text-xs text-muted-foreground">({subProducts.length})</span>
                              </div>
                              <div className="flex gap-2">
                            <Dialog open={editingSubcategoryId === sub.id} onOpenChange={(open) => setEditingSubcategoryId(open ? sub.id : null)}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingSubcategoryId(sub.id); }}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Edit Subcategory: {sub.name}</DialogTitle>
                                </DialogHeader>
                                <SubcategoryEditForm sub={sub} category={cat} updateSubcategory={updateSubcategory} onClose={() => setEditingSubcategoryId(null)} />
                              </DialogContent>
                            </Dialog>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                              if (confirm('Delete this subcategory? All products must be moved first.')) {
                                deleteSubcategory.mutate({ id: sub.id });
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                              </div>
                            </div>
                            {isSubExpanded && subProducts.length > 0 && (
                              <div className="border-t bg-background/50 p-2">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                                  {subProducts.map(p => (
                                    <div key={p.id} className="text-xs p-1.5 bg-background rounded border truncate">
                                      {p.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </SortableSubcategory>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            );
          })}
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="New subcategory name"
              value={newSubcategoryData.name}
              onChange={(e) => setNewSubcategoryData({ ...newSubcategoryData, name: e.target.value })}
              className="flex-1"
            />
            <Select
              value={newSubcategoryData.categoryId?.toString() || ''}
              onValueChange={(v) => setNewSubcategoryData({ ...newSubcategoryData, categoryId: Number(v) })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {menuData?.categories.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => {
              if (newSubcategoryData.name && newSubcategoryData.categoryId) {
                createSubcategory.mutate({
                  name: newSubcategoryData.name,
                  slug: generateSlug(newSubcategoryData.name),
                  categoryId: newSubcategoryData.categoryId,
                });
              }
            }}>
              <Plus className="w-4 h-4 mr-2" /> Add Subcategory
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Generate Tax Invoice HTML for an order

function SubcategoryEditForm({ sub, category, updateSubcategory, onClose }: { sub: any; category?: any; updateSubcategory: any; onClose?: () => void }) {
  // Determine if this subcategory has size/boba variants based on its own flags, not category name
  // Hot beverages like Tea in Pot have hasSizeVariants=false even though they're in a beverage category
  const hasSizeVariants = sub.hasSizeVariants !== false;
  const hasBobaOption = sub.hasBobaOption !== false;
  const showBeveragePricing = hasSizeVariants; // Only show beverage pricing if subcategory has size variants
  const [imagePreview, setImagePreview] = useState<string | null>(sub.imageUrl || null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [name, setName] = useState(sub.name);
  const [chineseName, setChineseName] = useState(sub.chineseName || '');
  const [description, setDescription] = useState(sub.description || '');
  const [basePricePetiteWithBoba, setBasePricePetiteWithBoba] = useState((sub.basePricePetiteWithBoba || 0) / 100);
  const [basePriceRegularWithBoba, setBasePriceRegularWithBoba] = useState((sub.basePriceRegularWithBoba || 0) / 100);
  const [basePriceLargeWithBoba, setBasePriceLargeWithBoba] = useState((sub.basePriceLargeWithBoba || 0) / 100);
  const [basePricePetiteNoBoba, setBasePricePetiteNoBoba] = useState((sub.basePricePetiteNoBoba || 0) / 100);
  const [basePriceRegularNoBoba, setBasePriceRegularNoBoba] = useState((sub.basePriceRegularNoBoba || 0) / 100);
  const [basePriceLargeNoBoba, setBasePriceLargeNoBoba] = useState((sub.basePriceLargeNoBoba || 0) / 100);
  const [deliveryPriceRegularWithBoba, setDeliveryPriceRegularWithBoba] = useState((sub.deliveryPriceRegularWithBoba || 0) / 100);
  const [deliveryPriceLargeWithBoba, setDeliveryPriceLargeWithBoba] = useState((sub.deliveryPriceLargeWithBoba || 0) / 100);
  const [deliveryPriceRegularNoBoba, setDeliveryPriceRegularNoBoba] = useState((sub.deliveryPriceRegularNoBoba || 0) / 100);
  const [deliveryPriceLargeNoBoba, setDeliveryPriceLargeNoBoba] = useState((sub.deliveryPriceLargeNoBoba || 0) / 100);
  const [syncPrices, setSyncPrices] = useState(false);
  const [availableInstore, setAvailableInstore] = useState(sub.availableInstore !== false);
  const [availableDelivery, setAvailableDelivery] = useState(sub.availableDelivery !== false);
  const [availablePickup, setAvailablePickup] = useState(sub.availablePickup !== false);
  const [availableAtPalladium, setAvailableAtPalladium] = useState((sub as any).availableAtPalladium !== false);
  const [availableAtTnagar, setAvailableAtTnagar] = useState((sub as any).availableAtTnagar !== false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageData(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateSubcategory.mutate({
      id: sub.id,
      name,
      chineseName: chineseName || null,
      description: description || null,
      imageData,
      basePricePetiteWithBoba: Math.round(basePricePetiteWithBoba * 100),
      basePriceRegularWithBoba: Math.round(basePriceRegularWithBoba * 100),
      basePriceLargeWithBoba: Math.round(basePriceLargeWithBoba * 100),
      basePricePetiteNoBoba: Math.round(basePricePetiteNoBoba * 100),
      basePriceRegularNoBoba: Math.round(basePriceRegularNoBoba * 100),
      basePriceLargeNoBoba: Math.round(basePriceLargeNoBoba * 100),
      deliveryPriceRegularWithBoba: Math.round(deliveryPriceRegularWithBoba * 100),
      deliveryPriceLargeWithBoba: Math.round(deliveryPriceLargeWithBoba * 100),
      deliveryPriceRegularNoBoba: Math.round(deliveryPriceRegularNoBoba * 100),
      deliveryPriceLargeNoBoba: Math.round(deliveryPriceLargeNoBoba * 100),
      syncProductPrices: syncPrices,
      availableInstore,
      availableDelivery,
      availablePickup,
      availableAtPalladium,
      availableAtTnagar,
    } as any);
  };

  return (
    <div className="space-y-4">
      {/* Subcategory Image Upload */}
      <div>
        <Label>Subcategory Image</Label>
        <div className="flex items-center gap-4 mt-2">
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted">
            {imagePreview ? (
              <img src={imagePreview} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id={`sub-img-upload-form-${sub.id}`}
              onChange={handleImageUpload}
            />
            <label htmlFor={`sub-img-upload-form-${sub.id}`}>
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer"><Upload className="w-4 h-4 mr-2" />Upload Image</span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-1">Recommended: 400x300px</p>
          </div>
        </div>
      </div>
      
      {/* Availability Toggles */}
      <div className="p-3 bg-secondary rounded-lg">
        <Label className="text-sm font-medium mb-2 block">Availability</Label>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`sub-avail-instore-${sub.id}`}
              checked={availableInstore}
              onChange={(e) => setAvailableInstore(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor={`sub-avail-instore-${sub.id}`} className="text-sm cursor-pointer">In-store</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`sub-avail-delivery-${sub.id}`}
              checked={availableDelivery}
              onChange={(e) => setAvailableDelivery(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor={`sub-avail-delivery-${sub.id}`} className="text-sm cursor-pointer">Delivery</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`sub-avail-pickup-${sub.id}`}
              checked={availablePickup}
              onChange={(e) => setAvailablePickup(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor={`sub-avail-pickup-${sub.id}`} className="text-sm cursor-pointer">Pickup</Label>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-muted-foreground/20">
          <Label className="text-xs text-muted-foreground mb-2 block">Outlet Availability</Label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`sub-avail-palladium-${sub.id}`}
                checked={availableAtPalladium}
                onChange={(e) => setAvailableAtPalladium(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor={`sub-avail-palladium-${sub.id}`} className="text-sm cursor-pointer">Palladium</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`sub-avail-tnagar-${sub.id}`}
                checked={availableAtTnagar}
                onChange={(e) => setAvailableAtTnagar(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor={`sub-avail-tnagar-${sub.id}`} className="text-sm cursor-pointer">T Nagar</Label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Subcategory Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Chinese Name (Optional)</Label>
          <Input value={chineseName} onChange={(e) => setChineseName(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Description (Optional)</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {/* Only show size/boba pricing for subcategories with size variants */}
      {showBeveragePricing && (
        <>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">In-Store Base Pricing (₹)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Regular + Boba</Label>
                <Input type="number" step="0.01" value={basePriceRegularWithBoba} onChange={(e) => setBasePriceRegularWithBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Large + Boba</Label>
                <Input type="number" step="0.01" value={basePriceLargeWithBoba} onChange={(e) => setBasePriceLargeWithBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Regular No Boba</Label>
                <Input type="number" step="0.01" value={basePriceRegularNoBoba} onChange={(e) => setBasePriceRegularNoBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Large No Boba</Label>
                <Input type="number" step="0.01" value={basePriceLargeNoBoba} onChange={(e) => setBasePriceLargeNoBoba(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Delivery Base Pricing (₹)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Regular + Boba</Label>
                <Input type="number" step="0.01" value={deliveryPriceRegularWithBoba} onChange={(e) => setDeliveryPriceRegularWithBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Large + Boba</Label>
                <Input type="number" step="0.01" value={deliveryPriceLargeWithBoba} onChange={(e) => setDeliveryPriceLargeWithBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Regular No Boba</Label>
                <Input type="number" step="0.01" value={deliveryPriceRegularNoBoba} onChange={(e) => setDeliveryPriceRegularNoBoba(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Large No Boba</Label>
                <Input type="number" step="0.01" value={deliveryPriceLargeNoBoba} onChange={(e) => setDeliveryPriceLargeNoBoba(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <input type="checkbox" checked={syncPrices} onChange={(e) => setSyncPrices(e.target.checked)} className="w-4 h-4" />
            <Label className="text-sm cursor-pointer">
              <span className="font-medium">Sync prices to products</span>
              <span className="text-muted-foreground block text-xs">Update all products using base pricing in this subcategory</span>
            </Label>
          </div>
        </>
      )}
      
      {/* For subcategories without size variants, show a simple note */}
      {!showBeveragePricing && (
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground">This category uses fixed product pricing. Edit individual products to set prices.</p>
        </div>
      )}
      <Button onClick={handleSave} disabled={updateSubcategory.isPending}>
        {updateSubcategory.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}

// Discounts Tab

