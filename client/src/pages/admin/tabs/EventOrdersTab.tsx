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
import { generateEventDocument } from '@/lib/eventDocument';

export default function EventOrdersTab() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  
  // Create order form state
  const [newOrder, setNewOrder] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    companyName: "",
    eventType: "corporate" as const,
    eventDate: "",
    eventTime: "",
    venue: "",
    guestCount: 50,
  });

  // Add item form state
  const [newItem, setNewItem] = useState({
    itemType: "beverage" as const,
    itemName: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
  });

  const { data: orders, isLoading } = trpc.events.getOrders.useQuery({ status: statusFilter as "all" | "draft" | "quoted" | "confirmed" | "in_progress" | "completed" | "cancelled" | undefined });
  const { data: orderDetails } = trpc.events.getOrder.useQuery(
    { id: selectedOrder?.id },
    { enabled: !!selectedOrder }
  );

  const createOrderMutation = trpc.events.createOrder.useMutation({
    onSuccess: () => {
      toast.success("Event order created successfully");
      utils.events.getOrders.invalidate();
      setShowCreateDialog(false);
      setNewOrder({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        companyName: "",
        eventType: "corporate",
        eventDate: "",
        eventTime: "",
        venue: "",
        guestCount: 50,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const addItemMutation = trpc.events.addOrderItem.useMutation({
    onSuccess: () => {
      toast.success("Item added successfully");
      utils.events.getOrder.invalidate();
      setShowAddItemDialog(false);
      setNewItem({
        itemType: "beverage",
        itemName: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const removeItemMutation = trpc.events.removeOrderItem.useMutation({
    onSuccess: () => {
      toast.success("Item removed");
      utils.events.getOrder.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateStatusMutation = trpc.events.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.events.getOrders.invalidate();
      utils.events.getOrder.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const recordPaymentMutation = trpc.events.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded");
      utils.events.getOrders.invalidate();
      utils.events.getOrder.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteOrderMutation = trpc.events.deleteOrder.useMutation({
    onSuccess: () => {
      toast.success("Event order deleted successfully");
      utils.events.getOrders.invalidate();
      setSelectedOrder(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleDeleteOrder = (order: any) => {
    if (window.confirm(`Are you sure you want to delete order "${order.orderNumber}"? This will also delete all order items. This action cannot be undone.`)) {
      deleteOrderMutation.mutate({ id: order.id });
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    quoted: "bg-blue-100 text-blue-800",
    confirmed: "bg-green-100 text-green-800",
    completed: "bg-purple-100 text-purple-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const itemTypeLabels: Record<string, string> = {
    beverage: "Beverage",
    food: "Food",
    staff: "Staff",
    delivery: "Delivery",
    equipment: "Equipment",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Event Orders</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading orders...</div>
      ) : !orders?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          No event orders found. Create your first event order.
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order: any) => (
            <Card 
              key={order.id} 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{order.orderNumber}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm">{order.customerName} {order.companyName && `(${order.companyName})`}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {order.eventDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {order.guestCount} guests
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">₹{(order.totalAmount / 100).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.advancePaid ? "Advance Paid" : "Advance Pending"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Order: {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {orderDetails && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Customer Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {orderDetails.order.customerName}</p>
                    <p><strong>Email:</strong> {orderDetails.order.customerEmail}</p>
                    <p><strong>Phone:</strong> {orderDetails.order.customerPhone}</p>
                    {orderDetails.order.companyName && (
                      <p><strong>Company:</strong> {orderDetails.order.companyName}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Event Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Type:</strong> {orderDetails.order.eventType}</p>
                    <p><strong>Date:</strong> {orderDetails.order.eventDate} {orderDetails.order.eventTime}</p>
                    <p><strong>Venue:</strong> {orderDetails.order.venue}</p>
                    <p><strong>Guests:</strong> {orderDetails.order.guestCount}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Order Items</h4>
                  <Button size="sm" variant="outline" onClick={() => setShowAddItemDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                {orderDetails.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items added yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Item</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-right p-2">Qty</th>
                        <th className="text-right p-2">Unit Price</th>
                        <th className="text-right p-2">Total</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetails.items.map((item: any) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2">
                            {item.itemName}
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </td>
                          <td className="p-2">{itemTypeLabels[item.itemType]}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">₹{(item.unitPrice / 100).toFixed(2)}</td>
                          <td className="p-2 text-right">₹{(item.totalPrice / 100).toFixed(2)}</td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItemMutation.mutate({ 
                                itemId: item.id, 
                                eventOrderId: selectedOrder.id 
                              })}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pricing Summary */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{(orderDetails.order.subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>₹{(orderDetails.order.gstAmount / 100).toFixed(2)}</span>
                  </div>
                  {(orderDetails.order.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-₹{(orderDetails.order.discountAmount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₹{(orderDetails.order.totalAmount / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Advance ({orderDetails.order.advancePercentage}%):</span>
                    <span className={orderDetails.order.advancePaid ? "text-green-600" : ""}>
                      ₹{(orderDetails.order.advanceAmount / 100).toFixed(2)}
                      {orderDetails.order.advancePaid && " ✓"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Balance:</span>
                    <span className={orderDetails.order.balancePaid ? "text-green-600" : ""}>
                      ₹{(orderDetails.order.balanceAmount / 100).toFixed(2)}
                      {orderDetails.order.balancePaid && " ✓"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Select 
                  value={orderDetails.order.status}
                  onValueChange={(value) => updateStatusMutation.mutate({ id: selectedOrder.id, status: value as any })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const doc = generateEventDocument(orderDetails.order as any, orderDetails.items, 'quotation');
                    const blob = new Blob([doc], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Quotation_${selectedOrder.orderNumber}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Quotation
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const doc = generateEventDocument(orderDetails.order as any, orderDetails.items, 'invoice');
                    const blob = new Blob([doc], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Invoice_${selectedOrder.orderNumber}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Invoice
                </Button>
                {!orderDetails.order.advancePaid && (
                  <Button 
                    variant="outline"
                    onClick={() => recordPaymentMutation.mutate({ id: selectedOrder.id, paymentType: "advance" })}
                  >
                    Record Advance Payment
                  </Button>
                )}
                {orderDetails.order.advancePaid && !orderDetails.order.balancePaid && (
                  <Button 
                    variant="outline"
                    onClick={() => recordPaymentMutation.mutate({ id: selectedOrder.id, paymentType: "balance" })}
                  >
                    Record Balance Payment
                  </Button>
                )}
                <Button 
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                  onClick={() => handleDeleteOrder(selectedOrder)}
                  disabled={deleteOrderMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Event Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name *</Label>
                <Input
                  value={newOrder.customerName}
                  onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                />
              </div>
              <div>
                <Label>Company Name</Label>
                <Input
                  value={newOrder.companyName}
                  onChange={(e) => setNewOrder({ ...newOrder, companyName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newOrder.customerEmail}
                  onChange={(e) => setNewOrder({ ...newOrder, customerEmail: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={newOrder.customerPhone}
                  onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Type *</Label>
                <Select 
                  value={newOrder.eventType}
                  onValueChange={(value: any) => setNewOrder({ ...newOrder, eventType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="private">Private Party</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Guest Count *</Label>
                <Input
                  type="number"
                  value={newOrder.guestCount}
                  onChange={(e) => setNewOrder({ ...newOrder, guestCount: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Date *</Label>
                <Input
                  type="date"
                  value={newOrder.eventDate}
                  onChange={(e) => setNewOrder({ ...newOrder, eventDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Event Time</Label>
                <Input
                  type="time"
                  value={newOrder.eventTime}
                  onChange={(e) => setNewOrder({ ...newOrder, eventTime: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Venue *</Label>
              <Textarea
                value={newOrder.venue}
                onChange={(e) => setNewOrder({ ...newOrder, venue: e.target.value })}
                placeholder="Event venue address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createOrderMutation.mutate(newOrder)}
              disabled={createOrderMutation.isPending || !newOrder.customerName || !newOrder.customerEmail || !newOrder.customerPhone || !newOrder.eventDate || !newOrder.venue}
            >
              {createOrderMutation.isPending ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Order Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Item Type</Label>
              <Select 
                value={newItem.itemType}
                onValueChange={(value: any) => setNewItem({ ...newItem, itemType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beverage">Beverage</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item Name *</Label>
              <Input
                value={newItem.itemName}
                onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                placeholder="e.g., Brown Sugar Milk Tea (500ml)"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Unit Price (₹)</Label>
                <Input
                  type="number"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedOrder) {
                  addItemMutation.mutate({
                    eventOrderId: selectedOrder.id,
                    ...newItem,
                    unitPrice: Math.round(newItem.unitPrice * 100), // Convert to paise
                  });
                }
              }}
              disabled={addItemMutation.isPending || !newItem.itemName}
            >
              {addItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Workshops Tab

