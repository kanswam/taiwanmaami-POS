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

export default function WorkshopsTab() {
  const utils = trpc.useUtils();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    instructorName: "",
    workshopDate: "",
    startTime: "",
    endTime: "",
    duration: "",
    venue: "",
    totalCapacity: 20,
    price: 0,
    earlyBirdPrice: 0,
    earlyBirdDeadline: "",
    imageUrl: "",
    status: "draft" as const,
  });

  const { data: workshops, isLoading } = trpc.workshops.getAll.useQuery();

  const createMutation = trpc.workshops.create.useMutation({
    onSuccess: () => {
      toast.success("Workshop created successfully");
      utils.workshops.getAll.invalidate();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.workshops.update.useMutation({
    onSuccess: () => {
      toast.success("Workshop updated successfully");
      utils.workshops.getAll.invalidate();
      setEditingWorkshop(null);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.workshops.delete.useMutation({
    onSuccess: () => {
      toast.success("Workshop deleted successfully");
      utils.workshops.getAll.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleDelete = (workshop: any) => {
    if (window.confirm(`Are you sure you want to delete "${workshop.title}"? This action cannot be undone.`)) {
      deleteMutation.mutate({ id: workshop.id });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      shortDescription: "",
      description: "",
      instructorName: "",
      workshopDate: "",
      startTime: "",
      endTime: "",
      duration: "",
      venue: "",
      totalCapacity: 20,
      price: 0,
      earlyBirdPrice: 0,
      earlyBirdDeadline: "",
      imageUrl: "",
      status: "draft",
    });
  };

  const openEditDialog = (workshop: any) => {
    setEditingWorkshop(workshop);
    // Convert Date objects to strings for the form
    const formatDateForInput = (date: any) => {
      if (!date) return "";
      if (typeof date === 'string') return date;
      if (date instanceof Date) return date.toISOString().split('T')[0];
      return String(date);
    };
    setFormData({
      title: workshop.title,
      shortDescription: workshop.shortDescription || "",
      description: workshop.description,
      instructorName: workshop.instructorName,
      workshopDate: formatDateForInput(workshop.workshopDate),
      startTime: workshop.startTime,
      endTime: workshop.endTime,
      duration: workshop.duration || "",
      venue: workshop.venue,
      totalCapacity: workshop.totalCapacity,
      price: workshop.price / 100,
      earlyBirdPrice: workshop.earlyBirdPrice ? workshop.earlyBirdPrice / 100 : 0,
      earlyBirdDeadline: formatDateForInput(workshop.earlyBirdDeadline),
      imageUrl: workshop.imageUrl || "",
      status: workshop.status,
    });
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    published: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Workshops</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Workshop
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading workshops...</div>
      ) : !workshops?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          No workshops found. Create your first workshop.
        </Card>
      ) : (
        <div className="grid gap-4">
          {workshops.map((workshop: any) => (
            <Card key={workshop.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {workshop.imageUrl && (
                    <img 
                      src={workshop.imageUrl} 
                      alt={workshop.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{workshop.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[workshop.status]}`}>
                        {workshop.status.charAt(0).toUpperCase() + workshop.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{workshop.shortDescription}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {workshop.workshopDate instanceof Date ? workshop.workshopDate.toLocaleDateString() : workshop.workshopDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {workshop.startTime} - {workshop.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {workshop.bookedCount || 0}/{workshop.totalCapacity || workshop.maxCapacity || 0} booked
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-semibold">₹{(workshop.price / 100).toLocaleString()}</span>
                      {workshop.earlyBirdPrice && (
                        <span className="text-green-600">
                          Early Bird: ₹{(workshop.earlyBirdPrice / 100).toLocaleString()} (until {workshop.earlyBirdDeadline})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(workshop)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(workshop)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Workshop Dialog */}
      <Dialog open={showCreateDialog || !!editingWorkshop} onOpenChange={() => {
        setShowCreateDialog(false);
        setEditingWorkshop(null);
        resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWorkshop ? "Edit Workshop" : "Create Workshop"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Bubble Tea Making Masterclass"
              />
            </div>
            <div>
              <Label>Short Description</Label>
              <Input
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="Brief description for listings"
              />
            </div>
            <div>
              <Label>Full Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed workshop description"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Instructor Name *</Label>
                <Input
                  value={formData.instructorName}
                  onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
                />
              </div>
              <div>
                <Label>Venue *</Label>
                <Input
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.workshopDate}
                  onChange={(e) => setFormData({ ...formData, workshopDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration</Label>
                <Input
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g., 3 hours"
                />
              </div>
              <div>
                <Label>Total Capacity *</Label>
                <Input
                  type="number"
                  value={formData.totalCapacity}
                  onChange={(e) => setFormData({ ...formData, totalCapacity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (₹) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Early Bird Price (₹)</Label>
                <Input
                  type="number"
                  value={formData.earlyBirdPrice}
                  onChange={(e) => setFormData({ ...formData, earlyBirdPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Early Bird Deadline</Label>
                <Input
                  type="date"
                  value={formData.earlyBirdDeadline}
                  onChange={(e) => setFormData({ ...formData, earlyBirdDeadline: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select 
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingWorkshop(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const data = {
                  ...formData,
                  price: Math.round(formData.price * 100),
                  earlyBirdPrice: formData.earlyBirdPrice ? Math.round(formData.earlyBirdPrice * 100) : undefined,
                };
                if (editingWorkshop) {
                  updateMutation.mutate({ id: editingWorkshop.id, ...data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending || !formData.title || !formData.description || !formData.instructorName || !formData.workshopDate || !formData.startTime || !formData.endTime || !formData.venue || !formData.price}
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingWorkshop ? "Update Workshop" : "Create Workshop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Workshop Bookings Tab

