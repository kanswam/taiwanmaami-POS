import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { trpc } from '@/lib/trpc';
import { ArrowRight, MapPin, Clock, Star, Sparkles, Instagram, Phone, Navigation } from 'lucide-react';

export default function Home() {
  const { data: stores } = trpc.stores.getAll.useQuery();

  // Category cards with video backgrounds
  const menuCategories = [
    {
      name: 'Bubble Tea / Coffee',
      description: 'Authentic Taiwanese bubble tea & premium coffee',
      video: '/videos/bubble-tea-coffee.mp4',
      href: '/category/bubble-tea-coffee',
    },
    {
      name: 'Hot Beverages',
      description: 'Warm & comforting traditional drinks',
      video: '/videos/hot-beverages.mp4',
      href: '/category/hot-beverages',
    },
    {
      name: 'Asian Rice-Noodles-Bread',
      description: 'Savory Asian street food favorites',
      video: '/videos/asian-food.mp4',
      href: '/category/asian-food',
    },
    {
      name: 'Asian Sweet Bites',
      description: 'Delicious mochis & desserts',
      video: '/videos/sweet-bites.mp4',
      href: '/category/sweet-bites',
    },
  ];

  // Location cards with video backgrounds
  const locations = [
    {
      name: 'Taiwan Maami',
      subtitle: 'Palladium Mall',
      address: 'First Floor, Palladium Mall, Velachery',
      city: 'Chennai - 600042',
      video: '/videos/palladium-outlet.mp4',
      mapUrl: 'https://maps.google.com/?q=Palladium+Mall+Velachery+Chennai',
      phone: '+91 98765 43210',
    },
    {
      name: 'Taiwan Maami (Moutan)',
      subtitle: 'T Nagar',
      address: 'New No. 29, Burkit Road, T Nagar',
      city: 'Chennai - 600017',
      video: '/videos/tnagar-outlet.mp4',
      mapUrl: 'https://maps.google.com/?q=29+Burkit+Road+TNagar+Chennai',
      phone: '+91 98765 43211',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section with Video Background */}
      <section className="relative overflow-hidden -mt-16 pt-16">
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            poster="/images/interior2.jpg"
          >
            <source src="/videos/hero-banner.mp4" type="video/mp4" />
            <img
              src="/images/interior2.jpg"
              alt="Taiwan Maami Interior"
              className="w-full h-full object-cover"
            />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/60" />
        </div>
        <div className="relative py-20 sm:py-32">
          <div className="container">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                Authentic Taiwanese
                <span className="block">Bubble Tea</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-8">
                Crafted with imported tapioca pearls from Taiwan. 
                Experience the true taste of premium bubble tea at Taiwan Maami.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/menu">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 w-full sm:w-auto">
                    Order Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                    <MapPin className="mr-2 w-5 h-5" />
                    Find Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-secondary/50">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Premium Quality</h3>
                <p className="text-sm text-muted-foreground">Imported ingredients from Taiwan</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Crafted Fresh</h3>
                <p className="text-sm text-muted-foreground">Made to order, every time</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Quick Delivery</h3>
                <p className="text-sm text-muted-foreground">Fast delivery across Chennai</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Our Menu - Video Category Cards */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Explore Our Menu</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From authentic bubble tea to delicious mochis and Asian street food, 
              discover our carefully curated selection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {menuCategories.map((category, index) => (
              <Link key={index} href={category.href}>
                <Card className="group cursor-pointer overflow-hidden hover:shadow-2xl transition-all duration-300 relative aspect-[16/9]">
                  {/* Video Background */}
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  >
                    <source src={category.video} type="video/mp4" />
                  </video>
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="font-bold text-white text-2xl mb-2 group-hover:text-primary-foreground transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-white/80 text-sm mb-4">
                      {category.description}
                    </p>
                    <div className="flex items-center text-white/90 text-sm font-medium group-hover:text-white transition-colors">
                      <span>Explore</span>
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/menu">
              <Button size="lg">
                View Full Menu
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Visit Our Outlets - Location Video Cards */}
      <section className="py-16 bg-secondary/30">
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
                {/* Video Background */}
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  poster="/images/shopfront.jpg"
                >
                  <source src={location.video} type="video/mp4" />
                </video>
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                
                {/* Content */}
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

      {/* CTA Section */}
      <section className="py-16">
        <div className="container">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0">
              <img
                src="/images/popping-boba.jpg"
                alt="Popping Boba"
                className="w-full h-full object-cover opacity-20"
              />
              <div className="absolute inset-0 gradient-primary opacity-90" />
            </div>
            <div className="relative p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Ready to Order?
              </h2>
              <p className="text-white/90 mb-6 max-w-xl mx-auto">
                Order online for delivery or pickup, or visit our outlets for the full Taiwan Maami experience.
              </p>
              <Link href="/menu">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                  Start Your Order
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="Taiwan Maami" className="h-10 w-auto" />
                <h3 className="font-bold text-lg">Taiwan Maami</h3>
                <span className="text-background/50">×</span>
                <img src="/images/moutan-logo.png" alt="Moutan" className="h-8 w-auto invert" />
                <span className="font-bold text-lg">Moutan</span>
              </div>
              <p className="text-sm text-background/70 mb-4">
                Authentic Taiwanese bubble tea and Asian cuisine in Chennai.
              </p>
              <a 
                href="https://instagram.com/taiwan_maami" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-background/70 hover:text-background transition-colors"
              >
                <Instagram className="w-5 h-5" />
                @taiwan_maami
              </a>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="/menu" className="hover:text-background">Menu</Link></li>
                <li><Link href="/about" className="hover:text-background">About Us</Link></li>
                <li><Link href="/locations" className="hover:text-background">Locations</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li><Link href="/terms" className="hover:text-background">Terms & Conditions</Link></li>
                <li><Link href="/privacy" className="hover:text-background">Privacy Policy</Link></li>
                <li><Link href="/refund" className="hover:text-background">Refund Policy</Link></li>
                <li><Link href="/shipping" className="hover:text-background">Shipping Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Hours</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li>Mon - Sun: 11am - 10pm</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/20 mt-8 pt-8 text-center text-sm text-background/50">
            <p>© {new Date().getFullYear()} Taiwan Maami. All rights reserved.</p>
            <p className="mt-1">A unit of Thamarai Foods and Trading Private Limited</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
