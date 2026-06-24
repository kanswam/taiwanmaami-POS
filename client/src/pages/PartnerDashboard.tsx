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
  Gift,
  TrendingUp,
  Calendar,
  UtensilsCrossed,
  Heart,
  Star,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Wallet,
  RefreshCw,
  Copy,
  Share2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PartnerDashboard() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [isRenewing, setIsRenewing] = useState(false);
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);

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

  const renewMutation = trpc.partner.renewEarly.useMutation();
  const verifyRenewalMutation = trpc.partner.verifyRenewalPayment.useMutation();
  const refundMutation = trpc.partner.requestRefund.useMutation();
  const utils = trpc.useUtils();

  const handleRenewEarly = async () => {
    setIsRenewing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Payment system failed to load. Please try again.');
        setIsRenewing(false);
        return;
      }

      const result = await renewMutation.mutateAsync(undefined);

      const options = {
        key: result.razorpayKeyId,
        amount: result.amount,
        currency: result.currency,
        name: 'Taiwan Maami',
        description: result.description,
        order_id: result.razorpayOrderId,
        handler: async (response: any) => {
          try {
            const verified = await verifyRenewalMutation.mutateAsync({
              existingSubscriptionId: result.existingSubscriptionId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              tier: result.tier,
            });

            if (verified.success) {
              toast.success(`Membership renewed! New expiry: ${new Date(verified.newEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
              utils.partner.getMySubscription.invalidate();
            }
          } catch (err) {
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#bd302c',
        },
        modal: {
          ondismiss: () => {
            setIsRenewing(false);
            toast.info('Renewal cancelled.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start renewal. Please try again.');
    } finally {
      setIsRenewing(false);
    }
  };

  const handleCopyReferralLink = () => {
    if (referralInfo?.referralCode) {
      const link = `${window.location.origin}/partner?ref=${referralInfo.referralCode}`;
      navigator.clipboard.writeText(link);
      toast.success('Referral link copied!');
    }
  };

  // If not authenticated
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
            Join the Maami Partner Programme to get complimentary food and drink items, earn Maami Rupees, and more.
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
  const complimentaryUsed = subscription.usageStats?.complimentaryItemsUsed || 0;
  const complimentaryLimit = subscription.usageStats?.maxComplimentaryPerYear || 15;
  const usedToday = subscription.usageStats?.usedToday || 0;
  const maamiRupeesBalance = subscription.maamiRupees?.balance || 0;
  const stampsCurrent = subscription.stamps?.current || 0;
  const stampsNeeded = 10;
  const showRenewalButton = daysRemaining < 90 || complimentaryUsed >= complimentaryLimit;

  return (
    <div className="min-h-screen bg-[#faf6f1]">
      <Header />

      <div className="container py-8 md:py-12">
        {/* Section 5a: Header Strip */}
        <Card className="relative overflow-hidden mb-8 bg-gradient-to-br from-[#1a0a08] via-[#2d1210] to-[#1a0a08] text-white p-6 md:p-8">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-5 right-5 w-48 h-48 bg-[#d4a574] rounded-full blur-[80px]" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
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
              <h1 className="text-xl md:text-2xl font-bold mb-1">
                Welcome back, {user?.name?.split(' ')[0] || 'Partner'}
              </h1>
              <p className="text-gray-400 text-sm">
                Active until {new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {daysRemaining} days remaining
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-gray-400 mb-1">Total savings</p>
              <p className="text-2xl font-bold text-[#d4a574]">
                {formatPrice(subscription.usageStats?.lifetimeSavings || 0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Main Grid: Left + Right panels */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">

          {/* Section 5b: Left Panel — Benefits Summary */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Your Benefits
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf6f1]">
                <div className="w-9 h-9 rounded-lg bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-4 h-4 text-[#bd302c]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">1 Free Item Per Day (up to ₹500)</p>
                  <p className="text-xs text-muted-foreground">15 per year. Any beverage + eligible food at T. Nagar & Anna Nagar. Beverages only at Palladium.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf6f1]">
                <div className="w-9 h-9 rounded-lg bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 text-[#bd302c]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">2% Maami Rupees on Every Order</p>
                  <p className="text-xs text-muted-foreground">Earn cashback on every order. Use it to pay for future orders. Expires 12 months after earning.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf6f1]">
                <div className="w-9 h-9 rounded-lg bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 text-[#bd302c]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Loyalty Stamps</p>
                  <p className="text-xs text-muted-foreground">Earn stamps on every order. Collect 10 stamps = 1 free drink.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf6f1]">
                <div className="w-9 h-9 rounded-lg bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-[#bd302c]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Referral Rewards</p>
                  <p className="text-xs text-muted-foreground">Refer a friend — you both get ₹200 Maami Rupees when they place their first order.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 5c: Right Panel — Complimentary Items Tracker */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#bd302c]" />
              Complimentary Items
            </h2>

            {/* Progress bar */}
            <div className="bg-[#faf6f1] rounded-xl p-4 mb-4">
              <div className="flex justify-between items-end mb-2">
                <p className="text-sm text-muted-foreground">Used this year</p>
                <p className="text-lg font-bold text-[#bd302c]">{complimentaryUsed} / {complimentaryLimit}</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-[#bd302c] to-[#d4a574] h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (complimentaryUsed / complimentaryLimit) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {complimentaryLimit - complimentaryUsed} remaining
                </p>
                <p className="text-xs text-muted-foreground">
                  1 per day
                </p>
              </div>
            </div>

            {/* Today's status chip */}
            <div className="mb-4">
              {usedToday > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  Used today — next available tomorrow
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Available today
                </div>
              )}
            </div>

            {/* Eligible items */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">T. Nagar & Anna Nagar:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {['Any Beverage', 'Biang Biang Noodles', 'Dan Dan Noodles', 'Cong You Bing', 'Egg Cong You Bing', 'Any Brioche'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-xs p-2 rounded-lg bg-[#faf6f1]">
                      <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Palladium Mall:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {['Any Beverage (up to ₹500)'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-xs p-2 rounded-lg bg-[#faf6f1]">
                      <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mt-2">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Mochi items are excluded from complimentary benefits at all outlets.
              </p>
            </div>
          </Card>
        </div>

        {/* Section 5d: Maami Rupees Widget */}
        <Card className="p-6 bg-white mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-600" />
            Maami Rupees
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Balance */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-amber-700">{formatPrice(maamiRupeesBalance)}</p>
              {subscription.maamiRupees?.expiringSoon && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatPrice(subscription.maamiRupees.expiringSoon.amount)} expires {new Date(subscription.maamiRupees.expiringSoon.expiresAt!).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Recent Activity</p>
              {subscription.maamiRupees?.recentTransactions && subscription.maamiRupees.recentTransactions.length > 0 ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {subscription.maamiRupees.recentTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-[#faf6f1]">
                      <div>
                        <p className="font-medium text-xs">{tx.description || tx.type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <span className={`font-semibold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatPrice(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No transactions yet. Earn 2% on every order!</p>
              )}
            </div>
          </div>
        </Card>

        {/* Section 5e + 5f: Stamps + Referral row */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Section 5e: Stamps Widget */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-600" />
              Loyalty Stamps
            </h2>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {Array.from({ length: stampsNeeded }).map((_, i) => (
                <div
                  key={i}
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                    i < stampsCurrent
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'border-gray-300 text-gray-300'
                  }`}
                >
                  <Star className="w-4 h-4" />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {stampsCurrent >= stampsNeeded ? (
                <span className="text-green-600 font-semibold">You have a free drink! Redeem on your next order.</span>
              ) : (
                <>{stampsNeeded - stampsCurrent} more stamp{stampsNeeded - stampsCurrent !== 1 ? 's' : ''} until your free drink</>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime stamps earned: {subscription.stamps?.lifetime || 0}
            </p>
          </Card>

          {/* Section 5f: Referral Widget */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              Refer a Friend
            </h2>
            {referralInfo?.referralCode ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Share your link — you both get <span className="font-semibold text-foreground">₹200 Maami Rupees</span> when they place their first order.
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 bg-[#faf6f1] rounded-lg px-3 py-2 text-sm font-mono truncate">
                    {window.location.origin}/partner?ref={referralInfo.referralCode}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyReferralLink}
                    className="shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-[#faf6f1] rounded-lg p-3">
                    <p className="text-lg font-bold">{subscription.referralStats?.totalReferrals || 0}</p>
                    <p className="text-xs text-muted-foreground">Referred</p>
                  </div>
                  <div className="bg-[#faf6f1] rounded-lg p-3">
                    <p className="text-lg font-bold">{subscription.referralStats?.subscribedReferrals || 0}</p>
                    <p className="text-xs text-muted-foreground">Subscribed</p>
                  </div>
                  <div className="bg-[#faf6f1] rounded-lg p-3">
                    <p className="text-lg font-bold">{formatPrice(subscription.referralStats?.totalRewardsEarned || 0)}</p>
                    <p className="text-xs text-muted-foreground">Earned</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Referral code loading...</p>
            )}
          </Card>
        </div>

        {/* Section 5g: Subscription Details + Early Renewal */}
        <Card className="p-6 bg-white">
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

          {/* Early Renewal — only show when <90 days remaining or all 15 used */}
          {showRenewalButton && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Renew Early</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {complimentaryUsed >= complimentaryLimit
                      ? "You've used all 15 complimentary items. Renew to reset your quota."
                      : `Only ${daysRemaining} days remaining. Extend your membership by 12 months from today.`
                    }
                  </p>
                </div>
                <Button
                  onClick={handleRenewEarly}
                  disabled={isRenewing}
                  className="bg-[#bd302c] hover:bg-[#9e0b0f] text-white shrink-0"
                >
                  {isRenewing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Renew Now</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Section 8: Refund request — only shown if eligible (no benefits used, ≤60 days) */}
          {subscription.refundEligibility?.eligible && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Request Refund</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You are eligible for a full refund as no benefits have been used. Refunds are processed within 5–7 business days.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0"
                  disabled={isRequestingRefund}
                  onClick={async () => {
                    if (!confirm('Are you sure you want to request a refund? Your Partner subscription will be deactivated after the refund is processed.')) return;
                    setIsRequestingRefund(true);
                    try {
                      const result = await refundMutation.mutateAsync();
                      toast.success(result.message || 'Refund request submitted successfully.');
                      utils.partner.getMySubscription.invalidate();
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to submit refund request.');
                    } finally {
                      setIsRequestingRefund(false);
                    }
                  }}
                >
                  {isRequestingRefund ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Submitting...</>
                  ) : (
                    'Request Refund'
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Monthly Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xl font-bold">{formatPrice(subscription.usageStats?.totalSavedThisMonth || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Saved this month</p>
          </Card>
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-bold">{subscription.usageStats?.freeItemsThisMonth || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Free items this month</p>
          </Card>
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl font-bold">{formatPrice(maamiRupeesBalance)}</p>
            <p className="text-xs text-muted-foreground mt-1">Maami Rupees</p>
          </Card>
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xl font-bold">{stampsCurrent} / {stampsNeeded}</p>
            <p className="text-xs text-muted-foreground mt-1">Stamps progress</p>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
