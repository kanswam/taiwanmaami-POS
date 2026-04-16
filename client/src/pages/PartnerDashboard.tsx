import { useState } from 'react';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { checkPartnerAccess, isPartnerGateActive } from '@/lib/partnerGate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice } from '@shared/types';
import { toast } from 'sonner';
import {
  Crown,
  Shield,
  Copy,
  Share2,
  Gift,
  TrendingUp,
  Calendar,
  UtensilsCrossed,
  CupSoda,
  Heart,
  Users,
  Loader2,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export default function PartnerDashboard() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Secret gate check
  const hasAccess = checkPartnerAccess();
  if (isPartnerGateActive() && !hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-32 text-center">
          <Crown className="w-16 h-16 text-[#d4a574] mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Something Special is Coming</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8">
            The Maami Partner Programme is being crafted with care. Stay tuned for an exclusive announcement.
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const { data: subscription, isLoading } = trpc.partner.getMySubscription.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: referralInfo } = trpc.partner.getReferralInfo.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // If not authenticated or not a partner, redirect
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in to view your Partner Dashboard</h1>
          <Button onClick={() => navigate('/partner')}>
            Learn about the Partner Programme
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <Crown className="w-16 h-16 text-[#d4a574] mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">You're not a Partner yet</h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join the Maami Partner Programme to get free Biang Biang Noodles, tea discounts, and more.
          </p>
          <Button
            size="lg"
            className="bg-[#bd302c] hover:bg-[#9e0b0f] text-white"
            onClick={() => navigate('/partner')}
          >
            Join Now <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const isFounder = subscription.tier === 'founding';
  const daysRemaining = Math.max(0, Math.ceil(
    (new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));

  const referralLink = referralInfo
    ? `${window.location.origin}/partner?ref=${referralInfo.referralCode}`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hey! I'm a Maami Partner at Taiwan Maami and I love it 🧋\n\n` +
      `Join using my link and we both earn Maami Rupees:\n${referralLink}\n\n` +
      `You get free Biang Biang Noodles at T. Nagar & free Large Bubble Tea at Palladium — every visit!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareGeneric = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Maami Partner Programme',
          text: `Join Taiwan Maami's Partner Programme and get free Biang Biang every visit! Use my referral code: ${referralInfo?.referralCode}`,
          url: referralLink,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6f1]">
      <Header />

      <div className="container py-8 md:py-12">
        {/* Header Card */}
        <Card className="relative overflow-hidden mb-8 bg-gradient-to-br from-[#1a0a08] via-[#2d1210] to-[#1a0a08] text-white p-8 md:p-10">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-5 right-5 w-48 h-48 bg-[#d4a574] rounded-full blur-[80px]" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                {isFounder ? (
                  <Badge className="bg-gradient-to-r from-[#d4a574] to-[#f0c090] text-[#1a0a08] font-semibold px-3 py-1">
                    <Crown className="w-3.5 h-3.5 mr-1" />
                    Founding Partner
                  </Badge>
                ) : (
                  <Badge className="bg-white/20 text-white font-semibold px-3 py-1">
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    Partner
                  </Badge>
                )}
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  Active
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Welcome back, {user?.name?.split(' ')[0] || 'Partner'}
              </h1>
              <p className="text-gray-400 text-sm">
                Member since {new Date(subscription.startDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                {' '}&middot;{' '}
                {daysRemaining} days remaining
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-gray-400 mb-1">Your referral code</p>
              <p className="text-2xl font-mono font-bold tracking-wider text-[#d4a574]">
                {subscription.referralCode}
              </p>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatPrice(subscription.usageStats?.totalSavedThisMonth || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Saved this month</p>
          </Card>

          <Card className="p-5 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Gift className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatPrice(subscription.usageStats?.lifetimeSavings || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Lifetime savings</p>
          </Card>

          <Card className="p-5 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{subscription.usageStats?.freeItemsThisMonth || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Free items this month</p>
          </Card>

          <Card className="p-5 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{subscription.referralStats?.subscribedReferrals || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Successful referrals</p>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Benefits Reminder */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Your Benefits
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-[#faf6f1]">
                <div className="w-10 h-10 rounded-lg bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-5 h-5 text-[#bd302c]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Free Biang Biang Noodles</p>
                  <p className="text-xs text-muted-foreground">Every visit at T. Nagar (Moutan)</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-[#faf6f1]">
                <div className="w-10 h-10 rounded-lg bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <CupSoda className="w-5 h-5 text-[#bd302c]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Free Large Bubble Tea</p>
                  <p className="text-xs text-muted-foreground">Every visit at Palladium Mall</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-[#faf6f1]">
                <div className="w-10 h-10 rounded-lg bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-[#bd302c]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Loyalty Stamps</p>
                  <p className="text-xs text-muted-foreground">Earn stamps on every order, 10 = free drink</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Referral Section */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#bd302c]" />
              Share & Earn
            </h2>

            <div className="bg-[#faf6f1] rounded-xl p-5 mb-5">
              <p className="text-sm text-muted-foreground mb-3">Your referral link</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white border rounded-lg px-3 py-2 text-sm font-mono truncate">
                  {referralLink || 'Loading...'}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full bg-[#25D366] hover:bg-[#1da851] text-white"
                onClick={handleShareWhatsApp}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share on WhatsApp
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleShareGeneric}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Link
              </Button>
            </div>

            <div className="mt-5 pt-5 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total referrals</span>
                <span className="font-medium">{subscription.referralStats?.totalReferrals || 0}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Subscribed referrals</span>
                <span className="font-medium">{subscription.referralStats?.subscribedReferrals || 0}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Rewards earned</span>
                <span className="font-medium text-green-600">
                  {formatPrice(subscription.referralStats?.totalRewardsEarned || 0)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Subscription Details */}
        <Card className="mt-8 p-6 bg-white">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            Subscription Details
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Plan</p>
              <p className="font-semibold">{isFounder ? 'Founding Partner' : 'Regular Partner'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Amount Paid</p>
              <p className="font-semibold">{formatPrice(subscription.amountPaid)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Start Date</p>
              <p className="font-semibold">
                {new Date(subscription.startDate).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Expires</p>
              <p className="font-semibold">
                {new Date(subscription.endDate).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
                <span className="text-muted-foreground font-normal ml-1">
                  ({daysRemaining} days)
                </span>
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
