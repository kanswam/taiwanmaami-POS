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

export default function ComplaintsTab() {
  const { data: complaints, refetch } = trpc.complaints.getAll.useQuery();
  const { data: stats } = trpc.complaints.getStats.useQuery();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolutionType, setResolutionType] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState('');
  const [storeCreditAmount, setStoreCreditAmount] = useState('');

  const updateStatus = trpc.complaints.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Complaint status updated');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resolveComplaint = trpc.complaints.resolve.useMutation({
    onSuccess: () => {
      toast.success('Complaint resolved successfully');
      refetch();
      setResolvingId(null);
      setResolution('');
      setResolutionType('');
      setRefundAmount('');
      setStoreCreditAmount('');
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteComplaint = trpc.complaints.delete.useMutation({
    onSuccess: () => {
      toast.success('Complaint deleted');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredComplaints = complaints?.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    return true;
  }) || [];

  const statusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const complaintTypeLabels: Record<string, string> = {
    delivery_issue: 'Delivery Issue',
    quality_issue: 'Quality Issue',
    missing_item: 'Missing Item',
    wrong_order: 'Wrong Order',
    late_delivery: 'Late Delivery',
    payment_issue: 'Payment Issue',
    staff_behavior: 'Staff Behavior',
    other: 'Other',
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </Card>
          <Card className="p-4 text-center border-red-200 bg-red-50">
            <p className="text-2xl font-bold text-red-600">{stats.open}</p>
            <p className="text-xs text-red-600">Open</p>
          </Card>
          <Card className="p-4 text-center border-yellow-200 bg-yellow-50">
            <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            <p className="text-xs text-yellow-600">In Progress</p>
          </Card>
          <Card className="p-4 text-center border-green-200 bg-green-50">
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-xs text-green-600">Resolved</p>
          </Card>
          <Card className="p-4 text-center border-gray-200 bg-gray-50">
            <p className="text-2xl font-bold text-gray-600">{stats.closed}</p>
            <p className="text-xs text-gray-600">Closed</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-xl font-semibold">Customer Complaints</h2>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredComplaints.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No complaints found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((complaint) => (
            <Card key={complaint.id} className="p-4">
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{complaint.customerName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[complaint.status]}`}>
                        {complaint.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[complaint.priority]}`}>
                        {complaint.priority}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {complaint.customerEmail && <span>{complaint.customerEmail} • </span>}
                      {complaint.customerPhone && <span>{complaint.customerPhone} • </span>}
                      {complaint.orderNumber && <span>Order #{complaint.orderNumber}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* Complaint Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium bg-secondary px-2 py-0.5 rounded">
                      {complaintTypeLabels[complaint.complaintType] || complaint.complaintType}
                    </span>
                  </div>
                  <p className="text-sm">{complaint.description}</p>
                </div>

                {/* Resolution (if resolved) */}
                {complaint.resolution && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Resolved</span>
                      {complaint.resolutionType && (
                        <span className="text-xs bg-green-100 px-2 py-0.5 rounded text-green-700">
                          {complaint.resolutionType.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-green-800">{complaint.resolution}</p>
                    {(complaint.refundAmount || complaint.storeCreditAmount) && (
                      <div className="mt-2 flex gap-4 text-sm">
                        {complaint.refundAmount && (
                          <span className="text-green-700">Refund: ₹{(complaint.refundAmount / 100).toFixed(2)}</span>
                        )}
                        {complaint.storeCreditAmount && (
                          <span className="text-green-700">Store Credit: ₹{(complaint.storeCreditAmount / 100).toFixed(2)}</span>
                        )}
                      </div>
                    )}
                    {complaint.resolvedByName && (
                      <p className="text-xs text-green-600 mt-1">Resolved by {complaint.resolvedByName}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {complaint.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ complaintId: complaint.id, status: 'in_progress' })}
                    >
                      Mark In Progress
                    </Button>
                  )}
                  {(complaint.status === 'open' || complaint.status === 'in_progress') && (
                    <Dialog open={resolvingId === complaint.id} onOpenChange={(open) => { if (!open) setResolvingId(null); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="default" onClick={() => setResolvingId(complaint.id)}>
                          <Check className="w-4 h-4 mr-1" />
                          Resolve
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Resolve Complaint</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Resolution Type *</Label>
                            <Select value={resolutionType} onValueChange={setResolutionType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select resolution type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="refund">Issue Refund</SelectItem>
                                <SelectItem value="store_credit">Give Store Credit</SelectItem>
                                <SelectItem value="replacement">Replacement/Reorder</SelectItem>
                                <SelectItem value="apology">Apology Only</SelectItem>
                                <SelectItem value="no_action">No Action Needed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {resolutionType === 'refund' && (
                            <div>
                              <Label>Refund Amount (₹)</Label>
                              <Input
                                type="number"
                                placeholder="e.g., 250"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                              />
                            </div>
                          )}

                          {resolutionType === 'store_credit' && (
                            <div>
                              <Label>Store Credit Amount (₹)</Label>
                              <Input
                                type="number"
                                placeholder="e.g., 100"
                                value={storeCreditAmount}
                                onChange={(e) => setStoreCreditAmount(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                This will be added to the customer's account balance
                              </p>
                            </div>
                          )}

                          <div>
                            <Label>Resolution Notes *</Label>
                            <Textarea
                              value={resolution}
                              onChange={(e) => setResolution(e.target.value)}
                              placeholder="Describe how the complaint was resolved..."
                              rows={3}
                            />
                          </div>

                          <Button
                            className="w-full"
                            disabled={!resolutionType || !resolution.trim()}
                            onClick={() => {
                              resolveComplaint.mutate({
                                complaintId: complaint.id,
                                resolution,
                                resolutionType: resolutionType as any,
                                refundAmount: refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined,
                                storeCreditAmount: storeCreditAmount ? Math.round(parseFloat(storeCreditAmount) * 100) : undefined,
                              });
                            }}
                          >
                            Resolve Complaint
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {complaint.status === 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ complaintId: complaint.id, status: 'closed' })}
                    >
                      Close Complaint
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this complaint?')) {
                        deleteComplaint.mutate({ complaintId: complaint.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Customers Tab Component

