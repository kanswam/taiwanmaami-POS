import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { trpc } from '@/lib/trpc';
import { ArrowRight, MapPin, Clock, Star, Sparkles } from 'lucide-react';

export default function Home() {
  const { data: stores } = trpc.stores.getAll.useQuery();

  // Category cards with video backgrounds
  const menuCategories = [
    {
      name: 'Bubble Tea / Coffee',
      description: 'Authentic Taiwanese bubble tea & premium coffee',
      video: '/videos/bubble-tea-coffee.mp4',
      href: '/menu?category=bubble-tea',
    },
    {
      name: 'Hot Beverages',
      description: 'Warm & comforting traditional drinks',
      video: '/videos/hot-beverages.mp4',
      href: '/menu?category=coffee',
    },
    {
      name: 'Asian Rice-Noodles-Bread',
      description: 'Savory Asian street food favorites',
      video: '/videos/asian-food.mp4',
      href: '/menu?category=food',
    },
    {
      name: 'Asian Sweet Bites',
      description: 'Delicious mochis & desserts',
      video: '/videos/sweet-bites.mp4',
      href: '/menu?category=mochis',
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
            <source src="/videos/hero-video.mp4" type="video/mp4" />
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

      {/* Shopfront Image Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
              <h2 className="text-3xl font-bold mb-4">Visit Our Outlets</h2>
              <p className="text-muted-foreground mb-6">
                Experience the authentic Taiwan Maami atmosphere at our beautifully designed outlets. 
                Our T Nagar location features a cozy interior with traditional Taiwanese elements, 
                while serving both our signature bubble tea and delicious Asian street food.
              </p>
              <div className="space-y-4">
                {stores?.map((store) => (
                  <Card key={store.id} className="p-4">
                    <h3 className="font-semibold mb-2">{store.name}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {store.address}, {store.area}
                      </p>
                      {store.openingHours && (
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {store.openingHours}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="/images/shopfront.jpg"
                  alt="Taiwan Maami Shopfront"
                  className="w-full h-auto"
                />
              </div>
            </div>
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
              </div>
              <p className="text-sm text-background/70">
                Authentic Taiwanese bubble tea and Asian cuisine in Chennai.
              </p>
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
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li>+91 98765 43210</li>
                <li>hello@taiwanmaami.com</li>
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
            © {new Date().getFullYear()} Taiwan Maami. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
