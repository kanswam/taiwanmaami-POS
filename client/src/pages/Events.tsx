import { useState } from "react";
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
import { Calendar, Clock, MapPin, Users, Ticket, ChefHat, PartyPopper, Phone, Mail, Instagram, Sparkles, CheckCircle2, ArrowRight, Heart, Building2, GraduationCap, UtensilsCrossed } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Past events showcase data with real photos
const pastEvents = [
  {
    title: "Wedding Celebrations",
    description: "Create unforgettable moments with our premium wedding catering and event services. From intimate ceremonies to grand celebrations, we bring your vision to life with exquisite cuisine and impeccable service.",
    image: "https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1768284574/events/wedding-event.jpg",
    icon: <Heart className="h-5 w-5" />,
    type: "Wedding",
    cta: "Plan Your Wedding",
  },
  {
    title: "Corporate Functions",
    description: "Impress your clients and team with sophisticated corporate catering. Our expert team delivers premium Asian cuisine and seamless service for conferences, gala dinners, and business gatherings.",
    image: "https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1768284572/events/corporate-event.jpg",
    icon: <Building2 className="h-5 w-5" />,
    type: "Corporate",
    cta: "Plan Your Corporate Event",
  },
  {
    title: "School Events",
    description: "Bring joy and flavour to your school events. Our vibrant food stall and catering services create memorable experiences for students, families, and staff. Perfect for fairs, festivals, and fundraisers!",
    image: "https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1768284573/events/school-event.jpg",
    icon: <GraduationCap className="h-5 w-5" />,
    type: "School",
    cta: "Plan Your School Event",
  },
];

// What we offer - consistent across all event types
const offerings = [
  { icon: <Sparkles className="h-6 w-6" />, title: "Premium Quality", desc: "Only the finest ingredients for your special day" },
  { icon: <CheckCircle2 className="h-6 w-6" />, title: "Professional Service", desc: "Trained staff for seamless execution" },
  { icon: <ChefHat className="h-6 w-6" />, title: "Authentic Cuisine", desc: "Genuine Taiwanese flavors and recipes" },
  { icon: <UtensilsCrossed className="h-6 w-6" />, title: "Custom Solutions", desc: "Tailored menus for your preferences" },
];

export default function Events() {
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false);
  const [workshopDialogOpen, setWorkshopDialogOpen] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);
  
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
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-red-600 to-red-800 text-white py-20 md:py-32">
        <div className="absolute inset-0 bg-black/20" />
        <div className="container relative z-10">
          <div className="max-w-3xl">
            <Badge className="bg-white/20 text-white mb-4">Premium Event Services</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Celebrate Life's Precious Moments
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              From intimate weddings to grand corporate galas, Taiwan Maami brings authentic Asian 
              cuisine and beverages to every celebration. Create unforgettable memories with our 
              premium catering.
            </p>
            <div className="flex flex-wrap gap-4">
              <Dialog open={inquiryDialogOpen} onOpenChange={setInquiryDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-white text-red-600 hover:bg-white/90">
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
              <a href="#workshops">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <Ticket className="mr-2 h-5 w-5" />
                  View Workshops
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Event Categories - From EventPage.docx */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">From Private Celebrations to Corporate Functions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We offer premium event catering and experiences for every occasion.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <Badge variant="outline" className="text-lg py-2 px-4">
                <Heart className="h-4 w-4 mr-2" /> Weddings
              </Badge>
              <Badge variant="outline" className="text-lg py-2 px-4">
                <GraduationCap className="h-4 w-4 mr-2" /> School Events
              </Badge>
              <Badge variant="outline" className="text-lg py-2 px-4">
                <Building2 className="h-4 w-4 mr-2" /> Corporate
              </Badge>
              <Badge variant="outline" className="text-lg py-2 px-4">
                <PartyPopper className="h-4 w-4 mr-2" /> Private Gatherings
              </Badge>
            </div>
          </div>

          {/* Event Cards with Real Photos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {pastEvents.map((event, index) => (
              <Card key={index} className="overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img 
                    src={event.image} 
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <Badge className="absolute top-3 left-3 bg-red-600">{event.type}</Badge>
                </div>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                      {event.icon}
                    </div>
                    <h3 className="text-xl font-semibold">{event.title}</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">{event.description}</p>
                  
                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="text-xs">Premium Quality</Badge>
                    <Badge variant="secondary" className="text-xs">Professional Service</Badge>
                    <Badge variant="secondary" className="text-xs">Authentic Cuisine</Badge>
                    <Badge variant="secondary" className="text-xs">Custom Solutions</Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => setInquiryDialogOpen(true)}
                  >
                    {event.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Premium Meal Boxes Section */}
          <Card className="mt-8 overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-8 flex flex-col justify-center">
                <Badge className="w-fit mb-4 bg-amber-100 text-amber-800">Premium Meal Boxes</Badge>
                <h3 className="text-2xl font-bold mb-4">Elevate Your Special Occasions</h3>
                <p className="text-muted-foreground mb-6">
                  Elevate your special occasions and gatherings with our premium bento box catering. 
                  Each box is meticulously crafted with premium ingredients, elegant presentation, 
                  and authentic Asian delicacies.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="secondary">Premium Quality</Badge>
                  <Badge variant="secondary">Professional Service</Badge>
                  <Badge variant="secondary">Authentic Cuisine</Badge>
                  <Badge variant="secondary">Custom Solutions</Badge>
                </div>
                <Button onClick={() => setInquiryDialogOpen(true)} className="w-fit">
                  Plan Your Meal Boxes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 flex items-center justify-center">
                <div className="text-center">
                  <UtensilsCrossed className="h-16 w-16 mx-auto text-amber-600 mb-4" />
                  <h4 className="font-semibold text-lg mb-2">Culinary Box</h4>
                  <p className="text-sm text-muted-foreground">
                    South Indian Tiffin • Sandwiches • Cóng Yoú Bǐng 蔥油餅
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    As featured at UN for Taiwan 2025
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Taiwan Maami?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We don't just serve food – we create experiences. Our exotic Taiwanese offerings 
              stand out from the usual fare seen at events.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {offerings.map((item, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Workshops Section */}
      <section id="workshops" className="py-16 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="bg-amber-100 text-amber-800 mb-4">Learn From The Best</Badge>
            <h2 className="text-3xl font-bold mb-4">Cooking Workshops</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workshops.map((workshop) => {
                const availableSeats = workshop.capacity - (workshop.bookedCount || 0);
                const isSoldOut = availableSeats <= 0;
                const isEarlyBird = workshop.earlyBirdPrice && workshop.earlyBirdDeadline && 
                  new Date().toISOString().split('T')[0] <= workshop.earlyBirdDeadline;

                return (
                  <Card key={workshop.id} className={`overflow-hidden ${isSoldOut ? 'opacity-75' : ''}`}>
                    {workshop.imageUrl && (
                      <div className="aspect-video relative">
                        <img 
                          src={workshop.imageUrl} 
                          alt={workshop.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isSoldOut && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Badge className="bg-red-600 text-lg py-2 px-4">SOLD OUT</Badge>
                          </div>
                        )}
                        {isEarlyBird && !isSoldOut && (
                          <Badge className="absolute top-3 right-3 bg-green-600">Early Bird</Badge>
                        )}
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{workshop.title}</CardTitle>
                      {workshop.shortDescription && (
                        <CardDescription>{workshop.shortDescription}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {new Date(workshop.date).toLocaleDateString('en-IN', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        {workshop.time}
                        {workshop.duration && <span className="ml-2 text-muted-foreground">({workshop.duration})</span>}
                      </div>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        {workshop.venue}
                      </div>
                      <div className="flex items-center text-sm">
                        <ChefHat className="h-4 w-4 mr-2 text-muted-foreground" />
                        Instructor: {workshop.instructorName}
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          {isEarlyBird ? (
                            <div>
                              <span className="text-2xl font-bold text-green-600">₹{(workshop.earlyBirdPrice! / 100).toFixed(0)}</span>
                              <span className="text-sm text-muted-foreground line-through ml-2">₹{(workshop.price / 100).toFixed(0)}</span>
                            </div>
                          ) : (
                            <span className="text-2xl font-bold">₹{(workshop.price / 100).toFixed(0)}</span>
                          )}
                          <span className="text-sm text-muted-foreground"> / person</span>
                        </div>
                        {!isSoldOut && (
                          <Badge variant="outline" className="text-amber-700 border-amber-300">
                            {availableSeats} seats left
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full" 
                        disabled={isSoldOut}
                        onClick={() => {
                          setSelectedWorkshop(workshop.id);
                          setWorkshopDialogOpen(true);
                        }}
                      >
                        {isSoldOut ? "Sold Out" : "Book Now"}
                        {!isSoldOut && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="max-w-lg mx-auto text-center py-12">
              <CardContent>
                <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Upcoming Workshops</h3>
                <p className="text-muted-foreground mb-4">
                  We're planning exciting new workshops! Follow us on Instagram to be the first to know.
                </p>
                <a 
                  href="https://instagram.com/taiwan_maami" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">
                    <Instagram className="mr-2 h-4 w-4" />
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
      <section className="py-16 bg-red-600 text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Make Your Event Special?</h2>
          <p className="text-white/90 max-w-2xl mx-auto mb-8">
            Contact us today to discuss your event requirements. We'll create a customized 
            package that fits your needs and budget.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="tel:+918925914303">
              <Button size="lg" className="bg-white text-red-600 hover:bg-white/90">
                <Phone className="mr-2 h-5 w-5" />
                Call Us: +91 89259 14303
              </Button>
            </a>
            <a href="mailto:hello@taiwanmaami.com">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Mail className="mr-2 h-5 w-5" />
                hello@taiwanmaami.com
              </Button>
            </a>
            <a href="https://instagram.com/taiwan_maami" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
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
