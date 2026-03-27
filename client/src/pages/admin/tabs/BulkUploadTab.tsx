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

export default function BulkUploadTab() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ name: string; status: string }[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    setUploadResults([]);

    const results: { name: string; status: string }[] = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          results.push({ name: file.name, status: 'success' });
        } else {
          results.push({ name: file.name, status: 'failed' });
        }
      } catch (error) {
        results.push({ name: file.name, status: 'error' });
      }
    }

    setUploadResults(results);
    setUploading(false);
    toast.success(`Uploaded ${results.filter(r => r.status === 'success').length} of ${files.length} files`);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Bulk Photo Upload</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upload multiple product photos at once. Name your files with the product slug (e.g., "rose-milk-tea.jpg") 
          to automatically match them to products.
        </p>

        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="bulk-upload"
          />
          <label htmlFor="bulk-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Drop images here or click to browse</p>
            <p className="text-sm text-muted-foreground">Supports JPG, PNG, WebP</p>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">{files.length} files selected</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {files.map((file, i) => (
                <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {file.name}
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload All
                </>
              )}
            </Button>
          </div>
        )}

        {uploadResults.length > 0 && (
          <div className="mt-4 p-4 bg-secondary rounded-lg">
            <p className="font-medium mb-2">Upload Results</p>
            <div className="space-y-1">
              {uploadResults.map((result, i) => (
                <div key={i} className="text-sm flex items-center gap-2">
                  {result.status === 'success' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                  {result.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Instructions</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>1. Name your image files using the product slug (URL-friendly name)</p>
          <p>2. Example: "rose-milk-tea.jpg" will be matched to the "Rose Milk Tea" product</p>
          <p>3. Supported formats: JPG, PNG, WebP</p>
          <p>4. Recommended size: 800x1200 pixels (portrait orientation)</p>
          <p>5. Maximum file size: 5MB per image</p>
        </div>
      </Card>
    </div>
  );
}


// POS functionality removed - OutletsTab and POSAuditTab removed

// Reviews Tab

