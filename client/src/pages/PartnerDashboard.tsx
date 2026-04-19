import React from 'react';
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
  CupSoda,
  Heart,
  Star,
  Percent,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export default function PartnerDashboard() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();


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
            Join the Maami Partner Programme to get complimentary food items, drink discounts, and more.
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
  const complimentaryLimit = subscription.usageStats?.maxComplimentaryPerYear || 25;

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
              <p className="text-sm text-gray-400 mb-1">Complimentary items</p>
              <p className="text-2xl font-mono font-bold tracking-wider text-[#d4a574]">
                {complimentaryUsed} / {complimentaryLimit}
              </p>
              <p className="text-xs text-gray-500">used this year</p>
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
                <Percent className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{subscription.usageStats?.freeItemsThisMonth || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Complimentary items this month</p>
          </Card>

          <Card className="p-5 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{complimentaryUsed} / {complimentaryLimit}</p>
            <p className="text-xs text-muted-foreground mt-1">Complimentary items used</p>
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
                  <p className="font-semibold text-sm">Complimentary Food Item</p>
                  <p className="text-xs text-muted-foreground">Biang Biang, Dan Dan, Cong You Bing, Egg Cong You Bing, or Brioche at T. Nagar. No minimum purchase.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-[#faf6f1]">
                <div className="w-10 h-10 rounded-lg bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <CupSoda className="w-5 h-5 text-[#bd302c]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">5% Off All Drinks</p>
                  <p className="text-xs text-muted-foreground">Every drink in your order gets 5% off, every time</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-[#faf6f1]">
                <div className="w-10 h-10 rounded-lg bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 text-[#bd302c]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">10% Off Workshops</p>
                  <p className="text-xs text-muted-foreground">All Taiwan Maami workshops and events</p>
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

          {/* Complimentary Items Tracker */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#bd302c]" />
              Complimentary Items
            </h2>

            <div className="bg-[#faf6f1] rounded-xl p-5 mb-5">
              <div className="flex justify-between items-end mb-3">
                <p className="text-sm text-muted-foreground">Items used this year</p>
                <p className="text-lg font-bold text-[#bd302c]">{complimentaryUsed} / {complimentaryLimit}</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-[#bd302c] to-[#d4a574] h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (complimentaryUsed / complimentaryLimit) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {complimentaryLimit - complimentaryUsed} remaining until {new Date(subscription.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Eligible items at T. Nagar:</p>
              <div className="grid grid-cols-2 gap-2">
                {['Biang Biang Noodles', 'Dan Dan Noodles', 'Cong You Bing', 'Egg Cong You Bing', 'Any Brioche'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-[#faf6f1]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                1 complimentary item per visit. No minimum purchase required.
              </p>
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
