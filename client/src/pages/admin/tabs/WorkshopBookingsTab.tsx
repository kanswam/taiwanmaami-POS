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

export default function WorkshopBookingsTab() {
  const utils = trpc.useUtils();
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<number | null>(null);

  const { data: workshops } = trpc.workshops.getAll.useQuery();
  const { data: bookings, isLoading } = trpc.workshops.getBookings.useQuery(
    { workshopId: selectedWorkshopId! },
    { enabled: !!selectedWorkshopId }
  );
  const { data: workshopDates } = trpc.workshops.getWorkshopDates.useQuery(
    { workshopId: selectedWorkshopId! },
    { enabled: !!selectedWorkshopId }
  );

  const updatePaymentMutation = trpc.workshops.updateBookingPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment status updated");
      utils.workshops.getBookings.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateAttendanceMutation = trpc.workshops.updateAttendance.useMutation({
    onSuccess: () => {
      toast.success("Attendance updated");
      utils.workshops.getBookings.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelBookingMutation = trpc.workshops.cancelBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled and spot released");
      utils.workshops.getBookings.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Helper to get time since booking
  const getTimeSinceBooking = (createdAt: string | Date) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return `${diffMins}m ago`;
  };

  // Helper to get workshop date display
  const getDateDisplay = (booking: any) => {
    if (booking.workshopDateId && workshopDates) {
      const dateInfo = workshopDates.find((d: any) => d.id === booking.workshopDateId);
      if (dateInfo) {
        return new Date(dateInfo.sessionDate).toLocaleDateString('en-IN', { 
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });
      }
    }
    // Fallback to workshop's main date
    const workshop = workshops?.find((w: any) => w.id === selectedWorkshopId);
    if (workshop?.workshopDate) {
      return new Date(workshop.workshopDate).toLocaleDateString('en-IN', { 
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    }
    return 'N/A';
  };

  const paymentStatusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    refunded: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const attendanceColors: Record<string, string> = {
    not_attended: "bg-gray-100 text-gray-800",
    attended: "bg-green-100 text-green-800",
    no_show: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Workshop Bookings</h2>
        <Select 
          value={selectedWorkshopId?.toString() || ""} 
          onValueChange={(value) => setSelectedWorkshopId(value ? parseInt(value) : null)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a workshop" />
          </SelectTrigger>
          <SelectContent>
            {workshops?.map((workshop: any) => (
              <SelectItem key={workshop.id} value={workshop.id.toString()}>
                {workshop.title} ({workshop.workshopDate instanceof Date ? workshop.workshopDate.toLocaleDateString() : workshop.workshopDate})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedWorkshopId ? (
        <Card className="p-8 text-center text-muted-foreground">
          Select a workshop to view its bookings.
        </Card>
      ) : isLoading ? (
        <div className="text-center py-8">Loading bookings...</div>
      ) : !bookings?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          No bookings found for this workshop.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Booking #</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-center p-3">Tickets</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-center p-3">Payment</th>
                <th className="text-center p-3">Attendance</th>
                <th className="text-left p-3">Booked</th>
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking: any) => {
                const timeSince = getTimeSinceBooking(booking.createdAt);
                const isStale = booking.paymentStatus === 'pending' && 
                  (new Date().getTime() - new Date(booking.createdAt).getTime()) > 2 * 60 * 60 * 1000;
                return (
                <tr key={booking.id} className={`border-b ${isStale ? 'bg-red-50' : ''}`}>
                  <td className="p-3">
                    <div className="font-mono text-sm">{booking.bookingNumber}</div>
                    {booking.paymentId && (
                      <div className="text-xs text-muted-foreground">Pay: {booking.paymentId}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded">
                      {getDateDisplay(booking)}
                    </span>
                  </td>
                  <td className="p-3">{booking.customerName}</td>
                  <td className="p-3 text-sm">
                    <div>{booking.customerEmail}</div>
                    <div className="text-muted-foreground">{booking.customerPhone}</div>
                  </td>
                  <td className="p-3 text-center">{booking.ticketCount}</td>
                  <td className="p-3 text-right">₹{((booking.totalAmount || 0) / 100).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Select
                        value={booking.paymentStatus}
                        onValueChange={(value) => updatePaymentMutation.mutate({
                          bookingId: booking.id,
                          paymentStatus: value as any,
                        })}
                      >
                        <SelectTrigger className={`w-28 h-8 text-xs ${paymentStatusColors[booking.paymentStatus]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      {!booking.paymentId && booking.paymentStatus === 'pending' && (
                        <span className="text-xs text-red-600">⚠ No payment</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Select
                      value={booking.attendedStatus}
                      onValueChange={(value) => updateAttendanceMutation.mutate({
                        bookingId: booking.id,
                        attendedStatus: value as any,
                      })}
                    >
                      <SelectTrigger className={`w-28 h-8 text-xs ${attendanceColors[booking.attendedStatus]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_attended">Not Attended</SelectItem>
                        <SelectItem value="attended">Attended</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <div className={`text-sm ${isStale ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                      {timeSince}
                      {isStale && <span className="block text-xs">⚠️ Unpaid</span>}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      onClick={() => {
                        if (confirm(`Cancel booking for ${booking.customerName}? This will release the spot.`)) {
                          cancelBookingMutation.mutate({ bookingId: booking.id });
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}


// Database Backup Tab Component

