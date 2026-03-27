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

export default function BackupTab() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<{ id: number; backupUrl: string; createdAt: Date | string } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  
  const { data: backupHistory, refetch } = trpc.backup.getHistory.useQuery();
  const createBackupMutation = trpc.backup.createBackup.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Backup created successfully! ${result.totalRows} rows backed up.`);
        refetch();
      } else {
        toast.error(`Backup failed: ${result.error}`);
      }
      setIsBackingUp(false);
    },
    onError: (error) => {
      toast.error(`Backup failed: ${error.message}`);
      setIsBackingUp(false);
    },
  });
  
  const restoreBackupMutation = trpc.backup.restoreFromBackup.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Database restored successfully! ${result.totalRowsRestored} rows restored from ${result.tablesRestored} tables.`);
        refetch();
      } else {
        toast.error(`Restore failed: ${result.error}`);
      }
      setIsRestoring(false);
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
      setConfirmText('');
    },
    onError: (error) => {
      toast.error(`Restore failed: ${error.message}`);
      setIsRestoring(false);
    },
  });
  
  const handleRestoreClick = (backup: { id: number; backupUrl: string | null; createdAt: Date | string }) => {
    if (!backup.backupUrl) return;
    setSelectedBackup({ id: backup.id, backupUrl: backup.backupUrl, createdAt: backup.createdAt });
    setRestoreDialogOpen(true);
    setConfirmText('');
  };
  
  const handleConfirmRestore = () => {
    if (!selectedBackup || confirmText !== 'RESTORE') return;
    setIsRestoring(true);
    restoreBackupMutation.mutate({ 
      backupUrl: selectedBackup.backupUrl,
      createPreRestoreBackup: true 
    });
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleBackupNow = () => {
    setIsBackingUp(true);
    createBackupMutation.mutate();
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export/database-excel', { credentials: 'include' });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `Taiwan_Maami_Database_Export_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Database exported as Excel successfully!');
    } catch (error) {
      toast.error('Failed to export database as Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadJson = (backupUrl: string) => {
    const a = document.createElement('a');
    a.href = backupUrl;
    const today = new Date().toISOString().split('T')[0];
    a.download = `Taiwan_Maami_Backup_${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-2">Database Backup</h2>
          <p className="text-muted-foreground">
            Automated daily backups at 4:00 AM IST. Backups are retained for 90 days.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleDownloadExcel} 
            disabled={isExporting}
            variant="outline"
            className="gap-2 border-green-600 text-green-700 hover:bg-green-50"
          >
            {isExporting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download as Excel
              </>
            )}
          </Button>
          <Button 
            onClick={handleBackupNow} 
            disabled={isBackingUp}
            className="gap-2"
          >
            {isBackingUp ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Backing up...
              </>
            ) : (
              <>
                <History className="h-4 w-4" />
                Backup Now
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">What's Included in Backups</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Orders & Order Items</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Customers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Loyalty Stamps</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Workshop Bookings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Event Orders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Products & Categories</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Reviews</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Backup History</h3>
        {!backupHistory || backupHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No backups yet. Click "Backup Now" to create your first backup.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Tables</th>
                  <th className="text-left py-3 px-4 font-medium">Rows</th>
                  <th className="text-left py-3 px-4 font-medium">Size</th>
                  <th className="text-left py-3 px-4 font-medium">Type</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backupHistory.map((backup) => (
                  <tr key={backup.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">{formatDate(backup.createdAt)}</td>
                    <td className="py-3 px-4">
                      {backup.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{backup.tablesBackedUp}</td>
                    <td className="py-3 px-4">{backup.totalRows.toLocaleString()}</td>
                    <td className="py-3 px-4">{formatBytes(backup.size)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        backup.triggeredBy === 'scheduled' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {backup.triggeredBy === 'scheduled' ? 'Scheduled' : 'Manual'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {backup.status === 'success' && backup.backupUrl && (
                          <>
                            <button 
                              onClick={() => handleDownloadJson(backup.backupUrl!)}
                              className="text-primary hover:underline text-sm cursor-pointer"
                            >
                              JSON
                            </button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreClick(backup)}
                              className="text-amber-600 border-amber-300 hover:bg-amber-50"
                            >
                              Restore
                            </Button>
                          </>
                        )}
                        {backup.status === 'failed' && backup.errorMessage && (
                          <span className="text-red-500 text-sm" title={backup.errorMessage}>
                            View Error
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-amber-50 border-amber-200">
        <h3 className="text-lg font-semibold mb-2 text-amber-800">One-Click Restore</h3>
        <p className="text-amber-700 text-sm mb-4">
          Click the "Restore" button next to any backup to restore your database to that point in time.
        </p>
        <ul className="list-disc list-inside text-sm text-amber-700 space-y-2">
          <li>A pre-restore backup is automatically created before restoration</li>
          <li>You'll need to type "RESTORE" to confirm the action</li>
          <li>All current data will be replaced with the backup data</li>
        </ul>
      </Card>
      
      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-600">⚠️ Confirm Database Restore</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 font-medium mb-2">You are about to restore from:</p>
              <p className="text-sm text-amber-700">
                {selectedBackup && new Date(selectedBackup.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">⚠️ Warning:</p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>All current data will be replaced</li>
                <li>Any data created after this backup will be lost</li>
                <li>A pre-restore backup will be created automatically</li>
              </ul>
            </div>
            <div>
              <label className="text-sm font-medium">Type RESTORE to confirm:</label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Type RESTORE"
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setRestoreDialogOpen(false);
                setSelectedBackup(null);
                setConfirmText('');
              }}
              disabled={isRestoring}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRestore}
              disabled={confirmText !== 'RESTORE' || isRestoring}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isRestoring ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Restoring...
                </>
              ) : (
                'Restore Database'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Razorpay Payment Reconciliation Tab

