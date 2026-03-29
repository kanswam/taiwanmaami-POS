/**
 * Admin Offline Settings Tab
 * 
 * Per-outlet toggle to enable/disable offline mode.
 * When enabled for an outlet, staff devices at that outlet can place
 * in-store and pickup orders even when the internet is down.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  WifiOff, Wifi, MapPin, Store, Shield, AlertTriangle,
  CheckCircle, Loader2, Info,
} from 'lucide-react';

export default function OfflineSettingsTab() {
  const { data: settings, isLoading, refetch } = trpc.offline.getSettings.useQuery();
  const updateSettings = trpc.offline.updateSettings.useMutation({
    onSuccess: () => {
      toast.success('Offline settings updated');
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update settings');
    },
  });

  const [palladiumEnabled, setPalladiumEnabled] = useState(false);
  const [tNagarEnabled, setTNagarEnabled] = useState(false);

  useEffect(() => {
    if (settings) {
      setPalladiumEnabled(settings.palladiumEnabled);
      setTNagarEnabled(settings.tNagarEnabled);
    }
  }, [settings]);

  const hasChanges = settings && (
    palladiumEnabled !== settings.palladiumEnabled ||
    tNagarEnabled !== settings.tNagarEnabled
  );

  const handleSave = () => {
    updateSettings.mutate({ palladiumEnabled, tNagarEnabled });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <WifiOff className="w-5 h-5" />
          Offline Mode Settings
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Control which outlets can operate in offline mode. When enabled, staff can place
          in-store and pickup cash orders even when the internet is down.
        </p>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-medium">How offline mode works:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-blue-700">
              <li>Orders are saved to the device's local storage (IndexedDB)</li>
              <li>KOTs are generated locally for kitchen printing</li>
              <li>When internet returns, orders auto-sync to the server</li>
              <li>Only <strong>cash</strong> payments for <strong>in-store</strong> and <strong>pickup</strong> orders are supported offline</li>
              <li>Delivery orders and online payments require internet</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Outlet Toggles */}
      <div className="space-y-4">
        {/* Palladium Mall */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${palladiumEnabled ? 'bg-emerald-100' : 'bg-muted'}`}>
                <Store className={`w-5 h-5 ${palladiumEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="font-semibold">Palladium Mall</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Velachery, Chennai
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={palladiumEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-muted-foreground'}>
                {palladiumEnabled ? (
                  <><Shield className="w-3 h-3 mr-1" /> Protected</>
                ) : (
                  <><WifiOff className="w-3 h-3 mr-1" /> Disabled</>
                )}
              </Badge>
              <Switch
                checked={palladiumEnabled}
                onCheckedChange={setPalladiumEnabled}
              />
            </div>
          </div>
        </Card>

        {/* T. Nagar */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${tNagarEnabled ? 'bg-emerald-100' : 'bg-muted'}`}>
                <Store className={`w-5 h-5 ${tNagarEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="font-semibold">Moutan — T. Nagar</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> T. Nagar, Chennai
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={tNagarEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-muted-foreground'}>
                {tNagarEnabled ? (
                  <><Shield className="w-3 h-3 mr-1" /> Protected</>
                ) : (
                  <><WifiOff className="w-3 h-3 mr-1" /> Disabled</>
                )}
              </Badge>
              <Switch
                checked={tNagarEnabled}
                onCheckedChange={setTNagarEnabled}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" /> Save Changes</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (settings) {
                setPalladiumEnabled(settings.palladiumEnabled);
                setTNagarEnabled(settings.tNagarEnabled);
              }
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Warning */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Important notes:</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-amber-700">
              <li>Staff must enable offline mode on their device via the "Offline Queue" tab in Staff Orders</li>
              <li>This admin setting controls which outlets are <em>allowed</em> to use offline mode</li>
              <li>Disabling an outlet here will not affect orders already queued on staff devices</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
