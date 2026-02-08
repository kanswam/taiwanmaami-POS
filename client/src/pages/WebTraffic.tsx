import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  ArrowLeft, 
  Globe, 
  Users, 
  Eye, 
  Clock, 
  Monitor, 
  Smartphone, 
  Tablet,
  TrendingUp,
  ExternalLink,
  Instagram,
  RefreshCw,
  Link2,
  Copy,
  Check,
  Megaphone,
  MessageCircle,
  Search,
  Mail,
  QrCode,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

const UTM_TEMPLATES = [
  { name: 'Instagram Bio', icon: Instagram, source: 'instagram', medium: 'bio', campaign: 'link_in_bio', color: 'text-pink-600' },
  { name: 'Instagram Story', icon: Instagram, source: 'instagram', medium: 'story', campaign: 'story_swipeup', color: 'text-pink-600' },
  { name: 'Instagram Post', icon: Instagram, source: 'instagram', medium: 'post', campaign: 'feed_post', color: 'text-pink-600' },
  { name: 'WhatsApp Share', icon: MessageCircle, source: 'whatsapp', medium: 'chat', campaign: 'whatsapp_share', color: 'text-green-600' },
  { name: 'WhatsApp Status', icon: MessageCircle, source: 'whatsapp', medium: 'status', campaign: 'whatsapp_status', color: 'text-green-600' },
  { name: 'Google Ads', icon: Search, source: 'google', medium: 'cpc', campaign: 'google_ads', color: 'text-blue-600' },
  { name: 'Email Newsletter', icon: Mail, source: 'email', medium: 'newsletter', campaign: 'monthly_newsletter', color: 'text-orange-600' },
  { name: 'Packaging QR Code', icon: QrCode, source: 'packaging', medium: 'qr_code', campaign: 'delivery_packaging', color: 'text-purple-600' },
  { name: 'Flyer / Print', icon: Megaphone, source: 'print', medium: 'flyer', campaign: 'local_flyer', color: 'text-amber-600' },
];

function UTMBuilder({ baseUrl }: { baseUrl: string }) {

  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [targetPage, setTargetPage] = useState('/');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedCustom, setCopiedCustom] = useState(false);

  const buildUrl = (source: string, medium: string, campaign: string, content?: string, page?: string) => {
    const url = new URL(page || targetPage, baseUrl);
    url.searchParams.set('utm_source', source);
    url.searchParams.set('utm_medium', medium);
    url.searchParams.set('utm_campaign', campaign);
    if (content) url.searchParams.set('utm_content', content);
    return url.toString();
  };

  const customUrl = utmSource && utmMedium && utmCampaign 
    ? buildUrl(utmSource, utmMedium, utmCampaign, utmContent || undefined)
    : '';

  const copyToClipboard = async (text: string, idx?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (idx !== undefined) {
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
      } else {
        setCopiedCustom(true);
        setTimeout(() => setCopiedCustom(false), 2000);
      }
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Copy failed. Please select and copy the link manually.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Templates */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Quick Templates — Click to copy</h4>
        <p className="text-xs text-muted-foreground mb-4">Pre-built UTM links for common marketing channels. Use these in your Instagram bio, WhatsApp messages, packaging QR codes, etc.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {UTM_TEMPLATES.map((tmpl, idx) => {
            const url = buildUrl(tmpl.source, tmpl.medium, tmpl.campaign, undefined, '/');
            const Icon = tmpl.icon;
            return (
              <div key={idx} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${tmpl.color}`} />
                    <span className="text-sm font-medium">{tmpl.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2"
                    onClick={() => copyToClipboard(url, idx)}
                  >
                    {copiedIdx === idx ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground font-mono break-all leading-relaxed">{url}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Builder */}
      <div className="border-t pt-6">
        <h4 className="font-semibold text-sm mb-3">Custom UTM Link Builder</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Target Page</Label>
            <Select value={targetPage} onValueChange={setTargetPage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="/">Home Page</SelectItem>
                <SelectItem value="/menu">Menu</SelectItem>
                <SelectItem value="/events">Events</SelectItem>
                <SelectItem value="/about">About Us</SelectItem>
                <SelectItem value="/wholesale">Wholesale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Source (where the link is placed) *</Label>
            <Input placeholder="e.g. instagram, google, flyer" value={utmSource} onChange={e => setUtmSource(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Medium (type of marketing) *</Label>
            <Input placeholder="e.g. social, cpc, email, qr_code" value={utmMedium} onChange={e => setUtmMedium(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Campaign (specific promotion) *</Label>
            <Input placeholder="e.g. valentines_2026, summer_sale" value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Content (optional — differentiate variations)</Label>
            <Input placeholder="e.g. banner_top, cta_button, video_ad" value={utmContent} onChange={e => setUtmContent(e.target.value)} />
          </div>
        </div>
        {customUrl && (
          <div className="mt-4 p-3 bg-accent/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Generated Link:</span>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyToClipboard(customUrl)}>
                {copiedCustom ? <><Check className="h-3 w-3 text-green-600 mr-1" /> Copied</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
              </Button>
            </div>
            <p className="text-xs font-mono break-all text-primary leading-relaxed">{customUrl}</p>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="border-t pt-4">
        <h4 className="font-semibold text-sm mb-2">How UTM Tracking Works</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>utm_source</strong> — Identifies where the traffic comes from (instagram, google, whatsapp)</p>
          <p><strong>utm_medium</strong> — The type of marketing channel (social, cpc, email, qr_code)</p>
          <p><strong>utm_campaign</strong> — The specific campaign or promotion name</p>
          <p><strong>utm_content</strong> — (Optional) Differentiates between variations of the same campaign</p>
          <p className="mt-2 text-foreground">When a customer clicks a UTM-tagged link, the parameters are automatically captured and shown in the <strong>Social Media Traffic</strong> and <strong>Traffic Sources</strong> sections above.</p>
        </div>
      </div>
    </div>
  );
}

const getDatePreset = (preset: string) => {
  const today = new Date();
  const startDate = new Date();
  switch (preset) {
    case 'today':
      return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    case 'last7days':
      startDate.setDate(today.getDate() - 7);
      return { start: startDate.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    case 'last30days':
      startDate.setDate(today.getDate() - 30);
      return { start: startDate.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    case 'last90days':
      startDate.setDate(today.getDate() - 90);
      return { start: startDate.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    default:
      startDate.setDate(today.getDate() - 30);
      return { start: startDate.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
  }
};

export default function WebTraffic() {
  const { user, isAuthenticated } = useAuth();
  const [datePreset, setDatePreset] = useState('last30days');
  const [startDate, setStartDate] = useState(getDatePreset('last30days').start);
  const [endDate, setEndDate] = useState(getDatePreset('last30days').end);

  const { data: trafficData, isLoading, refetch } = 
    trpc.analytics.getWebsiteTraffic.useQuery({
      startDate,
      endDate,
    });

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const { start, end } = getDatePreset(preset);
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Identify social media referrers
  const socialReferrers = useMemo(() => {
    if (!trafficData?.referrers) return [];
    return (trafficData.referrers as any[]).filter((r: any) => {
      const url = (r.x || '').toLowerCase();
      return url.includes('instagram') || url.includes('facebook') || url.includes('twitter') || 
             url.includes('youtube') || url.includes('linkedin') || url.includes('whatsapp') ||
             url.includes('t.co') || url.includes('lnkd.in');
    });
  }, [trafficData?.referrers]);

  const instagramTraffic = useMemo(() => {
    if (!trafficData?.referrers) return 0;
    return (trafficData.referrers as any[])
      .filter((r: any) => (r.x || '').toLowerCase().includes('instagram'))
      .reduce((sum: number, r: any) => sum + (r.y || 0), 0);
  }, [trafficData?.referrers]);

  const totalVisitors = trafficData?.stats?.visitors?.value || 0;
  const totalPageviews = trafficData?.stats?.pageviews?.value || 0;
  const totalVisits = trafficData?.stats?.visits?.value || 0;
  const bounceRate = trafficData?.stats?.bounces?.value && totalVisits > 0 
    ? ((trafficData.stats.bounces.value / totalVisits) * 100).toFixed(1) 
    : '0';
  const avgDuration = trafficData?.stats?.totaltime?.value && totalVisits > 0
    ? Math.round(trafficData.stats.totaltime.value / totalVisits)
    : 0;

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[#8B1A1A] text-white px-4 py-3">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/analytics">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sales Analytics
              </Button>
            </Link>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Website Traffic Analytics
            </h1>
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date Range</label>
                <Select value={datePreset} onValueChange={handleDatePresetChange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="last90days">Last 90 Days</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {datePreset === 'custom' && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[160px]" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[160px]" />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {trafficData?.error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{trafficData.error}</p>
              <p className="text-sm text-muted-foreground mt-2">Ensure Umami analytics is properly configured.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading traffic data...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Unique Visitors</span>
                  </div>
                  <p className="text-2xl font-bold">{totalVisitors.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs">Page Views</span>
                  </div>
                  <p className="text-2xl font-bold">{totalPageviews.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">Sessions</span>
                  </div>
                  <p className="text-2xl font-bold">{totalVisits.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Avg. Duration</span>
                  </div>
                  <p className="text-2xl font-bold">{avgDuration > 60 ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s` : `${avgDuration}s`}</p>
                </CardContent>
              </Card>
              <Card className="border-pink-200 dark:border-pink-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-pink-600 mb-1">
                    <Instagram className="h-4 w-4" />
                    <span className="text-xs">From Instagram</span>
                  </div>
                  <p className="text-2xl font-bold text-pink-600">{instagramTraffic.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalVisitors > 0 ? `${((instagramTraffic / totalVisitors) * 100).toFixed(1)}% of visitors` : ''}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Traffic Sources / Referrers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Traffic Sources</CardTitle>
                  <CardDescription>Where your visitors come from</CardDescription>
                </CardHeader>
                <CardContent>
                  {trafficData?.referrers && (trafficData.referrers as any[]).length > 0 ? (
                    <div className="space-y-2">
                      {(trafficData.referrers as any[]).slice(0, 15).map((ref: any, idx: number) => {
                        const maxVal = (trafficData.referrers as any[])[0]?.y || 1;
                        const pct = (ref.y / maxVal) * 100;
                        const isInstagram = (ref.x || '').toLowerCase().includes('instagram');
                        const isSocial = (ref.x || '').toLowerCase().match(/instagram|facebook|twitter|youtube|whatsapp|t\.co/);
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm truncate ${isInstagram ? 'text-pink-600 font-semibold' : isSocial ? 'text-blue-600 font-medium' : ''}`}>
                                  {ref.x || '(direct)'}
                                </span>
                                {isInstagram && <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700">Instagram</Badge>}
                                {isSocial && !isInstagram && <Badge variant="secondary" className="text-xs">Social</Badge>}
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isInstagram ? 'bg-pink-500' : isSocial ? 'bg-blue-500' : 'bg-primary'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{ref.y}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No referrer data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Pages */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Pages</CardTitle>
                  <CardDescription>Most visited pages on your site</CardDescription>
                </CardHeader>
                <CardContent>
                  {trafficData?.pages && (trafficData.pages as any[]).length > 0 ? (
                    <div className="space-y-2">
                      {(trafficData.pages as any[]).slice(0, 15).map((page: any, idx: number) => {
                        const maxVal = (trafficData.pages as any[])[0]?.y || 1;
                        const pct = (page.y / maxVal) * 100;
                        const pageName = page.x === '/' ? 'Home Page' : 
                          page.x === '/menu' ? 'Menu' :
                          page.x === '/cart' ? 'Cart' :
                          page.x === '/checkout' ? 'Checkout' :
                          page.x === '/events' ? 'Events' :
                          page.x === '/about' ? 'About Us' :
                          page.x;
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm truncate">{pageName}</span>
                                <span className="text-xs text-muted-foreground truncate">{page.x}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{page.y}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No page data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Entry Pages */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Entry Pages</CardTitle>
                  <CardDescription>Where visitors first land on your site</CardDescription>
                </CardHeader>
                <CardContent>
                  {trafficData?.entries && (trafficData.entries as any[]).length > 0 ? (
                    <div className="space-y-2">
                      {(trafficData.entries as any[]).slice(0, 10).map((entry: any, idx: number) => {
                        const maxVal = (trafficData.entries as any[])[0]?.y || 1;
                        const pct = (entry.y / maxVal) * 100;
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm truncate block mb-1">{entry.x || '/'}</span>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{entry.y}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No entry page data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Social Media Performance */}
              <Card className="border-pink-200 dark:border-pink-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    Social Media Traffic
                  </CardTitle>
                  <CardDescription>How social platforms drive traffic to your site</CardDescription>
                </CardHeader>
                <CardContent>
                  {socialReferrers.length > 0 ? (
                    <div className="space-y-3">
                      {socialReferrers.map((ref: any, idx: number) => {
                        const url = (ref.x || '').toLowerCase();
                        const isInsta = url.includes('instagram');
                        const platform = isInsta ? 'Instagram' : 
                          url.includes('facebook') ? 'Facebook' :
                          url.includes('twitter') || url.includes('t.co') ? 'Twitter/X' :
                          url.includes('youtube') ? 'YouTube' :
                          url.includes('whatsapp') ? 'WhatsApp' :
                          url.includes('linkedin') || url.includes('lnkd.in') ? 'LinkedIn' : 'Other';
                        return (
                          <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="flex items-center gap-2">
                              <Badge variant={isInsta ? 'default' : 'secondary'} className={isInsta ? 'bg-pink-500' : ''}>
                                {platform}
                              </Badge>
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{ref.x}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold">{ref.y}</span>
                              <span className="text-xs text-muted-foreground ml-1">visitors</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="mt-3 p-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg">
                        <p className="text-sm font-medium text-pink-800 dark:text-pink-200">
                          Instagram drives {instagramTraffic} visitors ({totalVisitors > 0 ? ((instagramTraffic / totalVisitors) * 100).toFixed(1) : 0}% of total traffic)
                        </p>
                        {instagramTraffic > 0 && totalVisitors > 0 && (
                          <p className="text-xs text-pink-600 dark:text-pink-300 mt-1">
                            {instagramTraffic / totalVisitors > 0.1 
                              ? 'Instagram is a strong traffic driver. Keep posting engaging content with clear CTAs to your website.'
                              : 'Instagram traffic has room to grow. Add more link-in-bio CTAs, stories with swipe-up links, and menu highlights.'}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-2">No social media referral traffic detected</p>
                      <p className="text-xs text-muted-foreground">
                        Tip: Add your website link to your Instagram bio and use "Link in bio" CTAs in posts and stories.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Devices */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Devices</CardTitle>
                  <CardDescription>What devices your visitors use</CardDescription>
                </CardHeader>
                <CardContent>
                  {trafficData?.devices && (trafficData.devices as any[]).length > 0 ? (
                    <div className="space-y-3">
                      {(trafficData.devices as any[]).map((device: any, idx: number) => {
                        const total = (trafficData.devices as any[]).reduce((s: number, d: any) => s + d.y, 0);
                        const pct = total > 0 ? ((device.y / total) * 100).toFixed(1) : '0';
                        const icon = device.x === 'mobile' ? <Smartphone className="h-4 w-4" /> :
                          device.x === 'tablet' ? <Tablet className="h-4 w-4" /> :
                          <Monitor className="h-4 w-4" />;
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            {icon}
                            <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium capitalize">{device.x}</span>
                                <span className="text-sm text-muted-foreground">{pct}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <span className="text-sm font-bold w-12 text-right">{device.y}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No device data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Browsers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Browsers</CardTitle>
                  <CardDescription>Browser breakdown of your visitors</CardDescription>
                </CardHeader>
                <CardContent>
                  {trafficData?.browsers && (trafficData.browsers as any[]).length > 0 ? (
                    <div className="space-y-2">
                      {(trafficData.browsers as any[]).slice(0, 8).map((browser: any, idx: number) => {
                        const total = (trafficData.browsers as any[]).reduce((s: number, b: any) => s + b.y, 0);
                        const pct = total > 0 ? ((browser.y / total) * 100).toFixed(1) : '0';
                        return (
                          <div key={idx} className="flex items-center justify-between py-1">
                            <span className="text-sm">{browser.x || 'Unknown'}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                              <span className="text-sm font-medium w-8 text-right">{browser.y}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No browser data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* UTM Link Builder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  UTM Link Builder
                </CardTitle>
                <CardDescription>
                  Generate trackable marketing links for Instagram, WhatsApp, Google Ads, packaging QR codes, and more. 
                  Traffic from these links will appear in the analytics above.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UTMBuilder baseUrl="https://taiwanmaami.com" />
              </CardContent>
            </Card>

            {/* Traffic Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Traffic Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Pages per visit */}
                  {totalVisitors > 0 && totalPageviews > 0 && (
                    <div className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-1">Pages per Visit: {(totalPageviews / totalVisits).toFixed(1)}</h4>
                      <p className="text-sm text-muted-foreground">
                        {totalPageviews / totalVisits > 3 
                          ? 'Visitors are exploring multiple pages — great engagement! Your menu and content structure is working well.'
                          : totalPageviews / totalVisits > 1.5
                          ? 'Decent engagement. Consider adding more internal links, featured items, or "You might also like" sections to increase page depth.'
                          : 'Low page depth suggests visitors may not be finding what they need. Improve navigation, add clear CTAs, and ensure the menu is easy to browse.'}
                      </p>
                    </div>
                  )}

                  {/* Mobile optimization */}
                  {trafficData?.devices && (trafficData.devices as any[]).length > 0 && (() => {
                    const mobileVisitors = (trafficData.devices as any[]).find((d: any) => d.x === 'mobile')?.y || 0;
                    const total = (trafficData.devices as any[]).reduce((s: number, d: any) => s + d.y, 0);
                    const mobilePct = total > 0 ? (mobileVisitors / total * 100) : 0;
                    return mobilePct > 50 ? (
                      <div className="border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4">
                        <h4 className="font-semibold text-sm mb-1">{mobilePct.toFixed(0)}% of traffic is mobile</h4>
                        <p className="text-sm text-muted-foreground">
                          Mobile dominates your traffic. Ensure fast load times, easy tap targets, and a streamlined mobile checkout. Consider a "Quick Order" button for returning customers.
                        </p>
                      </div>
                    ) : null;
                  })()}

                  {/* Instagram insight */}
                  {instagramTraffic > 0 && totalVisitors > 0 && (
                    <div className="border-l-4 border-l-pink-500 bg-pink-50 dark:bg-pink-950/20 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-pink-500" />
                        Instagram Performance
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {instagramTraffic / totalVisitors > 0.15
                          ? `Instagram is your strongest social channel, driving ${((instagramTraffic / totalVisitors) * 100).toFixed(1)}% of all traffic. Double down with: Reels showing food prep, customer testimonials, and behind-the-scenes content. Use "Order now — link in bio" CTAs consistently.`
                          : instagramTraffic / totalVisitors > 0.05
                          ? `Instagram contributes ${((instagramTraffic / totalVisitors) * 100).toFixed(1)}% of traffic. To grow this: post 4-5x/week, use food-focused Reels, add menu items to Stories highlights, and always include a website CTA.`
                          : `Instagram traffic is low at ${((instagramTraffic / totalVisitors) * 100).toFixed(1)}%. Focus on: consistent posting schedule, engaging Reels, collaborations with local food bloggers, and running Instagram-exclusive offers that drive website visits.`}
                      </p>
                    </div>
                  )}

                  {/* Direct traffic insight */}
                  {trafficData?.referrers && (() => {
                    const directVisitors = totalVisitors - (trafficData.referrers as any[]).reduce((s: number, r: any) => s + r.y, 0);
                    if (directVisitors > 0 && totalVisitors > 0) {
                      const directPct = (directVisitors / totalVisitors * 100);
                      return directPct > 40 ? (
                        <div className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                          <h4 className="font-semibold text-sm mb-1">Strong brand recall: {directPct.toFixed(0)}% direct traffic</h4>
                          <p className="text-sm text-muted-foreground">
                            A high percentage of visitors come directly to your site, indicating strong brand awareness. This is likely from repeat customers, word-of-mouth, and your physical store presence.
                          </p>
                        </div>
                      ) : null;
                    }
                    return null;
                  })()}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
