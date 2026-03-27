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

export default function DiscountsTab() {
  const { data: discounts, refetch } = trpc.admin.getAllDiscounts.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  
  const deleteDiscount = trpc.admin.deleteDiscount.useMutation({
    onSuccess: () => {
      toast.success('Discount deleted');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Discount Codes</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Discount
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Code</th>
                <th className="text-left p-3 text-sm font-medium">Type</th>
                <th className="text-right p-3 text-sm font-medium">Value</th>
                <th className="text-right p-3 text-sm font-medium">Min Order</th>
                <th className="text-center p-3 text-sm font-medium">Usage</th>
                <th className="text-center p-3 text-sm font-medium">Active</th>
                <th className="text-center p-3 text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {discounts?.map((discount: any) => (
                <tr key={discount.id} className="border-b hover:bg-secondary/50">
                  <td className="p-3 font-mono font-medium">{discount.code}</td>
                  <td className="p-3 capitalize">{discount.type}</td>
                  <td className="p-3 text-right">
                    {discount.type === 'percentage' ? `${discount.value}%` : formatPrice(discount.value)}
                  </td>
                  <td className="p-3 text-right">
                    {discount.minOrderAmount ? formatPrice(discount.minOrderAmount) : '-'}
                  </td>
                  <td className="p-3 text-center">
                    {discount.usageCount} / {discount.usageLimit || '∞'}
                  </td>
                  <td className="p-3 text-center">
                    {discount.isActive ? (
                      <Check className="w-4 h-4 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-red-600 mx-auto" />
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Delete discount code "${discount.code}"?`)) {
                          deleteDiscount.mutate({ id: discount.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateDiscountDialog open={showCreate} onClose={() => setShowCreate(false)} onSuccess={refetch} />
    </div>
  );
}

// Create Discount Dialog

function CreateDiscountDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed_amount',
    value: 10,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
  });

  const createDiscount = trpc.admin.createDiscount.useMutation({
    onSuccess: () => {
      toast.success('Discount created');
      onClose();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    createDiscount.mutate({
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: formData.value,
      minOrderAmount: formData.minOrderAmount || undefined,
      maxDiscountAmount: formData.maxDiscountAmount || undefined,
      usageLimit: formData.usageLimit || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Discount Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Code</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="SAVE10"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Value ({formData.type === 'percentage' ? '%' : '₹'})</Label>
            <Input
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Minimum Order Amount (paise, 0 = no minimum)</Label>
            <Input
              type="number"
              value={formData.minOrderAmount}
              onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Usage Limit (0 = unlimited)</Label>
            <Input
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createDiscount.isPending}>
            {createDiscount.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Bulk Upload Tab

