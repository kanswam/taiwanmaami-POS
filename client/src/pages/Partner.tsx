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
import { useLoginTransition } from '@/hooks/useLoginTransition';
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
  const { triggerLogin, transitionPortal } = useLoginTransition();

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
      triggerLogin();
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
  const teaDiscount = info?.teaDiscountPercent || 15;
  const slotsRemaining = info?.foundingSlotsRemaining || 0;
  const slotsTotal = info?.foundingSlotsTotal || 100;
  const referrerReward = info?.referrerReward || 25000;
  const referredReward = info?.referredReward || 10000;

  // Welcome screen after successful payment
  if (showWelcome && welcomeData) {
    const isFounder = welcomeData.tier === 'founding';
    const partnerReferralLink = `${window.location.origin}/partner?ref=${welcomeData.referralCode}`;

    const handleCopyWelcomeLink = () => {
      navigator.clipboard.writeText(partnerReferralLink);
      toast.success('Referral link copied!');
    };

    const handleShareWelcomeWhatsApp = () => {
      const text = encodeURIComponent(
        `Hey! I just joined the Maami Partner Programme at Taiwan Maami! 🎉🧋\n\n` +
        `I get free Biang Biang Noodles every visit + 15% off my tea!\n\n` +
        `Join using my link and we both earn Maami Rupees:\n${partnerReferralLink}\n\n` +
        `Don't miss out — limited Founding Partner slots available!`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank');
    };

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
                  <p className="font-semibold">Free Biang Biang Noodles</p>
                  <p className="text-sm text-gray-400">Order at T. Nagar (Moutan) and your Biang Biang is on us — every single visit!</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-[#bd302c]/30 flex items-center justify-center shrink-0">
                  <CupSoda className="w-5 h-5 text-[#f0a080]" />
                </div>
                <div>
                  <p className="font-semibold">Free Large Bubble Tea</p>
                  <p className="text-sm text-gray-400">Visit Palladium Mall and enjoy a free large bubble tea with every order!</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-[#bd302c]/30 flex items-center justify-center shrink-0">
                  <Percent className="w-5 h-5 text-[#f0a080]" />
                </div>
                <div>
                  <p className="font-semibold">15% Off All Teas</p>
                  <p className="text-sm text-gray-400">Your tea is always discounted at both outlets. The savings start from your very first order!</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Referral Encouragement */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 md:p-8 mb-8">
            <div className="text-center mb-5">
              <Users className="w-8 h-8 text-[#f0c090] mx-auto mb-3" />
              <h2 className="text-lg font-bold text-[#f0c090]">Refer Friends & Earn Rewards</h2>
              <p className="text-sm text-gray-400 mt-2">
                Share your referral link with friends. When they join, you get{' '}
                <span className="text-[#d4a574] font-semibold">{formatPrice(referrerReward)}</span> in Maami Rupees and they get{' '}
                <span className="text-[#d4a574] font-semibold">{formatPrice(referredReward)}</span>!
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2">Your referral code</p>
              <p className="text-xl font-mono font-bold tracking-wider text-[#d4a574] text-center">
                {welcomeData.referralCode}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full bg-[#25D366] hover:bg-[#1da851] text-white"
                onClick={handleShareWelcomeWhatsApp}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share with Friends on WhatsApp
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10"
                onClick={handleCopyWelcomeLink}
              >
                <Gift className="w-4 h-4 mr-2" />
                Copy Referral Link
              </Button>
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
      {transitionPortal}

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
              Free Biang Biang Noodles every visit. {teaDiscount}% off your tea.
              Earn rewards when friends join. One annual fee, unlimited benefits.
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
            {/* Free Biang Biang */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <UtensilsCrossed className="w-7 h-7 text-[#bd302c]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Free Biang Biang Noodles</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our most popular dish — free with every order at T. Nagar (Moutan). 
                Worth ₹415, yours every single visit.
              </p>
              <p className="mt-3 text-sm font-medium text-[#bd302c]">
                T. Nagar / Moutan outlet
              </p>
            </Card>

            {/* Free Large Tea */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <CupSoda className="w-7 h-7 text-[#bd302c]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Free Large Bubble Tea</h3>
              <p className="text-muted-foreground leading-relaxed">
                A free Large bubble tea with every order at Palladium Mall. 
                Choose any flavour — it's on us.
              </p>
              <p className="mt-3 text-sm font-medium text-[#bd302c]">
                Palladium Mall outlet
              </p>
            </Card>

            {/* Tea Discount */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <Percent className="w-7 h-7 text-[#bd302c]" />
              </div>
              <h3 className="text-xl font-bold mb-3">{teaDiscount}% Off Your Tea</h3>
              <p className="text-muted-foreground leading-relaxed">
                {teaDiscount}% off one tea per visit — your own drink, at both outlets.
                Stacks with the free Biang Biang or free Large Tea.
              </p>
              <p className="mt-3 text-sm font-medium text-[#bd302c]">
                Both outlets
              </p>
            </Card>

            {/* Referral Rewards */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <Users className="w-7 h-7 text-[#bd302c]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Refer & Earn</h3>
              <p className="text-muted-foreground leading-relaxed">
                Share your referral link. When a friend joins, you get {formatPrice(referrerReward)} in 
                Maami Rupees store credit, and they get {formatPrice(referredReward)}.
              </p>
              <p className="mt-3 text-sm font-medium text-[#bd302c]">
                Unlimited referrals
              </p>
            </Card>

            {/* Maami Rupees */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <Gift className="w-7 h-7 text-[#bd302c]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Maami Rupees</h3>
              <p className="text-muted-foreground leading-relaxed">
                Earn store credit through referrals. Use Maami Rupees to pay for 
                orders — like cash, but better.
              </p>
              <p className="mt-3 text-sm font-medium text-[#bd302c]">
                Usable on any order
              </p>
            </Card>

            {/* Priority */}
            <Card className="p-8 border-2 border-[#bd302c]/20 bg-white hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#bd302c]/10 flex items-center justify-center mb-5">
                <Star className="w-7 h-7 text-[#bd302c]" />
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
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              How Much Will You Save?
            </h2>
            <div className="bg-[#faf6f1] rounded-2xl p-8 md:p-12">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Visit once a week</p>
                  <p className="text-3xl font-bold text-[#bd302c]">₹26,000+</p>
                  <p className="text-sm text-muted-foreground mt-1">saved per year</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Visit twice a week</p>
                  <p className="text-3xl font-bold text-[#bd302c]">₹52,000+</p>
                  <p className="text-sm text-muted-foreground mt-1">saved per year</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Visit 3x a week</p>
                  <p className="text-3xl font-bold text-[#bd302c]">₹78,000+</p>
                  <p className="text-sm text-muted-foreground mt-1">saved per year</p>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-8">
                Based on 1 free Biang Biang (₹415) + {teaDiscount}% off 1 tea (~₹250 × {teaDiscount}% = ~₹37 saved) per visit
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
                    'Free Biang Biang every visit (T. Nagar)',
                    'Free Large Bubble Tea every visit (Palladium)',
                    `${teaDiscount}% off your tea (1 per visit)`,
                    'Refer & earn Maami Rupees',
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
                    'Free Biang Biang every visit (T. Nagar)',
                    'Free Large Bubble Tea every visit (Palladium)',
                    `${teaDiscount}% off your tea (1 per visit)`,
                    'Refer & earn Maami Rupees',
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

          {/* Referral Code Input */}
          <div className="max-w-md mx-auto mt-10">
            <div className="bg-white rounded-xl p-6 border">
              <label className="text-sm font-medium mb-2 block">
                Have a referral code?
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. PRIYA26ABC"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
              {referralCode && referralValidation && (
                <p className={`text-sm mt-2 ${referralValidation.valid ? 'text-green-600' : 'text-red-500'}`}>
                  {referralValidation.valid
                    ? `Referred by ${referralValidation.partnerName} — you'll both earn Maami Rupees!`
                    : 'Invalid referral code'}
                </p>
              )}
            </div>
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
                q: 'How does the free Biang Biang work?',
                a: 'Add Biang Biang Noodles to your order at T. Nagar (Moutan). The system automatically makes one Biang Biang free. If you order multiple, only one is free per visit.',
              },
              {
                q: 'What about Palladium Mall?',
                a: 'At Palladium, you get a free Large Bubble Tea instead (any flavour). The most expensive large tea in your order becomes free.',
              },
              {
                q: 'Does the tea discount stack with the free item?',
                a: `Yes! You get the free item PLUS ${teaDiscount}% off all other teas in your order. They're separate benefits.`,
              },
              {
                q: 'How do referrals work?',
                a: `Share your unique referral link via WhatsApp. When a friend joins as a Partner, you get ${formatPrice(referrerReward)} and they get ${formatPrice(referredReward)} in Maami Rupees (store credit). No limit on referrals.`,
              },
              {
                q: 'What are Maami Rupees?',
                a: 'Maami Rupees are store credit on your Taiwan Maami account. Use them to pay for any order — they work like cash.',
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
