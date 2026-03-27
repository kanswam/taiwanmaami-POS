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

export default function AddonsTab() {
  const { data: addons, refetch } = trpc.admin.getAllAddons.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [editingAddon, setEditingAddon] = useState<any>(null);
  
  const toggleStatus = trpc.admin.toggleAddonStatus.useMutation({
    onSuccess: () => refetch(),
  });
  
  const createAddon = trpc.admin.createAddon.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreate(false);
    },
  });
  
  const updateAddon = trpc.admin.updateAddon.useMutation({
    onSuccess: () => {
      refetch();
      setEditingAddon(null);
    },
  });

  const addonTypes = [
    { value: 'boba_flavor', label: 'Boba Flavor (Popping Boba)' },
    { value: 'boba_size', label: 'Boba Size (Tapioca)' },
    { value: 'extra_boba', label: 'Extra Boba' },
    { value: 'vegan_milk', label: 'Vegan Milk' },
    { value: 'food_addon', label: 'Food Add-on' },
  ];

  const groupedAddons = addons?.reduce((acc: Record<string, any[]>, addon: any) => {
    const type = addon.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(addon);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Add-ons Management</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Add-on
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Manage all add-ons here. Toggle the switch to enable/disable an add-on (e.g., when out of stock).
      </p>

      {addonTypes.map(({ value: type, label }) => (
        <Card key={type} className="p-4">
          <h3 className="font-medium mb-3">{label}</h3>
          <div className="space-y-2">
            {groupedAddons[type]?.map((addon: any) => (
              <div key={addon.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{addon.name}</span>
                    {addon.chineseName && <span className="text-muted-foreground">({addon.chineseName})</span>}
                    {!addon.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Disabled</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {addon.fixedPrice ? (
                      <span>₹{(addon.fixedPrice / 100).toFixed(0)}</span>
                    ) : (
                      <span>
                        Regular: ₹{addon.priceRegular ? (addon.priceRegular / 100).toFixed(0) : '-'} | 
                        Large: ₹{addon.priceLarge ? (addon.priceLarge / 100).toFixed(0) : '-'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingAddon(addon)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Switch
                    checked={addon.isActive}
                    onCheckedChange={(checked) => toggleStatus.mutate({ id: addon.id, isActive: checked })}
                  />
                </div>
              </div>
            )) || <p className="text-muted-foreground text-sm">No add-ons in this category</p>}
          </div>
        </Card>
      ))}

      {/* Create Add-on Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Add-on</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createAddon.mutate({
              name: formData.get('name') as string,
              chineseName: formData.get('chineseName') as string || undefined,
              type: formData.get('type') as any,
              fixedPrice: formData.get('fixedPrice') ? parseInt(formData.get('fixedPrice') as string) * 100 : undefined,
              pricePetite: formData.get('pricePetite') ? parseInt(formData.get('pricePetite') as string) * 100 : undefined,
              priceRegular: formData.get('priceRegular') ? parseInt(formData.get('priceRegular') as string) * 100 : undefined,
              priceLarge: formData.get('priceLarge') ? parseInt(formData.get('priceLarge') as string) * 100 : undefined,
              displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
            });
          }} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Chinese Name</Label>
              <Input name="chineseName" />
            </div>
            <div>
              <Label>Type *</Label>
              <Select name="type" required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {addonTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fixed Price (₹)</Label>
                <Input name="fixedPrice" type="number" placeholder="For food add-ons" />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input name="displayOrder" type="number" defaultValue="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Regular (₹)</Label>
                <Input name="priceRegular" type="number" placeholder="0" />
              </div>
              <div>
                <Label>Large (₹)</Label>
                <Input name="priceLarge" type="number" placeholder="0" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createAddon.isPending}>
              {createAddon.isPending ? 'Creating...' : 'Create Add-on'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Add-on Dialog */}
      <Dialog open={!!editingAddon} onOpenChange={() => setEditingAddon(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Add-on</DialogTitle>
          </DialogHeader>
          {editingAddon && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateAddon.mutate({
                id: editingAddon.id,
                name: formData.get('name') as string,
                chineseName: formData.get('chineseName') as string || undefined,
                type: formData.get('type') as any,
                fixedPrice: formData.get('fixedPrice') ? parseInt(formData.get('fixedPrice') as string) * 100 : null,
                pricePetite: formData.get('pricePetite') ? parseInt(formData.get('pricePetite') as string) * 100 : null,
                priceRegular: formData.get('priceRegular') ? parseInt(formData.get('priceRegular') as string) * 100 : null,
                priceLarge: formData.get('priceLarge') ? parseInt(formData.get('priceLarge') as string) * 100 : null,
                displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
              });
            }} className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input name="name" defaultValue={editingAddon.name} required />
              </div>
              <div>
                <Label>Chinese Name</Label>
                <Input name="chineseName" defaultValue={editingAddon.chineseName || ''} />
              </div>
              <div>
                <Label>Type *</Label>
                <Select name="type" defaultValue={editingAddon.type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {addonTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fixed Price (₹)</Label>
                  <Input name="fixedPrice" type="number" defaultValue={editingAddon.fixedPrice ? editingAddon.fixedPrice / 100 : ''} />
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input name="displayOrder" type="number" defaultValue={editingAddon.displayOrder || 0} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Petite (₹)</Label>
                  <Input name="pricePetite" type="number" defaultValue={editingAddon.pricePetite ? editingAddon.pricePetite / 100 : ''} />
                </div>
                <div>
                  <Label>Regular (₹)</Label>
                  <Input name="priceRegular" type="number" defaultValue={editingAddon.priceRegular ? editingAddon.priceRegular / 100 : ''} />
                </div>
                <div>
                  <Label>Large (₹)</Label>
                  <Input name="priceLarge" type="number" defaultValue={editingAddon.priceLarge ? editingAddon.priceLarge / 100 : ''} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateAddon.isPending}>
                {updateAddon.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcategory Edit Form Component

