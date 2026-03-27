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

export default function PaymentReportTab() {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [outletFilter, setOutletFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  const { data: reportData, isLoading, refetch } = trpc.orders.getPaymentReport.useQuery({
    startDate,
    endDate,
    outlet: outletFilter as 'all' | 'palladium' | 'tnagar',
    paymentMethod: methodFilter,
  });

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    upi: 'GPay / UPI',
    card: 'Card',
    razorpay: 'Razorpay',
    swiggy_dineout: 'Swiggy Dineout',
    zomato_dineout: 'Zomato Dineout',
    eazydiner: 'EazyDiner',
    birthday_gift: 'Birthday Gift',
    complimentary: 'Complimentary',
    other: 'Other',
    unknown: 'Not Recorded',
  };

  const paymentMethodIcons: Record<string, string> = {
    cash: '💵',
    upi: '📱',
    card: '💳',
    razorpay: '💳',
    swiggy_dineout: '🟠',
    zomato_dineout: '🔴',
    eazydiner: '🟣',
    birthday_gift: '🎂',
    complimentary: '🎁',
    other: '📋',
    unknown: '❓',
  };

  const exportToCSV = () => {
    if (!reportData?.orders) return;
    
    const headers = ['Order #', 'Date', 'Customer', 'Amount', 'Payment Method', 'Outlet', 'Order Type'];
    const orderRows = reportData.orders.map(order => [
      order.orderNumber,
      new Date(order.createdAt).toLocaleString(),
      order.customerName || 'Guest',
      (order.totalAmount / 100).toFixed(2),
      paymentMethodLabels[order.paymentMethod || 'unknown'],
      order.outletId === 1 ? 'Palladium Mall' : 'T Nagar',
      order.orderType,
    ]);
    
    // Add workshop bookings to export
    const workshopRows = (reportData.workshopBookings || []).map((booking: any) => [
      booking.orderNumber,
      new Date(booking.createdAt).toLocaleString(),
      booking.customerName || 'Guest',
      (booking.totalAmount / 100).toFixed(2),
      paymentMethodLabels[booking.paymentMethod || 'unknown'],
      'T Nagar',
      `Workshop (${booking.ticketCount} tickets)`,
    ]);
    
    const csvContent = [headers, ...orderRows, ...workshopRows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment Report</h2>
        <Button onClick={exportToCSV} disabled={!reportData?.orders?.length}>
          <Upload className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Outlet</Label>
            <Select value={outletFilter} onValueChange={setOutletFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                <SelectItem value="tnagar">T Nagar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="razorpay">Razorpay</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">GPay / UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="swiggy_dineout">Swiggy Dineout</SelectItem>
                <SelectItem value="zomato_dineout">Zomato Dineout</SelectItem>
                <SelectItem value="eazydiner">EazyDiner</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold">{reportData.totalOrders}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">
              ₹{(reportData.grandTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>
          <Card className="p-4 border-green-200 bg-green-50">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span>💰</span>
              Amount Collected
            </p>
            <p className="text-xl font-bold text-green-700">
              ₹{((reportData.collectedRevenue || reportData.grandTotal) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">Actual payments received</p>
          </Card>
          {(reportData.promotionalValue || 0) > 0 && (
            <Card className="p-4 border-amber-200 bg-amber-50">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span>🎁</span>
                Promotional Gifts
              </p>
              <p className="text-xl font-bold text-amber-700">
                ₹{((reportData.promotionalValue || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">Birthday gifts & complimentary</p>
            </Card>
          )}
        </div>
      )}

      {/* Payment Method Breakdown */}
      {reportData && Object.keys(reportData.summary).length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Payment Method Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(reportData.summary).map(([method, data]) => {
              const percentage = reportData.grandTotal > 0 
                ? ((data.total / reportData.grandTotal) * 100).toFixed(1)
                : '0';
              return (
                <div key={method} className="flex items-center gap-4">
                  <span className="text-2xl">{paymentMethodIcons[method] || '💰'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{paymentMethodLabels[method] || method}</span>
                      <span className="text-muted-foreground">
                        {data.count} orders • ₹{(data.total / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Orders Table */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Order Details</h3>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : !reportData?.orders?.length && !reportData?.workshopBookings?.length ? (
          <p className="text-center py-8 text-muted-foreground">No completed orders found for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Order #</th>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Customer</th>
                  <th className="text-right py-2 px-2">Amount</th>
                  <th className="text-left py-2 px-2">Method</th>
                  <th className="text-left py-2 px-2">Proof</th>
                  <th className="text-left py-2 px-2">Outlet</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.orders?.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-mono">{order.orderNumber}</td>
                    <td className="py-2 px-2">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-2">{order.customerName || 'Guest'}</td>
                    <td className="py-2 px-2 text-right font-medium">
                      ₹{(order.totalAmount / 100).toFixed(2)}
                    </td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1">
                        <span>{paymentMethodIcons[order.paymentMethod || 'unknown']}</span>
                        <span>{paymentMethodLabels[order.paymentMethod || 'unknown']}</span>
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {order.paymentProofUrl ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedProof(order.paymentProofUrl)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {order.outletId === 1 ? 'Palladium Mall' : 'T Nagar'}
                    </td>
                  </tr>
                ))}
                {/* Workshop Bookings */}
                {reportData?.workshopBookings?.map((booking: any) => (
                  <tr key={`workshop-${booking.id}`} className="border-b hover:bg-muted/50 bg-purple-50">
                    <td className="py-2 px-2 font-mono">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-purple-600">🎓</span>
                        {booking.orderNumber}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-2">{booking.customerName || 'Guest'}</td>
                    <td className="py-2 px-2 text-right font-medium">
                      ₹{(booking.totalAmount / 100).toFixed(2)}
                    </td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1">
                        <span>{paymentMethodIcons[booking.paymentMethod || 'unknown']}</span>
                        <span>{paymentMethodLabels[booking.paymentMethod || 'unknown']}</span>
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-purple-600 text-xs">Workshop ({booking.ticketCount} tickets)</span>
                    </td>
                    <td className="py-2 px-2">T Nagar</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payment Proof Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <img 
              src={selectedProof} 
              alt="Payment proof" 
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Event Inquiries Tab

