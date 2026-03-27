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

export default function LeelaRegistrationsTab() {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: registrations, isLoading, refetch } = trpc.popup.getRegistrations.useQuery({
    eventSlug: 'leela-hyderabad-march-2026',
    eventType: filterType === 'all' ? undefined : filterType as 'dinner' | 'masterclass',
  });

  const updateStatus = trpc.popup.updateRegistrationStatus.useMutation({
    onSuccess: () => {
      toast.success('Registration status updated');
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredRegistrations = (registrations || []).filter((r: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.customerName?.toLowerCase().includes(q) ||
      r.customerEmail?.toLowerCase().includes(q) ||
      r.customerPhone?.toLowerCase().includes(q)
    );
  });

  const dinnerCount = (registrations || []).filter((r: any) => r.eventType === 'dinner').length;
  const masterclassCount = (registrations || []).filter((r: any) => r.eventType === 'masterclass').length;
  const totalGuests = (registrations || []).reduce((sum: number, r: any) => sum + (r.numberOfGuests || 1), 0);
  const confirmedCount = (registrations || []).filter((r: any) => r.status === 'confirmed').length;

  const [exporting, setExporting] = useState(false);

  const exportExcel = async () => {
    if (!filteredRegistrations.length) return;
    setExporting(true);
    try {
      const response = await fetch('/api/export/leela-registrations', { credentials: 'include' });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Leela_Hyderabad_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Excel exported successfully');
    } catch (err) {
      toast.error('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500" />
            The Leela Hyderabad — Registrations
          </h2>
          <p className="text-muted-foreground mt-1">
            Taiwan Maami's Edible Journey · 5–8 March 2026
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!filteredRegistrations.length || exporting}>
            <Download className="w-4 h-4 mr-2" /> {exporting ? 'Exporting...' : 'Export Excel'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Registrations</div>
          <div className="text-3xl font-bold mt-1">{(registrations || []).length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Dinner</div>
          <div className="text-3xl font-bold mt-1 text-amber-600">{dinnerCount}</div>
          <div className="text-xs text-muted-foreground">5–8 March · 7PM–12AM</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Master Class</div>
          <div className="text-3xl font-bold mt-1 text-emerald-600">{masterclassCount}</div>
          <div className="text-xs text-muted-foreground">6–8 March · 1PM–3PM</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Guests</div>
          <div className="text-3xl font-bold mt-1">{totalGuests}</div>
          <div className="text-xs text-muted-foreground">{confirmedCount} confirmed</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="dinner">Dinner Only</SelectItem>
            <SelectItem value="masterclass">Master Class Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Registrations Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading registrations...</div>
      ) : filteredRegistrations.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-2">No registrations yet</h3>
          <p className="text-muted-foreground">
            Registrations will appear here as customers sign up for the event.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Contact</th>
                  <th className="text-left p-3 font-medium">Event</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-center p-3 font-medium">Guests</th>
                  <th className="text-left p-3 font-medium">Notes</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map((reg: any) => (
                  <tr key={reg.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{reg.customerName}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <a href={`mailto:${reg.customerEmail}`} className="text-blue-600 hover:underline text-xs">
                          {reg.customerEmail}
                        </a>
                        <a href={`tel:${reg.customerPhone}`} className="text-muted-foreground hover:text-foreground text-xs">
                          {reg.customerPhone}
                        </a>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        reg.eventType === 'dinner' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {reg.eventType === 'dinner' ? 'Dinner' : 'Master Class'}
                      </span>
                    </td>
                    <td className="p-3 text-xs">{reg.selectedDate}</td>
                    <td className="p-3 text-center font-medium">{reg.numberOfGuests}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate" title={reg.specialRequirements || ''}>
                      {reg.specialRequirements || '—'}
                    </td>
                    <td className="p-3 text-center">
                      <Select 
                        value={reg.status} 
                        onValueChange={(val) => updateStatus.mutate({ id: reg.id, status: val as any })}
                      >
                        <SelectTrigger className="h-7 text-xs w-[110px] mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registered">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500" /> Registered
                            </span>
                          </SelectItem>
                          <SelectItem value="confirmed">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500" /> Confirmed
                            </span>
                          </SelectItem>
                          <SelectItem value="cancelled">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500" /> Cancelled
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(reg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

