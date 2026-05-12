import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { checkPartnerAccess, isPartnerGateActive } from '@/lib/partnerGate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatPrice } from '@shared/types';
import { useClerk } from '@clerk/clerk-react';
import { toast } from 'sonner';
import {
  Crown,
  UtensilsCrossed,
  CupSoda,
  Percent,
  Users,
  Gift,
  Star,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Shield,
  Sparkles,
  Clock,
  Heart,
  ShoppingBag,
  ChevronRight,
  MapPin,
} from 'lucide-react';

// Declare Razorpay types
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

export default function Partner() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { isAuthenticated, user } = useAuth();
  const { openSignIn } = useClerk();

  const [selectedTier, setSelectedTier] = useState<'founding' | 'regular'>('founding');
  const [referralCode, setReferralCode] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{ referralCode: string; tier: string } | null>(null);

  // Secret gate check — during testing phase, only accessible with ?key=tmpartner2026
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

  // Parse referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
    }
  }, [searchString]);

  const { data: programmeInfo, isLoading } = trpc.partner.getProgrammeInfo.useQuery();
  const { data: mySubscription } = trpc.partner.getMySubscription.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: referralValidation } = trpc.partner.validateReferralCode.useQuery(
    { code: referralCode },
    { enabled: referralCode.length >= 4 }
  );

  const subscribeMutation = trpc.partner.subscribe.useMutation();
  const verifyPaymentMutation = trpc.partner.verifyPayment.useMutation();

  // If already a partner, redirect to dashboard
  useEffect(() => {
    if (mySubscription) {
      navigate('/partner/dashboard');
    }
  }, [mySubscription, navigate]);

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      openSignIn();
      return;
    }

    setIsSubscribing(true);
    try {
      // Load Razorpay
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Payment system failed to load. Please try again.');
        setIsSubscribing(false);
        return;
      }

      // Create subscription + Razorpay order
      const result = await subscribeMutation.mutateAsync({
        tier: selectedTier,
        referralCode: referralCode || undefined,
      });

      // Open Razorpay checkout
      const options = {
        key: result.razorpayKeyId,
        amount: result.amount,
        currency: result.currency,
        name: 'Taiwan Maami',
        description: result.description,
        order_id: result.razorpayOrderId,
        handler: async (response: any) => {
          try {
            const verified = await verifyPaymentMutation.mutateAsync({
              subscriptionId: result.subscriptionId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verified.success) {
              setWelcomeData({
                referralCode: verified.referralCode,
                tier: verified.tier,
              });
              setShowWelcome(true);
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
            setIsSubscribing(false);
            toast.info('Payment cancelled. Your subscription is saved — you can complete payment anytime.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start subscription. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

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

  const info = programmeInfo!;
  const foundingPrice = info?.foundingPrice || 250000;
  const regularPrice = info?.regularPrice || 350000;
  const slotsRemaining = info?.foundingSlotsRemaining || 0;
  const slotsTotal = info?.foundingSlotsTotal || 100;
  const complimentaryPerYear = info?.complimentaryItemsPerYear || 25;
  const drinkDiscount = info?.drinkDiscountPercent || 5;
  const workshopDiscount = info?.workshopDiscountPercent || 10;

  // Welcome screen after successful payment
  if (showWelcome && welcomeData) {
    const isFounder = welcomeData.tier === 'founding';

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0a08] via-[#2d1210] to-[#1a0a08] text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-[#bd302c] rounded-full blur-[120px] opacity-20" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#d4a574] rounded-full blur-[150px] opacity-15" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#d4a574] rounded-full blur-[200px] opacity-10" />
        </div>

        <div className="relative container max-w-2xl mx-auto py-12 md:py-20 px-4">
          {/* Celebration Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-[#d4a574] to-[#f0c090] mb-6">
              <Crown className="w-12 h-12 text-[#1a0a08]" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Welcome to the{' '}
              <span className="bg-gradient-to-r from-[#d4a574] to-[#f0c090] bg-clip-text text-transparent">
                Maami Partner
              </span>{' '}
              Family!
            </h1>
            <Badge className={`text-sm px-4 py-1.5 ${isFounder ? 'bg-gradient-to-r from-[#d4a574] to-[#f0c090] text-[#1a0a08]' : 'bg-white/20 text-white'}`}>
              <Crown className="w-4 h-4 mr-1.5" />
              {isFounder ? 'Founding Partner' : 'Partner'}
            </Badge>
          </div>

          {/* Benefits you can start enjoying */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 md:p-8 mb-8">
            <h2 className="text-lg font-bold mb-5 text-center text-[#f0c090]">
              Start Enjoying Your Benefits Right Away!
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-[#bd302c]/30 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-5 h-5 text-[#f0a080]" />
                </div>
                <div>
                  <p className="font-semibold">Complimentary Food Item</p>
                  <p className="text-sm text-gray-400">Choose from Biang Biang, Dan Dan Noodles, Cong You Bing, Egg Cong You Bing, or any Brioche — on us at T. Nagar, every visit! ({complimentaryPerYear} per year)</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-[#bd302c]/30 flex items-center justify-center shrink-0">
                  <CupSoda className="w-5 h-5 text-[#f0a080]" />
                </div>
                <div>
                  <p className="font-semibold">{drinkDiscount}% Off All Drinks</p>
                  <p className="text-sm text-gray-400">Every drink in your order gets {drinkDiscount}% off — bubble tea, coffee, everything!</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-[#bd302c]/30 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 text-[#f0a080]" />
                </div>
                <div>
                  <p className="font-semibold">{workshopDiscount}% Off Workshops</p>
                  <p className="text-sm text-gray-400">Get {workshopDiscount}% off on all workshops run by Taiwan Maami.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* CTA to Dashboard */}
          <div className="text-center">
            <Button
              size="lg"
              className="bg-[#bd302c] hover:bg-[#9e0b0f] text-white text-lg px-10 py-6"
              onClick={() => navigate('/partner/dashboard')}
            >
              Go to My Partner Dashboard <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              Place your next order and watch the savings add up!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a0a08] via-[#2d1210] to-[#1a0a08] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-[#bd302c] rounded-full blur-[120px]" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#d4a574] rounded-full blur-[150px]" />
        </div>
        <div className="container relative py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-6 bg-[#bd302c]/20 text-[#f0a080] border-[#bd302c]/30 text-sm px-4 py-1.5">
              <Crown className="w-4 h-4 mr-1.5" />
              Limited Founding Partner Slots
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Become a{' '}
              <span className="bg-gradient-to-r from-[#d4a574] to-[#f0c090] bg-clip-text text-transparent">
                Maami Partner
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Complimentary food every visit at T. Nagar. {drinkDiscount}% off all drinks.
              {workshopDiscount}% off workshops. One annual fee, {complimentaryPerYear} complimentary items a year.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-[#bd302c] hover:bg-[#9e0b0f] text-white text-lg px-8 py-6"
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Join Now <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-500 text-gray-200 hover:bg-white/10 text-lg px-8 py-6"
                onClick={() => document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See Benefits
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-[#faf6f1]">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Your Partner Benefits
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Every visit becomes more rewarding. Here's what you get as a Maami Partner.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Complimentary Food Item */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <UtensilsCrossed className="w-7 h-7 text-[#bd302c]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Complimentary Food Item</h3>
              <p className="text-muted-foreground leading-relaxed">
                Choose from Biang Biang Noodles, Dan Dan Noodles, Cong You Bing, Egg Cong You Bing, or any Brioche — 
                complimentary at T. Nagar, every visit. No minimum purchase needed.
              </p>
              <p className="mt-3 text-sm font-medium text-[#bd302c]">
                {complimentaryPerYear} items per year · T. Nagar
              </p>
            </Card>

            {/* Drink Discount */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <CupSoda className="w-7 h-7 text-[#bd302c]" />
              </div>
              <h3 className="text-xl font-bold mb-3">{drinkDiscount}% Off All Drinks</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every bubble tea, coffee, and beverage in your order gets {drinkDiscount}% off. 
                Applies automatically at checkout.
              </p>
              <p className="mt-3 text-sm font-medium text-[#bd302c]">
                All outlets · Every order
              </p>
            </Card>

            {/* Workshop Discount */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <Star className="w-7 h-7 text-[#bd302c]" />
              </div>
              <h3 className="text-xl font-bold mb-3">{workshopDiscount}% Off Workshops</h3>
              <p className="text-muted-foreground leading-relaxed">
                Get {workshopDiscount}% off on all workshops and events run by Taiwan Maami. 
                Learn to make noodles, bubble tea, and more.
              </p>
              <p className="mt-3 text-sm font-medium text-[#bd302c]">
                All workshops
              </p>
            </Card>

            {/* Loyalty Stamps */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <Heart className="w-7 h-7 text-[#bd302c]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Loyalty Stamps</h3>
              <p className="text-muted-foreground leading-relaxed">
                Earn loyalty stamps on every order. Collect 10 stamps and get a free bubble tea on us.
                Partner benefits stack with loyalty rewards.
              </p>
              <p className="mt-3 text-sm font-medium text-[#bd302c]">
                Both outlets
              </p>
            </Card>

            {/* Partner Badge */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <Crown className="w-7 h-7 text-[#bd302c]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Partner Badge</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your profile gets a Partner badge. Staff will recognise you as 
                part of the Maami family.
              </p>
              <p className="mt-3 text-sm font-medium text-[#bd302c]">
                Founding Partners get a gold badge
              </p>
            </Card>

            {/* No Minimum Purchase */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <Gift className="w-7 h-7 text-[#bd302c]" />
              </div>
              <h3 className="text-xl font-bold mb-3">No Minimum Purchase</h3>
              <p className="text-muted-foreground leading-relaxed">
                Walk in, pick your complimentary item, and leave. No need to buy anything else. 
                It's that simple.
              </p>
              <p className="mt-3 text-sm font-medium text-[#bd302c]">
                T. Nagar outlet
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works — Visual Step-by-Step Guide */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Claiming your complimentary item is automatic. Just order normally and the system does the rest.
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-16">
            {/* T. Nagar Flow */}
            <div>
              <div className="flex items-center gap-3 mb-8 justify-center">
                <MapPin className="w-5 h-5 text-[#bd302c]" />
                <h3 className="text-xl font-bold text-foreground">At T. Nagar (Moutan)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 md:gap-2">
                {/* Step 1 */}
                <div className="bg-[#faf6f1] rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#bd302c] text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">1</div>
                  <ShoppingBag className="w-8 h-8 text-[#bd302c] mx-auto mb-3" />
                  <p className="font-semibold text-foreground mb-1">Walk in</p>
                  <p className="text-sm text-muted-foreground">No minimum purchase needed. Just be a Partner!</p>
                </div>
                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center">
                  <ChevronRight className="w-6 h-6 text-[#bd302c]/40" />
                </div>
                {/* Step 2 */}
                <div className="bg-[#faf6f1] rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#bd302c] text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">2</div>
                  <UtensilsCrossed className="w-8 h-8 text-[#bd302c] mx-auto mb-3" />
                  <p className="font-semibold text-foreground mb-1">Pick your item</p>
                  <p className="text-sm text-muted-foreground">Biang Biang, Dan Dan, Cong You Bing, Brioche — your choice!</p>
                </div>
                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center">
                  <ChevronRight className="w-6 h-6 text-[#bd302c]/40" />
                </div>
                {/* Step 3 */}
                <div className="bg-gradient-to-br from-[#bd302c]/10 to-[#d4a574]/10 rounded-2xl p-6 text-center border-2 border-[#bd302c]/20">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#bd302c] to-[#d4a574] text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <Sparkles className="w-8 h-8 text-[#bd302c] mx-auto mb-3" />
                  <p className="font-semibold text-foreground mb-1">It's complimentary!</p>
                  <p className="text-sm text-muted-foreground">Automatically deducted at checkout. Save up to ₹415!</p>
                </div>
              </div>
            </div>

            {/* Drink Discount Flow */}
            <div>
              <div className="flex items-center gap-3 mb-8 justify-center">
                <CupSoda className="w-5 h-5 text-[#bd302c]" />
                <h3 className="text-xl font-bold text-foreground">Drink Discount (Any Outlet)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 md:gap-2">
                {/* Step 1 */}
                <div className="bg-[#faf6f1] rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#bd302c] text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">1</div>
                  <CupSoda className="w-8 h-8 text-[#bd302c] mx-auto mb-3" />
                  <p className="font-semibold text-foreground mb-1">Order any drink</p>
                  <p className="text-sm text-muted-foreground">Bubble tea, coffee, any beverage</p>
                </div>
                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center">
                  <ChevronRight className="w-6 h-6 text-[#bd302c]/40" />
                </div>
                {/* Step 2 */}
                <div className="bg-[#faf6f1] rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#bd302c] text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">2</div>
                  <Sparkles className="w-8 h-8 text-[#bd302c] mx-auto mb-3" />
                  <p className="font-semibold text-foreground mb-1">Partner detected</p>
                  <p className="text-sm text-muted-foreground">System recognises your Partner status</p>
                </div>
                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center">
                  <ChevronRight className="w-6 h-6 text-[#bd302c]/40" />
                </div>
                {/* Step 3 */}
                <div className="bg-gradient-to-br from-[#bd302c]/10 to-[#d4a574]/10 rounded-2xl p-6 text-center border-2 border-[#bd302c]/20">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#bd302c] to-[#d4a574] text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <Percent className="w-8 h-8 text-[#bd302c] mx-auto mb-3" />
                  <p className="font-semibold text-foreground mb-1">{drinkDiscount}% off applied!</p>
                  <p className="text-sm text-muted-foreground">Discount on every drink in your order</p>
                </div>
              </div>
            </div>

            {/* Tip callout */}
            <div className="bg-[#faf6f1] border border-[#d4a574]/30 rounded-2xl p-6 md:p-8 text-center max-w-2xl mx-auto">
              <Shield className="w-8 h-8 text-[#bd302c] mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-2">No codes needed. Fully automatic.</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Just log in and place your order. The system recognises your Partner status and applies all benefits at checkout.
                You'll see the savings in your order summary before you pay.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 bg-[#faf6f1]">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              How Much Will You Save?
            </h2>
            <div className="bg-[#faf6f1] rounded-2xl p-8 md:p-12">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Visit once a week</p>
                  <p className="text-3xl font-bold text-[#bd302c]">₹21,500+</p>
                  <p className="text-sm text-muted-foreground mt-1">saved per year</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Visit twice a week</p>
                  <p className="text-3xl font-bold text-[#bd302c]">₹10,750+</p>
                  <p className="text-sm text-muted-foreground mt-1">saved (25 item limit)</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Plus drink savings</p>
                  <p className="text-3xl font-bold text-[#bd302c]">{drinkDiscount}% off</p>
                  <p className="text-sm text-muted-foreground mt-1">on every drink, every order</p>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-8">
                Based on 1 complimentary item (~₹415) per visit at T. Nagar, capped at {complimentaryPerYear} per year, plus {drinkDiscount}% off drinks
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-[#faf6f1]">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Choose Your Plan
            </h2>
            <p className="text-muted-foreground text-lg">
              Same benefits. Founding Partners get early access pricing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Founding Partner */}
            <Card
              className={`relative p-8 cursor-pointer transition-all ${
                selectedTier === 'founding'
                  ? 'border-2 border-[#bd302c] shadow-xl ring-2 ring-[#bd302c]/20'
                  : 'border-2 border-gray-200 hover:border-[#bd302c]/50'
              } ${slotsRemaining <= 0 ? 'opacity-60 pointer-events-none' : ''}`}
              onClick={() => slotsRemaining > 0 && setSelectedTier('founding')}
            >
              {slotsRemaining > 0 && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#bd302c] text-white px-4 py-1">
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Only {slotsRemaining} of {slotsTotal} slots left
                </Badge>
              )}
              <div className="text-center pt-4">
                <Crown className="w-10 h-10 text-[#d4a574] mx-auto mb-3" />
                <h3 className="text-2xl font-bold mb-1">Founding Partner</h3>
                <p className="text-muted-foreground text-sm mb-6">Early supporter pricing</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{formatPrice(foundingPrice)}</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <ul className="text-left space-y-3 mb-6">
                  {[
                    `Complimentary food item at T. Nagar (${complimentaryPerYear}/year)`,
                    `${drinkDiscount}% off all drinks, every order`,
                    `${workshopDiscount}% off all workshops`,
                    'Loyalty stamps on every order',
                    'Gold Partner badge',
                    'Founding Partner recognition',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {slotsRemaining <= 0 && (
                  <Badge variant="secondary" className="mb-4">Sold Out</Badge>
                )}
              </div>
            </Card>

            {/* Regular Partner */}
            <Card
              className={`relative p-8 cursor-pointer transition-all ${
                selectedTier === 'regular'
                  ? 'border-2 border-[#bd302c] shadow-xl ring-2 ring-[#bd302c]/20'
                  : 'border-2 border-gray-200 hover:border-[#bd302c]/50'
              }`}
              onClick={() => setSelectedTier('regular')}
            >
              <div className="text-center pt-4">
                <Shield className="w-10 h-10 text-[#a86462] mx-auto mb-3" />
                <h3 className="text-2xl font-bold mb-1">Regular Partner</h3>
                <p className="text-muted-foreground text-sm mb-6">Always available</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{formatPrice(regularPrice)}</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <ul className="text-left space-y-3 mb-6">
                  {[
                    `Complimentary food item at T. Nagar (${complimentaryPerYear}/year)`,
                    `${drinkDiscount}% off all drinks, every order`,
                    `${workshopDiscount}% off all workshops`,
                    'Loyalty stamps on every order',
                    'Partner badge',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>



          {/* Subscribe Button */}
          <div className="text-center mt-10">
            <Button
              size="lg"
              className="bg-[#bd302c] hover:bg-[#9e0b0f] text-white text-lg px-12 py-6"
              onClick={handleSubscribe}
              disabled={isSubscribing || !info?.programmeActive}
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : !isAuthenticated ? (
                <>
                  Sign In to Join <ArrowRight className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  Join as {selectedTier === 'founding' ? 'Founding' : 'Regular'} Partner — {formatPrice(selectedTier === 'founding' ? foundingPrice : regularPrice)}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
            {!info?.programmeActive && (
              <p className="text-sm text-muted-foreground mt-3">
                The Partner Programme is not currently accepting new subscriptions.
              </p>
            )}
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Secure payment via Razorpay
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Annual subscription
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-6">
            {[
              {
                q: 'What complimentary items can I choose from?',
                a: 'At T. Nagar, you can choose from Biang Biang Noodles, Dan Dan Noodles, Cong You Bing, Egg Cong You Bing, or any Brioche. One item per visit, up to ' + complimentaryPerYear + ' per year.',
              },
              {
                q: 'Do I need to buy something else to get my complimentary item?',
                a: 'No! There is no minimum purchase. Walk in, pick your complimentary item, and enjoy. You can of course order more if you like.',
              },
              {
                q: `How does the ${drinkDiscount}% drink discount work?`,
                a: `Every drink in your order — bubble tea, coffee, any beverage — gets ${drinkDiscount}% off automatically. This works at all outlets, on every order.`,
              },
              {
                q: 'Do I earn loyalty stamps on complimentary items?',
                a: 'Loyalty stamps are earned based on the amount you actually pay. Complimentary items are not counted towards stamp calculation.',
              },
              {
                q: 'Is this a subscription? Does it auto-renew?',
                a: 'It\'s an annual membership. It does NOT auto-renew — you\'ll get a reminder before expiry to renew if you wish.',
              },
              {
                q: 'What\'s the difference between Founding and Regular?',
                a: `Founding Partners get the same benefits at a lower price (${formatPrice(foundingPrice)}/year vs ${formatPrice(regularPrice)}/year) plus a gold badge. Limited to ${slotsTotal} slots.`,
              },
            ].map((faq) => (
              <div key={faq.q} className="border rounded-xl p-6">
                <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
