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

export default function FoodScheduleTab() {
  const { data: scheduleData, refetch } = trpc.admin.getFoodSchedule.useQuery();
  const updateSchedule = trpc.admin.updateFoodSchedule.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Food schedule updated successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update schedule'),
  });

  const [enabled, setEnabled] = useState(true);
  const [manualOverride, setManualOverride] = useState<'on' | 'off' | null>(null);
  const [weekdayStart, setWeekdayStart] = useState('16:00');
  const [weekdayEnd, setWeekdayEnd] = useState('24:00');
  const [weekendSlot1Start, setWeekendSlot1Start] = useState('12:00');
  const [weekendSlot1End, setWeekendSlot1End] = useState('15:00');
  const [weekendSlot2Start, setWeekendSlot2Start] = useState('18:00');
  const [weekendSlot2End, setWeekendSlot2End] = useState('24:00');

  // Quick toggle mutation — saves only the manual override without touching schedule times
  const quickToggle = trpc.admin.updateFoodSchedule.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to toggle food'),
  });

  const handleQuickToggle = (override: 'on' | 'off' | null) => {
    setManualOverride(override);
    // Save immediately with current schedule values
    const wdStart = parseTime(weekdayStart);
    const wdEnd = parseTime(weekdayEnd);
    const we1Start = parseTime(weekendSlot1Start);
    const we1End = parseTime(weekendSlot1End);
    const we2Start = parseTime(weekendSlot2Start);
    const we2End = parseTime(weekendSlot2End);
    quickToggle.mutate({
      enabled,
      manualOverride: override,
      weekday: [{ startHour: wdStart.startHour, startMinute: wdStart.startMinute, endHour: wdEnd.startHour, endMinute: wdEnd.startMinute }],
      weekend: [
        { startHour: we1Start.startHour, startMinute: we1Start.startMinute, endHour: we1End.startHour, endMinute: we1End.startMinute },
        { startHour: we2Start.startHour, startMinute: we2Start.startMinute, endHour: we2End.startHour, endMinute: we2End.startMinute },
      ],
    });
    if (override === 'on') toast.success('Food manually turned ON — visible to customers now');
    else if (override === 'off') toast.success('Food manually turned OFF — hidden from customers');
    else toast.success('Manual override removed — using automatic schedule');
  };

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return { startHour: h, startMinute: m };
  };

  useEffect(() => {
    if (scheduleData?.config) {
      const c = scheduleData.config;
      setEnabled(c.enabled);
      setManualOverride((c as any).manualOverride || null);
      if (c.weekday.length > 0) {
        setWeekdayStart(`${String(c.weekday[0].startHour).padStart(2, '0')}:${String(c.weekday[0].startMinute).padStart(2, '0')}`);
        setWeekdayEnd(`${String(c.weekday[0].endHour).padStart(2, '0')}:${String(c.weekday[0].endMinute).padStart(2, '0')}`);
      }
      if (c.weekend.length > 0) {
        setWeekendSlot1Start(`${String(c.weekend[0].startHour).padStart(2, '0')}:${String(c.weekend[0].startMinute).padStart(2, '0')}`);
        setWeekendSlot1End(`${String(c.weekend[0].endHour).padStart(2, '0')}:${String(c.weekend[0].endMinute).padStart(2, '0')}`);
      }
      if (c.weekend.length > 1) {
        setWeekendSlot2Start(`${String(c.weekend[1].startHour).padStart(2, '0')}:${String(c.weekend[1].startMinute).padStart(2, '0')}`);
        setWeekendSlot2End(`${String(c.weekend[1].endHour).padStart(2, '0')}:${String(c.weekend[1].endMinute).padStart(2, '0')}`);
      }
    }
  }, [scheduleData]);

  const handleSave = () => {
    const wdStart = parseTime(weekdayStart);
    const wdEnd = parseTime(weekdayEnd);
    const we1Start = parseTime(weekendSlot1Start);
    const we1End = parseTime(weekendSlot1End);
    const we2Start = parseTime(weekendSlot2Start);
    const we2End = parseTime(weekendSlot2End);

    updateSchedule.mutate({
      enabled,
      manualOverride,
      weekday: [{
        startHour: wdStart.startHour, startMinute: wdStart.startMinute,
        endHour: wdEnd.startHour, endMinute: wdEnd.startMinute,
      }],
      weekend: [
        { startHour: we1Start.startHour, startMinute: we1Start.startMinute, endHour: we1End.startHour, endMinute: we1End.startMinute },
        { startHour: we2Start.startHour, startMinute: we2Start.startMinute, endHour: we2End.startHour, endMinute: we2End.startMinute },
      ],
    });
  };

  const timeOptions = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'
  ];

  const formatTimeLabel = (t: string) => {
    const [h] = t.split(':').map(Number);
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    if (h === 24) return '12 AM (Midnight)';
    if (h > 12) return `${h - 12} PM`;
    return `${h} AM`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Food Availability Schedule</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically show/hide food items on the customer menu based on time of day.
            Beverages and Mochi Desserts are always available.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{enabled ? 'Active' : 'Disabled'}</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Manual Override - Quick Toggle */}
      <div className="p-5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Quick Food Toggle</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Instantly turn food ON or OFF for customers, overriding the automatic schedule.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuickToggle(manualOverride === 'on' ? null : 'on')}
              disabled={quickToggle.isPending}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                manualOverride === 'on'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/30 ring-2 ring-green-400'
                  : 'bg-muted hover:bg-green-100 dark:hover:bg-green-900 text-muted-foreground'
              }`}
            >
              Force ON
            </button>
            <button
              onClick={() => handleQuickToggle(manualOverride === 'off' ? null : 'off')}
              disabled={quickToggle.isPending}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                manualOverride === 'off'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-400'
                  : 'bg-muted hover:bg-red-100 dark:hover:bg-red-900 text-muted-foreground'
              }`}
            >
              Force OFF
            </button>
            {manualOverride && (
              <button
                onClick={() => handleQuickToggle(null)}
                disabled={quickToggle.isPending}
                className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-all"
              >
                Use Auto
              </button>
            )}
          </div>
        </div>
        {manualOverride && (
          <div className={`mt-3 p-2 rounded-md text-sm font-medium ${
            manualOverride === 'on' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            Manual override active: Food is forced <strong>{manualOverride === 'on' ? 'ON' : 'OFF'}</strong>. The automatic schedule below is being ignored.
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className={`p-4 rounded-lg border-2 ${
        scheduleData?.currentlyAvailable
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
          : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            scheduleData?.currentlyAvailable ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
          }`} />
          <span className="font-semibold">
            Food is currently {scheduleData?.currentlyAvailable ? 'AVAILABLE' : 'UNAVAILABLE'} on the menu
          </span>
        </div>
        {manualOverride === 'on' && (
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Manually forced ON — food is visible to customers regardless of schedule.
          </p>
        )}
        {manualOverride === 'off' && (
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            Manually forced OFF — food is hidden from customers regardless of schedule.
          </p>
        )}
        {!manualOverride && !enabled && (
          <p className="text-sm text-muted-foreground mt-1">
            Schedule is disabled — food items are shown at all times.
          </p>
        )}
        {!manualOverride && enabled && !scheduleData?.currentlyAvailable && (
          <p className="text-sm text-muted-foreground mt-1">
            Outside scheduled food hours. Use "Force ON" above to override.
          </p>
        )}
      </div>

      {enabled && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Weekday Schedule */}
          <div className="p-5 rounded-xl border bg-card">
            <h3 className="font-semibold text-lg mb-1">Monday – Friday</h3>
            <p className="text-xs text-muted-foreground mb-4">Single food service window</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <select value={weekdayStart} onChange={e => setWeekdayStart(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border bg-background text-sm">
                  {timeOptions.filter(t => t !== '24:00').map(t => (
                    <option key={t} value={t}>{formatTimeLabel(t)}</option>
                  ))}
                </select>
              </div>
              <span className="mt-5 text-muted-foreground">→</span>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <select value={weekdayEnd} onChange={e => setWeekdayEnd(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border bg-background text-sm">
                  {timeOptions.map(t => (
                    <option key={t} value={t}>{formatTimeLabel(t)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Weekend Schedule */}
          <div className="p-5 rounded-xl border bg-card">
            <h3 className="font-semibold text-lg mb-1">Saturday – Sunday</h3>
            <p className="text-xs text-muted-foreground mb-4">Two food service windows</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-green-700 dark:text-green-400">Slot 1 (Lunch)</label>
                <div className="flex items-center gap-3 mt-1">
                  <select value={weekendSlot1Start} onChange={e => setWeekendSlot1Start(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md border bg-background text-sm">
                    {timeOptions.filter(t => t !== '24:00').map(t => (
                      <option key={t} value={t}>{formatTimeLabel(t)}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground">→</span>
                  <select value={weekendSlot1End} onChange={e => setWeekendSlot1End(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md border bg-background text-sm">
                    {timeOptions.map(t => (
                      <option key={t} value={t}>{formatTimeLabel(t)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-green-700 dark:text-green-400">Slot 2 (Dinner)</label>
                <div className="flex items-center gap-3 mt-1">
                  <select value={weekendSlot2Start} onChange={e => setWeekendSlot2Start(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md border bg-background text-sm">
                    {timeOptions.filter(t => t !== '24:00').map(t => (
                      <option key={t} value={t}>{formatTimeLabel(t)}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground">→</span>
                  <select value={weekendSlot2End} onChange={e => setWeekendSlot2End(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md border bg-background text-sm">
                    {timeOptions.map(t => (
                      <option key={t} value={t}>{formatTimeLabel(t)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={updateSchedule.isPending}>
          {updateSchedule.isPending ? 'Saving...' : 'Save Schedule'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Changes take effect within 5 minutes (cached for performance).
          The schedule uses Indian Standard Time (IST).
        </p>
      </div>

      {/* Info box */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <h4 className="font-medium text-sm mb-2">How it works</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• When food is outside its scheduled hours, the entire Food category is hidden from the customer menu</li>
          <li>• Beverages (Iced & Hot) and Sweet Bites (Mochis) are always visible during store hours</li>
          <li>• Staff/admin menu always shows all items regardless of schedule</li>
          <li>• Use "Force ON" / "Force OFF" to instantly override the schedule with one click</li>
          <li>• Click "Use Auto" to go back to the automatic time-based schedule</li>
        </ul>
      </div>
    </div>
  );
}

// Site Settings Tab Component

