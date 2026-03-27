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

export default function SiteSettingsTab() {
  const { data: settings, refetch } = trpc.admin.getSiteSettings.useQuery();
  const updateSetting = trpc.admin.updateSiteSetting.useMutation();

  const [heroTitle, setHeroTitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [qualityTitle, setQualityTitle] = useState('');
  const [qualityDescription, setQualityDescription] = useState('');
  const [freshnessTitle, setFreshnessTitle] = useState('');
  const [freshnessDescription, setFreshnessDescription] = useState('');
  const [deliveryTitle, setDeliveryTitle] = useState('');
  const [deliveryDescription, setDeliveryDescription] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('15');
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Category cards
  const [cat1Name, setCat1Name] = useState('Iced Beverages');
  const [cat1Desc, setCat1Desc] = useState('Authentic Taiwanese bubble tea & premium coffee');
  const [cat2Name, setCat2Name] = useState('Hot Beverages');
  const [cat2Desc, setCat2Desc] = useState('Warm & comforting traditional drinks');
  const [cat3Name, setCat3Name] = useState('Asian Rice-Noodles-Bread');
  const [cat3Desc, setCat3Desc] = useState('Savory Asian street food favorites');
  const [cat4Name, setCat4Name] = useState('Asian Sweet Bites');
  const [cat4Desc, setCat4Desc] = useState('Delicious mochis & desserts');
  
  // Location cards
  const [loc1Name, setLoc1Name] = useState('Taiwan Maami');
  const [loc1Subtitle, setLoc1Subtitle] = useState('Palladium Mall');
  const [loc1Address, setLoc1Address] = useState('First Floor, Palladium Mall, Velachery');
  const [loc1City, setLoc1City] = useState('Chennai - 600042');
  const [loc2Name, setLoc2Name] = useState('Moutan');
  const [loc2Subtitle, setLoc2Subtitle] = useState('T Nagar');
  const [loc2Address, setLoc2Address] = useState('New No. 29, Burkit Road, T Nagar');
  const [loc2City, setLoc2City] = useState('Chennai - 600017');
  
  // Company details
  const [companyName, setCompanyName] = useState('Thamarai Foods and Trading Private Limited');
  const [gstNumber, setGstNumber] = useState('33AAKCT4782H1Z1');

  // Load settings on mount
  useEffect(() => {
    if (settings) {
      const settingsMap = settings.reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {});

      setHeroTitle(settingsMap.hero_title || 'Authentic Taiwanese\nBubble Tea');
      setHeroDescription(settingsMap.hero_description || 'Crafted with imported tapioca pearls from Taiwan. Experience the true taste of premium bubble tea at Taiwan Maami.');
      setQualityTitle(settingsMap.quality_title || 'Premium Quality');
      setQualityDescription(settingsMap.quality_description || 'Imported ingredients from Taiwan');
      setFreshnessTitle(settingsMap.freshness_title || 'Crafted Fresh');
      setFreshnessDescription(settingsMap.freshness_description || 'Made to order, every time');
      setDeliveryTitle(settingsMap.delivery_title || 'Quick Delivery');
      setDeliveryDescription(settingsMap.delivery_description || 'Fast delivery across Chennai');
      setStorePhone(settingsMap.store_phone || '+91 9150570557');
      setStoreEmail(settingsMap.store_email || 'info@taiwanmaami.com');
      setStoreAddress(settingsMap.store_address || '34/8 Singarar Street, Triplicane, Chennai - 600005');
      setDeliveryRadius(settingsMap.delivery_radius || '15');
      setDeliveryEnabled(settingsMap.delivery_enabled !== 'false');
      
      // Category cards
      setCat1Name(settingsMap.cat1_name || 'Iced Beverages');
      setCat1Desc(settingsMap.cat1_desc || 'Authentic Taiwanese bubble tea & premium coffee');
      setCat2Name(settingsMap.cat2_name || 'Hot Beverages');
      setCat2Desc(settingsMap.cat2_desc || 'Warm & comforting traditional drinks');
      setCat3Name(settingsMap.cat3_name || 'Asian Rice-Noodles-Bread');
      setCat3Desc(settingsMap.cat3_desc || 'Savory Asian street food favorites');
      setCat4Name(settingsMap.cat4_name || 'Asian Sweet Bites');
      setCat4Desc(settingsMap.cat4_desc || 'Delicious mochis & desserts');
      
      // Location cards
      setLoc1Name(settingsMap.loc1_name || 'Taiwan Maami');
      setLoc1Subtitle(settingsMap.loc1_subtitle || 'Palladium Mall');
      setLoc1Address(settingsMap.loc1_address || 'First Floor, Palladium Mall, Velachery');
      setLoc1City(settingsMap.loc1_city || 'Chennai - 600042');
      setLoc2Name(settingsMap.loc2_name || 'Moutan');
      setLoc2Subtitle(settingsMap.loc2_subtitle || 'T Nagar');
      setLoc2Address(settingsMap.loc2_address || 'New No. 29, Burkit Road, T Nagar');
      setLoc2City(settingsMap.loc2_city || 'Chennai - 600017');
      
      // Company details
      setCompanyName(settingsMap.company_name || 'Thamarai Foods and Trading Private Limited');
      setGstNumber(settingsMap.gst_number || '33AAKCT4782H1Z1');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'hero_title', value: heroTitle },
        { key: 'hero_description', value: heroDescription },
        { key: 'quality_title', value: qualityTitle },
        { key: 'quality_description', value: qualityDescription },
        { key: 'freshness_title', value: freshnessTitle },
        { key: 'freshness_description', value: freshnessDescription },
        { key: 'delivery_title', value: deliveryTitle },
        { key: 'delivery_description', value: deliveryDescription },
        { key: 'store_phone', value: storePhone },
        { key: 'store_email', value: storeEmail },
        { key: 'store_address', value: storeAddress },
        { key: 'delivery_radius', value: deliveryRadius },
        { key: 'delivery_enabled', value: deliveryEnabled ? 'true' : 'false' },
        // Category cards
        { key: 'cat1_name', value: cat1Name },
        { key: 'cat1_desc', value: cat1Desc },
        { key: 'cat2_name', value: cat2Name },
        { key: 'cat2_desc', value: cat2Desc },
        { key: 'cat3_name', value: cat3Name },
        { key: 'cat3_desc', value: cat3Desc },
        { key: 'cat4_name', value: cat4Name },
        { key: 'cat4_desc', value: cat4Desc },
        // Location cards
        { key: 'loc1_name', value: loc1Name },
        { key: 'loc1_subtitle', value: loc1Subtitle },
        { key: 'loc1_address', value: loc1Address },
        { key: 'loc1_city', value: loc1City },
        { key: 'loc2_name', value: loc2Name },
        { key: 'loc2_subtitle', value: loc2Subtitle },
        { key: 'loc2_address', value: loc2Address },
        { key: 'loc2_city', value: loc2City },
        // Company details
        { key: 'company_name', value: companyName },
        { key: 'gst_number', value: gstNumber },
      ];

      for (const update of updates) {
        await updateSetting.mutateAsync(update);
      }

      toast.success('Settings saved successfully!');
      refetch();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Site Settings</h2>
        <p className="text-muted-foreground">Edit homepage content and site information</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Hero Section</h3>
        <div className="space-y-4">
          <div>
            <Label>Hero Title</Label>
            <Input
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="Authentic Taiwanese Bubble Tea"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Use \n for line breaks</p>
          </div>
          <div>
            <Label>Hero Description</Label>
            <textarea
              value={heroDescription}
              onChange={(e) => setHeroDescription(e.target.value)}
              placeholder="Crafted with imported tapioca pearls..."
              className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background mt-2"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Feature Highlights</h3>
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="font-medium">Premium Quality</h4>
            <div>
              <Label className="text-sm">Title</Label>
              <Input
                value={qualityTitle}
                onChange={(e) => setQualityTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input
                value={qualityDescription}
                onChange={(e) => setQualityDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Crafted Fresh</h4>
            <div>
              <Label className="text-sm">Title</Label>
              <Input
                value={freshnessTitle}
                onChange={(e) => setFreshnessTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input
                value={freshnessDescription}
                onChange={(e) => setFreshnessDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Quick Delivery</h4>
            <div>
              <Label className="text-sm">Title</Label>
              <Input
                value={deliveryTitle}
                onChange={(e) => setDeliveryTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input
                value={deliveryDescription}
                onChange={(e) => setDeliveryDescription(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Store Information</h3>
        <div className="space-y-4">
          <div>
            <Label>Phone Number</Label>
            <Input
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              placeholder="+91 9150570557"
              className="mt-2"
            />
          </div>
          <div>
            <Label>Email Address</Label>
            <Input
              value={storeEmail}
              onChange={(e) => setStoreEmail(e.target.value)}
              placeholder="info@taiwanmaami.com"
              className="mt-2"
            />
          </div>
          <div>
            <Label>Store Address</Label>
            <textarea
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="34/8 Singarar Street, Triplicane, Chennai - 600005"
              className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background mt-2"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Delivery Settings</h3>
        <div className="space-y-4">
          {/* Quick Delivery Toggle */}
          <div className={`p-4 rounded-lg border-2 ${deliveryEnabled ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Delivery Service</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {deliveryEnabled 
                    ? 'Delivery is currently ENABLED for customers' 
                    : 'Delivery is currently DISABLED - customers cannot place delivery orders'}
                </p>
              </div>
              <Switch
                checked={deliveryEnabled}
                onCheckedChange={setDeliveryEnabled}
              />
            </div>
            {!deliveryEnabled && (
              <p className="text-sm text-red-700 mt-2 font-medium">
                ⚠️ Use this to temporarily disable deliveries during bad weather, staff shortages, or high demand.
              </p>
            )}
          </div>

          <div>
            <Label>Delivery Radius (km)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Input
                type="number"
                min="1"
                max="50"
                value={deliveryRadius}
                onChange={(e) => setDeliveryRadius(e.target.value)}
                className="w-32"
                disabled={!deliveryEnabled}
              />
              <span className="text-muted-foreground">kilometers from T Nagar outlet</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Adjust based on weather conditions, traffic, or delivery partner availability.
              Customers outside this radius will see a notice that delivery is not available to their area.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Current setting:</strong> {deliveryEnabled ? `Delivery available within ${deliveryRadius}km of T Nagar outlet.` : 'Delivery is currently disabled.'}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Category Cards</h3>
        <p className="text-sm text-muted-foreground mb-4">Edit the category cards shown on the homepage</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Category 1 (Iced Beverages)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={cat1Name} onChange={(e) => setCat1Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input value={cat1Desc} onChange={(e) => setCat1Desc(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Category 2 (Hot Beverages)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={cat2Name} onChange={(e) => setCat2Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input value={cat2Desc} onChange={(e) => setCat2Desc(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Category 3 (Food)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={cat3Name} onChange={(e) => setCat3Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input value={cat3Desc} onChange={(e) => setCat3Desc(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Category 4 (Desserts)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={cat4Name} onChange={(e) => setCat4Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input value={cat4Desc} onChange={(e) => setCat4Desc(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Location Cards</h3>
        <p className="text-sm text-muted-foreground mb-4">Edit the outlet locations shown on the homepage</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Location 1 (Palladium)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={loc1Name} onChange={(e) => setLoc1Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Subtitle</Label>
              <Input value={loc1Subtitle} onChange={(e) => setLoc1Subtitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Address</Label>
              <Input value={loc1Address} onChange={(e) => setLoc1Address(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">City</Label>
              <Input value={loc1City} onChange={(e) => setLoc1City(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="font-medium">Location 2 (T Nagar)</h4>
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={loc2Name} onChange={(e) => setLoc2Name(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Subtitle</Label>
              <Input value={loc2Subtitle} onChange={(e) => setLoc2Subtitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Address</Label>
              <Input value={loc2Address} onChange={(e) => setLoc2Address(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">City</Label>
              <Input value={loc2City} onChange={(e) => setLoc2City(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Company & Invoice Details</h3>
        <p className="text-sm text-muted-foreground mb-4">These details appear on customer receipts and invoices</p>
        <div className="space-y-4">
          <div>
            <Label>Company Name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-2" placeholder="Thamarai Foods and Trading Private Limited" />
          </div>
          <div>
            <Label>GST Number</Label>
            <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className="mt-2" placeholder="33AAKCT4782H1Z1" />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Changes are saved to the database and will be visible immediately on the homepage after saving.
        </p>
      </div>
    </div>
  );
}

// Bulk Pricing Tab Component

