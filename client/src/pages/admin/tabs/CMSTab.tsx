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
import { RichTextEditor } from '@/components/RichTextEditor';

export default function CMSTab() {
  const { data: cmsContent, refetch } = trpc.cms.getAllContent.useQuery();
  const updateContent = trpc.cms.updateContent.useMutation({
    onSuccess: () => {
      toast.success('Content saved successfully!');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [aboutUs, setAboutUs] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [faq, setFaq] = useState('');
  const [franchiseOpportunity, setFranchiseOpportunity] = useState('');
  const [shippingPolicy, setShippingPolicy] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (cmsContent) {
      const contentMap = cmsContent.reduce((acc: any, c: any) => {
        acc[c.key] = c.value;
        return acc;
      }, {});
      setAboutUs(contentMap.about_us || '');
      setTermsConditions(contentMap.terms_conditions || '');
      setPrivacyPolicy(contentMap.privacy_policy || '');
      setRefundPolicy(contentMap.refund_policy || '');
      setFaq(contentMap.faq || '');
      setFranchiseOpportunity(contentMap.franchise_opportunity || '');
      setShippingPolicy(contentMap.shipping_policy || '');
    }
  }, [cmsContent]);

  const handleSave = async (key: string, value: string) => {
    setSaving(key);
    try {
      await updateContent.mutateAsync({ key, value });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Content Pages</h2>
        <p className="text-muted-foreground">Edit content for About Us, Terms & Conditions, Privacy Policy, and other pages. Changes take effect immediately.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">About Us</h3>
          <Button onClick={() => handleSave('about_us', aboutUs)} disabled={saving === 'about_us'} size="sm">
            {saving === 'about_us' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={aboutUs}
          onChange={setAboutUs}
          placeholder="Tell your story... Who is Taiwan Maami? What makes your bubble tea special?"
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Terms & Conditions</h3>
          <Button onClick={() => handleSave('terms_conditions', termsConditions)} disabled={saving === 'terms_conditions'} size="sm">
            {saving === 'terms_conditions' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={termsConditions}
          onChange={setTermsConditions}
          placeholder="Your terms and conditions for using the website and ordering..."
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Privacy Policy</h3>
          <Button onClick={() => handleSave('privacy_policy', privacyPolicy)} disabled={saving === 'privacy_policy'} size="sm">
            {saving === 'privacy_policy' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={privacyPolicy}
          onChange={setPrivacyPolicy}
          placeholder="How you collect, use, and protect customer data..."
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Refund Policy</h3>
          <Button onClick={() => handleSave('refund_policy', refundPolicy)} disabled={saving === 'refund_policy'} size="sm">
            {saving === 'refund_policy' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={refundPolicy}
          onChange={setRefundPolicy}
          placeholder="Your refund and cancellation policy..."
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">FAQ</h3>
          <Button onClick={() => handleSave('faq', faq)} disabled={saving === 'faq'} size="sm">
            {saving === 'faq' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={faq}
          onChange={setFaq}
          placeholder="Frequently asked questions and answers..."
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Shipping Policy</h3>
          <Button onClick={() => handleSave('shipping_policy', shippingPolicy)} disabled={saving === 'shipping_policy'} size="sm">
            {saving === 'shipping_policy' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={shippingPolicy}
          onChange={setShippingPolicy}
          placeholder="Your shipping and delivery policy... Include delivery areas, times, and charges."
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Franchise Opportunity</h3>
          <Button onClick={() => handleSave('franchise_opportunity', franchiseOpportunity)} disabled={saving === 'franchise_opportunity'} size="sm">
            {saving === 'franchise_opportunity' ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <RichTextEditor
          content={franchiseOpportunity}
          onChange={setFranchiseOpportunity}
          placeholder="Information about franchise opportunities... Include requirements, investment details, and contact information."
        />
      </Card>
    </div>
  );
}

// Admin PIN Tab - Set up PIN for discount authorization

