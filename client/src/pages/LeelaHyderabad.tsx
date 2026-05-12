import { useState, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Users, ArrowRight, ArrowDown, ChefHat, Utensils, Wine, CheckCircle2, Phone, Mail } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

const EVENT_SLUG = "leela-hyderabad-march-2026";
const POSTER_URL = "https://res.cloudinary.com/drpu1dbqk/image/upload/f_auto,q_auto/v1778606562/taiwan-maami/static/CWmnTPwxvTOuCjdR.jpg";

// Dinner dates: 5-8 March 2026
const DINNER_DATES = [
  { value: "2026-03-05", label: "Thursday, 5th March 2026" },
  { value: "2026-03-06", label: "Friday, 6th March 2026" },
  { value: "2026-03-07", label: "Saturday, 7th March 2026" },
  { value: "2026-03-08", label: "Sunday, 8th March 2026" },
];

// Masterclass dates: 6-8 March 2026
const MASTERCLASS_DATES = [
  { value: "2026-03-06", label: "Friday, 6th March 2026" },
  { value: "2026-03-07", label: "Saturday, 7th March 2026" },
  { value: "2026-03-08", label: "Sunday, 8th March 2026" },
];

export default function LeelaHyderabad() {
  const formRef = useRef<HTMLDivElement>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [eventType, setEventType] = useState<"dinner" | "masterclass" | "">("");
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    selectedDate: "",
    numberOfGuests: 1,
    specialRequirements: "",
  });

  const registerMutation = trpc.popup.registerInterest.useMutation({
    onSuccess: () => {
      setRegistrationSuccess(true);
      toast.success("Registration successful! We'll be in touch soon.");
    },
    onError: (error) => {
      toast.error(error.message || "Registration failed. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventType) {
      toast.error("Please select an event type");
      return;
    }
    if (!form.selectedDate) {
      toast.error("Please select a date");
      return;
    }
    registerMutation.mutate({
      eventSlug: EVENT_SLUG,
      customerName: form.customerName,
      customerEmail: form.customerEmail,
      customerPhone: form.customerPhone,
      eventType: eventType as "dinner" | "masterclass",
      selectedDate: form.selectedDate,
      numberOfGuests: form.numberOfGuests,
      specialRequirements: form.specialRequirements || undefined,
    });
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const availableDates = eventType === "dinner" ? DINNER_DATES : eventType === "masterclass" ? MASTERCLASS_DATES : [];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Taiwan Maami's Edible Journey at The Leela Hyderabad"
        description="Experience an exclusive culinary residency at The Leela Hyderabad, 5-8 March 2026. Dinner 7PM-12AM & Master Class 1PM-3PM by Theresa Hu. A journey from imperial China to Taiwan to India. Register your interest now."
        keywords="Taiwan Maami Hyderabad, The Leela Hyderabad popup, Taiwanese food Hyderabad, culinary residency Hyderabad, Theresa Hu chef, masterclass Hyderabad, Chinese New Year dinner 2026, RAEN The Chef's Studio"
        canonicalPath="/leela-hyderabad"
        ogImage={POSTER_URL}
        ogType="event"
      />
      <Header />

      {/* Hero Section - Full-width poster with overlay */}
      <section className="relative -mt-16 pt-16">
        <div className="relative">
          <img
            src={POSTER_URL}
            alt="Taiwan Maami's Edible Journey at The Leela Hyderabad - Dinner 7PM-12AM, 5-8 March 2026 | Master Class 1PM-3PM, 6-8 March 2026"
            className="w-full h-auto"
          />
          {/* Gradient overlay at bottom for CTA */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent py-8 px-4">
            <div className="container text-center">
              <Button
                size="lg"
                onClick={scrollToForm}
                className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 shadow-2xl"
              >
                Register Your Interest
                <ArrowDown className="ml-2 w-5 h-5 animate-bounce" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Event Quick Info Bar */}
      <section className="bg-stone-900 text-white py-6">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Calendar className="w-6 h-6 text-amber-400" />
              <div>
                <p className="font-semibold text-lg">5 — 8 March 2026</p>
                <p className="text-sm text-white/70">Four extraordinary evenings</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MapPin className="w-6 h-6 text-amber-400" />
              <div>
                <p className="font-semibold text-lg">RAEN — The Chef's Studio</p>
                <p className="text-sm text-white/70">The Leela, Banjara Hills, Hyderabad</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ChefHat className="w-6 h-6 text-amber-400" />
              <div>
                <p className="font-semibold text-lg">Theresa Hu</p>
                <p className="text-sm text-white/70">Creator of Taiwan Maami & House of Thamarai</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Vision - Story Narrative */}
      <section className="py-16 md:py-24 bg-stone-50">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-amber-700 border-amber-300 bg-amber-50 px-4 py-1 text-sm">
              The Vision
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
              A Culinary Story Told in Two Harmonious Parts
            </h2>
          </div>

          <div className="prose prose-lg prose-stone max-w-none space-y-6 text-stone-700 leading-relaxed">
            <p>
              This is a high-concept residency that presents a journey in two harmonious parts: <strong>a culinary story told through food</strong>, and <strong>a parallel tea narrative told through the world's finest leaves</strong>. Each dish and each tea is a chapter in a remarkable, true story — taking guests from the imperial palaces of China to the vibrant tea houses of Taiwan, across the globe, and finally, to a home in India.
            </p>
            <p>
              We propose to host the event from <strong>March 4 to 8, 2026</strong>, to also celebrate the <strong>2026 Chinese New Year</strong> with our curated menu. The event is designed to be a landmark for Hyderabad's culinary scene, showcasing a mastery of both food and tea that is unique in the world.
            </p>
          </div>
        </div>
      </section>

      {/* The Creator - Theresa Hu's Story */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-amber-700 border-amber-300 bg-amber-50 px-4 py-1 text-sm">
              The Creator & The Story
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Ms Theresa Hu
            </h2>
            <p className="text-lg text-stone-500 italic">Creator of Taiwan Maami & House of Thamarai</p>
          </div>

          <div className="prose prose-lg prose-stone max-w-none space-y-6 text-stone-700 leading-relaxed">
            <p>
              The residency is conceived and led by <strong>Ms Theresa Hu</strong>. The menu is a direct reflection of her personal history and her approach to food. Her expertise is not from a traditional culinary school, but from <strong>a life lived at the centre of colliding cultures</strong>. Her family's history is the history of modern China:
            </p>

            <div className="bg-stone-50 rounded-xl p-6 md:p-8 border border-stone-200 space-y-4 not-prose">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-3 flex-shrink-0" />
                <p className="text-stone-700">Her mother's family were the clan of <strong className="text-stone-900">Irgen-Giyoro</strong>, the Manchu nobles of the Qing Dynasty — the last imperial rulers of China.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-3 flex-shrink-0" />
                <p className="text-stone-700">Her father's family were <strong className="text-stone-900">Han revolutionaries</strong> who helped found the Republic.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-3 flex-shrink-0" />
                <p className="text-stone-700">After the Chinese Civil War, her grandparents, as military personnel, were part of the <strong className="text-stone-900">historic retreat of the Republic of China's government to Taiwan</strong>. It was there that two opposing family legacies were reconciled, and Theresa was born.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-3 flex-shrink-0" />
                <p className="text-stone-700">She grew up in a place with a complex identity. <strong className="text-stone-900">Taiwanese cuisine is a unique fusion</strong>, deeply influenced by 50 years of Japanese colonial rule. This is why dishes like Katsu Curry are as much a part of her heritage as the ancient noodle traditions of the mainland.</p>
              </div>
            </div>

            <p>
              Her own journey then took her to the vibrant culinary capitals of <strong>Hong Kong</strong> and <strong>London</strong>. It was in Hong Kong that she fell in love with the refined flavours of Cantonese cuisine, which you will taste in the Steamed Garlic Prawns. In the UK, she was inspired by the sophisticated and historic cocktail culture, which influences the modern tea-based cocktails.
            </p>

            <p>
              Her story found its next chapter here in <strong>India</strong>, her adopted home and the home of her husband. It is this final connection that inspired her to bring all these authentic, multi-layered flavours of her life's journey to the Indian palate.
            </p>

            <blockquote className="border-l-4 border-amber-500 bg-amber-50/50 pl-6 py-4 italic text-stone-600 not-prose rounded-r-lg">
              <p className="text-lg leading-relaxed">
                "My philosophy is simple: to create authentic food and tea, you must start with the rawest of materials. As a trained classical musician, when I study a piece, I analyse the most fundamental elements and then the technique of construction. I have the same approach to culinary art."
              </p>
              <footer className="mt-3 text-sm font-medium text-stone-500 not-italic">— Theresa Hu</footer>
            </blockquote>

            <p>
              Every childhood recipe is deconstructed and rebuilt with local ingredients — if not available, they are imported — to achieve the most authentic experience. She re-creates and trains to ensure perfect execution in the end.
            </p>

            <p className="text-lg font-medium text-stone-900 text-center py-4">
              This event is the culmination of a life's work — a story that begins in China, is forged in Taiwan, is refined in Hong Kong and London, and finds its heart in India.
            </p>
          </div>
        </div>
      </section>

      {/* Event Details Cards */}
      <section className="py-16 md:py-24 bg-stone-900 text-white">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Two Experiences, One Journey
            </h2>
            <p className="text-white/70 text-lg">Choose your path through this edible story</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Dinner Card */}
            <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
              <div className="bg-gradient-to-r from-amber-600 to-amber-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Utensils className="w-6 h-6" />
                  <h3 className="text-2xl font-bold">The Dinner</h3>
                </div>
                <p className="text-white/80 text-sm">A multi-course culinary journey</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span>5th — 8th March 2026</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span>7:00 PM — 12:00 AM</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span>RAEN — The Chef's Studio, The Leela, Banjara Hills</span>
                </div>
                <Separator className="bg-white/10" />
                <p className="text-white/70 text-sm leading-relaxed">
                  Experience an extraordinary multi-course dinner that traces Theresa's culinary journey from the imperial kitchens of China through the vibrant night markets of Taiwan to the refined dining rooms of Hong Kong. Each course is paired with rare teas from the world's finest estates.
                </p>
                <Button
                  onClick={() => {
                    setEventType("dinner");
                    setForm(f => ({ ...f, selectedDate: "" }));
                    scrollToForm();
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white mt-2"
                >
                  Register for Dinner
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Masterclass Card */}
            <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
              <div className="bg-gradient-to-r from-stone-600 to-stone-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <ChefHat className="w-6 h-6" />
                  <h3 className="text-2xl font-bold">The Master Class</h3>
                </div>
                <p className="text-white/80 text-sm">Learn the art of Taiwanese cuisine</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span>6th — 8th March 2026</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span>1:00 PM — 3:00 PM</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span>RAEN — The Chef's Studio, The Leela, Banjara Hills</span>
                </div>
                <Separator className="bg-white/10" />
                <p className="text-white/70 text-sm leading-relaxed">
                  Join Theresa Hu for an intimate afternoon master class where she shares the techniques and stories behind her signature dishes. Learn the art of hand-pulled noodles, the secrets of authentic Taiwanese tea preparation, and the philosophy of deconstructing and rebuilding recipes with integrity.
                </p>
                <Button
                  onClick={() => {
                    setEventType("masterclass");
                    setForm(f => ({ ...f, selectedDate: "" }));
                    scrollToForm();
                  }}
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10 mt-2"
                >
                  Register for Master Class
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section ref={formRef} className="py-16 md:py-24 bg-stone-50 scroll-mt-20" id="register">
        <div className="container max-w-2xl">
          {registrationSuccess ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-stone-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Thank You for Registering
              </h2>
              <p className="text-lg text-stone-600 mb-2">
                Your interest has been recorded. We will be in touch with you shortly with further details.
              </p>
              <p className="text-stone-500 mb-8">
                The Leela Hyderabad will also be taking bookings on their system separately.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => {
                    setRegistrationSuccess(false);
                    setEventType("");
                    setForm({
                      customerName: "",
                      customerEmail: "",
                      customerPhone: "",
                      selectedDate: "",
                      numberOfGuests: 1,
                      specialRequirements: "",
                    });
                  }}
                  variant="outline"
                >
                  Register for Another Date
                </Button>
                <Link href="/">
                  <Button>Back to Home</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <Badge variant="outline" className="mb-4 text-amber-700 border-amber-300 bg-amber-50 px-4 py-1 text-sm">
                  Reserve Your Journey
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Register Your Interest
                </h2>
                <p className="text-stone-600 max-w-lg mx-auto">
                  No payment is required at this stage. Register your interest and we will contact you with further details and confirmation.
                </p>
              </div>

              <Card className="shadow-xl border-stone-200">
                <CardContent className="p-6 md:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Event Type Selection */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold text-stone-900">Which experience interests you? *</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEventType("dinner");
                            setForm(f => ({ ...f, selectedDate: "" }));
                          }}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            eventType === "dinner"
                              ? "border-amber-500 bg-amber-50 shadow-md"
                              : "border-stone-200 hover:border-stone-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <Utensils className={`w-5 h-5 ${eventType === "dinner" ? "text-amber-600" : "text-stone-400"}`} />
                            <span className="font-semibold text-stone-900">Dinner</span>
                          </div>
                          <p className="text-xs text-stone-500">7PM — 12AM · 5-8 March</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEventType("masterclass");
                            setForm(f => ({ ...f, selectedDate: "" }));
                          }}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            eventType === "masterclass"
                              ? "border-amber-500 bg-amber-50 shadow-md"
                              : "border-stone-200 hover:border-stone-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <ChefHat className={`w-5 h-5 ${eventType === "masterclass" ? "text-amber-600" : "text-stone-400"}`} />
                            <span className="font-semibold text-stone-900">Master Class</span>
                          </div>
                          <p className="text-xs text-stone-500">1PM — 3PM · 6-8 March</p>
                        </button>
                      </div>
                    </div>

                    {/* Date Selection */}
                    {eventType && (
                      <div className="space-y-2">
                        <Label htmlFor="date" className="text-base font-semibold text-stone-900">
                          Select Your Preferred Date *
                        </Label>
                        <Select
                          value={form.selectedDate}
                          onValueChange={(val) => setForm(f => ({ ...f, selectedDate: val }))}
                        >
                          <SelectTrigger id="date">
                            <SelectValue placeholder="Choose a date" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDates.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Separator />

                    {/* Personal Details */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="font-medium">Full Name *</Label>
                        <Input
                          id="name"
                          value={form.customerName}
                          onChange={(e) => setForm(f => ({ ...f, customerName: e.target.value }))}
                          placeholder="Your full name"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="font-medium">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={form.customerEmail}
                            onChange={(e) => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                            placeholder="your@email.com"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="font-medium">Phone *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={form.customerPhone}
                            onChange={(e) => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                            placeholder="+91 XXXXX XXXXX"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="guests" className="font-medium">Number of Guests</Label>
                        <Select
                          value={form.numberOfGuests.toString()}
                          onValueChange={(val) => setForm(f => ({ ...f, numberOfGuests: parseInt(val) }))}
                        >
                          <SelectTrigger id="guests">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n} {n === 1 ? "Guest" : "Guests"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="requirements" className="font-medium">Special Requirements or Dietary Needs</Label>
                        <Textarea
                          id="requirements"
                          value={form.specialRequirements}
                          onChange={(e) => setForm(f => ({ ...f, specialRequirements: e.target.value }))}
                          placeholder="Any allergies, dietary restrictions, or special requests..."
                          rows={3}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white text-lg py-6"
                      disabled={registerMutation.isPending || !eventType || !form.selectedDate}
                    >
                      {registerMutation.isPending ? "Submitting..." : "Register My Interest"}
                    </Button>

                    <p className="text-xs text-center text-stone-400">
                      No payment required. This is a registration of interest only. The Leela Hyderabad will also be taking bookings on their system separately.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </section>

      {/* Contact Bar */}
      <section className="bg-stone-900 text-white py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center">
            <p className="text-white/70">For enquiries, contact us:</p>
            <a href="tel:+918712688658" className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors">
              <Phone className="w-4 h-4" />
              +91 87126 88658
            </a>
            <a href="mailto:hello@taiwanmaami.com" className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors">
              <Mail className="w-4 h-4" />
              hello@taiwanmaami.com
            </a>
            <a href="https://www.taiwanmaami.com" className="text-amber-400 hover:text-amber-300 transition-colors">
              www.taiwanmaami.com
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
