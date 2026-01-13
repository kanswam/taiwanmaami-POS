import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';

// Define the main categories with their videos and subcategories
const categories = [
  {
    slug: 'bubble-tea-coffee',
    title: 'Bubble Tea / Coffee',
    description: 'Authentic Taiwanese bubble tea & premium coffee',
    video: '/videos/bubble-tea-coffee.mp4',
    subcategories: ['Black Tea', 'Oolong Tea', 'Green Tea', 'Matcha', 'Taro', 'Slush', 'Coffee'],
  },
  {
    slug: 'hot-beverages',
    title: 'Hot Beverages',
    description: 'Warm & comforting traditional drinks',
    video: '/videos/hot-beverages.mp4',
    subcategories: ['Coffee', 'Hot Cocoa', 'Tea'],
  },
  {
    slug: 'asian-food',
    title: 'Asian Rice-Noodles-Bread',
    description: 'Savory Asian street food favorites',
    video: '/videos/asian-food.mp4',
    subcategories: ['Rice', 'Noodles', 'Flat Bread', 'Savoury Pillow Brioche'],
  },
  {
    slug: 'sweet-bites',
    title: 'Asian Sweet Bites',
    description: 'Delicious mochis & desserts',
    video: '/videos/sweet-bites.mp4',
    subcategories: ['Mochi', 'Boba Creme Caramel', 'Sweet Pillow Brioche'],
  },
];

export default function MenuCategories() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-primary/10 py-12">
        <div className="container text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Our Menu</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our carefully curated selection of authentic Taiwanese bubble tea, 
            Asian street food, and delicious desserts.
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="container py-8 md:py-12">
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {categories.map((category) => (
            <Link key={category.slug} href={`/category/${category.slug}`}>
              <Card className="group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300">
                {/* Video Background */}
                <div className="relative h-48 md:h-56 overflow-hidden">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  >
                    <source src={category.video} type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="text-2xl font-bold text-white mb-1">{category.title}</h2>
                    <p className="text-white/80 text-sm">{category.description}</p>
                  </div>
                </div>
                
                {/* Subcategories Preview */}
                <div className="p-4 bg-card">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {category.subcategories.slice(0, 4).map((sub) => (
                      <span 
                        key={sub} 
                        className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                      >
                        {sub}
                      </span>
                    ))}
                    {category.subcategories.length > 4 && (
                      <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                        +{category.subcategories.length - 4} more
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {category.subcategories.length} subcategories
                    </span>
                    <span className="flex items-center gap-1 text-primary group-hover:gap-2 transition-all">
                      Explore <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
