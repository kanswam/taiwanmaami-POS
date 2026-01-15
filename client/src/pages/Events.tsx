import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Users, Ticket, ChefHat, PartyPopper, Phone, Mail, Instagram, Sparkles, CheckCircle2, ArrowRight, Heart, Building2, GraduationCap, UtensilsCrossed, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Hero carousel images - using existing Taiwan Maami product images
const heroCarouselImages = [
  {
    url: "https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto,w_1920/v1767674968/taiwan-maami/products/products-180001-img-1767674967366.jpg",
    title: "Signature Bubble Tea",
    subtitle: "Handcrafted with premium ingredients",
  },
  {
    url: "https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto,w_1920/v1767675060/taiwan-maami/categories/categories-1-img-1767675052496.jpg",
    title: "Authentic Taiwanese Cuisine",
    subtitle: "From our kitchen to your event",
  },
  {
    url: "https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto,w_1920/v1767674989/taiwan-maami/products/products-210001-img-1767674988673.jpg",
    title: "Delicious Desserts",
    subtitle: "Sweet endings for every celebration",
  },
  {
    url: "https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto,w_1920/v1767675074/taiwan-maami/categories/categories-2-img-1767675067508.jpg",
    title: "Premium Food Selection",
    subtitle: "Curated menus for your special day",
  },
];

// Past events showcase data with CORRECTED photos
const pastEvents = [
  {
    title: "Wedding Celebrations",
    description: "Create unforgettable moments with our premium wedding catering and event services. From intimate ceremonies to grand celebrations, we bring your vision to life with exquisite cuisine and impeccable service.",
    image: "https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1768284572/events/corporate-event.jpg",
    icon: <Heart className="h-5 w-5" />,
    type: "Wedding",
    cta: "Plan Your Wedding",
    color: "from-rose-500 to-pink-600",
  },
  {
    title: "Corporate Functions",
    description: "Impress your clients and team with sophisticated corporate catering. Our expert team delivers premium Asian cuisine and seamless service for conferences, gala dinners, and business gatherings.",
    image: "https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1768284574/events/wedding-event.jpg",
    icon: <Building2 className="h-5 w-5" />,
    type: "Corporate",
    cta: "Plan Your Corporate Event",
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "School Events",
    description: "Bring joy and flavour to your school events. Our vibrant food stall and catering services create memorable experiences for students, families, and staff. Perfect for fairs, festivals, and fundraisers!",
    image: "https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1768284573/events/school-event.jpg",
    icon: <GraduationCap className="h-5 w-5" />,
    type: "School",
    cta: "Plan Your School Event",
    color: "from-amber-500 to-orange-600",
  },
];

// What we offer - consistent across all event types
const offerings = [
  { icon: <Sparkles className="h-8 w-8" />, title: "Premium Quality", desc: "Only the finest ingredients for your special day" },
  { icon: <CheckCircle2 className="h-8 w-8" />, title: "Professional Service", desc: "Trained staff for seamless execution" },
  { icon: <ChefHat className="h-8 w-8" />, title: "Authentic Cuisine", desc: "Genuine Taiwanese flavors and recipes" },
  { icon: <UtensilsCrossed className="h-8 w-8" />, title: "Custom Solutions", desc: "Tailored menus for your preferences" },
];

// Stats
const stats = [
  { value: "5+", label: "Events Catered" },
  { value: "5,000+", label: "Guests Served" },
  { value: "100%", label: "Client Satisfaction" },
  { value: "5★", label: "Average Rating" },
];

export default function Events() {
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false);
  const [workshopDialogOpen, setWorkshopDialogOpen] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const workshopsRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to workshops section if #workshops hash is present
  useEffect(() => {
    if (window.location.hash === '#workshops' && workshopsRef.current) {
      setTimeout(() => {
        workshopsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, []);
  
  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroCarouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroCarouselImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroCarouselImages.length) % heroCarouselImages.length);
  
  // Inquiry form state
  const [inquiryForm, setInquiryForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    companyName: "",
    eventType: "" as "wedding" | "corporate" | "school" | "private" | "other" | "",
    eventDate: "",
    eventTime: "",
    venue: "",
    guestCount: "",
    cateringType: "" as "beverages_only" | "food_only" | "both" | "",
    preferredItems: "",
    budgetRange: "",
    specialRequirements: "",
  });

  // Workshop booking form state
  const [bookingForm, setBookingForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    ticketCount: 1,
    specialRequirements: "",
  });

  // Fetch published workshops
  const { data: workshops, isLoading: workshopsLoading } = trpc.workshops.getPublished.useQuery();

  // Submit inquiry mutation
  const submitInquiry = trpc.events.submitInquiry.useMutation({
    onSuccess: () => {
      toast.success("Inquiry Submitted! Our team will contact you within 24 hours.");
      setInquiryDialogOpen(false);
      setInquiryForm({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        companyName: "",
        eventType: "",
        eventDate: "",
        eventTime: "",
        venue: "",
        guestCount: "",
        cateringType: "",
        preferredItems: "",
        budgetRange: "",
        specialRequirements: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit inquiry. Please try again.");
    },
  });

  // Book workshop mutation
  const bookWorkshop = trpc.workshops.bookTickets.useMutation({
    onSuccess: (data) => {
      toast.success(`Booking Confirmed! Your booking number is ${data.bookingNumber}. We'll contact you for payment details.`);
      setWorkshopDialogOpen(false);
      setBookingForm({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        ticketCount: 1,
        specialRequirements: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to book tickets. Please try again.");
    },
  });

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryForm.eventType || !inquiryForm.cateringType) {
      toast.error("Please select event type and catering type.");
      return;
    }
    submitInquiry.mutate({
      ...inquiryForm,
      eventType: inquiryForm.eventType as "wedding" | "corporate" | "school" | "private" | "other",
      cateringType: inquiryForm.cateringType as "beverages_only" | "food_only" | "both",
      guestCount: parseInt(inquiryForm.guestCount) || 1,
    });
  };

  const handleWorkshopBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop) return;
    bookWorkshop.mutate({
      workshopId: selectedWorkshop,
      ...bookingForm,
    });
  };

  const selectedWorkshopData = workshops?.find(w => w.id === selectedWorkshop);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with Carousel */}
      <section className="relative h-[80vh] min-h-[600px] overflow-hidden">
        {/* Carousel Images */}
        {heroCarouselImages.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={slide.url}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
          </div>
        ))}
        
        {/* Carousel Navigation */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-all"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-all"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
        
        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroCarouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide ? "bg-white w-8" : "bg-white/50"
              }`}
            />
          ))}
        </div>
        
        {/* Hero Content */}
        <div className="absolute inset-0 z-10 flex items-center">
          <div className="container">
            <div className="max-w-2xl">
              <Badge className="bg-red-600 text-white mb-4 text-sm px-4 py-1">Premium Event Services</Badge>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                Celebrate Life's<br />
                <span className="text-red-400">Precious Moments</span>
              </h1>
              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                From intimate weddings to grand corporate galas, Taiwan Maami brings authentic Asian 
                cuisine and beverages to every celebration.
              </p>
              <div className="flex flex-wrap gap-4">
                <Dialog open={inquiryDialogOpen} onOpenChange={setInquiryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6">
                      <PartyPopper className="mr-2 h-5 w-5" />
                      Book Event Catering
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Event Catering Inquiry</DialogTitle>
                      <DialogDescription>
                        Tell us about your event and we'll create a customized catering package for you.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInquirySubmit} className="space-y-6 mt-4">
                      {/* Contact Information */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="customerName">Your Name *</Label>
                            <Input
                              id="customerName"
                              value={inquiryForm.customerName}
                              onChange={(e) => setInquiryForm({ ...inquiryForm, customerName: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="companyName">Company/Organization</Label>
                            <Input
                              id="companyName"
                              value={inquiryForm.companyName}
                              onChange={(e) => setInquiryForm({ ...inquiryForm, companyName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customerEmail">Email *</Label>
                            <Input
                              id="customerEmail"
                              type="email"
                              value={inquiryForm.customerEmail}
                              onChange={(e) => setInquiryForm({ ...inquiryForm, customerEmail: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customerPhone">Phone Number *</Label>
                            <Input
                              id="customerPhone"
                              value={inquiryForm.customerPhone}
                              onChange={(e) => setInquiryForm({ ...inquiryForm, customerPhone: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Event Details */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Event Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="eventType">Event Type *</Label>
                            <Select
                              value={inquiryForm.eventType}
                              onValueChange={(value) => setInquiryForm({ ...inquiryForm, eventType: value as typeof inquiryForm.eventType })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select event type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="wedding">Wedding</SelectItem>
                                <SelectItem value="corporate">Corporate Event</SelectItem>
                                <SelectItem value="school">School Event</SelectItem>
                                <SelectItem value="private">Private Gathering</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="guestCount">Expected Guests *</Label>
                            <Input
                              id="guestCount"
                              type="number"
                              min="1"
                              placeholder="e.g., 100"
                              value={inquiryForm.guestCount}
                              onChange={(e) => setInquiryForm({ ...inquiryForm, guestCount: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="eventDate">Event Date *</Label>
                            <Input
                              id="eventDate"
                              type="date"
                              value={inquiryForm.eventDate}
                              onChange={(e) => setInquiryForm({ ...inquiryForm, eventDate: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="eventTime">Event Time</Label>
                            <Input
                              id="eventTime"
                              type="time"
                              value={inquiryForm.eventTime}
                              onChange={(e) => setInquiryForm({ ...inquiryForm, eventTime: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="venue">Venue/Location *</Label>
                            <Input
                              id="venue"
                              placeholder="e.g., ITC Grand Chola, Chennai"
                              value={inquiryForm.venue}
                              onChange={(e) => setInquiryForm({ ...inquiryForm, venue: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Catering Requirements */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Catering Requirements</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cateringType">Catering Type *</Label>
                            <Select
                              value={inquiryForm.cateringType}
                              onValueChange={(value) => setInquiryForm({ ...inquiryForm, cateringType: value as typeof inquiryForm.cateringType })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select catering type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="beverages_only">Beverages Only (Bubble Tea, etc.)</SelectItem>
                                <SelectItem value="food_only">Food Only</SelectItem>
                                <SelectItem value="both">Both Food & Beverages</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="budgetRange">Budget Range</Label>
                            <Select
                              value={inquiryForm.budgetRange}
                              onValueChange={(value) => setInquiryForm({ ...inquiryForm, budgetRange: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select budget range" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="under_25k">Under ₹25,000</SelectItem>
                                <SelectItem value="25k_50k">₹25,000 - ₹50,000</SelectItem>
                                <SelectItem value="50k_1l">₹50,000 - ₹1,00,000</SelectItem>
                                <SelectItem value="1l_2l">₹1,00,000 - ₹2,00,000</SelectItem>
                                <SelectItem value="above_2l">Above ₹2,00,000</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="preferredItems">Preferred Items</Label>
                            <Textarea
                              id="preferredItems"
                              placeholder="e.g., Bubble Tea Bar, Biang Biang Noodles, Mochi, etc."
                              value={inquiryForm.preferredItems}
                              onChange={(e) => setInquiryForm({ ...inquiryForm, preferredItems: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="specialRequirements">Special Requirements</Label>
                            <Textarea
                              id="specialRequirements"
                              placeholder="Any dietary restrictions, allergies, or special requests?"
                              value={inquiryForm.specialRequirements}
                              onChange={(e) => setInquiryForm({ ...inquiryForm, specialRequirements: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitInquiry.isPending}>
                        {submitInquiry.isPending ? "Submitting..." : "Submit Inquiry"}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Our team will contact you within 24 hours to discuss your requirements.
                      </p>
                    </form>
                  </DialogContent>
                </Dialog>
                <a href="#services">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6">
                    Explore Services
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-red-600 py-8">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">{stat.value}</div>
                <div className="text-white/80 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Event Types Section */}
      <section id="services" className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="bg-red-100 text-red-700 mb-4">Our Services</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">From Private Celebrations to Corporate Functions</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We offer premium event catering and experiences for every occasion.
            </p>
          </div>

          {/* Event Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {pastEvents.map((event, index) => (
              <Card key={index} className="overflow-hidden group hover:shadow-2xl transition-all duration-300 border-0 bg-white">
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img 
                    src={event.image} 
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${event.color} opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
                  <Badge className="absolute top-4 left-4 bg-white text-gray-900 shadow-lg">{event.type}</Badge>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${event.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      {event.icon}
                    </div>
                    <h3 className="text-xl font-bold">{event.title}</h3>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">{event.description}</p>
                  
                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge variant="secondary" className="bg-gray-100">Premium Quality</Badge>
                    <Badge variant="secondary" className="bg-gray-100">Professional Service</Badge>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <Button 
                    className={`w-full bg-gradient-to-r ${event.color} hover:opacity-90 text-white`}
                    onClick={() => setInquiryDialogOpen(true)}
                  >
                    {event.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Meal Boxes - Full Width Banner */}
      <section className="py-20 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-amber-100 text-amber-800 mb-4">Premium Meal Boxes</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Elevate Your Special Occasions</h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Elevate your special occasions and gatherings with our premium bento box catering. 
                Each box is meticulously crafted with premium ingredients, elegant presentation, 
                and authentic Asian delicacies.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {offerings.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <span className="font-medium">{item.title}</span>
                  </div>
                ))}
              </div>
              <Button 
                size="lg" 
                onClick={() => setInquiryDialogOpen(true)} 
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Plan Your Meal Boxes
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="relative">
              <div className="bg-white rounded-3xl shadow-2xl p-8 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <UtensilsCrossed className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Culinary Box</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                      <Star className="h-5 w-5 text-amber-500" />
                      <span>South Indian Tiffin</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                      <Star className="h-5 w-5 text-amber-500" />
                      <span>Creamy Chicken Sandwich</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                      <Star className="h-5 w-5 text-amber-500" />
                      <span>Cóng Yoú Bǐng 蔥油餅</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-6">
                    As featured at UN for Taiwan 2025
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="bg-red-600 text-white mb-4">Why Choose Us</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Taiwan Maami?</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              We don't just serve food – we create experiences. Our exotic Taiwanese offerings 
              stand out from the usual fare seen at events.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {offerings.map((item, index) => (
              <div key={index} className="text-center group">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-red-500/30">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workshops Section */}
      <section id="workshops" ref={workshopsRef} className="py-20 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="bg-amber-100 text-amber-800 mb-4">Learn From The Best</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Cooking Workshops</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join our MD, Theresa, for hands-on workshops where you'll learn to make 
              authentic Taiwanese dishes. Limited seats available!
            </p>
          </div>

          {workshopsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading workshops...</p>
            </div>
          ) : workshops && workshops.length > 0 ? (
            <div className="space-y-12">
              {workshops.map((workshop) => {
                const availableSeats = (workshop.maxCapacity || workshop.totalCapacity || 0) - (workshop.bookedCount || workshop.ticketsSold || 0);
                const isSoldOut = availableSeats <= 0;
                const isEarlyBird = workshop.earlyBirdPrice && workshop.earlyBirdDeadline && 
                  new Date().toISOString().split('T')[0] <= workshop.earlyBirdDeadline;

                return (
                  <Card key={workshop.id} className={`overflow-hidden shadow-xl ${isSoldOut ? 'opacity-75' : ''}`}>
                    <div className="grid md:grid-cols-2 gap-0">
                      {/* Left side - Image */}
                      <div className="relative aspect-video md:aspect-auto md:min-h-[400px]">
                        {workshop.imageUrl ? (
                          <img 
                            src={workshop.imageUrl} 
                            alt={workshop.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                            <ChefHat className="h-24 w-24 text-amber-400" />
                          </div>
                        )}
                        {isSoldOut && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Badge className="bg-red-600 text-xl py-3 px-6">SOLD OUT</Badge>
                          </div>
                        )}
                        {isEarlyBird && !isSoldOut && (
                          <Badge className="absolute top-4 right-4 bg-green-600 text-lg py-2 px-4">🎉 Early Bird Offer!</Badge>
                        )}
                      </div>
                      
                      {/* Right side - Details */}
                      <div className="p-6 md:p-8 flex flex-col">
                        <div className="flex-1">
                          <h3 className="text-2xl md:text-3xl font-bold mb-3">{workshop.title}</h3>
                          
                          {/* Quick Info Bar */}
                          <div className="flex flex-wrap gap-4 mb-6 text-sm">
                            <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full">
                              <Calendar className="h-4 w-4" />
                              {new Date(workshop.workshopDate).toLocaleDateString('en-IN', { 
                                weekday: 'short', 
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full">
                              <Clock className="h-4 w-4" />
                              {workshop.startTime} - {workshop.endTime}
                            </div>
                            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full">
                              <Users className="h-4 w-4" />
                              {availableSeats} spots left
                            </div>
                          </div>
                          
                          {/* Full Description */}
                          {workshop.description && (
                            <div className="mb-6">
                              <h4 className="font-semibold text-lg mb-2">About This Workshop</h4>
                              <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                {workshop.description}
                              </div>
                            </div>
                          )}
                          
                          {/* Venue & Instructor */}
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                <MapPin className="h-4 w-4" />
                                Venue
                              </div>
                              <p className="font-medium">{workshop.venue || workshop.location}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                <ChefHat className="h-4 w-4" />
                                Instructor
                              </div>
                              <p className="font-medium">{workshop.instructorName}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Price & Book Button */}
                        <div className="border-t pt-6 mt-auto">
                          <div className="flex items-center justify-between">
                            <div>
                              {isEarlyBird ? (
                                <div>
                                  <span className="text-3xl font-bold text-green-600">₹{(workshop.earlyBirdPrice! / 100).toFixed(0)}</span>
                                  <span className="text-lg text-muted-foreground line-through ml-2">₹{(workshop.price / 100).toFixed(0)}</span>
                                  <span className="text-sm text-muted-foreground"> / person</span>
                                  <p className="text-sm text-green-600 mt-1">Early bird until {new Date(workshop.earlyBirdDeadline!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-3xl font-bold">₹{(workshop.price / 100).toFixed(0)}</span>
                                  <span className="text-sm text-muted-foreground"> / person</span>
                                </div>
                              )}
                            </div>
                            <Button 
                              size="lg"
                              className="text-lg px-8" 
                              disabled={isSoldOut}
                              onClick={() => {
                                setSelectedWorkshop(workshop.id);
                                setWorkshopDialogOpen(true);
                              }}
                            >
                              {isSoldOut ? "Sold Out" : "Book Now"}
                              {!isSoldOut && <ArrowRight className="ml-2 h-5 w-5" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="max-w-lg mx-auto text-center py-12 border-0 shadow-xl">
              <CardContent>
                <ChefHat className="h-16 w-16 mx-auto text-amber-500 mb-6" />
                <h3 className="text-2xl font-bold mb-3">No Upcoming Workshops</h3>
                <p className="text-muted-foreground mb-6">
                  We're planning exciting new workshops! Follow us on Instagram to be the first to know.
                </p>
                <a 
                  href="https://instagram.com/taiwan_maami" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="lg">
                    <Instagram className="mr-2 h-5 w-5" />
                    Follow @taiwan_maami
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Workshop Booking Dialog */}
      <Dialog open={workshopDialogOpen} onOpenChange={setWorkshopDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Workshop Tickets</DialogTitle>
            <DialogDescription>
              {selectedWorkshopData?.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWorkshopBook} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="bookingName">Your Name *</Label>
              <Input
                id="bookingName"
                value={bookingForm.customerName}
                onChange={(e) => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingEmail">Email *</Label>
              <Input
                id="bookingEmail"
                type="email"
                value={bookingForm.customerEmail}
                onChange={(e) => setBookingForm({ ...bookingForm, customerEmail: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingPhone">Phone Number *</Label>
              <Input
                id="bookingPhone"
                value={bookingForm.customerPhone}
                onChange={(e) => setBookingForm({ ...bookingForm, customerPhone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticketCount">Number of Tickets (Max 5)</Label>
              <Select
                value={bookingForm.ticketCount.toString()}
                onValueChange={(value) => setBookingForm({ ...bookingForm, ticketCount: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'ticket' : 'tickets'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingRequirements">Special Requirements (Optional)</Label>
              <Textarea
                id="bookingRequirements"
                placeholder="Any dietary restrictions or special needs?"
                value={bookingForm.specialRequirements}
                onChange={(e) => setBookingForm({ ...bookingForm, specialRequirements: e.target.value })}
              />
            </div>
            
            {selectedWorkshopData && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="text-xl font-bold">
                    ₹{((selectedWorkshopData.earlyBirdPrice && selectedWorkshopData.earlyBirdDeadline && new Date().toISOString().split('T')[0] <= selectedWorkshopData.earlyBirdDeadline 
                      ? selectedWorkshopData.earlyBirdPrice 
                      : selectedWorkshopData.price) * bookingForm.ticketCount / 100).toFixed(0)}
                  </span>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={bookWorkshop.isPending}>
              {bookWorkshop.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You'll receive payment details via email after booking confirmation.
            </p>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contact CTA */}
      <section className="py-20 bg-gradient-to-r from-red-600 to-red-700 text-white">
        <div className="container text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Make Your Event Special?</h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-10">
            Contact us today to discuss your event requirements. We'll create a customized 
            package that fits your needs and budget.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="tel:+918925914303">
              <Button size="lg" className="bg-white text-red-600 hover:bg-white/90 text-lg px-8 py-6">
                <Phone className="mr-2 h-5 w-5" />
                Call Us: +91 89259 14303
              </Button>
            </a>
            <a href="mailto:hello@taiwanmaami.com">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6">
                <Mail className="mr-2 h-5 w-5" />
                hello@taiwanmaami.com
              </Button>
            </a>
            <a href="https://instagram.com/taiwan_maami" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6">
                <Instagram className="mr-2 h-5 w-5" />
                @taiwan_maami
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
