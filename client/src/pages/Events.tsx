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
import { Calendar, Clock, MapPin, Users, Ticket, ChefHat, PartyPopper, Phone, Mail, Instagram, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Past events showcase data
const pastEvents = [
  {
    title: "Wedding Reception - Radisson Blu",
    description: "Served 200+ guests with our signature bubble tea bar and Taiwanese snacks",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop",
    guests: 200,
    type: "Wedding",
  },
  {
    title: "Tech Company Annual Meet",
    description: "Corporate event with customized bubble tea flavors and biang biang noodles",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop",
    guests: 150,
    type: "Corporate",
  },
  {
    title: "School Cultural Festival",
    description: "Fun-filled event with interactive bubble tea making stations",
    image: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&h=400&fit=crop",
    guests: 300,
    type: "School",
  },
];

// What we offer
const offerings = [
  { icon: <ChefHat className="h-6 w-6" />, title: "Authentic Taiwanese Cuisine", desc: "From bubble tea to biang biang noodles" },
  { icon: <Users className="h-6 w-6" />, title: "Flexible Guest Count", desc: "From intimate gatherings to large events" },
  { icon: <Sparkles className="h-6 w-6" />, title: "Customized Menus", desc: "Tailored to your preferences and budget" },
  { icon: <CheckCircle2 className="h-6 w-6" />, title: "Professional Service", desc: "Trained staff for seamless execution" },
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
            <Badge className="bg-white/20 text-white mb-4">Events & Workshops</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Bring Taiwan to Your Event
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              From corporate gatherings to weddings, we bring authentic Taiwanese flavors 
              that create unforgettable experiences. Plus, learn to make our signature dishes 
              in our exclusive workshops!
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
                              <SelectItem value="wedding">Wedding / Reception</SelectItem>
                              <SelectItem value="corporate">Corporate Event</SelectItem>
                              <SelectItem value="school">School / College Event</SelectItem>
                              <SelectItem value="private">Private Party</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guestCount">Number of Guests *</Label>
                          <Input
                            id="guestCount"
                            type="number"
                            min="1"
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
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="venue">Venue / Location *</Label>
                        <Input
                          id="venue"
                          placeholder="Where will the event be held?"
                          value={inquiryForm.venue}
                          onChange={(e) => setInquiryForm({ ...inquiryForm, venue: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Catering Requirements */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Catering Requirements</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cateringType">What would you like? *</Label>
                          <Select
                            value={inquiryForm.cateringType}
                            onValueChange={(value) => setInquiryForm({ ...inquiryForm, cateringType: value as typeof inquiryForm.cateringType })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select catering type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beverages_only">Bubble Tea Only</SelectItem>
                              <SelectItem value="food_only">Food Only</SelectItem>
                              <SelectItem value="both">Both Beverages & Food</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="budgetRange">Budget Range (Optional)</Label>
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
                              <SelectItem value="above_1l">Above ₹1,00,000</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preferredItems">Preferred Items</Label>
                        <Textarea
                          id="preferredItems"
                          placeholder="Any specific drinks or food items you'd like? (e.g., Brown Sugar Boba, Biang Biang Noodles)"
                          value={inquiryForm.preferredItems}
                          onChange={(e) => setInquiryForm({ ...inquiryForm, preferredItems: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="specialRequirements">Special Requirements</Label>
                        <Textarea
                          id="specialRequirements"
                          placeholder="Any dietary restrictions, allergies, or special requests?"
                          value={inquiryForm.specialRequirements}
                          onChange={(e) => setInquiryForm({ ...inquiryForm, specialRequirements: e.target.value })}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={submitInquiry.isPending}>
                      {submitInquiry.isPending ? "Submitting..." : "Submit Inquiry"}
                    </Button>
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

      {/* What We Offer */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Taiwan Maami for Your Event?</h2>
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

      {/* Past Events Gallery */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Events We've Catered</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From intimate gatherings to grand celebrations, we've brought Taiwanese flavors 
              to events across Chennai.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pastEvents.map((event, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="aspect-video relative">
                  <img 
                    src={event.image} 
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-3 left-3 bg-red-600">{event.type}</Badge>
                </div>
                <CardContent className="pt-4">
                  <h3 className="font-semibold mb-2">{event.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-1" />
                    {event.guests}+ guests served
                  </div>
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
              <p className="mt-4 text-muted-foreground">Loading workshops...</p>
            </div>
          ) : workshops && workshops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workshops.map((workshop) => {
                const isSoldOut = workshop.bookedCount >= workshop.totalCapacity;
                const availableSeats = workshop.totalCapacity - workshop.bookedCount;
                const today = new Date().toISOString().split('T')[0];
                const isEarlyBird = workshop.earlyBirdPrice && workshop.earlyBirdDeadline && today <= workshop.earlyBirdDeadline;
                
                return (
                  <Card key={workshop.id} className="overflow-hidden">
                    {workshop.imageUrl && (
                      <div className="aspect-video relative">
                        <img 
                          src={workshop.imageUrl} 
                          alt={workshop.title}
                          className="w-full h-full object-cover"
                        />
                        {isSoldOut && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Badge className="bg-red-600 text-lg py-2 px-4">SOLD OUT</Badge>
                          </div>
                        )}
                        {isEarlyBird && !isSoldOut && (
                          <Badge className="absolute top-3 right-3 bg-green-600">Early Bird!</Badge>
                        )}
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between">
                        <span>{workshop.title}</span>
                      </CardTitle>
                      {workshop.shortDescription && (
                        <CardDescription>{workshop.shortDescription}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {new Date(workshop.workshopDate).toLocaleDateString('en-IN', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        {workshop.startTime} - {workshop.endTime}
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
            <a href="mailto:events@taiwanmaami.com">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Mail className="mr-2 h-5 w-5" />
                events@taiwanmaami.com
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
