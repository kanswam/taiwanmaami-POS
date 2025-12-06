import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { trpc } from '@/lib/trpc';
import { ArrowRight, MapPin, Clock, Star, Sparkles, Instagram, Play } from 'lucide-react';

export default function Home() {
  const { data: categories } = trpc.menu.getCategories.useQuery();
  const { data: stores } = trpc.stores.getAll.useQuery();
  const { data: featuredVideos } = trpc.admin.getFeaturedVideos.useQuery();
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);
  const [, navigate] = useLocation();

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
      <section className="relative overflow-hidden">
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

      {/* Featured Videos Carousel */}
      {featuredVideos && featuredVideos.length > 0 && (
        <section className="py-16 bg-gradient-to-b from-background to-secondary/20">
          <div className="container">
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Play className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold">Watch Our Creations</h2>
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                See how we craft our signature drinks and dishes with premium ingredients.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredVideos.map((video) => (
                <div key={video.id} className="group relative">
                  <div className="aspect-video rounded-2xl overflow-hidden shadow-lg bg-secondary">
                    <video
                      src={video.videoUrl || ''}
                      poster={video.videoThumbnail || video.imageUrl || ''}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => {
                        const vid = e.target as HTMLVideoElement;
                        vid.pause();
                        vid.currentTime = 0;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-semibold text-lg mb-2">{video.name}</h3>
                      {video.deliveryPrice && (
                        <p className="text-white/80 text-sm mb-3">₹{video.deliveryPrice}</p>
                      )}
                      <Button
                        size="sm"
                        className="bg-white text-primary hover:bg-white/90"
                        onClick={() => navigate(`/menu?product=${video.slug}`)}
                      >
                        Order Now
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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

      {/* Instagram Feed Section */}
      <section className="py-16 bg-gradient-to-b from-secondary/20 to-background">
        <div className="container">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Instagram className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-bold">Follow Us on Instagram</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Stay updated with our latest creations, behind-the-scenes moments, and special offers.
            </p>
            <a
              href="https://www.instagram.com/taiwan_maami/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold"
            >
              <Instagram className="w-5 h-5" />
              @taiwan_maami
            </a>
          </div>

          {/* Instagram Embed Widget */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl shadow-lg p-6 border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Instagram-style placeholder cards that link to Instagram */}
                {[1, 2, 3, 4].map((i) => (
                  <a
                    key={i}
                    href="https://www.instagram.com/taiwan_maami/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square rounded-xl overflow-hidden bg-secondary"
                  >
                    <img
                      src={`/images/${['caramel-milk-tea', 'mango-mochi', 'hazelnut-milk-tea', 'dragon-speck-mochi'][i-1]}.jpg`}
                      alt="Instagram post"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Instagram className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                ))}
              </div>
              <div className="text-center mt-6">
                <a
                  href="https://www.instagram.com/taiwan_maami/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="gap-2">
                    <Instagram className="w-4 h-4" />
                    View More on Instagram
                  </Button>
                </a>
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
      <Footer />
    </div>
  );
}
