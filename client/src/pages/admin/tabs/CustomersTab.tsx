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

export default function CustomersTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const { data: customersData, refetch } = trpc.customers.getAll.useQuery({
    search: debouncedSearch || undefined,
    limit: 500, // Increase limit to show more customers
  });
  const [typeFilter, setTypeFilter] = useState<'all' | 'registered' | 'guest'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [editingCustomer, setEditingCustomer] = useState<{ id: number; name: string; phone: string; email: string; storeCredit: number; notes: string } | null>(null);
  const [sortColumn, setSortColumn] = useState<'name' | 'totalOrders' | 'totalSpent' | 'stampCount' | 'rewards' | 'lastOrderDate'>('totalSpent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAddStampsDialog, setShowAddStampsDialog] = useState(false);
  const [stampCustomer, setStampCustomer] = useState<{ id: number; name: string; currentStamps: number } | null>(null);
  const [stampsToAdd, setStampsToAdd] = useState(1);
  const [stampReason, setStampReason] = useState('Physical loyalty card transfer');
  const [stampMode, setStampMode] = useState<'add' | 'deduct'>('add');

  // Account Merge state
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeStep, setMergeStep] = useState<'select' | 'preview' | 'confirm'>('select');
const [mergeSource, setMergeSource] = useState<{ id: number | string; name: string } | null>(null);
   const [mergeTarget, setMergeTarget] = useState<{ id: number | string; name: string } | null>(null);
  const [mergeSearchSource, setMergeSearchSource] = useState('');
  const [mergeSearchTarget, setMergeSearchTarget] = useState('');
  const [debouncedMergeSource, setDebouncedMergeSource] = useState('');
  const [debouncedMergeTarget, setDebouncedMergeTarget] = useState('');

  // Debounce merge search terms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMergeSource(mergeSearchSource), 300);
    return () => clearTimeout(timer);
  }, [mergeSearchSource]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMergeTarget(mergeSearchTarget), 300);
    return () => clearTimeout(timer);
  }, [mergeSearchTarget]);

  // Independent search queries for merge dialog
  const mergeSourceResults = trpc.customers.getAll.useQuery(
    { search: debouncedMergeSource, limit: 20 },
    { enabled: debouncedMergeSource.length >= 2 && showMergeDialog && !mergeSource }
  );
  const mergeTargetResults = trpc.customers.getAll.useQuery(
    { search: debouncedMergeTarget, limit: 20 },
    { enabled: debouncedMergeTarget.length >= 2 && showMergeDialog && !mergeTarget }
  );

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortableHeader = ({ column, children, align = 'left' }: { column: typeof sortColumn; children: React.ReactNode; align?: 'left' | 'right' | 'center' }) => (
    <th 
      className={`text-${align} p-3 text-sm font-medium cursor-pointer hover:bg-secondary/80 select-none`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {children}
        {sortColumn === column && (
          <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success('Customer added successfully');
      setShowAddDialog(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateCustomer = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success('Customer updated successfully');
      setShowEditDialog(false);
      setEditingCustomer(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const addStamps = (trpc.customers as any).addStamps?.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message);
      setShowAddStampsDialog(false);
      setStampCustomer(null);
      setStampsToAdd(1);
      setStampReason('Physical loyalty card transfer');
      setStampMode('add');
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add stamps'),
  });

  const adjustStamps = (trpc.customers as any).adjustStamps?.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message);
      setShowAddStampsDialog(false);
      setStampCustomer(null);
      setStampsToAdd(1);
      setStampReason('Physical loyalty card transfer');
      setStampMode('add');
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to adjust stamps'),
  });

  // Merge preview query
  const mergePreview = (trpc.customers as any).previewMerge?.useQuery(
    { sourceId: mergeSource?.id || 0, targetId: mergeTarget?.id || 0 },
    { enabled: !!mergeSource && !!mergeTarget && mergeStep === 'preview' }
  );

  // Merge execution mutation
  const executeMerge = (trpc.customers as any).executeMerge?.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || 'Accounts merged successfully');
      setShowMergeDialog(false);
      resetMergeState();
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to merge accounts'),
  });

  const resetMergeState = () => {
    setMergeStep('select');
    setMergeSource(null);
    setMergeTarget(null);
    setMergeSearchSource('');
    setMergeSearchTarget('');
  };

  const filteredCustomers = (customersData?.customers?.filter(customer => {
    const matchesSearch = !searchTerm || 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || customer.type === typeFilter;
    return matchesSearch && matchesType;
  }) || []).sort((a, b) => {
    let aVal: any, bVal: any;
    switch (sortColumn) {
      case 'name':
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        break;
      case 'totalOrders':
        aVal = a.totalOrders || 0;
        bVal = b.totalOrders || 0;
        break;
      case 'totalSpent':
        aVal = a.totalSpent || 0;
        bVal = b.totalSpent || 0;
        break;
      case 'stampCount':
        aVal = a.stampCount || 0;
        bVal = b.stampCount || 0;
        break;
      case 'rewards':
        aVal = a.unredeemedRewards || 0;
        bVal = b.unredeemedRewards || 0;
        break;
      case 'lastOrderDate':
        aVal = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
        bVal = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Customer Database</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            const link = document.createElement('a');
            link.href = '/api/export/customer-database';
            link.download = 'customer-database.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => { resetMergeState(); setShowMergeDialog(true); }}>
            <GitMerge className="w-4 h-4 mr-2" />
            Merge Accounts
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="guest">Guests</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <SortableHeader column="name" align="left">Name</SortableHeader>
                <th className="text-left p-3 text-sm font-medium">Phone</th>
                <th className="text-left p-3 text-sm font-medium">Email</th>
                <th className="text-center p-3 text-sm font-medium">Type</th>
                <SortableHeader column="totalOrders" align="right">Orders</SortableHeader>
                <SortableHeader column="totalSpent" align="right">Total Spent</SortableHeader>
                <th className="text-right p-3 text-sm font-medium">Store Credit</th>
                <SortableHeader column="stampCount" align="center">Stamps</SortableHeader>
                <SortableHeader column="rewards" align="center">Rewards</SortableHeader>
                <SortableHeader column="lastOrderDate" align="left">Last Order</SortableHeader>
                <th className="text-center p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer: any) => (
                <tr key={customer.id} className="border-b hover:bg-secondary/50">
                  <td className="p-3 font-medium">{customer.name || 'N/A'}</td>
                  <td className="p-3">{customer.phone || 'N/A'}</td>
                  <td className="p-3">{customer.email || 'N/A'}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${customer.type === 'registered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {customer.type === 'registered' ? 'Registered' : 'Guest'}
                    </span>
                  </td>
                  <td className="p-3 text-right">{customer.totalOrders}</td>
                  <td className="p-3 text-right">{formatPrice(customer.totalSpent)}</td>
                  <td className="p-3 text-right">{formatPrice(customer.storeCredit)}</td>
                  <td className="p-3 text-center">
                    {customer.type === 'registered' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        ⭐ {customer.stampCount || 0}/10
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {(customer.rewardDetails?.length || 0) > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold cursor-help ${customer.unredeemedRewards > 0 ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                            🎁 {customer.unredeemedRewards > 0 ? customer.unredeemedRewards : '0'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-2">
                            {customer.unredeemedRewards > 0 && (
                              <div>
                                <p className="font-semibold text-green-700 mb-1">✅ Available ({customer.unredeemedRewards}):</p>
                                {customer.rewardDetails?.filter((r: any) => !r.isRedeemed && new Date(r.expiresAt) > new Date()).map((r: any, i: number) => (
                                  <div key={i} className="text-xs mb-1 pl-2 border-l-2 border-green-400">
                                    <p>🧂 Free Large Bubble Tea</p>
                                    <p className="text-muted-foreground">Code: {r.voucherCode}</p>
                                    <p className="text-muted-foreground">Expires: {new Date(r.expiresAt).toLocaleDateString()}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {customer.rewardDetails?.some((r: any) => r.isRedeemed) && (
                              <div>
                                <p className="font-semibold text-gray-500 mb-1">🌟 Redeemed:</p>
                                {customer.rewardDetails?.filter((r: any) => r.isRedeemed).map((r: any, i: number) => (
                                  <div key={i} className="text-xs mb-1 pl-2 border-l-2 border-gray-300">
                                    <p className="line-through opacity-70">🧂 Free Large Bubble Tea</p>
                                    <p className="text-muted-foreground">Code: {r.voucherCode}</p>
                                    <p className="text-muted-foreground">Redeemed: {r.redeemedAt ? new Date(r.redeemedAt).toLocaleDateString() : 'N/A'}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {customer.rewardDetails?.some((r: any) => !r.isRedeemed && new Date(r.expiresAt) <= new Date()) && (
                              <div>
                                <p className="font-semibold text-red-500 mb-1">❌ Expired:</p>
                                {customer.rewardDetails?.filter((r: any) => !r.isRedeemed && new Date(r.expiresAt) <= new Date()).map((r: any, i: number) => (
                                  <div key={i} className="text-xs mb-1 pl-2 border-l-2 border-red-300">
                                    <p className="line-through opacity-70">🧂 Free Large Bubble Tea</p>
                                    <p className="text-muted-foreground">Code: {r.voucherCode}</p>
                                    <p className="text-muted-foreground">Expired: {new Date(r.expiresAt).toLocaleDateString()}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    {customer.lastOrderDate 
                      ? new Date(customer.lastOrderDate).toLocaleDateString()
                      : 'N/A'
                    }
                  </td>
                  <td className="p-3 text-center">
                    {customer.type === 'registered' && (
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setStampCustomer({
                                  id: customer.id,
                                  name: customer.name || 'Customer',
                                  currentStamps: customer.stampCount || 0,
                                });
                                setShowAddStampsDialog(true);
                              }}
                            >
                              <Star className="w-4 h-4 text-amber-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add Stamps</TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCustomer({
                              id: customer.id,
                              name: customer.name || '',
                              phone: customer.phone || '',
                              email: customer.email || '',
                              storeCredit: customer.storeCredit || 0,
                              notes: customer.notes || '',
                            });
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground">
        Showing {filteredCustomers.length} of {customersData?.total || 0} customers
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="10-digit phone number"
              />
            </div>
            <div>
              <Label>Email (Optional)</Label>
              <Input
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="customer@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              disabled={!newCustomer.name.trim() || !newCustomer.phone.trim()}
              onClick={() => createCustomer.mutate(newCustomer)}
            >
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) setEditingCustomer(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={editingCustomer.phone}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  placeholder="10-digit phone number"
                />
              </div>
              <div>
                <Label>Email (Optional)</Label>
                <Input
                  value={editingCustomer.email}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  placeholder="customer@email.com"
                />
              </div>
              <div>
                <Label>Store Credit (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editingCustomer.storeCredit}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, storeCredit: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">Adjust store credit balance for this customer</p>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editingCustomer.notes}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  placeholder="Special preferences, delivery instructions, etc."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingCustomer(null);
            }}>Cancel</Button>
            <Button
              disabled={!editingCustomer?.name.trim() || !editingCustomer?.phone.trim() || updateCustomer.isPending}
              onClick={() => {
                if (editingCustomer) {
                  updateCustomer.mutate({
                    id: editingCustomer.id,
                    name: editingCustomer.name,
                    phone: editingCustomer.phone,
                    email: editingCustomer.email || undefined,
                    storeCredit: editingCustomer.storeCredit,
                    notes: editingCustomer.notes || undefined,
                  });
                }
              }}
            >
              {updateCustomer.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Accounts Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={(open) => {
        setShowMergeDialog(open);
        if (!open) resetMergeState();
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="w-5 h-5" />
              Merge Customer Accounts
            </DialogTitle>
          </DialogHeader>

          {mergeStep === 'select' && (
            <div className="space-y-6 py-4">
              <p className="text-sm text-muted-foreground">
                Select two customer accounts to merge. The <strong>source</strong> account's data (stamps, orders, credits) will be transferred to the <strong>target</strong> account. The source account will be deactivated after the merge.
              </p>

              {/* Source Account Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold text-red-700">Source Account (will be deactivated)</Label>
                <p className="text-xs text-muted-foreground">This is the old/duplicate account that will be merged and deactivated.</p>
                {mergeSource ? (
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <p className="font-medium">{mergeSource.name}</p>
                      <p className="text-sm text-muted-foreground">ID: #{mergeSource.id}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setMergeSource(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Search by name, phone, or email..."
                      value={mergeSearchSource}
                      onChange={(e) => setMergeSearchSource(e.target.value)}
                    />
                    {mergeSearchSource.length >= 2 && (
                      <div className="max-h-40 overflow-y-auto border rounded-lg">
                        {mergeSourceResults.isLoading && <p className="p-2 text-sm text-muted-foreground">Searching...</p>}
                        {(mergeSourceResults.data?.customers || []).filter((c: any) =>
                          c.id !== mergeTarget?.id
                        ).map((c: any) => (
                          <div
                            key={c.id}
                            className="p-2 hover:bg-secondary cursor-pointer border-b last:border-b-0"
                            onClick={() => { setMergeSource({ id: c.id, name: c.name || c.phone || 'Unknown' }); setMergeSearchSource(''); }}
                          >
                            <p className="font-medium text-sm">{c.name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.phone || 'No phone'} | {c.email || 'No email'} | Stamps: {c.stampCount || 0} | Orders: {c.totalOrders}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {mergeSource && (
                <div className="flex justify-center">
                  <ArrowRight className="w-6 h-6 text-muted-foreground" />
                </div>
              )}

              {/* Target Account Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold text-green-700">Target Account (will be kept)</Label>
                <p className="text-xs text-muted-foreground">This is the primary account that will receive all data from the source.</p>
                {mergeTarget ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="font-medium">{mergeTarget.name}</p>
                      <p className="text-sm text-muted-foreground">ID: #{mergeTarget.id}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setMergeTarget(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Search by name, phone, or email..."
                      value={mergeSearchTarget}
                      onChange={(e) => setMergeSearchTarget(e.target.value)}
                    />
                    {mergeSearchTarget.length >= 2 && (
                      <div className="max-h-40 overflow-y-auto border rounded-lg">
                        {mergeTargetResults.isLoading && <p className="p-2 text-sm text-muted-foreground">Searching...</p>}
                        {(mergeTargetResults.data?.customers || []).filter((c: any) =>
                          c.id !== mergeSource?.id
                        ).map((c: any) => (
                          <div
                            key={c.id}
                            className="p-2 hover:bg-secondary cursor-pointer border-b last:border-b-0"
                            onClick={() => { setMergeTarget({ id: c.id, name: c.name || c.phone || 'Unknown' }); setMergeSearchTarget(''); }}
                          >
                            <p className="font-medium text-sm">{c.name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.phone || 'No phone'} | {c.email || 'No email'} | Stamps: {c.stampCount || 0} | Orders: {c.totalOrders}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {mergeStep === 'preview' && mergePreview?.data && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Source Card */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-700 mb-2">Source (Deactivating)</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {mergePreview.data.source.name || 'N/A'}</p>
                    <p><strong>Phone:</strong> {mergePreview.data.source.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> {mergePreview.data.source.email || 'N/A'}</p>
                    <p><strong>Login:</strong> {mergePreview.data.source.loginMethod || 'N/A'}</p>
                    <p><strong>Stamps:</strong> {mergePreview.data.source.stampCount}/10</p>
                    <p><strong>Store Credit:</strong> {formatPrice(mergePreview.data.source.storeCredit)}</p>
                    <p><strong>Orders:</strong> {mergePreview.data.source.orderCount}</p>
                  </div>
                </div>

                {/* Target Card */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-700 mb-2">Target (Keeping)</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {mergePreview.data.target.name || 'N/A'}</p>
                    <p><strong>Phone:</strong> {mergePreview.data.target.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> {mergePreview.data.target.email || 'N/A'}</p>
                    <p><strong>Login:</strong> {mergePreview.data.target.loginMethod || 'N/A'}</p>
                    <p><strong>Stamps:</strong> {mergePreview.data.target.stampCount}/10</p>
                    <p><strong>Store Credit:</strong> {formatPrice(mergePreview.data.target.storeCredit)}</p>
                    <p><strong>Orders:</strong> {mergePreview.data.target.orderCount}</p>
                  </div>
                </div>
              </div>

              {/* Merge Result Preview */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-700 mb-2">After Merge (Target Account)</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><strong>Stamps:</strong> {mergePreview.data.mergePreview.stampCountAfterMerge}/10</p>
                  <p><strong>Store Credit:</strong> {formatPrice(mergePreview.data.mergePreview.storeCreditAfterMerge)}</p>
                  <p><strong>Total Orders:</strong> {mergePreview.data.mergePreview.totalOrdersAfterMerge}</p>
                  <p><strong>Loyalty Points:</strong> {mergePreview.data.mergePreview.loyaltyPointsAfterMerge}</p>
                </div>
              </div>

              {/* Records to Transfer */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-semibold text-amber-700 mb-2">Records to Transfer</h4>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <p>Orders: {mergePreview.data.mergePreview.recordsToTransfer.orders}</p>
                  <p>Addresses: {mergePreview.data.mergePreview.recordsToTransfer.addresses}</p>
                  <p>Stamp Transactions: {mergePreview.data.mergePreview.recordsToTransfer.stampTransactions}</p>
                  <p>Loyalty Transactions: {mergePreview.data.mergePreview.recordsToTransfer.loyaltyTransactions}</p>
                  <p>Rewards: {mergePreview.data.mergePreview.recordsToTransfer.rewards}</p>
                  <p>Discount Usages: {mergePreview.data.mergePreview.recordsToTransfer.discountUsages}</p>
                  <p>Reviews: {mergePreview.data.mergePreview.recordsToTransfer.reviews}</p>
                  <p>Complaints: {mergePreview.data.mergePreview.recordsToTransfer.complaints}</p>
                </div>
              </div>

              {/* Missing fields that will be filled */}
              {(!mergePreview.data.target.phone && mergePreview.data.source.phone) ||
               (!mergePreview.data.target.email && mergePreview.data.source.email) ? (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                  <p className="font-medium text-purple-700 mb-1">Missing fields to be filled from source:</p>
                  {!mergePreview.data.target.phone && mergePreview.data.source.phone && (
                    <p>Phone: {mergePreview.data.source.phone}</p>
                  )}
                  {!mergePreview.data.target.email && mergePreview.data.source.email && (
                    <p>Email: {mergePreview.data.source.email}</p>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {mergeStep === 'preview' && mergePreview?.isLoading && (
            <div className="py-8 text-center text-muted-foreground">Loading merge preview...</div>
          )}

          {mergeStep === 'preview' && mergePreview?.error && (
            <div className="py-4 text-center text-red-600">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              <p>{mergePreview.error.message}</p>
            </div>
          )}

          {mergeStep === 'confirm' && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-700">This action cannot be undone</h4>
                    <p className="text-sm text-red-600 mt-1">
                      You are about to merge <strong>{mergeSource?.name}</strong> (#{mergeSource?.id}) into <strong>{mergeTarget?.name}</strong> (#{mergeTarget?.id}).
                      All data from the source account will be transferred and the source account will be permanently deactivated.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {mergeStep === 'select' && (
              <>
                <Button variant="outline" onClick={() => setShowMergeDialog(false)}>Cancel</Button>
                <Button
                  disabled={!mergeSource || !mergeTarget}
                  onClick={() => setMergeStep('preview')}
                >
                  Preview Merge
                </Button>
              </>
            )}
            {mergeStep === 'preview' && (
              <>
                <Button variant="outline" onClick={() => setMergeStep('select')}>Back</Button>
                <Button
                  disabled={mergePreview?.isLoading || mergePreview?.error}
                  variant="destructive"
                  onClick={() => setMergeStep('confirm')}
                >
                  Proceed to Confirm
                </Button>
              </>
            )}
            {mergeStep === 'confirm' && (
              <>
                <Button variant="outline" onClick={() => setMergeStep('preview')}>Back</Button>
                <Button
                  variant="destructive"
                  disabled={executeMerge?.isPending}
                  onClick={() => {
                    if (mergeSource && mergeTarget) {
                      executeMerge.mutate({ sourceId: mergeSource.id, targetId: mergeTarget.id });
                    }
                  }}
                >
                  {executeMerge?.isPending ? 'Merging...' : 'Confirm Merge'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stamp Adjustment Dialog */}
      <Dialog open={showAddStampsDialog} onOpenChange={(open) => {
        setShowAddStampsDialog(open);
        if (!open) {
          setStampCustomer(null);
          setStampsToAdd(1);
          setStampReason('Physical loyalty card transfer');
          setStampMode('add');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stamp Adjustment</DialogTitle>
          </DialogHeader>
          {stampCustomer && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="font-medium text-amber-800">{stampCustomer.name}</p>
                <p className="text-sm text-amber-600">Current stamps: {stampCustomer.currentStamps}/10</p>
              </div>
              <div>
                <Label className="mb-2 block">Action</Label>
                <div className="flex gap-2">
                  <Button
                    variant={stampMode === 'add' ? 'default' : 'outline'}
                    size="sm"
                    className={stampMode === 'add' ? 'bg-green-600 hover:bg-green-700' : ''}
                    onClick={() => {
                      setStampMode('add');
                      setStampReason('Physical loyalty card transfer');
                    }}
                  >
                    + Add Stamps
                  </Button>
                  <Button
                    variant={stampMode === 'deduct' ? 'default' : 'outline'}
                    size="sm"
                    className={stampMode === 'deduct' ? 'bg-red-600 hover:bg-red-700' : ''}
                    onClick={() => {
                      setStampMode('deduct');
                      setStampReason('Manual correction');
                    }}
                  >
                    − Deduct Stamps
                  </Button>
                </div>
              </div>
              <div>
                <Label>Number of stamps to {stampMode === 'add' ? 'add' : 'deduct'}</Label>
                <Select value={String(stampsToAdd)} onValueChange={(v) => setStampsToAdd(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(stampMode === 'deduct'
                      ? Array.from({ length: Math.min(stampCustomer.currentStamps, 20) }, (_, i) => i + 1)
                      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                    ).map(n => (
                      <SelectItem key={n} value={String(n)}>{n} stamp{n > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason <span className="text-red-500">*</span></Label>
                <Input
                  value={stampReason}
                  onChange={(e) => setStampReason(e.target.value)}
                  placeholder={stampMode === 'add' ? 'Physical loyalty card transfer' : 'Manual correction - reason'}
                />
              </div>
              <div className={`p-3 rounded-lg ${stampMode === 'deduct' ? 'bg-red-50 border border-red-200' : 'bg-muted'}`}>
                <p className="text-sm">
                  After {stampMode === 'add' ? 'adding' : 'deducting'}: <strong>
                    {stampMode === 'add'
                      ? stampCustomer.currentStamps + stampsToAdd
                      : Math.max(0, stampCustomer.currentStamps - stampsToAdd)
                    }/10 stamps
                  </strong>
                </p>
                {stampMode === 'add' && stampCustomer.currentStamps + stampsToAdd >= 10 && (
                  <p className="text-sm text-green-600 mt-1">🎉 Customer will qualify for a free drink!</p>
                )}
                {stampMode === 'deduct' && (
                  <p className="text-xs text-red-600 mt-1">This action will be logged with your name for audit purposes.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStampsDialog(false)}>Cancel</Button>
            {stampMode === 'add' ? (
              <Button
                disabled={!stampCustomer || addStamps.isPending || !stampReason.trim()}
                onClick={() => {
                  if (stampCustomer) {
                    addStamps.mutate({
                      customerId: stampCustomer.id,
                      stamps: stampsToAdd,
                      reason: stampReason,
                    });
                  }
                }}
              >
                {addStamps.isPending ? 'Adding...' : `Add ${stampsToAdd} Stamp${stampsToAdd > 1 ? 's' : ''}`}
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={!stampCustomer || adjustStamps.isPending || !stampReason.trim()}
                onClick={() => {
                  if (stampCustomer) {
                    adjustStamps.mutate({
                      customerId: stampCustomer.id,
                      adjustment: -stampsToAdd,
                      reason: stampReason,
                    });
                  }
                }}
              >
                {adjustStamps.isPending ? 'Deducting...' : `Deduct ${stampsToAdd} Stamp${stampsToAdd > 1 ? 's' : ''}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Food Schedule Tab Component

