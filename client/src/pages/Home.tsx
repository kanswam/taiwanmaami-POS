import { Link, useLocation, useSearch } from 'wouter';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// Taiwan Maami Web Platform - Customer Ordering Website
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { SEO } from '@/components/SEO';
import { LazyVideo } from '@/components/LazyVideo';
import { trpc } from '@/lib/trpc';
import { ArrowRight, MapPin, Clock, Star, Sparkles, Instagram, Phone, Navigation, Store, Truck, ShoppingBag, Facebook, Twitter, Youtube, ChevronLeft, ChevronRight, Leaf, Globe, Plus, X, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { formatPrice, OUTLET_HOURS } from '@shared/types';
import { ProductCustomizationModal } from '@/components/ProductCustomizationModal';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '@/lib/imageOptimizer';
import { OptimizedImage } from '@/components/OptimizedImage';

// Chinese painting jade green for CTAs
const JADE_GREEN = '#5e6c48';
const JADE_GREEN_HOVER = '#4d5a3b';

export default function Home() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  
  // Instagram bio redirect: ?order=now → go straight to menu/ordering
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get('order') === 'now') {
      setLocation('/menu?type=delivery&utm_source=instagram');
    }
  }, [searchString, setLocation]);

  // Fetch site settings from database (public endpoint - no auth required)
  const { data: siteSettings } = trpc.menu.getPublicSiteSettings.useQuery();
  
  // Fetch homepage CMS sections
  const { data: homepageSections } = trpc.homepage.getSections.useQuery();
  
  // Fetch featured products for carousel
  const { data: featuredProducts } = trpc.homepage.getFeaturedProducts.useQuery();
  
  // Fetch upcoming workshops for announcement banner
  const { data: upcomingWorkshops } = trpc.workshops.getPublished.useQuery();
  
  // Cart context for outlet/order type
  const { state: cartState, setOrderType, setInstoreOutlet, setPickupOutlet } = useCart();
  const { instoreOutlet, pickupOutlet } = cartState;

  // Fetch full menu for 2-level tabbed menu section (dynamic based on order type)
  const { data: fullMenu } = trpc.menu.getFullMenu.useQuery({
    isDelivery: cartState.orderType === 'delivery',
    isPickup: cartState.orderType === 'pickup',
    includeUnavailable: false,
  });
  
  // Active category tab for the explore menu section
  const [activeMenuTab, setActiveMenuTab] = useState<number | null>(null);
  const [activeSubFilter, setActiveSubFilter] = useState<string>('all');

  // Outlet selection UI state
  const [showOutletSelector, setShowOutletSelector] = useState(false);
  const [pendingOrderType, setPendingOrderType] = useState<'instore' | 'pickup' | null>(null);
  const [pendingQuickAddProductId, setPendingQuickAddProductId] = useState<number | null>(null);

  // Track whether user has EXPLICITLY chosen their ordering mode in this session
  // This prevents silent defaults from localStorage allowing items into cart without choosing
  const [hasExplicitlyChosenMode, setHasExplicitlyChosenMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('tw_orderModeChosen') === 'true';
  });

  // Determine if outlet has been selected
  const hasOutletSelected = useMemo(() => {
    if (cartState.orderType === 'delivery') return true;
    if (cartState.orderType === 'instore') return !!instoreOutlet;
    if (cartState.orderType === 'pickup') return !!pickupOutlet;
    return false;
  }, [cartState.orderType, instoreOutlet, pickupOutlet]);

  // Combined check: outlet selected AND user explicitly chose this session
  const canAddToCart = hasOutletSelected && hasExplicitlyChosenMode;

  // Get the current selected outlet
  const currentOutlet = useMemo(() => {
    if (cartState.orderType === 'instore') return instoreOutlet;
    if (cartState.orderType === 'pickup') return pickupOutlet;
    if (cartState.orderType === 'delivery') return 'tnagar';
    return null;
  }, [cartState.orderType, instoreOutlet, pickupOutlet]);

  // Mark order mode as explicitly chosen (persists for this browser session)
  const markModeChosen = useCallback(() => {
    setHasExplicitlyChosenMode(true);
    sessionStorage.setItem('tw_orderModeChosen', 'true');
  }, []);

  // Handle order type selection
  const handleOrderTypeClick = (type: 'instore' | 'delivery' | 'pickup') => {
    if (type === 'delivery') {
      setOrderType('delivery');
      setShowOutletSelector(false);
      setPendingOrderType(null);
      markModeChosen();
      toast.success('Ordering for Delivery from T. Nagar', { duration: 2000 });
      // If there's a pending quick add from carousel, check availability at T. Nagar (delivery outlet)
      if (pendingQuickAddProductId) {
        const pendingProduct = featuredProducts?.find((p: any) => p.id === pendingQuickAddProductId)
          || fullMenu?.products.find((p: any) => p.id === pendingQuickAddProductId);
        if (pendingProduct && pendingProduct.availableAtTnagar === false) {
          toast.info('This item is not available for delivery from T. Nagar. Try dine-in or pickup at Palladium!', { duration: 3000 });
        } else {
          setQuickAddProductId(pendingQuickAddProductId);
        }
        setPendingQuickAddProductId(null);
      } else {
        setTimeout(() => {
          document.getElementById('explore-menu')?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    } else {
      setPendingOrderType(type);
      setShowOutletSelector(true);
    }
  };

  // Handle outlet selection
  const handleOutletSelect = (outlet: 'palladium' | 'tnagar' | 'annanagar') => {
    if (outlet === 'palladium' && !OUTLET_HOURS.palladium.orderingEnabled) {
      toast('Online ordering not available at Palladium Mall yet. Please select another outlet.', { icon: '🚫' });
      return;
    }
    if (outlet === 'annanagar' && !OUTLET_HOURS.annanagar.orderingEnabled) {
      toast('Online ordering not available at Anna Nagar yet. Please select another outlet.', { icon: '🚫' });
      return;
    }
    const type = pendingOrderType || cartState.orderType;
    setOrderType(type);
    if (type === 'instore') {
      setInstoreOutlet(outlet);
    } else if (type === 'pickup') {
      setPickupOutlet(outlet);
    }
    setShowOutletSelector(false);
    setPendingOrderType(null);
    markModeChosen();
    const outletName = outlet === 'palladium' ? 'Palladium Mall' : outlet === 'annanagar' ? 'Anna Nagar' : 'T. Nagar';
    const typeLabel = type === 'instore' ? 'Dine-In' : 'Pickup';
    toast.success(`${typeLabel} at ${outletName}`, { duration: 2000 });
    if (pendingQuickAddProductId) {
      // Check if the pending product is available at the newly selected outlet
      const pendingProduct = featuredProducts?.find((p: any) => p.id === pendingQuickAddProductId)
        || fullMenu?.products.find((p: any) => p.id === pendingQuickAddProductId);
      const isAvailableAtNewOutlet = (() => {
        if (!pendingProduct) return true; // If we can't find the product data, allow it
        if (outlet === 'palladium' && pendingProduct.availableAtPalladium === false) return false;
        if (outlet === 'tnagar' && pendingProduct.availableAtTnagar === false) return false;
        if (outlet === 'annanagar' && pendingProduct.availableAtAnnanagar === false) return false;
        return true;
      })();
      
      if (!isAvailableAtNewOutlet) {
        const outletLabel = outlet === 'palladium' ? 'Palladium Mall' : outlet === 'annanagar' ? 'Anna Nagar' : 'T. Nagar';
        toast.info(`This item is not available at ${outletLabel}. Try our other outlet!`, { duration: 3000 });
      } else {
        setQuickAddProductId(pendingQuickAddProductId);
      }
      setPendingQuickAddProductId(null);
    } else {
      setTimeout(() => {
        document.getElementById('explore-menu')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };


  // Quick Add modal state
  const [quickAddProductId, setQuickAddProductId] = useState<number | null>(null);

  // Helper: check if a featured product (from carousel) is available at the current outlet
  const isFeaturedProductAvailable = useCallback((product: any) => {
    if (!currentOutlet) return true; // no outlet selected = show all as available
    if (currentOutlet === 'palladium' && product.availableAtPalladium === false) return false;
    if (currentOutlet === 'tnagar' && product.availableAtTnagar === false) return false;
    if (currentOutlet === 'annanagar' && product.availableAtAnnanagar === false) return false;
    return true;
  }, [currentOutlet]);

  // Helper: open Quick Add modal for a product (with outlet pre-check + availability check)
  const openQuickAdd = (productId: number, e?: React.MouseEvent, productData?: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Force outlet+mode selection if user hasn't explicitly chosen this session
    if (!canAddToCart) {
      setPendingQuickAddProductId(productId);
      setPendingOrderType(null); // Reset so they see order type selection first
      setShowOutletSelector(true);
      return;
    }
    // Check availability at the selected outlet
    if (productData && !isFeaturedProductAvailable(productData)) {
      const outletName = currentOutlet === 'palladium' ? 'Palladium Mall' : 'T. Nagar';
      toast.info(`This item is not available at ${outletName}. Try our other outlet!`, { duration: 3000 });
      return;
    }
    setQuickAddProductId(productId);
  };

  // Resolve the Quick Add modal data from fullMenu
  const quickAddProduct = useMemo(() => {
    if (!quickAddProductId || !fullMenu) return null;
    const product = fullMenu.products.find((p: any) => p.id === quickAddProductId);
    if (!product) return null;
    const subcategory = fullMenu.subcategories.find((s: any) => s.id === product.subcategoryId);
    if (!subcategory) return null;
    const category = fullMenu.categories.find((c: any) => c.id === subcategory.categoryId);
    return { product, subcategory, category };
  }, [quickAddProductId, fullMenu]);
  
  // Parse CMS sections into a map
  const sectionsMap = useMemo(() => {
    if (!homepageSections) return {};
    return homepageSections.reduce((acc: any, s: any) => {
      acc[s.sectionKey] = s;
      return acc;
    }, {});
  }, [homepageSections]);

  // Default values
  const [heroTitle, setHeroTitle] = useState('Authentic Taiwanese\nBubble Tea');
  const [heroDescription, setHeroDescription] = useState('Crafted with imported tapioca pearls from Taiwan. Experience the true taste of premium bubble tea at Taiwan Maami.');
  const [qualityTitle, setQualityTitle] = useState('Premium Quality');
  const [qualityDescription, setQualityDescription] = useState('Imported ingredients from Taiwan');
  const [freshnessTitle, setFreshnessTitle] = useState('Crafted Fresh');
  const [freshnessDescription, setFreshnessDescription] = useState('Made to order, every time');
  const [deliveryTitle, setDeliveryTitle] = useState('Quick Delivery');
  const [deliveryDescription, setDeliveryDescription] = useState('Fast delivery across Chennai');
  
  // Category cards
  const [cat1Name, setCat1Name] = useState('Iced Beverages');
  const [cat1Desc, setCat1Desc] = useState('Authentic Taiwanese bubble tea & premium coffee');
  const [cat2Name, setCat2Name] = useState('Hot Beverages');
  const [cat2Desc, setCat2Desc] = useState('Warm & comforting traditional drinks');
  const [cat3Name, setCat3Name] = useState('Food');
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

  // Load settings from database when available
  // Handle hash-based scrolling when navigating from other pages (e.g., /#explore-menu)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // Retry scroll multiple times as dynamic content shifts layout
      const timers = [500, 1200, 2500].map(delay =>
        setTimeout(() => {
          const el = document.getElementById(hash.slice(1));
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, delay)
      );
      return () => timers.forEach(clearTimeout);
    }
  }, []);

  useEffect(() => {
    if (siteSettings) {
      const settingsMap = siteSettings.reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
      
      if (settingsMap.hero_title) setHeroTitle(settingsMap.hero_title);
      if (settingsMap.hero_description) setHeroDescription(settingsMap.hero_description);
      if (settingsMap.quality_title) setQualityTitle(settingsMap.quality_title);
      if (settingsMap.quality_description) setQualityDescription(settingsMap.quality_description);
      if (settingsMap.freshness_title) setFreshnessTitle(settingsMap.freshness_title);
      if (settingsMap.freshness_description) setFreshnessDescription(settingsMap.freshness_description);
      if (settingsMap.delivery_title) setDeliveryTitle(settingsMap.delivery_title);
      if (settingsMap.delivery_description) setDeliveryDescription(settingsMap.delivery_description);
      
      // Category cards
      if (settingsMap.cat1_name) setCat1Name(settingsMap.cat1_name);
      if (settingsMap.cat1_desc) setCat1Desc(settingsMap.cat1_desc);
      if (settingsMap.cat2_name) setCat2Name(settingsMap.cat2_name);
      if (settingsMap.cat2_desc) setCat2Desc(settingsMap.cat2_desc);
      if (settingsMap.cat3_name) setCat3Name(settingsMap.cat3_name);
      if (settingsMap.cat3_desc) setCat3Desc(settingsMap.cat3_desc);
      if (settingsMap.cat4_name) setCat4Name(settingsMap.cat4_name);
      if (settingsMap.cat4_desc) setCat4Desc(settingsMap.cat4_desc);
      
      // Location cards
      if (settingsMap.loc1_name) setLoc1Name(settingsMap.loc1_name);
      if (settingsMap.loc1_subtitle) setLoc1Subtitle(settingsMap.loc1_subtitle);
      if (settingsMap.loc1_address) setLoc1Address(settingsMap.loc1_address);
      if (settingsMap.loc1_city) setLoc1City(settingsMap.loc1_city);
      if (settingsMap.loc2_name) setLoc2Name(settingsMap.loc2_name);
      if (settingsMap.loc2_subtitle) setLoc2Subtitle(settingsMap.loc2_subtitle);
      if (settingsMap.loc2_address) setLoc2Address(settingsMap.loc2_address);
      if (settingsMap.loc2_city) setLoc2City(settingsMap.loc2_city);
    }
  }, [siteSettings]);

  // Handle scroll to section from other pages (via sessionStorage)
  useEffect(() => {
    const scrollToSection = sessionStorage.getItem('scrollToSection');
    if (scrollToSection) {
      sessionStorage.removeItem('scrollToSection');
      setTimeout(() => {
        const element = document.getElementById(scrollToSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }, []);

  // Track if the How To Order section is visible (to hide/show sticky pill)
  const orderSectionRef = useRef<HTMLDivElement>(null);
  const [orderSectionVisible, setOrderSectionVisible] = useState(true);
  useEffect(() => {
    const el = orderSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOrderSectionVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Carousel scroll ref
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Helper: find first category with products available at the current outlet
  const findFirstAvailableCategory = useCallback(() => {
    if (!fullMenu?.categories || !fullMenu?.subcategories || !fullMenu?.products) return null;
    for (const cat of fullMenu.categories) {
      const catSubIds = fullMenu.subcategories.filter((s: any) => s.categoryId === cat.id).map((s: any) => s.id);
      const hasProducts = fullMenu.products.some((p: any) => {
        if (!catSubIds.includes(p.subcategoryId) || !p.isActive) return false;
        if (currentOutlet === 'palladium' && p.availableAtPalladium === false) return false;
        if (currentOutlet === 'tnagar' && p.availableAtTnagar === false) return false;
        if (currentOutlet === 'annanagar' && p.availableAtAnnanagar === false) return false;
        return true;
      });
      if (hasProducts) return cat.id;
    }
    return fullMenu.categories[0]?.id ?? null;
  }, [fullMenu, currentOutlet]);

  // Set default active menu tab when data loads
  useEffect(() => {
    if (fullMenu?.categories && fullMenu.categories.length > 0 && activeMenuTab === null) {
      setActiveMenuTab(findFirstAvailableCategory() ?? fullMenu.categories[0].id);
    }
  }, [fullMenu, activeMenuTab, findFirstAvailableCategory]);

  // Auto-switch to first category with available products when outlet changes
  const prevOutletRef = useRef(currentOutlet);
  useEffect(() => {
    if (!fullMenu?.categories || !currentOutlet) return;
    // Only auto-switch when the outlet actually changes, not on every tab click
    if (prevOutletRef.current !== currentOutlet) {
      prevOutletRef.current = currentOutlet;
      const firstAvailable = findFirstAvailableCategory();
      if (firstAvailable !== null) {
        setActiveMenuTab(firstAvailable);
        setActiveSubFilter('all');
      }
    }
  }, [currentOutlet, fullMenu, findFirstAvailableCategory]);

  // Compute filtered products for the tabbed menu
  const menuSubcategories = useMemo(() => {
    if (!fullMenu || !activeMenuTab) return [];
    return fullMenu.subcategories.filter((s: any) => s.categoryId === activeMenuTab);
  }, [fullMenu, activeMenuTab]);

  const menuProducts = useMemo(() => {
    if (!fullMenu || !activeMenuTab) return [];
    const subIds = activeSubFilter === 'all'
      ? menuSubcategories.map((s: any) => s.id)
      : [Number(activeSubFilter)];
    // Show ALL active products (don't filter by outlet), but mark availability
    return fullMenu.products.filter((p: any) => {
      if (!subIds.includes(p.subcategoryId) || !p.isActive) return false;
      return true;
    });
  }, [fullMenu, activeMenuTab, activeSubFilter, menuSubcategories]);

  // Helper: check if a product is available at the current outlet
  const isProductAvailableAtOutlet = useCallback((product: any) => {
    if (!currentOutlet) return true; // no outlet selected = show all as available
    if (currentOutlet === 'palladium' && product.availableAtPalladium === false) return false;
    if (currentOutlet === 'tnagar' && product.availableAtTnagar === false) return false;
    if (currentOutlet === 'annanagar' && product.availableAtAnnanagar === false) return false;
    return true;
  }, [currentOutlet]);

  // CMS-driven announcement bar items
  const announcementSection = sectionsMap['announcement_bar'];
  const announcementItems = announcementSection?.content?.items || [
    { icon: '🚚', text: 'Free Delivery Above ₹2500' },
    { icon: '⭐', text: '10 Stamps = 1 Free Drink' },
    { icon: '🎉', text: 'BOBALOVE10 — 10% Off First Order' },
  ];

  // CMS-driven hero content
  const heroSection = sectionsMap['hero'];
  const heroCta = heroSection?.content?.ctaText || 'Order Online & Save!';
  const heroCtaSub = heroSection?.content?.ctaSubtext || 'Skip the queue • Earn loyalty stamps • Get exclusive offers';

  // CMS-driven freshness story
  const freshnessSection = sectionsMap['freshness_story'];
  const freshnessStoryTitle = freshnessSection?.title || 'Freshly Crafted. Authentically Taiwanese.';
  const freshnessStorySubtitle = freshnessSection?.subtitle || 'Every drink and food item is prepared fresh in-store using ingredients imported directly from Taiwan. No shortcuts, no compromises — just genuine Taiwanese flavours crafted with care.';
  const freshnessPillars = freshnessSection?.content?.pillars || [
    { icon: '🍃', title: 'Organic Whole-Leaf Tea', description: 'Sourced from certified plantations from Nilgiris, Tamil Nadu' },
    { icon: '🍡', title: 'Handmade Mochi', description: 'Prepared fresh daily using premium Japanese rice flour' },
    { icon: '🧋', title: 'Real Tapioca Pearls', description: 'Cooked in small batches every 4 hours for perfect texture' },
    { icon: '✈️', title: 'Imported Ingredients', description: 'Key ingredients flown in directly from Taiwan' },
  ];

  // Category cards with video backgrounds
  const menuCategories = [
    {
      name: cat3Name,
      description: cat3Desc,
      video: 'https://maami-media.sgp1.cdn.digitaloceanspaces.com/videos/bNweCHEHeGisBBOW.mp4',
      href: '/menu?category=food',
    },
    {
      name: cat1Name,
      description: cat1Desc,
      video: 'https://maami-media.sgp1.cdn.digitaloceanspaces.com/videos/CKsMrsUAUMbuMMbu.mp4',
      href: '/menu?category=bubble-tea',
    },
    {
      name: cat2Name,
      description: cat2Desc,
      video: 'https://maami-media.sgp1.cdn.digitaloceanspaces.com/videos/OXrITxhITgHnggSH.mp4',
      href: '/menu?category=coffee',
    },
    {
      name: cat4Name,
      description: cat4Desc,
      video: 'https://maami-media.sgp1.cdn.digitaloceanspaces.com/videos/SidroKXBRlTSURyD.mp4',
      href: '/menu?category=mochis',
    },
  ];

  // Location cards with video backgrounds
  const locations = [
    {
      name: loc1Name,
      subtitle: loc1Subtitle,
      address: loc1Address,
      city: loc1City,
      video: 'https://maami-media.sgp1.cdn.digitaloceanspaces.com/videos/tRoWoigbWbPFdWft.mp4',
      mapUrl: 'https://maps.google.com/?q=Palladium+Mall+Velachery+Chennai',
      phone: '+91 89259 14303',
      hours: '10:00 AM - 10:00 PM',
    },
    {
      name: loc2Name,
      subtitle: loc2Subtitle,
      address: loc2Address,
      city: loc2City,
      video: 'https://maami-media.sgp1.cdn.digitaloceanspaces.com/videos/bnVxigSNwrNZdrqE.mp4',
      mapUrl: 'https://maps.google.com/?q=29+Burkit+Road+TNagar+Chennai',
      phone: '+91 91505 70557',
      hours: '12:00 PM - 12:00 AM',
      services: 'In-store, Pickup & Delivery',
    },
    {
      name: 'Taiwan Maami',
      subtitle: 'Anna Nagar',
      address: 'AC Block, 6th Main Road, 3rd Street',
      city: 'Anna Nagar, Chennai - 600040',
      video: '',
      mapUrl: 'https://maps.google.com/?q=AC+Block+6th+Main+Road+Anna+Nagar+Chennai',
      phone: '',
      hours: '12:00 PM - 12:00 AM',
      services: 'Bubble Tea, Mochis & QSR',
    },
  ];

  // Helper: get display price for a featured product
  const getDisplayPrice = (product: any) => {
    if (product.useBasePrice && product.basePriceRegularNoBoba) {
      return product.basePriceRegularNoBoba;
    }
    return product.instorePrice || product.deliveryPrice || 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        description="Taiwan Maami - Chennai's premium Taiwanese bubble tea cafe. Organic whole-leaf boba tea, mochi, Asian street food. Order online for delivery, pickup or dine-in at T Nagar & Velachery."
        keywords="bubble tea Chennai, Taiwan Maami, boba tea Chennai, mochi Chennai, Asian food Chennai, Taiwanese food Chennai, tapioca pearls, bubble tea delivery Chennai, T Nagar bubble tea, Velachery bubble tea"
        canonicalPath="/"
      />
      <Header />

      {/* ===== 1. STATIC ANNOUNCEMENT BAR (replaces marquee) ===== */}
      {announcementSection?.isActive !== false && (
        <div className="bg-foreground text-background py-2.5">
          <div className="container">
            <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap text-sm">
              {announcementItems.map((item: any, i: number) => (
                <span key={i} className="flex items-center gap-2 whitespace-nowrap">
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.text}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}



      {/* ===== 2. HERO SECTION with Warm Amber Overlay ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            poster="https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606599/taiwan-maami/static/cuoZWmjPGnGiJcSS.jpg"
          >
            <source src="https://res.cloudinary.com/drpu1dbqk/video/upload/v1779960320/taiwan-maami/static/hero-video-compressed.mp4" type="video/mp4" />
            <img
              src="https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606599/taiwan-maami/static/cuoZWmjPGnGiJcSS.jpg"
              alt="Taiwan Maami Interior"
              className="w-full h-full object-cover"
            />
          </video>
          {/* Warm amber overlay - lets the video show through clearly */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, rgba(120, 60, 20, 0.70), rgba(120, 60, 20, 0.45), rgba(120, 60, 20, 0.20))'
          }} />
        </div>
        <div className="relative py-20 sm:py-32">
          <div className="container">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                {(heroSection?.title || heroTitle).split('\n').map((line: string, i: number) => (
                  <span key={i} className={i > 0 ? 'block' : ''}>{line}</span>
                ))}
              </h1>
              <p className="text-lg sm:text-xl text-white/90" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                {heroSection?.subtitle || heroDescription}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3. FRESHNESS STORY (CMS-driven, right after hero) ===== */}
      {freshnessSection?.isActive !== false && (
        <section className="py-16 bg-secondary/50">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{freshnessStoryTitle}</h2>
              <p className="text-muted-foreground max-w-3xl mx-auto text-lg leading-relaxed">
                {freshnessStorySubtitle}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {freshnessPillars.map((pillar: any, i: number) => (
                <div key={i} className="text-center p-6 rounded-xl bg-card/80 border border-border/50">
                  <div className="text-4xl mb-3">{pillar.icon}</div>
                  <h3 className="font-bold text-lg mb-2">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== 4. CUSTOMER FAVOURITES CAROUSEL ===== */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Customer Favourites</h2>
                <p className="text-muted-foreground">Our most loved items, handpicked for you</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => scrollCarousel('left')}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollCarousel('right')}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div
              ref={carouselRef}
              className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {featuredProducts.map((product: any) => {
                const carouselAvailable = isFeaturedProductAvailable(product);
                return (
                <div key={product.id} className="flex-shrink-0 w-[220px] sm:w-[250px] snap-start group">
                  <div
                    onClick={() => carouselAvailable
                      ? openQuickAdd(product.id, undefined, product)
                      : toast.info(`This item is not available at ${currentOutlet === 'palladium' ? 'Palladium Mall' : currentOutlet === 'annanagar' ? 'Anna Nagar' : 'T. Nagar'}. Try another outlet!`, { duration: 3000 })
                    }
                    className={carouselAvailable ? 'cursor-pointer' : 'cursor-default'}
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-secondary">
                      {product.imageUrl ? (
                        <OptimizedImage
                          src={getOptimizedImageUrl(product.imageUrl, { width: 400, crop: 'fill', quality: 'auto' })}
                          sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 220px"
                          alt={product.name}
                          className={`w-full h-full transition-transform duration-300 ${carouselAvailable ? 'group-hover:scale-105' : 'grayscale-[40%] opacity-70'}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ShoppingBag className="w-12 h-12 opacity-30" />
                        </div>
                      )}
                      {/* Category badge */}
                      <span className="absolute top-2 left-2 text-xs font-medium px-2 py-1 rounded-full bg-foreground/80 text-background">
                        {product.categoryName}
                      </span>
                      {/* "Not available" stamp overlay */}
                      {!carouselAvailable && currentOutlet && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/60 text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-center leading-tight rotate-[-12deg] shadow-lg border border-white/20">
                            Not available at<br />{currentOutlet === 'palladium' ? 'Palladium' : currentOutlet === 'annanagar' ? 'A. Nagar' : 'T. Nagar'}
                          </div>
                        </div>
                      )}
                      {/* Diet indicator */}
                      {product.isVegetarian && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-sm border-2 border-green-600 bg-white flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-green-600" />
                        </span>
                      )}
                      {product.isNonVeg && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-sm border-2 border-red-600 bg-white flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-red-600" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => carouselAvailable
                        ? openQuickAdd(product.id, undefined, product)
                        : toast.info(`This item is not available at ${currentOutlet === 'palladium' ? 'Palladium Mall' : currentOutlet === 'annanagar' ? 'Anna Nagar' : 'T. Nagar'}. Try another outlet!`, { duration: 3000 })
                      }
                      className={carouselAvailable ? 'cursor-pointer' : 'cursor-default'}
                    >
                      <h3 className={`font-semibold text-sm line-clamp-2 transition-colors ${carouselAvailable ? 'group-hover:text-primary' : 'text-muted-foreground'}`}>
                        {product.name}
                      </h3>
                      <span className="text-xs text-muted-foreground">{product.subcategoryName}</span>
                    </div>
                    {/* Quick Add button - only for available items */}
                    {carouselAvailable ? (
                      <button
                        onClick={(e) => openQuickAdd(product.id, e, product)}
                        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform"
                        style={{ background: JADE_GREEN }}
                        title="Quick Add"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    ) : (
                      <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                        <Plus className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  {getDisplayPrice(product) > 0 && (
                    <span className={`font-bold text-sm mt-1 block ${!carouselAvailable ? 'text-muted-foreground' : ''}`}>{formatPrice(getDisplayPrice(product))}</span>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== HOW TO ORDER SECTION ===== */}
      <section id="order-options" ref={orderSectionRef} className="py-16 bg-secondary/30 scroll-mt-20">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">How Would You Like to Order?</h2>
          </div>

          {/* Show confirmation pill if outlet is already selected AND user explicitly chose */}
          {canAddToCart ? (
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: JADE_GREEN }}>
                    {cartState.orderType === 'instore' ? <Store className="w-5 h-5 text-white" /> :
                     cartState.orderType === 'delivery' ? <Truck className="w-5 h-5 text-white" /> :
                     <ShoppingBag className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {cartState.orderType === 'instore' ? 'Dine In-Store' :
                       cartState.orderType === 'delivery' ? 'Home Delivery' : 'Quick Pickup'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {cartState.orderType === 'delivery' ? 'From T. Nagar outlet' :
                       `At ${currentOutlet === 'palladium' ? 'Palladium Mall' : currentOutlet === 'annanagar' ? 'Anna Nagar' : 'T. Nagar'}`}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setPendingOrderType(null); setShowOutletSelector(true); }}>
                  Change
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-3">Browse the menu below and add items to your cart</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card onClick={() => handleOrderTypeClick('instore')} className="p-6 text-center hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-primary h-full flex flex-col">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors flex-shrink-0">
                  <Store className="w-8 h-8 text-primary group-hover:text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">Dine In</h3>
                <p className="text-sm text-muted-foreground mb-2 flex-grow">Visit our outlets and enjoy freshly made bubble tea</p>
                <div className="text-primary font-medium flex items-center justify-center gap-2 mt-auto">
                  Select <ArrowRight className="w-4 h-4" />
                </div>
              </Card>
              <Card onClick={() => handleOrderTypeClick('delivery')} className="p-6 text-center hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-primary h-full flex flex-col">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors flex-shrink-0">
                  <Truck className="w-8 h-8 text-primary group-hover:text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">Delivery</h3>
                <p className="text-sm text-muted-foreground mb-2 flex-grow">Get your favorites delivered to your doorstep</p>
                <div className="text-primary font-medium flex items-center justify-center gap-2 mt-auto">
                  Select <ArrowRight className="w-4 h-4" />
                </div>
              </Card>
              <Card onClick={() => handleOrderTypeClick('pickup')} className="p-6 text-center hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-primary h-full flex flex-col">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors flex-shrink-0">
                  <ShoppingBag className="w-8 h-8 text-primary group-hover:text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">Pickup</h3>
                <p className="text-sm text-muted-foreground mb-2 flex-grow">Order ahead and pick up at your convenience</p>
                <div className="text-primary font-medium flex items-center justify-center gap-2 mt-auto">
                  Select <ArrowRight className="w-4 h-4" />
                </div>
              </Card>
            </div>
          )}

          {/* Outlet Selector Modal */}
          {showOutletSelector && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowOutletSelector(false); setPendingOrderType(null); setPendingQuickAddProductId(null); }}>
              <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Select Order Type & Outlet</h3>
                  <button onClick={() => { setShowOutletSelector(false); setPendingOrderType(null); setPendingQuickAddProductId(null); }} className="p-1 rounded-full hover:bg-secondary">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {!pendingOrderType ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">How would you like to order?</p>
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => handleOrderTypeClick('instore')} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary transition-colors">
                        <Store className="w-6 h-6" />
                        <span className="text-sm font-medium">Dine In</span>
                      </button>
                      <button onClick={() => handleOrderTypeClick('delivery')} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary transition-colors">
                        <Truck className="w-6 h-6" />
                        <span className="text-sm font-medium">Delivery</span>
                      </button>
                      <button onClick={() => handleOrderTypeClick('pickup')} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary transition-colors">
                        <ShoppingBag className="w-6 h-6" />
                        <span className="text-sm font-medium">Pickup</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">Select your outlet</p>
                    <div className="space-y-3">
                      <button onClick={() => handleOutletSelect('palladium')} className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
                        !OUTLET_HOURS.palladium.orderingEnabled
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                          : 'border-border hover:border-primary'
                      }`}>
                        <MapPin className={`w-5 h-5 flex-shrink-0 ${!OUTLET_HOURS.palladium.orderingEnabled ? 'text-gray-400' : ''}`} />
                        <div>
                          <p className={`font-semibold ${!OUTLET_HOURS.palladium.orderingEnabled ? 'text-gray-400' : ''}`}>Palladium Mall</p>
                          <p className="text-xs text-muted-foreground">Velachery • 10am-10pm</p>
                          {!OUTLET_HOURS.palladium.orderingEnabled && (
                            <p className="text-xs text-orange-600 font-medium">Online ordering coming soon</p>
                          )}
                        </div>
                      </button>
                      <button onClick={() => handleOutletSelect('tnagar')} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary transition-colors text-left">
                        <MapPin className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">T. Nagar (Moutan)</p>
                          <p className="text-xs text-muted-foreground">Burkit Road • 12pm-12am</p>
                        </div>
                      </button>
                      <button onClick={() => handleOutletSelect('annanagar')} className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
                        !OUTLET_HOURS.annanagar.orderingEnabled
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                          : 'border-border hover:border-primary'
                      }`}>
                        <MapPin className={`w-5 h-5 flex-shrink-0 ${!OUTLET_HOURS.annanagar.orderingEnabled ? 'text-gray-400' : ''}`} />
                        <div>
                          <p className={`font-semibold ${!OUTLET_HOURS.annanagar.orderingEnabled ? 'text-gray-400' : ''}`}>Anna Nagar</p>
                          <p className="text-xs text-muted-foreground">AC Block, 6th Main Road • 12pm-12am</p>
                          {!OUTLET_HOURS.annanagar.orderingEnabled && (
                            <p className="text-xs text-orange-600 font-medium">Opening soon</p>
                          )}
                        </div>
                      </button>
                    </div>
                    <button onClick={() => setPendingOrderType(null)} className="mt-3 text-sm text-muted-foreground hover:text-foreground">
                      &larr; Back to order types
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sticky selection pill - only show when How To Order section is scrolled out of view */}
      {canAddToCart && !orderSectionVisible && (
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border py-2">
          <div className="container flex items-center justify-center gap-2 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
              {cartState.orderType === 'instore' ? <Store className="w-4 h-4" /> :
               cartState.orderType === 'delivery' ? <Truck className="w-4 h-4" /> :
               <ShoppingBag className="w-4 h-4" />}
              <span className="font-medium">
                {cartState.orderType === 'instore' ? 'Dine In' :
                 cartState.orderType === 'delivery' ? 'Delivery' : 'Pickup'}
              </span>
              <span className="text-muted-foreground">·</span>
              <span>{currentOutlet === 'palladium' ? 'Palladium Mall' : currentOutlet === 'annanagar' ? 'Anna Nagar' : 'T. Nagar'}</span>
            </div>
            <button
              onClick={() => { setPendingOrderType(null); setShowOutletSelector(true); }}
              className="text-primary font-medium hover:underline"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* ===== EXPLORE OUR MENU - 2-Level Tabbed Menu ===== */}
      <section id="explore-menu" className="py-16 scroll-mt-32">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Explore Our Menu</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {!canAddToCart
                ? 'From authentic bubble tea to delicious mochis and Asian street food, discover our carefully curated selection.'
                : cartState.orderType === 'delivery'
                  ? 'Showing items available for delivery from T. Nagar'
                  : `Showing items available at ${currentOutlet === 'palladium' ? 'Palladium Mall' : currentOutlet === 'annanagar' ? 'Anna Nagar' : 'T. Nagar'}`}
            </p>
          </div>

          {fullMenu && fullMenu.categories.length > 0 ? (
            <div>
              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                {fullMenu.categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveMenuTab(cat.id); setActiveSubFilter('all'); }}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      activeMenuTab === cat.id
                        ? 'text-white shadow-md'
                        : 'bg-card border border-border text-foreground hover:bg-secondary'
                    }`}
                    style={activeMenuTab === cat.id ? { background: JADE_GREEN } : {}}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Subcategory Filter Chips */}
              {menuSubcategories.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                  <button
                    onClick={() => setActiveSubFilter('all')}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activeSubFilter === 'all'
                        ? 'bg-foreground text-background'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    All
                  </button>
                  {menuSubcategories.map((sub: any) => (
                    <button
                      key={sub.id}
                      onClick={() => setActiveSubFilter(String(sub.id))}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                        activeSubFilter === String(sub.id)
                          ? 'bg-foreground text-background'
                          : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Product Grid */}
              {menuProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No items in this category.</p>
                </div>
              ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {menuProducts.slice(0, 20).map((product: any) => {
                  const available = isProductAvailableAtOutlet(product);
                  return (
                  <div
                    key={product.id}
                    onClick={() => available ? openQuickAdd(product.id) : toast.info(`This item is not available at ${currentOutlet === 'palladium' ? 'Palladium Mall' : currentOutlet === 'annanagar' ? 'Anna Nagar' : 'T. Nagar'}. Try another outlet!`, { duration: 3000 })}
                    className={`group ${available ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-2 bg-secondary">
                      {product.imageUrl ? (
                        <OptimizedImage
                          src={getOptimizedImageUrl(product.imageUrl, { width: 300, crop: 'fill', quality: 'auto' })}
                          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
                          alt={product.name}
                          className={`w-full h-full transition-transform duration-300 ${available ? 'group-hover:scale-105' : 'grayscale-[40%] opacity-70'}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ShoppingBag className="w-8 h-8 opacity-30" />
                        </div>
                      )}
                      {/* "Not available" stamp overlay */}
                      {!available && currentOutlet && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/60 text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-center leading-tight rotate-[-12deg] shadow-lg border border-white/20">
                            Not available at<br />{currentOutlet === 'palladium' ? 'Palladium' : currentOutlet === 'annanagar' ? 'A. Nagar' : 'T. Nagar'}
                          </div>
                        </div>
                      )}
                      {/* Diet indicator */}
                      {product.isVegetarian && (
                        <span className="absolute top-2 left-2 w-5 h-5 rounded-sm border-2 border-green-600 bg-white flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-green-600" />
                        </span>
                      )}
                      {product.isNonVeg && (
                        <span className="absolute top-2 left-2 w-5 h-5 rounded-sm border-2 border-red-600 bg-white flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-red-600" />
                        </span>
                      )}
                      {/* Quick Add button overlay - only for available items */}
                      {available && (
                        <button
                          onClick={(e) => openQuickAdd(product.id, e)}
                          className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: JADE_GREEN }}
                          title="Quick Add"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h3 className={`font-semibold text-sm line-clamp-2 transition-colors ${available ? 'group-hover:text-primary' : 'text-muted-foreground'}`}>
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {fullMenu.subcategories.find((s: any) => s.id === product.subcategoryId)?.name}
                      </span>
                      {(product.instorePrice || product.deliveryPrice) > 0 && (
                        <span className={`font-bold text-xs ${!available ? 'text-muted-foreground' : ''}`}>
                          {formatPrice(product.useBasePrice
                            ? (fullMenu.subcategories.find((s: any) => s.id === product.subcategoryId)?.basePriceRegularNoBoba || product.instorePrice)
                            : (product.instorePrice || product.deliveryPrice)
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
              )}

              {/* Show more / View Full Menu */}
              <div className="text-center mt-8">
                <Link href={`/menu?type=${cartState.orderType}${currentOutlet ? `&outlet=${currentOutlet}` : ''}`}>
                  <Button size="lg" style={{ background: JADE_GREEN, borderColor: JADE_GREEN }} className="text-white hover:opacity-90">
                    View Full Menu
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Loading menu...
            </div>
          )}
        </div>
      </section>

      {/* ===== VISIT OUR OUTLETS ===== */}
      <section id="outlets" className="py-16 bg-secondary/30 scroll-mt-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Visit Our Outlets</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience the authentic Taiwan Maami atmosphere at our beautifully designed outlets in Chennai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {locations.map((location, index) => (
              <Card key={index} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 relative aspect-[4/3]">
                <LazyVideo
                  src={location.video}
                  poster="https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606603/taiwan-maami/static/fYHiyJVvyVYquZaW.webp"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-white text-2xl mb-1">
                      {location.name}
                    </h3>
                    <p className="text-primary-foreground font-medium text-lg">
                      {location.subtitle}
                    </p>
                  </div>
                  <div className="space-y-2 mb-4">
                    <p className="text-white/90 text-sm flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{location.address}<br />{location.city}</span>
                    </p>
                    <p className="text-white/80 text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {location.phone}
                    </p>
                    <p className="text-white/80 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {location.hours}
                    </p>
                    {location.services && (
                      <p className="text-amber-300 text-xs font-medium mt-1">
                        {location.services}
                      </p>
                    )}
                  </div>
                  <a 
                    href={location.mapUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white bg-primary/80 hover:bg-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LOYALTY PROGRAMME ===== */}
      <section className="py-10 sm:py-16 bg-primary">
        <div className="container">
          <div className="text-center mb-6 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
              Login to our Loyalty Programme
            </h2>
            <p className="text-white/90 text-base sm:text-lg">
              Simple. Seamless. Rewarding.
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 max-w-5xl mx-auto mb-6 sm:mb-10">
            <Card className="p-4 sm:p-6 bg-white/10 border-white/20 text-center">
              <div className="text-2xl sm:text-4xl mb-2 sm:mb-3">🏆</div>
              <h3 className="font-bold text-white text-sm sm:text-lg mb-1 sm:mb-2">₹450 = 1 stamp</h3>
              <p className="text-white/80 text-xs sm:text-sm">
                Collect 10 stamps and receive a free drink.
              </p>
            </Card>
            
            <Card className="p-4 sm:p-6 bg-white/10 border-white/20 text-center">
              <div className="text-2xl sm:text-4xl mb-2 sm:mb-3">⚙️</div>
              <h3 className="font-bold text-white text-sm sm:text-lg mb-1 sm:mb-2">Fully automated</h3>
              <p className="text-white/80 text-xs sm:text-sm">
                Stamps and rewards tracked automatically.
              </p>
            </Card>
            
            <Card className="p-4 sm:p-6 bg-white/10 border-white/20 text-center">
              <div className="text-2xl sm:text-4xl mb-2 sm:mb-3">🌍</div>
              <h3 className="font-bold text-white text-sm sm:text-lg mb-1 sm:mb-2">Use it anywhere</h3>
              <p className="text-white/80 text-xs sm:text-sm">
                Valid for in-store, pickup, and delivery.
              </p>
            </Card>
            
            <Card className="p-4 sm:p-6 bg-white/10 border-white/20 text-center">
              <div className="text-2xl sm:text-4xl mb-2 sm:mb-3">⭐</div>
              <h3 className="font-bold text-white text-sm sm:text-lg mb-1 sm:mb-2">Member exclusives</h3>
              <p className="text-white/80 text-xs sm:text-sm">
                Special gifts, early access, and invite-only events.
              </p>
            </Card>
          </div>
          
          <div className="text-center">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => document.getElementById('order-options')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Your Order
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-foreground text-background py-8 sm:py-12">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Social Media Links */}
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4">Follow Us</h4>
              <div className="flex gap-3 sm:gap-4">
                <a 
                  href="https://www.instagram.com/taiwan_maami/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a 
                  href="https://www.threads.net/@taiwan_maami" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
                  title="Threads"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.73 2.108-1.152 3.457-1.187 1.357-.035 2.56.269 3.476.765.034-.996-.04-1.872-.293-2.609l1.903-.576c.37 1.074.476 2.39.353 3.908.838.477 1.55 1.09 2.104 1.822.758 1.003 1.14 2.164 1.14 3.455 0 .655-.088 1.327-.264 2.005-.52 2.005-1.756 3.67-3.68 4.95-1.795 1.197-4.08 1.855-6.604 1.903zm1.07-8.852c-.095-.003-.189-.003-.283 0-1.17.03-2.099.313-2.688.817-.477.408-.67.882-.645 1.334.028.506.282.932.716 1.2.53.327 1.261.468 2.06.396 1.063-.06 1.876-.453 2.416-1.168.417-.552.678-1.292.782-2.202-.71-.262-1.53-.396-2.358-.377z"/>
                  </svg>
                </a>
                <a 
                  href="https://www.facebook.com/Taiwanmaami" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
                  title="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a 
                  href="https://x.com/taiwanmaami" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
                  title="X (Twitter)"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a 
                  href="https://youtube.com/@theresahucy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
                  title="YouTube"
                >
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
              <div className="mt-4 sm:mt-6">
                <h4 className="font-semibold mb-2">Contact</h4>
                <div className="space-y-1 text-xs sm:text-sm text-background/70">
                  <a href="mailto:hello@taiwanmaami.com" className="block hover:text-background">
                    hello@taiwanmaami.com
                  </a>
                  <a href="tel:+917845053909" className="block hover:text-background">
                    +91 78450 53909
                  </a>
                  <a href="tel:+919150570557" className="block hover:text-background">
                    +91 91505 70557 (T Nagar)
                  </a>
                </div>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4">Quick Links</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-background/70">
                <li><Link href="/menu" className="hover:text-background">Menu</Link></li>
                <li><Link href="/about" className="hover:text-background">About Us</Link></li>
                <li><Link href="/terms" className="hover:text-background">Terms & Conditions</Link></li>
                <li><Link href="/privacy" className="hover:text-background">Privacy Policy</Link></li>
                <li><Link href="/refund" className="hover:text-background">Refund Policy</Link></li>
                <li><Link href="/shipping" className="hover:text-background">Shipping Policy</Link></li>
                <li><Link href="/faq" className="hover:text-background">FAQ</Link></li>
                <li><Link href="/blog" className="hover:text-background">Blog</Link></li>
                <li><Link href="/franchise" className="hover:text-background">Franchise Opportunity</Link></li>
              </ul>
            </div>
            
            {/* Hours */}
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4">Hours</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-background/70">
                <li><strong>Palladium:</strong> 10am - 10pm</li>
                <li><strong>T Nagar:</strong> 12pm - 12am</li>
                <li><strong>Anna Nagar:</strong> 12pm - 12am</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/20 mt-6 pt-6 sm:mt-8 sm:pt-8 text-center text-xs sm:text-sm text-background/50">
            <p>&copy; {new Date().getFullYear()} Taiwan Maami™. All rights reserved.</p>
            <p className="mt-1">A unit of Thamarai Foods and Trading Private Limited</p>
          </div>
        </div>
      </footer>

      {/* Quick Add Modal */}
      {quickAddProduct && (
        <ProductCustomizationModal
          product={quickAddProduct.product}
          subcategory={quickAddProduct.subcategory}
          category={quickAddProduct.category}
          isDelivery={cartState.orderType === 'delivery'}
          open={!!quickAddProductId}
          onClose={() => setQuickAddProductId(null)}
        />
      )}
    </div>
  );
}
