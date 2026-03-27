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

export default function AdminPinTab() {
  const { data: hasPin, refetch: refetchHasPin } = trpc.adminPin.hasPin.useQuery();
  const setPin = trpc.adminPin.setPin.useMutation({
    onSuccess: () => {
      toast.success('PIN set successfully!');
      refetchHasPin();
      setNewPin('');
      setConfirmPin('');
    },
    onError: (err) => toast.error(err.message),
  });

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSetPin = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }
    setPin.mutate({ pin: newPin });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Admin PIN</h2>
        <p className="text-muted-foreground">Set up a 4-digit PIN for authorizing discounts. Staff will need this PIN to apply discounts to orders.</p>
      </div>

      <Card className="p-6 max-w-md">
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${hasPin ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className={`font-medium ${hasPin ? 'text-green-800' : 'text-amber-800'}`}>
              {hasPin ? '✓ PIN is set' : '⚠️ No PIN set - discounts cannot be authorized'}
            </p>
          </div>

          <div>
            <Label>{hasPin ? 'Change PIN' : 'Set New PIN'}</Label>
            <Input
              type="password"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-digit PIN"
              className="mt-2 text-center text-2xl tracking-widest"
            />
          </div>

          <div>
            <Label>Confirm PIN</Label>
            <Input
              type="password"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Confirm PIN"
              className="mt-2 text-center text-2xl tracking-widest"
            />
          </div>

          <Button 
            onClick={handleSetPin} 
            disabled={setPin.isPending || newPin.length !== 4 || confirmPin.length !== 4}
            className="w-full"
          >
            {setPin.isPending ? 'Setting PIN...' : hasPin ? 'Update PIN' : 'Set PIN'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">How it works</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• When staff apply a discount, they must enter an admin's PIN</li>
          <li>• Each admin can set their own PIN</li>
          <li>• All discount authorizations are logged for audit purposes</li>
          <li>• PINs are securely hashed and never stored in plain text</li>
        </ul>
      </Card>
    </div>
  );
}

// Refunds Tab - Approve/Reject refund requests

