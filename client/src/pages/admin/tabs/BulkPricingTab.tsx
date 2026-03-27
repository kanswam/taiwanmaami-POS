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

export default function BulkPricingTab() {
  const [scope, setScope] = useState<'all' | 'category' | 'subcategory'>('all');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>();
  const [priceType, setPriceType] = useState<'instore' | 'delivery' | 'both'>('both');
  const [updateMethod, setUpdateMethod] = useState<'percentage_increase' | 'percentage_decrease' | 'fixed_increase' | 'fixed_decrease'>('percentage_increase');
  const [value, setValue] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  
  const { data: categories } = trpc.menu.getCategories.useQuery();
  const { data: subcategoriesData } = trpc.menu.getSubcategories.useQuery();
  const utils = trpc.useUtils();
  
  const { data: preview, isLoading: previewLoading, refetch: refetchPreview } = trpc.admin.bulkPricePreview.useQuery(
    {
      scope,
      categoryId,
      subcategoryId,
      priceType,
      updateMethod,
      value: updateMethod.includes('fixed') ? value * 100 : value, // Convert to paise for fixed amounts
    },
    { enabled: showPreview && value > 0 }
  );
  
  const updateMutation = trpc.admin.bulkPriceUpdate.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully updated ${data.updatedCount} products`);
      setShowPreview(false);
      setValue(0);
      utils.menu.getProducts.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update prices: ${error.message}`);
    },
  });
  
  const handlePreview = () => {
    if (value <= 0) {
      toast.error('Please enter a value greater than 0');
      return;
    }
    setShowPreview(true);
    refetchPreview();
  };
  
  const handleApply = () => {
    if (!preview?.products) return;
    
    const updates = preview.products.map((p: { id: number; type?: string; newInstorePrice: number | null; newDeliveryPrice: number | null }) => ({
      id: p.id,
      type: (p.type || 'product') as 'product' | 'subcategory',
      instorePrice: p.newInstorePrice,
      deliveryPrice: p.newDeliveryPrice,
    }));
    
    updateMutation.mutate({ 
      updates, 
      priceType,
      updateMethod,
      value: updateMethod.includes('fixed') ? value * 100 : value,
    });
  };
  
  const filteredSubcategories = subcategoriesData?.filter(s => !categoryId || s.categoryId === categoryId) || [];
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Bulk Price Update</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Scope Selection */}
          <div>
            <Label className="mb-2 block">Scope</Label>
            <Select value={scope} onValueChange={(v: 'all' | 'category' | 'subcategory') => {
              setScope(v);
              setShowPreview(false);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="category">By Category</SelectItem>
                <SelectItem value="subcategory">By Subcategory</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Category Selection */}
          {(scope === 'category' || scope === 'subcategory') && (
            <div>
              <Label className="mb-2 block">Category</Label>
              <Select value={categoryId?.toString() || ''} onValueChange={(v) => {
                setCategoryId(v ? Number(v) : undefined);
                setSubcategoryId(undefined);
                setShowPreview(false);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Subcategory Selection */}
          {scope === 'subcategory' && categoryId && (
            <div>
              <Label className="mb-2 block">Subcategory</Label>
              <Select value={subcategoryId?.toString() || ''} onValueChange={(v) => {
                setSubcategoryId(v ? Number(v) : undefined);
                setShowPreview(false);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Price Type */}
          <div>
            <Label className="mb-2 block">Price Type</Label>
            <Select value={priceType} onValueChange={(v: 'instore' | 'delivery' | 'both') => {
              setPriceType(v);
              setShowPreview(false);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select price type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both Prices</SelectItem>
                <SelectItem value="instore">In-Store Only</SelectItem>
                <SelectItem value="delivery">Delivery Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Update Method */}
          <div>
            <Label className="mb-2 block">Update Method</Label>
            <Select value={updateMethod} onValueChange={(v: 'percentage_increase' | 'percentage_decrease' | 'fixed_increase' | 'fixed_decrease') => {
              setUpdateMethod(v);
              setShowPreview(false);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage_increase">Increase by %</SelectItem>
                <SelectItem value="percentage_decrease">Decrease by %</SelectItem>
                <SelectItem value="fixed_increase">Increase by ₹</SelectItem>
                <SelectItem value="fixed_decrease">Decrease by ₹</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Value Input */}
          <div>
            <Label className="mb-2 block">
              {updateMethod.includes('percentage') ? 'Percentage' : 'Amount (₹)'}
            </Label>
            <Input
              type="number"
              min="0"
              step={updateMethod.includes('percentage') ? '0.5' : '5'}
              value={value}
              onChange={(e) => {
                setValue(Number(e.target.value));
                setShowPreview(false);
              }}
              placeholder={updateMethod.includes('percentage') ? 'e.g., 10 for 10%' : 'e.g., 50 for ₹50'}
            />
          </div>
        </div>
        
        <div className="flex gap-4">
          <Button onClick={handlePreview} disabled={value <= 0 || previewLoading}>
            {previewLoading ? 'Loading...' : 'Preview Changes'}
          </Button>
          {showPreview && preview && preview.products.length > 0 && (
            <Button 
              onClick={handleApply} 
              disabled={updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateMutation.isPending ? 'Applying...' : `Apply to ${preview.totalCount} Products`}
            </Button>
          )}
        </div>
      </Card>
      
      {/* Preview Table */}
      {showPreview && preview && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Preview ({preview.totalCount} products)</h3>
          {preview.products.length === 0 ? (
            <p className="text-muted-foreground">No products match the selected criteria</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Product</th>
                    <th className="text-right py-2 px-3">Old In-Store</th>
                    <th className="text-right py-2 px-3">New In-Store</th>
                    <th className="text-right py-2 px-3">Old Delivery</th>
                    <th className="text-right py-2 px-3">New Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.products.slice(0, 50).map(p => (
                    <tr key={p.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">{p.name}</td>
                      <td className="text-right py-2 px-3">
                        {p.oldInstorePrice ? formatPrice(p.oldInstorePrice) : '-'}
                      </td>
                      <td className="text-right py-2 px-3 font-medium">
                        {p.newInstorePrice ? (
                          <span className={p.newInstorePrice !== p.oldInstorePrice ? 'text-green-600' : ''}>
                            {formatPrice(p.newInstorePrice)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="text-right py-2 px-3">
                        {p.oldDeliveryPrice ? formatPrice(p.oldDeliveryPrice) : '-'}
                      </td>
                      <td className="text-right py-2 px-3 font-medium">
                        {p.newDeliveryPrice ? (
                          <span className={p.newDeliveryPrice !== p.oldDeliveryPrice ? 'text-green-600' : ''}>
                            {formatPrice(p.newDeliveryPrice)}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.products.length > 50 && (
                <p className="text-sm text-muted-foreground mt-2">Showing first 50 of {preview.products.length} products</p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// KOT Reports Tab Component

