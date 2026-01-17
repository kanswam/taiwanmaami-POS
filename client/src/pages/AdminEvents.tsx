import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Users, Phone, Mail, IndianRupee, Plus, Trash2, ArrowLeft, Eye } from "lucide-react";
import { Link } from "wouter";

const inquiryStatusColors: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  quoted: "bg-purple-500",
  confirmed: "bg-green-500",
  cancelled: "bg-red-500",
};

const orderStatusColors: Record<string, string> = {
  draft: "bg-gray-500",
  quoted: "bg-purple-500",
  confirmed: "bg-green-500",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

const workshopStatusColors: Record<string, string> = {
  draft: "bg-gray-500",
  published: "bg-green-500",
  cancelled: "bg-red-500",
  completed: "bg-emerald-500",
};

export default function AdminEvents() {
  const [activeTab, setActiveTab] = useState("inquiries");
  const [selectedInquiry, setSelectedInquiry] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [showCreateWorkshop, setShowCreateWorkshop] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Events & Workshops</h1>
              <p className="text-muted-foreground">Manage event inquiries, orders, and workshops</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            <TabsTrigger value="orders">Event Orders</TabsTrigger>
            <TabsTrigger value="workshops">Workshops</TabsTrigger>
          </TabsList>

          <TabsContent value="inquiries" className="mt-6">
            <InquiriesTab 
              selectedInquiry={selectedInquiry} 
              setSelectedInquiry={setSelectedInquiry}
              onCreateOrder={() => setShowCreateOrder(true)}
            />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <EventOrdersTab 
              selectedOrder={selectedOrder}
              setSelectedOrder={setSelectedOrder}
            />
          </TabsContent>

          <TabsContent value="workshops" className="mt-6">
            <WorkshopsTab 
              showCreate={showCreateWorkshop}
              setShowCreate={setShowCreateWorkshop}
            />
          </TabsContent>
        </Tabs>
      </div>

      <CreateOrderDialog 
        open={showCreateOrder} 
        onOpenChange={setShowCreateOrder}
        inquiryId={selectedInquiry}
      />
    </div>
  );
}

function InquiriesTab({ 
  selectedInquiry, 
  setSelectedInquiry,
  onCreateOrder 
}: { 
  selectedInquiry: number | null;
  setSelectedInquiry: (id: number | null) => void;
  onCreateOrder: () => void;
}) {
  const { data: inquiries, isLoading, refetch } = trpc.events.getInquiries.useQuery();
  const updateStatus = trpc.events.updateInquiryStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading inquiries...</div>;
  }

  if (!inquiries?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No event inquiries yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Inquiries submitted from the Events page will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Event Inquiries ({inquiries.length})</h2>
      </div>

      <div className="grid gap-4">
        {inquiries.map((inquiry) => (
          <Card key={inquiry.id} className={selectedInquiry === inquiry.id ? "ring-2 ring-primary" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{inquiry.customerName}</CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {inquiry.customerEmail}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {inquiry.customerPhone}
                    </span>
                  </CardDescription>
                </div>
                <Badge className={inquiryStatusColors[inquiry.status]}>
                  {inquiry.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Event Type:</span>
                  <p className="font-medium capitalize">{inquiry.eventType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{inquiry.eventDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Guests:</span>
                  <p className="font-medium">{inquiry.guestCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Catering:</span>
                  <p className="font-medium capitalize">{inquiry.cateringType.replace("_", " ")}</p>
                </div>
              </div>
              
              {inquiry.venue && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Venue:</span>
                  <p className="font-medium">{inquiry.venue}</p>
                </div>
              )}

              {inquiry.preferredItems && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Preferred Items:</span>
                  <p>{inquiry.preferredItems}</p>
                </div>
              )}

              {inquiry.specialRequirements && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Special Requirements:</span>
                  <p>{inquiry.specialRequirements}</p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Select
                  value={inquiry.status}
                  onValueChange={(value) => updateStatus.mutate({ 
                    id: inquiry.id, 
                    status: value as "new" | "contacted" | "quoted" | "confirmed" | "cancelled" 
                  })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedInquiry(inquiry.id);
                    onCreateOrder();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Order
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EventOrdersTab({ 
  selectedOrder,
  setSelectedOrder 
}: { 
  selectedOrder: number | null;
  setSelectedOrder: (id: number | null) => void;
}) {
  const { data: orders, isLoading, refetch } = trpc.events.getOrders.useQuery();
  const updateStatus = trpc.events.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success("Order status updated");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  if (!orders?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No event orders yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create orders from inquiries or directly
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Event Orders ({orders.length})</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono">{order.orderNumber}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                </div>
              </TableCell>
              <TableCell className="capitalize">{order.eventType}</TableCell>
              <TableCell>{order.eventDate}</TableCell>
              <TableCell>{order.guestCount}</TableCell>
              <TableCell>₹{((order.totalAmount || 0) / 100).toLocaleString()}</TableCell>
              <TableCell>
                <Badge className={orderStatusColors[order.status]}>
                  {order.status.replace("_", " ").toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedOrder(order.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Select
                    value={order.status}
                    onValueChange={(value) => updateStatus.mutate({ 
                      id: order.id, 
                      status: value as "draft" | "quoted" | "confirmed" | "in_progress" | "completed" | "cancelled"
                    })}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedOrder && (
        <OrderDetailsDialog 
          orderId={selectedOrder} 
          onClose={() => setSelectedOrder(null)}
          onUpdate={refetch}
        />
      )}
    </div>
  );
}

function WorkshopsTab({ 
  showCreate, 
  setShowCreate 
}: { 
  showCreate: boolean;
  setShowCreate: (show: boolean) => void;
}) {
  const { data: workshops, isLoading, refetch } = trpc.workshops.getAll.useQuery();
  const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);

  if (isLoading) {
    return <div className="text-center py-8">Loading workshops...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Workshops ({workshops?.length || 0})</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workshop
        </Button>
      </div>

      {!workshops?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No workshops yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first workshop to start selling tickets
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workshops.map((workshop) => (
            <Card key={workshop.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{workshop.title}</CardTitle>
                    <CardDescription>{workshop.shortDescription}</CardDescription>
                  </div>
                  <Badge className={workshopStatusColors[workshop.status]}>
                    {workshop.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{workshop.workshopDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{workshop.startTime} - {workshop.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{workshop.venue}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{workshop.bookedCount || 0} / {workshop.totalCapacity} booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span>₹{((workshop.price || 0) / 100).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedWorkshop(workshop.id)}
                  >
                    View Bookings
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateWorkshopDialog 
        open={showCreate} 
        onOpenChange={setShowCreate}
        onSuccess={refetch}
      />

      {selectedWorkshop && (
        <WorkshopBookingsDialog 
          workshopId={selectedWorkshop}
          onClose={() => setSelectedWorkshop(null)}
        />
      )}
    </div>
  );
}

function CreateOrderDialog({ 
  open, 
  onOpenChange,
  inquiryId 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiryId: number | null;
}) {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    companyName: "",
    eventType: "corporate" as const,
    eventDate: "",
    eventTime: "",
    venue: "",
    guestCount: 50,
    advancePercentage: 50,
  });

  const createOrder = trpc.events.createOrder.useMutation({
    onSuccess: () => {
      toast.success("Event order created");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = () => {
    createOrder.mutate({
      ...formData,
      inquiryId: inquiryId || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Event Order</DialogTitle>
          <DialogDescription>
            Create a new event order with custom pricing
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input 
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input 
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input 
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input 
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type *</Label>
              <Select 
                value={formData.eventType}
                onValueChange={(value: "wedding" | "corporate" | "school" | "private" | "other") => 
                  setFormData({ ...formData, eventType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Guest Count *</Label>
              <Input 
                type="number"
                value={formData.guestCount}
                onChange={(e) => setFormData({ ...formData, guestCount: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Date *</Label>
              <Input 
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Event Time</Label>
              <Input 
                type="time"
                value={formData.eventTime}
                onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Venue *</Label>
            <Input 
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Advance Percentage</Label>
            <Input 
              type="number"
              min={0}
              max={100}
              value={formData.advancePercentage}
              onChange={(e) => setFormData({ ...formData, advancePercentage: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createOrder.isPending}>
            {createOrder.isPending ? "Creating..." : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailsDialog({ 
  orderId, 
  onClose,
  onUpdate 
}: { 
  orderId: number;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { data: order, isLoading, refetch } = trpc.events.getOrder.useQuery({ id: orderId });
  const [newItem, setNewItem] = useState({
    itemType: "beverage" as const,
    itemName: "",
    quantity: 1,
    unitPrice: 0,
    notes: "",
  });

  const addItem = trpc.events.addOrderItem.useMutation({
    onSuccess: () => {
      toast.success("Item added");
      refetch();
      onUpdate();
      setNewItem({ itemType: "beverage", itemName: "", quantity: 1, unitPrice: 0, notes: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const removeItem = trpc.events.removeOrderItem.useMutation({
    onSuccess: () => {
      toast.success("Item removed");
      refetch();
      onUpdate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading || !order) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order {order.order.orderNumber}</DialogTitle>
          <DialogDescription>
            {order.order.customerName} - {order.order.eventType} on {order.order.eventDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Order Items</h3>
            {order.items.length === 0 ? (
              <p className="text-muted-foreground text-sm">No items added yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="capitalize">{item.itemType}</TableCell>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{((item.unitPrice || 0) / 100).toLocaleString()}</TableCell>
                      <TableCell>₹{((item.totalPrice || 0) / 100).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeItem.mutate({ itemId: item.id, eventOrderId: orderId })}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Add Item</h3>
            <div className="grid grid-cols-5 gap-4">
              <Select 
                value={newItem.itemType}
                onValueChange={(value: "beverage" | "food" | "staff" | "delivery" | "equipment" | "other") => 
                  setNewItem({ ...newItem, itemType: value })
                }
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
              <Input 
                placeholder="Item name"
                value={newItem.itemName}
                onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
              />
              <Input 
                type="number"
                placeholder="Qty"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              />
              <Input 
                type="number"
                placeholder="Unit Price (₹)"
                value={newItem.unitPrice / 100 || ""}
                onChange={(e) => setNewItem({ ...newItem, unitPrice: (parseFloat(e.target.value) || 0) * 100 })}
              />
              <Button 
                onClick={() => addItem.mutate({ eventOrderId: orderId, ...newItem })}
                disabled={!newItem.itemName || addItem.isPending}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Order Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{((order.order.subtotal || 0) / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18%):</span>
                <span>₹{((order.order.gstAmount || 0) / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-₹{((order.order.discountAmount || 0) / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>₹{((order.order.totalAmount || 0) / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Advance ({order.order.advancePercentage}%):</span>
                <span>₹{((order.order.advanceAmount || 0) / 100).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateWorkshopDialog({ 
  open, 
  onOpenChange,
  onSuccess 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    instructorName: "Theresa",
    workshopDate: "",
    startTime: "10:00",
    endTime: "13:00",
    duration: "3 hours",
    venue: "Taiwan Maami T Nagar",
    totalCapacity: 10,
    price: 150000,
    earlyBirdPrice: 120000,
    earlyBirdDeadline: "",
    status: "draft" as const,
  });

  const createWorkshop = trpc.workshops.create.useMutation({
    onSuccess: () => {
      toast.success("Workshop created");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = () => {
    createWorkshop.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Workshop</DialogTitle>
          <DialogDescription>
            Create a new workshop with ticket inventory
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input 
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Biang Biang Noodles Workshop"
            />
          </div>

          <div className="space-y-2">
            <Label>Short Description</Label>
            <Input 
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="Brief description for listings"
            />
          </div>

          <div className="space-y-2">
            <Label>Full Description *</Label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed workshop description"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Instructor Name *</Label>
              <Input 
                value={formData.instructorName}
                onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input 
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 3 hours"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Workshop Date *</Label>
              <Input 
                type="date"
                value={formData.workshopDate}
                onChange={(e) => setFormData({ ...formData, workshopDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input 
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input 
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Venue *</Label>
            <Input 
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Capacity *</Label>
              <Input 
                type="number"
                value={formData.totalCapacity}
                onChange={(e) => setFormData({ ...formData, totalCapacity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Price (₹) *</Label>
              <Input 
                type="number"
                value={formData.price / 100}
                onChange={(e) => setFormData({ ...formData, price: (parseFloat(e.target.value) || 0) * 100 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Early Bird Price (₹)</Label>
              <Input 
                type="number"
                value={(formData.earlyBirdPrice || 0) / 100}
                onChange={(e) => setFormData({ ...formData, earlyBirdPrice: (parseFloat(e.target.value) || 0) * 100 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Early Bird Deadline</Label>
              <Input 
                type="date"
                value={formData.earlyBirdDeadline}
                onChange={(e) => setFormData({ ...formData, earlyBirdDeadline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(value: "draft" | "published" | "cancelled" | "completed") => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createWorkshop.isPending}>
            {createWorkshop.isPending ? "Creating..." : "Create Workshop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkshopBookingsDialog({ 
  workshopId, 
  onClose 
}: { 
  workshopId: number;
  onClose: () => void;
}) {
  const { data: bookings, isLoading, refetch } = trpc.workshops.getBookings.useQuery({ workshopId });
  const { data: workshopDates } = trpc.workshops.getWorkshopDates.useQuery({ workshopId });
  const updatePayment = trpc.workshops.updateBookingPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment status updated");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateAttendance = trpc.workshops.updateBookingAttendance.useMutation({
    onSuccess: () => {
      toast.success("Attendance updated");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Helper to get date display for a booking
  const getDateDisplay = (booking: any) => {
    if (booking.workshopDateId && workshopDates) {
      const dateInfo = workshopDates.find(d => d.id === booking.workshopDateId);
      if (dateInfo) {
        return new Date(dateInfo.sessionDate).toLocaleDateString('en-IN', { 
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });
      }
    }
    return 'N/A';
  };
  
  // Group bookings by date
  const bookingsByDate = bookings?.reduce((acc, booking) => {
    const dateKey = booking.workshopDateId || 'unassigned';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(booking);
    return acc;
  }, {} as Record<string | number, typeof bookings>) || {};

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workshop Bookings</DialogTitle>
          <DialogDescription>
            Manage bookings and attendance
          </DialogDescription>
        </DialogHeader>
        
        {/* Date Summary Cards */}
        {workshopDates && workshopDates.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {workshopDates.map(date => (
              <div key={date.id} className="bg-muted p-3 rounded-lg text-center">
                <p className="font-semibold">
                  {new Date(date.sessionDate).toLocaleDateString('en-IN', { 
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {date.bookedCount}/{date.maxCapacity} booked
                </p>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center">Loading bookings...</div>
        ) : !bookings?.length ? (
          <div className="py-8 text-center text-muted-foreground">No bookings yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Attended</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono">{booking.bookingNumber}</TableCell>
                  <TableCell>
                    <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded">
                      {getDateDisplay(booking)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.customerName}</p>
                      <p className="text-xs text-muted-foreground">{booking.customerEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>{booking.ticketCount}</TableCell>
                  <TableCell>₹{(booking.totalAmount || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Select
                      value={booking.paymentStatus}
                      onValueChange={(value: "pending" | "paid" | "refunded") => 
                        updatePayment.mutate({ workshopId, bookingId: booking.id, paymentStatus: value })
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={booking.attended || false}
                      onChange={(e) => 
                        updateAttendance.mutate({ workshopId, bookingId: booking.id, attended: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
