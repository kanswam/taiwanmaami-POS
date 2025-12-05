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
    'bubble-tea': '/images/bubble-tea.jpg',
    'coffee': '/images/coffee.jpg',
    'mochis': '/images/mochi.jpg',
    'food': '/images/food.jpg',
    'slush': '/images/slush.jpg',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="gradient-primary py-20 sm:py-32">
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
                <Link href="/locations">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                    <MapPin className="mr-2 w-5 h-5" />
                    Find Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
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
                      src={categoryImages[category.slug] || '/placeholder.jpg'}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.jpg';
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

      {/* Locations */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Visit Us</h2>
            <p className="text-muted-foreground">Find a Taiwan Maami outlet near you</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {stores?.map((store) => (
              <Card key={store.id} className="p-6">
                <h3 className="font-semibold text-lg mb-2">{store.name}</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {store.address}, {store.area}, {store.city} - {store.pincode}
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
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container">
          <Card className="gradient-primary p-8 sm:p-12 text-center">
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
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Taiwan Maami</h3>
              <p className="text-sm text-background/70">
                Authentic Taiwanese bubble tea crafted with premium imported ingredients.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <Link href="/menu" className="block text-background/70 hover:text-background">Menu</Link>
                <Link href="/about" className="block text-background/70 hover:text-background">About Us</Link>
                <Link href="/locations" className="block text-background/70 hover:text-background">Locations</Link>
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
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-sm text-background/70">
                <p>Chennai, Tamil Nadu</p>
                <p>India</p>
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
