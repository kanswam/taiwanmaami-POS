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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Crown,
  Gift,
  Star,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Shield,
  Sparkles,
  Clock,
  ChevronDown,
  Wallet,
  GraduationCap,
  Coffee,
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
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Payment system failed to load. Please try again.');
        setIsSubscribing(false);
        return;
      }

      const result = await subscribeMutation.mutateAsync({
        tier: selectedTier,
        referralCode: referralCode || undefined,
      });

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
  const foundingPrice = info?.foundingPrice || 388800;
  const regularPrice = info?.regularPrice || 450000;
  const slotsRemaining = info?.foundingSlotsRemaining || 0;
  const slotsTotal = info?.foundingSlotsTotal || 49;
  const complimentaryPerYear = info?.complimentaryItemsPerYear || 15;

  // Welcome screen after successful payment
  if (showWelcome && welcomeData) {
    const isFounder = welcomeData.tier === 'founding';

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0a08] via-[#2d1210] to-[#1a0a08] text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-[#bd302c] rounded-full blur-[120px] opacity-20" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#d4a574] rounded-full blur-[150px] opacity-15" />
        </div>

        <div className="relative container max-w-2xl mx-auto py-12 md:py-20 px-4">
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

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 md:p-8 mb-8">
            <h2 className="text-lg font-bold mb-5 text-center text-[#f0c090]">
              Your Benefits Are Now Active
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                <Gift className="w-6 h-6 text-[#f0a080] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">15 Complimentary Items Per Year</p>
                  <p className="text-sm text-gray-400">One free item per day, up to {formatPrice(50000)}. Auto-selected at checkout.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                <Wallet className="w-6 h-6 text-[#f0a080] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Maami Rupees (2% Back)</p>
                  <p className="text-sm text-gray-400">Earn 2% of every order as store credit. Redeemable at any outlet.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                <Coffee className="w-6 h-6 text-[#f0a080] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Loyalty Stamps</p>
                  <p className="text-sm text-gray-400">Collect 10 stamps, earn a free Large Bubble Tea.</p>
                </div>
              </div>
            </div>
          </Card>

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

      {/* ═══════════════════════════════════════════════════════════════════
          BLOCK 1 — Hero (above fold on mobile)
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-[#1a0a08] via-[#2d1210] to-[#1a0a08] text-white py-16 md:py-24">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
              Taiwan Maami Partner Programme
            </h1>
            <p className="text-lg md:text-xl text-gray-300">
              Every visit. Something on us.
            </p>
          </div>

          {/* Two tier cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Founding Partner Card */}
            <Card
              className={`relative p-6 cursor-pointer transition-all bg-white/5 backdrop-blur-sm border-white/20 hover:border-[#d4a574]/60 ${
                selectedTier === 'founding'
                  ? 'border-[#d4a574] ring-2 ring-[#d4a574]/30'
                  : ''
              } ${slotsRemaining <= 0 ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => slotsRemaining > 0 && setSelectedTier('founding')}
            >
              {slotsRemaining > 0 && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#d4a574] text-[#1a0a08] text-xs px-3 py-0.5">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {slotsRemaining} of {slotsTotal} slots left
                </Badge>
              )}
              <div className="text-center pt-3">
                <Crown className="w-8 h-8 text-[#d4a574] mx-auto mb-2" />
                <h3 className="text-xl font-bold text-white mb-1">Founding Partner</h3>
                <p className="text-3xl font-bold text-[#d4a574] mb-1">{formatPrice(foundingPrice)}</p>
                <p className="text-sm text-gray-400 mb-4">per year (incl. GST)</p>
                <Button
                  size="sm"
                  className="bg-[#bd302c] hover:bg-[#9e0b0f] text-white w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTier('founding');
                    document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Join Now <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                {slotsRemaining <= 0 && (
                  <Badge variant="secondary" className="mt-3">Sold Out</Badge>
                )}
              </div>
            </Card>

            {/* Regular Partner Card */}
            <Card
              className={`relative p-6 cursor-pointer transition-all bg-white/5 backdrop-blur-sm border-white/20 hover:border-white/40 ${
                selectedTier === 'regular'
                  ? 'border-white ring-2 ring-white/20'
                  : ''
              }`}
              onClick={() => setSelectedTier('regular')}
            >
              <div className="text-center pt-3">
                <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <h3 className="text-xl font-bold text-white mb-1">Regular Partner</h3>
                <p className="text-3xl font-bold text-white mb-1">{formatPrice(regularPrice)}</p>
                <p className="text-sm text-gray-400 mb-4">per year (incl. GST) · Always open</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-500 text-gray-200 hover:bg-white/10 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTier('regular');
                    document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Join Now <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Cultural note */}
          <p className="text-center text-sm italic text-gray-400 mt-6">
            In Taiwanese culture, 8 is the number of prosperity.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          BLOCK 2 — Benefits (4 cards)
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-[#faf6f1]">
        <div className="container max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Your Benefits</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="p-6 border-[#bd302c]/15 bg-white">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-[#bd302c]" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1">{complimentaryPerYear} Complimentary Items Per Year</h3>
                  <p className="text-sm text-muted-foreground">One free item per day, any item up to {formatPrice(50000)}. Mochis excluded.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-[#bd302c]/15 bg-white">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-[#bd302c]" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1">Earn Maami Rupees</h3>
                  <p className="text-sm text-muted-foreground">2% of every order back as store credit, redeemable at any outlet.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-[#bd302c]/15 bg-white">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <Coffee className="w-5 h-5 text-[#bd302c]" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1">Loyalty Stamps</h3>
                  <p className="text-sm text-muted-foreground">Collect 10 stamps, earn a free Large Bubble Tea.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-[#bd302c]/15 bg-white">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#bd302c]/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-[#bd302c]" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1">10% Off Workshops & Events</h3>
                  <p className="text-sm text-muted-foreground">Learn to make noodles, bubble tea, and more — at a discount.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          BLOCK 3 — Savings Table
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="container max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Your Savings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-[#bd302c]/20">
                  <th className="text-left py-3 pr-4 font-semibold text-foreground"></th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground">Once a month<br /><span className="text-xs text-muted-foreground font-normal">(12 visits)</span></th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground">Every 3 weeks<br /><span className="text-xs text-muted-foreground font-normal">(15 visits)</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 pr-4 text-muted-foreground">{complimentaryPerYear} complimentary items (avg {formatPrice(42000)})</td>
                  <td className="py-3 px-4 text-center font-medium">{formatPrice(504000)}</td>
                  <td className="py-3 px-4 text-center font-medium">{formatPrice(630000)}</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-muted-foreground">Maami Rupees earned (2% on orders)</td>
                  <td className="py-3 px-4 text-center font-medium">~{formatPrice(12000)}+</td>
                  <td className="py-3 px-4 text-center font-medium">~{formatPrice(15000)}+</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-muted-foreground">Free stamp teas</td>
                  <td className="py-3 px-4 text-center font-medium">~{formatPrice(44500)}</td>
                  <td className="py-3 px-4 text-center font-medium">~{formatPrice(89000)}</td>
                </tr>
                <tr className="border-t-2 border-[#bd302c]/20 font-semibold">
                  <td className="py-3 pr-4">Total value</td>
                  <td className="py-3 px-4 text-center text-[#bd302c]">~{formatPrice(560500)}</td>
                  <td className="py-3 px-4 text-center text-[#bd302c]">~{formatPrice(734000)}</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-muted-foreground">Founding Partner fee</td>
                  <td className="py-3 px-4 text-center">{formatPrice(foundingPrice)}</td>
                  <td className="py-3 px-4 text-center">{formatPrice(foundingPrice)}</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-muted-foreground">Regular Partner fee</td>
                  <td className="py-3 px-4 text-center">{formatPrice(regularPrice)}</td>
                  <td className="py-3 px-4 text-center">{formatPrice(regularPrice)}</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="py-3 pr-4 font-semibold text-green-800">Your saving — Founding</td>
                  <td className="py-3 px-4 text-center font-bold text-green-700">{formatPrice(171700)}</td>
                  <td className="py-3 px-4 text-center font-bold text-green-700">{formatPrice(345200)}</td>
                </tr>
                <tr className="bg-green-50/50">
                  <td className="py-3 pr-4 font-semibold text-green-800">Your saving — Regular</td>
                  <td className="py-3 px-4 text-center font-bold text-green-700">{formatPrice(110500)}</td>
                  <td className="py-3 px-4 text-center font-bold text-green-700">{formatPrice(284000)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Maami Rupees scale with your actual spend — 2% of every order. Estimates use {formatPrice(50000)} avg order.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          BLOCK 4 — How It Works (5 steps)
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-[#faf6f1]">
        <div className="container max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">How It Works</h2>
          <div className="space-y-6">
            {[
              { step: 1, text: 'Sign up and pay via Razorpay' },
              { step: 2, text: 'Benefits apply automatically from your next order' },
              { step: 3, text: 'Your free item is selected automatically — the highest-priced eligible item in your order. You can change it if you prefer something else.' },
              { step: 4, text: 'Earn Maami Rupees and stamps on every order' },
              { step: 5, text: 'Track everything on your Partner Dashboard' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-[#bd302c] text-white flex items-center justify-center shrink-0 text-sm font-bold">
                  {step}
                </div>
                <p className="text-foreground pt-1.5 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          BLOCK 5 — Sign-up Form
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="signup" className="py-16 bg-white">
        <div className="container max-w-lg mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Join the Partner Programme</h2>

          <Card className="p-6 md:p-8 border-2 border-gray-100">
            {/* Tier selector */}
            <div className="mb-6">
              <label className="text-sm font-medium text-foreground mb-2 block">Select your tier</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    selectedTier === 'founding'
                      ? 'border-[#d4a574] bg-[#d4a574]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${slotsRemaining <= 0 ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => slotsRemaining > 0 && setSelectedTier('founding')}
                >
                  <Crown className="w-5 h-5 text-[#d4a574] mx-auto mb-1" />
                  <p className="font-semibold text-sm">Founding</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(foundingPrice)}/yr</p>
                </button>
                <button
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    selectedTier === 'regular'
                      ? 'border-[#bd302c] bg-[#bd302c]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTier('regular')}
                >
                  <Shield className="w-5 h-5 text-[#bd302c] mx-auto mb-1" />
                  <p className="font-semibold text-sm">Regular</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(regularPrice)}/yr</p>
                </button>
              </div>
              {selectedTier === 'founding' && slotsRemaining > 0 && (
                <p className="text-xs text-[#d4a574] mt-2 text-center">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  {slotsRemaining} of {slotsTotal} founding slots remaining
                </p>
              )}
            </div>

            {/* Pre-filled info */}
            {isAuthenticated && user && (
              <div className="mb-6 space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
                  <Input value={user.name || ''} disabled className="bg-gray-50" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                  <Input value={user.email || ''} disabled className="bg-gray-50" />
                </div>
              </div>
            )}

            {/* Referral code */}
            <div className="mb-6">
              <label className="text-sm font-medium text-foreground mb-1 block">
                Referral code <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="e.g. MAAMI-KANNAN"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="uppercase"
              />
              {referralCode.length >= 4 && referralValidation && (
                <p className={`text-xs mt-1.5 ${referralValidation.valid ? 'text-green-600' : 'text-red-500'}`}>
                  {referralValidation.valid
                    ? `✓ Referred by ${referralValidation.partnerName} — you'll receive ₹200 in Maami Rupees on your first order`
                    : '✗ Invalid referral code'}
                </p>
              )}
              {!referralCode && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Your friend gets ₹200 in Maami Rupees too
                </p>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                BLOCK 6 — Refund Policy (non-collapsible, above payment)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-foreground/80 leading-relaxed">
                <span className="font-semibold">Refund Policy:</span> Non-refundable once any benefit has been used. Full refund within 60 days if no benefits redeemed — email{' '}
                <a href="mailto:hello@taiwanmaami.com" className="text-[#bd302c] underline">hello@taiwanmaami.com</a>.
                By completing payment you agree to these terms.
              </p>
            </div>

            {/* Subscribe button */}
            <Button
              size="lg"
              className="bg-[#bd302c] hover:bg-[#9e0b0f] text-white w-full text-base py-6"
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
                  Pay {formatPrice(selectedTier === 'founding' ? foundingPrice : regularPrice)} — Join as {selectedTier === 'founding' ? 'Founding' : 'Regular'} Partner
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
            {!info?.programmeActive && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                The Partner Programme is not currently accepting new subscriptions.
              </p>
            )}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Secure payment
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Annual · No auto-renew
              </span>
            </div>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          BLOCK 7 — Terms & Conditions (collapsed by default)
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-12 bg-[#faf6f1]">
        <div className="container max-w-2xl mx-auto px-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="terms" className="border rounded-xl bg-white px-6">
              <AccordionTrigger className="text-base font-semibold py-4">
                Terms & Conditions
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#bd302c] shrink-0 mt-0.5" />
                    <span>One free item per day (not per visit)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#bd302c] shrink-0 mt-0.5" />
                    <span>Mochis excluded at all outlets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#bd302c] shrink-0 mt-0.5" />
                    <span>Maami Rupees: store credit only, not cash, cannot pay for Partner Programme fee, expire 12 months from earned date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#bd302c] shrink-0 mt-0.5" />
                    <span>Stamps earned on amount paid after discounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#bd302c] shrink-0 mt-0.5" />
                    <span>Unused items do not carry over on renewal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#bd302c] shrink-0 mt-0.5" />
                    <span>Non-transferable, non-refundable after use</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#bd302c] shrink-0 mt-0.5" />
                    <span>Benefits will not be reduced during active membership year without credit or adjustment</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <Footer />
    </div>
  );
}
