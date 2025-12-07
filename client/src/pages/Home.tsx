import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { trpc } from '@/lib/trpc';
import { ArrowRight, MapPin, Clock, Star, Sparkles } from 'lucide-react';

export default function Home() {
  const { data: categories } = trpc.menu.getCategories.useQuery();
  const { data: stores } = trpc.stores.getAll.useQuery();

  const categoryImages: Record<string, string> = {
    'bubble-tea': '/images/caramel-milk-tea.jpg',
    'coffee': '/images/hazelnut-milk-tea.jpg',
    'mochis': '/images/mango-mochi.jpg',
    'food': '/images/biang-biang-noodles.jpg',
    'slush': '/images/popping-boba.jpg',
  };

  // Featured products for showcase
  const featuredProducts = [
    { name: 'Caramel Milk Tea', image: '/images/caramel-milk-tea.jpg' },
    { name: 'Hazelnut Milk Tea', image: '/images/hazelnut-milk-tea.jpg' },
    { name: 'Biang Biang Noodles', image: '/images/biang-biang-noodles.jpg' },
    { name: 'Dragon Speck Mochi', image: '/images/dragon-speck-mochi.jpg' },
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
            {/* Fallback to image if video doesn't load */}
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

      {/* Featured Products Showcase */}
      <section className="py-16 bg-gradient-to-b from-background to-secondary/20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Signature Creations</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover our most loved drinks and dishes, crafted with passion and premium ingredients.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product, index) => (
              <div key={index} className="group relative overflow-hidden rounded-2xl aspect-[3/4] shadow-lg">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold text-lg">{product.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Explore Our Menu</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From authentic bubble tea to delicious mochis and Asian street food, 
              discover our carefully curated selection.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories?.map((category) => (
              <Link key={category.id} href={`/menu?category=${category.slug}`}>
                <Card className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all">
                  <div className="aspect-square relative bg-secondary">
                    <img
                      src={categoryImages[category.slug] || '/images/shopfront.jpg'}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/shopfront.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-semibold text-white text-lg">{category.name}</h3>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
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
                Authentic Taiwanese bubble tea crafted with premium imported ingredients.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <Link href="/menu" className="block text-background/70 hover:text-background">Menu</Link>
                <Link href="/about" className="block text-background/70 hover:text-background">About Us</Link>
                <Link href="/about" className="block text-background/70 hover:text-background">Locations</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Policies</h4>
              <div className="space-y-2 text-sm">
                <Link href="/terms" className="block text-background/70 hover:text-background">Terms & Conditions</Link>
                <Link href="/privacy" className="block text-background/70 hover:text-background">Privacy Policy</Link>
                <Link href="/refund" className="block text-background/70 hover:text-background">Refund Policy</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact & Follow Us</h4>
              <div className="space-y-2 text-sm text-background/70">
                <p>Chennai, Tamil Nadu, India</p>
                <a 
                  href="https://www.instagram.com/taiwan_maami/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-background transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                  <span>@taiwan_maami</span>
                </a>
                <p className="text-xs mt-3">Follow us for updates, new flavors & promotions!</p>
              </div>
            </div>
          </div>
          <div className="border-t border-background/20 mt-8 pt-8 text-center text-sm text-background/50">
            <p>© {new Date().getFullYear()} Thamarai Foods and Trading Private Limited. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
