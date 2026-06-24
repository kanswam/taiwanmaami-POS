import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { formatPrice } from '@shared/types';
import { toast } from 'sonner';
import {
  Crown,
  Users,
  TrendingUp,
  Gift,
  Settings,
  Loader2,
  Ban,
  RefreshCw,
  UtensilsCrossed,
  Star,
} from 'lucide-react';

export default function AdminPartners() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [configValue, setConfigValue] = useState('');

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.partner.adminGetStats.useQuery();
  const { data: partnersData, isLoading: partnersLoading, refetch: refetchPartners } = trpc.partner.adminGetPartners.useQuery({
    status: statusFilter as any,
    page,
    limit: 50,
  });

  const updateConfig = trpc.partner.adminUpdateConfig.useMutation({
    onSuccess: () => {
      toast.success('Configuration updated');
      setEditingConfig(null);
      refetchStats();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const cancelSubscription = trpc.partner.adminCancelSubscription.useMutation({
    onSuccess: () => {
      toast.success('Subscription cancelled');
      refetchPartners();
      refetchStats();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleUpdateConfig = (key: string) => {
    updateConfig.mutate({ key, value: configValue });
  };

  const handleCancel = (subId: number, userName: string) => {
    if (confirm(`Cancel ${userName}'s Partner subscription?`)) {
      cancelSubscription.mutate({ subscriptionId: subId, reason: 'Cancelled by admin' });
    }
  };

  if (statsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const foundingSlotsRemaining = parseInt(stats?.config?.founding_slots_remaining || '50');
  const foundingSlotsTotal = parseInt(stats?.config?.founding_slots_total || '50');
  const foundingSlotsFilled = foundingSlotsTotal - foundingSlotsRemaining;

  const configItems = stats?.config ? [
    { key: 'programme_active', label: 'Programme Active', type: 'toggle' },
    { key: 'founding_price_paise', label: 'Founding Price (paise)', type: 'number' },
    { key: 'regular_price_paise', label: 'Regular Price (paise)', type: 'number' },
    { key: 'founding_slots_remaining', label: 'Founding Slots Remaining', type: 'number' },
    { key: 'founding_slots_total', label: 'Founding Slots Total', type: 'number' },
    { key: 'complimentary_items_per_year', label: 'Complimentary Items / Year', type: 'number' },
    { key: 'workshop_discount_percent', label: 'Workshop Discount %', type: 'number' },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="w-6 h-6 text-[#d4a574]" />
              Partner Programme
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Manage subscriptions and programme settings</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchStats(); refetchPartners(); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats?.activePartners || 0}</p>
            <p className="text-xs text-muted-foreground">Active Partners</p>
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="secondary">{stats?.foundingPartners || 0} Founding</Badge>
              <Badge variant="secondary">{stats?.regularPartners || 0} Regular</Badge>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatPrice(stats?.totalRevenue || 0)}</p>
            <p className="text-xs text-muted-foreground">Subscription Revenue</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                <Gift className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatPrice(stats?.totalBenefitsGiven || 0)}</p>
            <p className="text-xs text-muted-foreground">Benefits Given</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{foundingSlotsFilled} / {foundingSlotsTotal}</p>
            <p className="text-xs text-muted-foreground">Founding Slots Filled</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-[#d4a574] to-[#bd302c] h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (foundingSlotsFilled / foundingSlotsTotal) * 100)}%` }}
              />
            </div>
          </Card>
        </div>

        {/* Benefits Summary */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-[#d4a574]" />
            Current Benefits
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
              <UtensilsCrossed className="w-5 h-5 text-[#bd302c] mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Complimentary Food Item</p>
                <p className="text-xs text-muted-foreground mt-1">
                  1 per visit, up to ₹500. All outlets ({stats?.config?.complimentary_items_per_year || '24'}/year). Palladium: drinks only.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
              <Star className="w-5 h-5 text-[#bd302c] mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">{stats?.config?.workshop_discount_percent || '10'}% Off Workshops</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All Taiwan Maami workshops and events.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Partners List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Partners</h2>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {partnersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !partnersData?.partners.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No partners found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Partner</th>
                    <th className="pb-3 font-medium">Tier</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Benefits Used</th>
                    <th className="pb-3 font-medium">Paid</th>
                    <th className="pb-3 font-medium">Expires</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {partnersData.partners.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{p.userName || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{p.userPhone || p.userEmail || ''}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant={p.tier === 'founding' ? 'default' : 'secondary'} className={p.tier === 'founding' ? 'bg-[#d4a574] text-[#1a0a08]' : ''}>
                          {p.tier === 'founding' ? 'Founding' : 'Regular'}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={p.status === 'active' ? 'default' : p.status === 'cancelled' ? 'destructive' : 'secondary'}
                          className={p.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3">{formatPrice(p.totalBenefitsUsed)}</td>
                      <td className="py-3">{formatPrice(p.amountPaid)}</td>
                      <td className="py-3 text-xs">
                        {p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-3">
                        {p.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleCancel(p.id, p.userName || 'this partner')}
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {partnersData.total > 50 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground py-1.5">
                    Page {page} of {Math.ceil(partnersData.total / 50)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= Math.ceil(partnersData.total / 50)}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Configuration */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Programme Configuration
          </h2>
          <div className="space-y-3">
            {configItems.map((item) => {
              const currentValue = stats?.config?.[item.key] || '';
              const isEditing = editingConfig === item.key;

              return (
                <div key={item.key} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Input
                          value={configValue}
                          onChange={(e) => setConfigValue(e.target.value)}
                          className="w-40 h-8 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8"
                          onClick={() => handleUpdateConfig(item.key)}
                          disabled={updateConfig.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => setEditingConfig(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {item.key.includes('paise') && currentValue
                            ? `${currentValue} (${formatPrice(parseInt(currentValue))})`
                            : currentValue || '—'}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => {
                            setEditingConfig(item.key);
                            setConfigValue(currentValue);
                          }}
                        >
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
