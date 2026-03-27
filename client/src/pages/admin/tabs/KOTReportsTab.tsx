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

export default function KOTReportsTab() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const { data: summary, isLoading } = trpc.kot.getDailySummary.useQuery({ date: selectedDate });

  const toggleOrder = (kotId: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(kotId)) {
      newExpanded.delete(kotId);
    } else {
      newExpanded.add(kotId);
    }
    setExpandedOrders(newExpanded);
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">KOT Analytics & Staffing Report</h2>
          <div className="flex items-center gap-4">
            <Label>Select Date</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading report...</div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="text-sm text-blue-600 font-medium">Total Orders</div>
                <div className="text-3xl font-bold text-blue-900 mt-2">{summary.totalKots}</div>
                <div className="text-xs text-blue-600 mt-1">{summary.date}</div>
              </Card>

              <Card className="p-4 bg-green-50 border-green-200">
                <div className="text-sm text-green-600 font-medium">Pickup Orders</div>
                <div className="text-3xl font-bold text-green-900 mt-2">
                  {(summary.orderTypeBreakdown as Record<string, number>)['PICKUP'] || 0}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {summary.totalKots > 0 ? Math.round((((summary.orderTypeBreakdown as Record<string, number>)['PICKUP'] || 0) / summary.totalKots) * 100) : 0}% of total
                </div>
              </Card>

              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="text-sm text-purple-600 font-medium">Delivery Orders</div>
                <div className="text-3xl font-bold text-purple-900 mt-2">
                  {(summary.orderTypeBreakdown as Record<string, number>)['DELIVERY'] || 0}
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  {summary.totalKots > 0 ? Math.round((((summary.orderTypeBreakdown as Record<string, number>)['DELIVERY'] || 0) / summary.totalKots) * 100) : 0}% of total
                </div>
              </Card>

              <Card className="p-4 bg-amber-50 border-amber-200">
                <div className="text-sm text-amber-600 font-medium">Dine-In Orders</div>
                <div className="text-3xl font-bold text-amber-900 mt-2">
                  {(summary.orderTypeBreakdown as Record<string, number>)['INSTORE'] || 0}
                </div>
                <div className="text-xs text-amber-600 mt-1">
                  {summary.totalKots > 0 ? Math.round((((summary.orderTypeBreakdown as Record<string, number>)['INSTORE'] || 0) / summary.totalKots) * 100) : 0}% of total
                </div>
              </Card>
            </div>

            {/* Hourly Breakdown Chart */}
            {summary.hourlyBreakdown && summary.hourlyBreakdown.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">📊 Hourly Order Volume</h3>
                <div className="space-y-2">
                  {summary.hourlyBreakdown
                    .filter(h => h.count > 0)
                    .map((hour) => (
                      <div key={hour.hour} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-medium text-muted-foreground">
                          {hour.hourLabel}
                        </div>
                        <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                          <div
                            className="bg-primary h-full flex items-center justify-end px-3 text-primary-foreground text-sm font-bold transition-all"
                            style={{
                              width: `${Math.max((hour.count / Math.max(...summary.hourlyBreakdown.map(h => h.count))) * 100, 5)}%`,
                            }}
                          >
                            {hour.count}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}

            {/* Peak Hours & Staffing Recommendations */}
            {summary.peakHours && summary.peakHours.length > 0 && (
              <Card className="p-6 bg-orange-50 border-orange-200">
                <h3 className="text-lg font-bold mb-4 text-orange-900">⚡ Peak Hours & Staffing Recommendations</h3>
                <div className="space-y-3">
                  {summary.peakHours.map((peak, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-orange-200">
                      <div>
                        <div className="font-bold text-orange-900">{peak.hour}</div>
                        <div className="text-sm text-orange-700">{peak.orders} orders</div>
                      </div>
                      <div className="text-sm text-orange-800 font-medium">
                        {peak.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Detailed Order List */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">📋 Detailed Order List ({summary.orders.length} orders)</h3>
              {summary.orders.length > 0 ? (
                <div className="space-y-2">
                  {summary.orders.map((order) => (
                    <div key={order.kotId} className="border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleOrder(order.kotId)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="font-mono text-sm font-bold text-primary">
                            KOT #{order.kotId}
                          </div>
                          <div className="text-sm font-medium">
                            {order.orderNumber}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${
                            order.orderType === 'PICKUP' ? 'bg-green-100 text-green-800' :
                            order.orderType === 'DELIVERY' ? 'bg-purple-100 text-purple-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {order.orderType}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.customerName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.totalItems} items
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-medium">
                            {formatTime(order.createdAt)}
                          </div>
                          {expandedOrders.has(order.kotId) ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {expandedOrders.has(order.kotId) && (
                        <div className="p-4 bg-background border-t">
                          <div className="space-y-2">
                            {order.items.map((item: { quantity: number; name: string; customizations?: string; addons?: { name: string; price: number }[] }, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-muted/20 rounded">
                                <div className="font-bold text-primary">{item.quantity}x</div>
                                <div className="flex-1">
                                  <div className="font-medium">{item.name}</div>
                                  {item.customizations && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {item.customizations}
                                    </div>
                                  )}
                                  {item.addons && item.addons.length > 0 && (
                                    <div className="mt-1">
                                      {item.addons.map((addon, aidx) => (
                                        <div key={aidx} className="text-sm text-blue-600">
                                          + {addon.name} (₹{(addon.price / 100).toFixed(0)})
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No orders on this date
                </div>
              )}
            </Card>

            {/* Top Selling Items */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">🏆 Top Selling Items</h3>
              {summary.topItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">#</th>
                        <th className="text-left py-3 px-4 font-semibold">Product Name</th>
                        <th className="text-right py-3 px-4 font-semibold">Quantity Sold</th>
                        <th className="text-right py-3 px-4 font-semibold">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.topItems.map((item, index) => {
                        const totalItems = summary.topItems.reduce((sum, i) => sum + i.quantity, 0);
                        const percentage = Math.round((item.quantity / totalItems) * 100);
                        return (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
                            <td className="py-3 px-4 font-medium">{item.productName}</td>
                            <td className="py-3 px-4 text-right font-bold">{item.quantity}</td>
                            <td className="py-3 px-4 text-right text-muted-foreground">{percentage}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No items sold on this date
                </div>
              )}
            </Card>

            {/* Operational Insights */}
            {summary.totalKots > 0 && (
              <Card className="p-6 bg-blue-50 border-blue-200">
                <h3 className="text-lg font-bold mb-3 text-blue-900">💡 Operational Insights</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>• <strong>{summary.totalKots} orders</strong> were processed on {summary.date}</p>
                  {summary.peakHours.length > 0 && (
                    <p>• Peak ordering time was <strong>{summary.peakHours[0].hour}</strong> with {summary.peakHours[0].orders} orders - consider scheduling extra staff during this period</p>
                  )}
                  {summary.topItems[0] && (
                    <p>• "<strong>{summary.topItems[0].productName}</strong>" was the most popular item with {summary.topItems[0].quantity} orders - ensure adequate inventory</p>
                  )}
                  <p>• Order type distribution: {(summary.orderTypeBreakdown as Record<string, number>)['PICKUP'] || 0} Pickup, {(summary.orderTypeBreakdown as Record<string, number>)['DELIVERY'] || 0} Delivery, {(summary.orderTypeBreakdown as Record<string, number>)['INSTORE'] || 0} Dine-in</p>
                  <p>• Use this data for inventory planning, staff scheduling, and operational optimization</p>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No data available</div>
        )}
      </Card>
    </div>
  );
}


// Audit Log Tab Component

