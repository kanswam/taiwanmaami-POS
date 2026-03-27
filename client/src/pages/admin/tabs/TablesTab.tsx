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

export default function TablesTab() {
  const { data: activeOrders, refetch } = trpc.orders.getActiveInstoreOrders.useQuery();
  const updatePaymentStatus = trpc.orders.updatePaymentStatus.useMutation({
    onSuccess: () => {
      toast.success('Payment status updated');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Group orders by table number
  const tableOrders = useMemo(() => {
    if (!activeOrders) return [];
    const grouped = new Map<string, typeof activeOrders>();
    activeOrders.forEach(order => {
      const tableNum = order.tableNumber || 'No Table';
      if (!grouped.has(tableNum)) {
        grouped.set(tableNum, []);
      }
      grouped.get(tableNum)!.push(order);
    });
    return Array.from(grouped.entries());
  }, [activeOrders]);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
    preparing: 'bg-orange-100 text-orange-800 border-orange-300',
    ready: 'bg-green-100 text-green-800 border-green-300',
    completed: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  const paymentStatusColors: Record<string, string> = {
    pending: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-800',
  };

  // Calculate table total
  const getTableTotal = (orders: typeof activeOrders) => {
    if (!orders) return 0;
    return orders.reduce((sum, order) => sum + order.totalAmount, 0);
  };

  // Check if all orders on table are completed
  const isTableReady = (orders: typeof activeOrders) => {
    if (!orders || orders.length === 0) return false;
    return orders.every((order: any) => order.orderStatus === 'ready' || order.orderStatus === 'completed');
  };

  // Check if table needs payment
  const needsPayment = (orders: typeof activeOrders) => {
    if (!orders) return false;
    return orders.some((order: any) => order.paymentStatus === 'pending');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Table Status Dashboard</h2>
          <p className="text-sm text-muted-foreground">Monitor in-store orders by table</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tableOrders.map(([tableNum, orders]) => (
          <Card 
            key={tableNum} 
            className={`p-4 border-2 ${
              isTableReady(orders) 
                ? needsPayment(orders) 
                  ? 'border-amber-400 bg-amber-50' 
                  : 'border-green-400 bg-green-50'
                : 'border-blue-400 bg-blue-50'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-bold">Table {tableNum}</h3>
                <p className="text-sm text-muted-foreground">
                  {orders?.length || 0} order{(orders?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatPrice(getTableTotal(orders))}</p>
                {needsPayment(orders) && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded">Unpaid</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {orders?.map((order: any) => (
                <div key={order.id} className="p-2 bg-white rounded border">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">#{order.orderNumber.slice(-6)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColors[order.orderStatus] || ''}`}>
                      {order.orderStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm">{formatPrice(order.totalAmount)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${paymentStatusColors[order.paymentStatus] || ''}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  {order.paymentStatus === 'pending' && (
                    <Button 
                      size="sm" 
                      className="w-full mt-2 h-7 text-xs"
                      onClick={() => updatePaymentStatus.mutate({ orderId: order.id, paymentStatus: 'completed' })}
                    >
                      Mark as Paid
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {isTableReady(orders) && needsPayment(orders) && (
              <Button 
                className="w-full mt-3"
                onClick={() => {
                  orders?.forEach((order: any) => {
                    if (order.paymentStatus === 'pending') {
                      updatePaymentStatus.mutate({ orderId: order.id, paymentStatus: 'completed' });
                    }
                  });
                }}
              >
                Collect Payment ({formatPrice(getTableTotal(orders))})
              </Button>
            )}
          </Card>
        ))}
      </div>

      {tableOrders.length === 0 && (
        <Card className="p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Active Tables</h3>
          <p className="text-muted-foreground">In-store orders will appear here when customers place orders.</p>
        </Card>
      )}
    </div>
  );
}

// Add-ons Tab

