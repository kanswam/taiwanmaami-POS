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

export default function EventInquiriesTab() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");

  const { data: inquiries, isLoading } = trpc.events.getInquiries.useQuery({ status: statusFilter as "all" | "new" | "contacted" | "quoted" | "confirmed" | "cancelled" | undefined });
  
  const updateStatusMutation = trpc.events.updateInquiryStatus.useMutation({
    onSuccess: () => {
      toast.success("Inquiry updated successfully");
      utils.events.getInquiries.invalidate();
      setSelectedInquiry(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteInquiryMutation = trpc.events.deleteInquiry.useMutation({
    onSuccess: () => {
      toast.success("Inquiry deleted successfully");
      utils.events.getInquiries.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleDeleteInquiry = (inquiry: any) => {
    if (window.confirm(`Are you sure you want to delete the inquiry from "${inquiry.customerName}"? This action cannot be undone.`)) {
      deleteInquiryMutation.mutate({ id: inquiry.id });
    }
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800",
    contacted: "bg-yellow-100 text-yellow-800",
    quoted: "bg-purple-100 text-purple-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const eventTypeLabels: Record<string, string> = {
    wedding: "Wedding",
    corporate: "Corporate",
    school: "School",
    private: "Private Party",
    other: "Other",
  };

  const cateringTypeLabels: Record<string, string> = {
    beverages_only: "Beverages Only",
    food_only: "Food Only",
    both: "Food & Beverages",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Event Inquiries</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading inquiries...</div>
      ) : !inquiries?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          No event inquiries found.
        </Card>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry: any) => (
            <Card key={inquiry.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{inquiry.customerName}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[inquiry.status]}`}>
                      {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {eventTypeLabels[inquiry.eventType] || inquiry.eventType}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {inquiry.customerEmail}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {inquiry.customerPhone}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {inquiry.eventDate}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {inquiry.guestCount} guests
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {inquiry.venue}
                    </span>
                    <span className="text-muted-foreground">
                      {cateringTypeLabels[inquiry.cateringType]}
                    </span>
                    {inquiry.budgetRange && (
                      <span className="text-muted-foreground">Budget: {inquiry.budgetRange}</span>
                    )}
                  </div>
                  {inquiry.preferredItems && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Preferred Items:</strong> {inquiry.preferredItems}
                    </p>
                  )}
                  {inquiry.specialRequirements && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Special Requirements:</strong> {inquiry.specialRequirements}
                    </p>
                  )}
                  {inquiry.adminNotes && (
                    <p className="text-sm bg-yellow-50 p-2 rounded">
                      <strong>Admin Notes:</strong> {inquiry.adminNotes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Submitted: {new Date(inquiry.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedInquiry(inquiry);
                      setAdminNotes(inquiry.adminNotes || "");
                      setNewStatus(inquiry.status);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Update
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteInquiry(inquiry)}
                    disabled={deleteInquiryMutation.isPending}
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

      {/* Update Inquiry Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Inquiry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
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
            </div>
            <div>
              <Label>Admin Notes</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this inquiry..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInquiry(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedInquiry) {
                  updateStatusMutation.mutate({
                    id: selectedInquiry.id,
                    status: newStatus as any,
                    internalNotes: adminNotes,
                  });
                }
              }}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Event Orders Tab

