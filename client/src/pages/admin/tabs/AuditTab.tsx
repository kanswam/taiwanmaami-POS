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

export default function AuditTab() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const { data: auditLogs, isLoading } = trpc.audit.getProductLogs.useQuery({
    action: actionFilter !== 'all' ? actionFilter as any : undefined,
    startDate: dateRange.start,
    endDate: dateRange.end + 'T23:59:59',
    limit: 200,
  });

  const { data: summary } = trpc.audit.getSummary.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end + 'T23:59:59',
  });

  const { data: productHistory } = trpc.audit.getProductHistory.useQuery(
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
  );

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      deactivate: 'bg-orange-100 text-orange-800',
      reactivate: 'bg-emerald-100 text-emerald-800',
      stock_in: 'bg-teal-100 text-teal-800',
      stock_out: 'bg-amber-100 text-amber-800',
      price_change: 'bg-purple-100 text-purple-800',
      image_change: 'bg-indigo-100 text-indigo-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      deactivate: 'Deactivated',
      reactivate: 'Reactivated',
      stock_in: 'Stock In',
      stock_out: 'Stock Out',
      price_change: 'Price Changed',
      image_change: 'Image Changed',
    };
    return labels[action] || action;
  };

  // Export audit logs to CSV
  const exportToCSV = () => {
    if (!auditLogs?.logs || auditLogs.logs.length === 0) {
      toast.error('No audit logs to export');
      return;
    }

    const headers = ['Date', 'Product', 'Action', 'Field Changed', 'Old Value', 'New Value', 'Changed By'];
    const rows = auditLogs.logs.map(log => [
      formatDate(log.createdAt),
      log.productName,
      getActionLabel(log.action),
      log.fieldChanged || '-',
      log.oldValue?.replace(/"/g, '') || '-',
      log.newValue?.replace(/"/g, '') || '-',
      log.userName || 'System',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${dateRange.start}-to-${dateRange.end}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Audit log exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Changes</div>
          <div className="text-3xl font-bold text-blue-900 mt-2">{auditLogs?.total || 0}</div>
          <div className="text-xs text-blue-600 mt-1">In selected period</div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm text-green-600 font-medium">Products Created</div>
          <div className="text-3xl font-bold text-green-900 mt-2">
            {summary?.byAction.find(a => a.action === 'create')?.count || 0}
          </div>
        </Card>

        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="text-sm text-orange-600 font-medium">Stock Changes</div>
          <div className="text-3xl font-bold text-orange-900 mt-2">
            {(summary?.byAction.find(a => a.action === 'stock_in')?.count || 0) +
             (summary?.byAction.find(a => a.action === 'stock_out')?.count || 0)}
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="text-sm text-purple-600 font-medium">Price Changes</div>
          <div className="text-3xl font-bold text-purple-900 mt-2">
            {summary?.byAction.find(a => a.action === 'price_change')?.count || 0}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Filters:</span>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">Action:</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="deactivate">Deactivated</SelectItem>
                <SelectItem value="reactivate">Reactivated</SelectItem>
                <SelectItem value="stock_in">Stock In</SelectItem>
                <SelectItem value="stock_out">Stock Out</SelectItem>
                <SelectItem value="price_change">Price Change</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">From:</Label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">To:</Label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-40"
            />
          </div>

          <div className="ml-auto">
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={!auditLogs?.logs || auditLogs.logs.length === 0}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Activity by User */}
      {summary?.byUser && summary.byUser.length > 0 && (
        <Card className="p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Activity by User
          </h3>
          <div className="flex flex-wrap gap-4">
            {summary.byUser.map((user, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <span className="font-medium">{user.userName}</span>
                <span className="text-sm text-muted-foreground">({user.count} changes)</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Audit Log Table */}
      <Card className="p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Change History
        </h3>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
        ) : auditLogs?.logs && auditLogs.logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium">Date & Time</th>
                  <th className="text-left py-3 px-4 font-medium">Product</th>
                  <th className="text-left py-3 px-4 font-medium">Action</th>
                  <th className="text-left py-3 px-4 font-medium">Field</th>
                  <th className="text-left py-3 px-4 font-medium">Old Value</th>
                  <th className="text-left py-3 px-4 font-medium">New Value</th>
                  <th className="text-left py-3 px-4 font-medium">Changed By</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        className="font-medium text-primary hover:underline"
                        onClick={() => setSelectedProductId(log.productId)}
                      >
                        {log.productName}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {log.fieldChanged || '-'}
                    </td>
                    <td className="py-3 px-4 max-w-32 truncate" title={log.oldValue || ''}>
                      {log.oldValue ? (
                        <span className="text-red-600">{log.oldValue.replace(/"/g, '')}</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 max-w-32 truncate" title={log.newValue || ''}>
                      {log.newValue ? (
                        <span className="text-green-600">{log.newValue.replace(/"/g, '')}</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {log.userName || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No audit logs found for the selected filters
          </div>
        )}
      </Card>

      {/* Product History Dialog */}
      <Dialog open={!!selectedProductId} onOpenChange={() => setSelectedProductId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Product Change History
            </DialogTitle>
          </DialogHeader>

          {productHistory && productHistory.length > 0 ? (
            <div className="space-y-3">
              {productHistory.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                    {getActionLabel(log.action)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{log.fieldChanged || 'Product'}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                    </div>
                    {log.oldValue && log.newValue && (
                      <div className="text-sm mt-1">
                        <span className="text-red-600 line-through">{log.oldValue.replace(/"/g, '')}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{log.newValue.replace(/"/g, '')}</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      by {log.userName || 'System'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No history found for this product
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Create Product Dialog

