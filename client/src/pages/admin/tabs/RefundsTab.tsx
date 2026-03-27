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

export default function RefundsTab() {
  const { data: pendingRefunds, refetch: refetchPending } = trpc.refunds.getPending.useQuery();
  const { data: allRefunds, refetch: refetchAll } = trpc.refunds.getAll.useQuery();
  const reviewRefund = trpc.refunds.review.useMutation({
    onSuccess: (data) => {
      toast.success(`Refund ${data.status}!`);
      refetchPending();
      refetchAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [activeView, setActiveView] = useState<'pending' | 'all'>('pending');

  const handleReview = (action: 'approve' | 'reject') => {
    if (!selectedRefund) return;
    reviewRefund.mutate({
      requestId: selectedRefund.id,
      action,
      reviewNotes,
    });
    setSelectedRefund(null);
    setReviewNotes('');
  };

  const formatDate = (date: any) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const refundsToShow = activeView === 'pending' ? pendingRefunds : allRefunds;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Refund Requests</h2>
          <p className="text-muted-foreground">Review and approve/reject refund requests from staff</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeView === 'pending' ? 'default' : 'outline'} 
            onClick={() => setActiveView('pending')}
            size="sm"
          >
            Pending ({pendingRefunds?.length || 0})
          </Button>
          <Button 
            variant={activeView === 'all' ? 'default' : 'outline'} 
            onClick={() => setActiveView('all')}
            size="sm"
          >
            All Requests
          </Button>
        </div>
      </div>

      {(!refundsToShow || refundsToShow.length === 0) ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {activeView === 'pending' ? 'No pending refund requests' : 'No refund requests yet'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {refundsToShow.map((refund: any) => (
            <Card key={refund.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Order #{refund.orderNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      refund.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      refund.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {refund.status.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      refund.refundType === 'full' ? 'bg-blue-100 text-blue-800' :
                      refund.refundType === 'partial' ? 'bg-purple-100 text-purple-800' :
                      'bg-teal-100 text-teal-800'
                    }`}>
                      {refund.refundType === 'store_credit' ? 'Store Credit' : refund.refundType}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-primary">₹{(refund.refundAmount / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{refund.refundReason}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested by {refund.requestedByName} on {formatDate(refund.createdAt)}
                  </p>
                  {refund.reviewedByName && (
                    <p className="text-xs text-muted-foreground">
                      {refund.status === 'approved' ? 'Approved' : 'Rejected'} by {refund.reviewedByName} on {formatDate(refund.reviewedAt)}
                    </p>
                  )}
                  {refund.reviewNotes && (
                    <p className="text-sm italic mt-2">Notes: {refund.reviewNotes}</p>
                  )}
                </div>
                {refund.status === 'pending' && (
                  <Button onClick={() => setSelectedRefund(refund)} size="sm">
                    Review
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedRefund} onOpenChange={(open) => !open && setSelectedRefund(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Refund Request</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>Order:</strong> #{selectedRefund.orderNumber}</p>
                <p><strong>Amount:</strong> ₹{(selectedRefund.refundAmount / 100).toFixed(2)}</p>
                <p><strong>Type:</strong> {selectedRefund.refundType === 'store_credit' ? 'Store Credit' : selectedRefund.refundType}</p>
                <p><strong>Reason:</strong> {selectedRefund.refundReason}</p>
                <p><strong>Requested by:</strong> {selectedRefund.requestedByName}</p>
              </div>
              <div>
                <Label>Review Notes (optional)</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  className="mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedRefund(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleReview('reject')}
              disabled={reviewRefund.isPending}
            >
              Reject
            </Button>
            <Button 
              onClick={() => handleReview('approve')}
              disabled={reviewRefund.isPending}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Payment Report Tab

