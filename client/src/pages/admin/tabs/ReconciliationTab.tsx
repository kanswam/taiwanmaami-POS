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

export default function ReconciliationTab() {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [showOnlyDiscrepancies, setShowOnlyDiscrepancies] = useState(false);

  // Quick period selectors
  const setQuickPeriod = (type: 'today' | 'yesterday' | 'week' | 'month') => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (type) {
      case 'today':
        start = today;
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = start;
        break;
      case 'week':
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start = new Date(today);
        start.setMonth(start.getMonth() - 1);
        break;
      default:
        start = today;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const { data: reconciliationData, isLoading, refetch } = trpc.analytics.getRazorpayReconciliation.useQuery({
    startDate,
    endDate,
    period,
  });

  const bulkFetchMutation = trpc.analytics.bulkFetchRazorpayPayments.useMutation();
  const markReconciledMutation = trpc.analytics.markOrderReconciled.useMutation();
  const [razorpayAmounts, setRazorpayAmounts] = useState<Record<string, number>>({});
  const [isFetchingRazorpay, setIsFetchingRazorpay] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [selectedOrderForReconcile, setSelectedOrderForReconcile] = useState<{orderId: number; orderNumber: string; discrepancy: number; isWriteOff?: boolean} | null>(null);
  const [reconcileNote, setReconcileNote] = useState('');

  // Fetch actual amounts from Razorpay API
  const fetchRazorpayAmounts = async () => {
    if (!reconciliationData?.items) return;

    const paymentIds = reconciliationData.items
      .filter(item => item.razorpayPaymentId && item.razorpayPaymentId.startsWith('pay_'))
      .map(item => item.razorpayPaymentId);

    if (paymentIds.length === 0) {
      return;
    }

    setIsFetchingRazorpay(true);
    try {
      const results = await bulkFetchMutation.mutateAsync({ paymentIds });
      const amounts: Record<string, number> = {};
      Object.entries(results).forEach(([id, data]) => {
        if (data.amount) {
          amounts[id] = data.amount;
        }
      });
      setRazorpayAmounts(amounts);
    } catch (error) {
      console.error('Failed to fetch Razorpay payment details:', error);
    } finally {
      setIsFetchingRazorpay(false);
    }
  };

  // Handle marking order as reconciled or written off
  const handleMarkReconciled = async () => {
    if (!selectedOrderForReconcile || !reconcileNote.trim()) return;
    
    const isWriteOff = selectedOrderForReconcile.isWriteOff || false;
    
    try {
      await markReconciledMutation.mutateAsync({
        orderId: selectedOrderForReconcile.orderId,
        note: reconcileNote,
        isWriteOff,
      });
      toast.success(`Order ${selectedOrderForReconcile.orderNumber} ${isWriteOff ? 'written off' : 'marked as reconciled'}`);
      setReconcileDialogOpen(false);
      setSelectedOrderForReconcile(null);
      setReconcileNote('');
      refetch();
    } catch (error) {
      toast.error(`Failed to ${isWriteOff ? 'write off' : 'mark as reconciled'}`);
    }
  };

  // Reset fetch state when date range changes
  useEffect(() => {
    setHasFetchedOnce(false);
    setRazorpayAmounts({});
  }, [startDate, endDate]);

  // Auto-fetch Razorpay amounts when data loads
  useEffect(() => {
    if (reconciliationData?.items && reconciliationData.items.length > 0 && !hasFetchedOnce && !isFetchingRazorpay) {
      setHasFetchedOnce(true);
      fetchRazorpayAmounts();
    }
  }, [reconciliationData?.items, hasFetchedOnce, isFetchingRazorpay]);

  // Export to CSV
  const exportToCSV = () => {
    if (!reconciliationData?.items?.length) return;

    const headers = [
      'Order #',
      'Date',
      'Customer',
      'Phone',
      'Order Type',
      'Subtotal',
      'GST',
      'Delivery',
      'Discount',
      'Order Total',
      'Payment Recorded',
      'Razorpay Amount',
      'Discrepancy',
      'Status',
      'Razorpay Order ID',
      'Razorpay Payment ID',
    ];

    const rows = reconciliationData.items.map(item => {
      const razorpayAmount = razorpayAmounts[item.razorpayPaymentId] || 0;
      const actualDiscrepancy = item.orderTotal - razorpayAmount;
      return [
        item.orderNumber,
        new Date(item.createdAt).toLocaleDateString('en-IN'),
        item.customerName,
        item.customerPhone,
        item.orderType,
        (item.subtotal / 100).toFixed(2),
        (item.gst / 100).toFixed(2),
        (item.deliveryCharge / 100).toFixed(2),
        (item.discountAmount / 100).toFixed(2),
        (item.orderTotal / 100).toFixed(2),
        (item.paymentAmount / 100).toFixed(2),
        razorpayAmount > 0 ? (razorpayAmount / 100).toFixed(2) : 'Not Fetched',
        razorpayAmount > 0 ? (actualDiscrepancy / 100).toFixed(2) : 'N/A',
        item.orderStatus,
        item.razorpayOrderId,
        item.razorpayPaymentId,
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `razorpay-reconciliation-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Reconciliation report exported');
  };

  const filteredItems = showOnlyDiscrepancies
    ? reconciliationData?.items?.filter(item => {
        const razorpayAmount = razorpayAmounts[item.razorpayPaymentId] || 0;
        if (razorpayAmount > 0) {
          return Math.abs(item.orderTotal - razorpayAmount) > 100;
        }
        return item.paymentMissing || item.hasDiscrepancy;
      })
    : reconciliationData?.items;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Razorpay Payment Reconciliation</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchRazorpayAmounts}
            disabled={isFetchingRazorpay || !reconciliationData?.items?.length}
          >
            {isFetchingRazorpay ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Fetch Razorpay Amounts
              </>
            )}
          </Button>
          <Button onClick={exportToCSV} disabled={!reconciliationData?.items?.length}>
            <Upload className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setQuickPeriod('today')}>Today</Button>
            <Button size="sm" variant="outline" onClick={() => setQuickPeriod('yesterday')}>Yesterday</Button>
            <Button size="sm" variant="outline" onClick={() => setQuickPeriod('week')}>Last 7 Days</Button>
            <Button size="sm" variant="outline" onClick={() => setQuickPeriod('month')}>Last 30 Days</Button>
          </div>
          <div className="flex gap-4 items-end">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={() => refetch()}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Switch
              checked={showOnlyDiscrepancies}
              onCheckedChange={setShowOnlyDiscrepancies}
            />
            <Label className="text-sm">Show only discrepancies</Label>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      {reconciliationData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Orders</div>
            <div className="text-2xl font-bold">{reconciliationData.summary.totalOrders}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Expected (Order Totals)</div>
            <div className="text-2xl font-bold text-blue-600">
              ₹{(reconciliationData.summary.totalExpected / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Recorded in DB</div>
            <div className="text-2xl font-bold text-green-600">
              ₹{(reconciliationData.summary.totalCollected / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </Card>
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="text-sm text-red-600">Discrepancy Count</div>
            <div className="text-2xl font-bold text-red-600">
              {reconciliationData.summary.discrepancyCount} orders
            </div>
          </Card>
        </div>
      )}

      {/* Razorpay Fetched Summary */}
      {Object.keys(razorpayAmounts).length > 0 && (
        <Card className="p-4 border-purple-200 bg-purple-50">
          <h3 className="font-semibold text-purple-800 mb-2">Razorpay API Data (Actual Collected)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-purple-600">Payments Fetched</div>
              <div className="text-xl font-bold text-purple-800">{Object.keys(razorpayAmounts).length}</div>
            </div>
            <div>
              <div className="text-sm text-purple-600">Total from Razorpay</div>
              <div className="text-xl font-bold text-purple-800">
                ₹{(Object.values(razorpayAmounts).reduce((a, b) => a + b, 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-purple-600">Actual Discrepancy</div>
              <div className="text-xl font-bold text-red-600">
                ₹{((reconciliationData?.summary?.totalExpected || 0) - Object.values(razorpayAmounts).reduce((a, b) => a + b, 0)) / 100}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Orders Table */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Order Details ({filteredItems?.length || 0} orders)</h3>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : !filteredItems?.length ? (
          <p className="text-center py-8 text-muted-foreground">No Razorpay orders found for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-2">Order #</th>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Customer</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Payment</th>
                  <th className="text-right py-2 px-2">Order Total</th>
                  <th className="text-right py-2 px-2">Razorpay Amt</th>
                  <th className="text-right py-2 px-2">Discrepancy</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Payment ID</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems?.map((item) => {
                  const razorpayAmount = razorpayAmounts[item.razorpayPaymentId] || 0;
                  const rawDiscrepancy = razorpayAmount > 0 ? item.orderTotal - razorpayAmount : item.discrepancy;
                  // If reconciled or written off, show ₹0 discrepancy
                  const isSettled = (item as any).isReconciled || (item as any).isWrittenOff;
                  const actualDiscrepancy = isSettled ? 0 : rawDiscrepancy;
                  const hasIssue = isSettled ? false : (razorpayAmount > 0 ? Math.abs(rawDiscrepancy) > 100 : item.paymentMissing || item.hasDiscrepancy);

                  return (
                    <tr 
                      key={item.orderId} 
                      className={`border-b hover:bg-muted/50 ${hasIssue ? 'bg-red-50' : ''}`}
                    >
                      <td className="py-2 px-2 font-mono font-medium">{item.orderNumber}</td>
                      <td className="py-2 px-2">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2 px-2">
                        <div>{item.customerName}</div>
                        {item.customerPhone && (
                          <div className="text-xs text-muted-foreground">{item.customerPhone}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 capitalize">{item.orderType}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.paymentMethod === 'razorpay' ? 'bg-blue-100 text-blue-800' :
                          item.paymentMethod === 'card' ? 'bg-purple-100 text-purple-800' :
                          item.paymentMethod === 'upi' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.paymentMethod || 'unknown'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-medium">
                        ₹{(item.orderTotal / 100).toFixed(2)}
                        {item.deliveryCharge > 0 && (
                          <div className="text-xs text-muted-foreground">
                            (incl. ₹{(item.deliveryCharge / 100).toFixed(0)} delivery)
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {razorpayAmount > 0 ? (
                          <span className="font-medium text-green-600">
                            ₹{(razorpayAmount / 100).toFixed(2)}
                          </span>
                        ) : item.razorpayPaymentId ? (
                          <span className="text-muted-foreground text-xs">Click Fetch</span>
                        ) : (
                          <span className="text-red-500">No Payment ID</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {razorpayAmount > 0 ? (
                          <span className={actualDiscrepancy > 100 ? 'text-red-600 font-bold' : 'text-green-600'}>
                            {actualDiscrepancy > 0 ? '+' : ''}₹{(actualDiscrepancy / 100).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.orderStatus === 'completed' ? 'bg-green-100 text-green-800' :
                          item.orderStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.orderStatus}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        {item.razorpayPaymentId ? (
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {item.razorpayPaymentId.slice(0, 15)}...
                          </code>
                        ) : (
                          <span className="text-red-500 text-xs">Missing</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {(item as any).isReconciled ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-green-600 text-xs flex items-center gap-1 cursor-help">
                                <Check className="w-3 h-3" /> Reconciled
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-medium">Reconciliation Note:</p>
                              <p>{(item as any).reconciliationNote?.replace('[RECONCILED] ', '') || 'No note recorded'}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (item as any).isWrittenOff ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-orange-600 text-xs flex items-center gap-1 cursor-help">
                                <X className="w-3 h-3" /> Written Off
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-medium">Write-off Reason:</p>
                              <p>{(item as any).reconciliationNote?.replace('[WRITE-OFF] ', '') || 'No reason recorded'}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : hasIssue ? (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => {
                                setSelectedOrderForReconcile({
                                  orderId: item.orderId,
                                  orderNumber: item.orderNumber,
                                  discrepancy: rawDiscrepancy,
                                  isWriteOff: false,
                                });
                                setReconcileDialogOpen(true);
                              }}
                            >
                              Reconciled
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                              onClick={() => {
                                setSelectedOrderForReconcile({
                                  orderId: item.orderId,
                                  orderNumber: item.orderNumber,
                                  discrepancy: rawDiscrepancy,
                                  isWriteOff: true,
                                });
                                setReconcileDialogOpen(true);
                              }}
                            >
                              Write Off
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Daily Breakdown */}
      {reconciliationData?.dailySummary && reconciliationData.dailySummary.length > 1 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Daily Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-right py-2 px-2">Orders</th>
                  <th className="text-right py-2 px-2">Expected</th>
                  <th className="text-right py-2 px-2">Recorded</th>
                  <th className="text-right py-2 px-2">Discrepancy</th>
                </tr>
              </thead>
              <tbody>
                {reconciliationData.dailySummary.map((day) => (
                  <tr key={day.date} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-medium">
                      {new Date(day.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-2 px-2 text-right">{day.orders}</td>
                    <td className="py-2 px-2 text-right">₹{(day.expected / 100).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right">₹{(day.collected / 100).toFixed(2)}</td>
                    <td className={`py-2 px-2 text-right font-medium ${day.discrepancy > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {day.discrepancy > 0 ? '+' : ''}₹{(day.discrepancy / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reconciliation Dialog */}
      <Dialog open={reconcileDialogOpen} onOpenChange={setReconcileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedOrderForReconcile?.isWriteOff ? 'Write Off Discrepancy' : 'Mark Order as Reconciled'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedOrderForReconcile && (
              <>
                <p className="text-sm">
                  Order <strong>{selectedOrderForReconcile.orderNumber}</strong> has a discrepancy of{' '}
                  <span className="text-red-600 font-bold">
                    ₹{(selectedOrderForReconcile.discrepancy / 100).toFixed(2)}
                  </span>
                </p>
                {selectedOrderForReconcile.isWriteOff && (
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-800">
                    <strong>Write Off:</strong> This will mark the discrepancy as a loss that cannot be recovered. Use this for delivery fees that were not collected and cannot be charged to the customer.
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">
                    {selectedOrderForReconcile.isWriteOff ? 'Write-off Reason' : 'Reconciliation Note'}
                  </label>
                  <textarea
                    className="w-full mt-1 p-2 border rounded-md text-sm"
                    rows={3}
                    placeholder={selectedOrderForReconcile.isWriteOff 
                      ? 'e.g., Delivery fee not collected due to payment bug - cannot recover'
                      : 'e.g., Customer paid ₹504.24 via QR code on 27 Jan 2026'
                    }
                    value={reconcileNote}
                    onChange={(e) => setReconcileNote(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcileDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkReconciled}
              disabled={!reconcileNote.trim() || markReconciledMutation.isPending}
              className={selectedOrderForReconcile?.isWriteOff ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              {markReconciledMutation.isPending 
                ? 'Saving...' 
                : selectedOrderForReconcile?.isWriteOff 
                  ? 'Write Off' 
                  : 'Mark as Reconciled'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Leela Hyderabad Registrations Tab

