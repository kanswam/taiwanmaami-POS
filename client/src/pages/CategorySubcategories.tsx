import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft, ChevronRight } from 'lucide-react';

// Define the category structure with subcategories
const categoryData: Record<string, {
  title: string;
  description: string;
  video: string;
  subcategories: Array<{
    name: string;
    slug: string;
    description: string;
    image: string;
  }>;
}> = {
  'bubble-tea-coffee': {
    title: 'Bubble Tea / Coffee',
    description: 'Authentic Taiwanese bubble tea & premium coffee',
    video: '/videos/bubble-tea-coffee.mp4',
    subcategories: [
      {
        name: 'Black Tea',
        slug: 'organic-black-tea',
        description: 'Classic organic black tea blends',
        image: '/images/subcategories/black-tea.jpg',
      },
      {
        name: 'Oolong Tea',
        slug: 'organic-oolong-tea',
        description: 'Premium oolong tea varieties',
        image: '/images/subcategories/oolong-tea.jpg',
      },
      {
        name: 'Green Tea',
        slug: 'organic-green-tea',
        description: 'Refreshing organic green tea',
        image: '/images/subcategories/green-tea.jpg',
      },
      {
        name: 'Matcha',
        slug: 'matcha-blend',
        description: 'Rich Japanese matcha blends',
        image: '/images/subcategories/matcha.jpg',
      },
      {
        name: 'Taro',
        slug: 'taro-blend',
        description: 'Creamy taro latte drinks',
        image: '/images/subcategories/taro.jpg',
      },
      {
        name: 'Slush',
        slug: 'fruit-slush',
        description: 'Icy fruit slush drinks',
        image: '/images/subcategories/slush.jpg',
      },
      {
        name: 'Coffee',
        slug: 'iced-coffee',
        description: 'Premium iced coffee drinks',
        image: '/images/subcategories/iced-coffee.jpg',
      },
    ],
  },
  'hot-beverages': {
    title: 'Hot Beverages',
    description: 'Warm & comforting traditional drinks',
    video: '/videos/hot-beverages.mp4',
    subcategories: [
      {
        name: 'Coffee',
        slug: 'hot-coffee',
        description: 'Freshly brewed hot coffee',
        image: '/images/subcategories/hot-coffee.jpg',
      },
      {
        name: 'Hot Cocoa',
        slug: 'hot-cocoa',
        description: 'Rich and creamy hot chocolate',
        image: '/images/subcategories/hot-cocoa.jpg',
      },
      {
        name: 'Tea',
        slug: 'tea-in-pot',
        description: 'Traditional tea served in pot',
        image: '/images/subcategories/tea-pot.jpg',
      },
    ],
  },
  'asian-food': {
    title: 'Asian Rice-Noodles-Bread',
    description: 'Savory Asian street food favorites',
    video: '/videos/asian-food.mp4',
    subcategories: [
      {
        name: 'Rice',
        slug: 'rice',
        description: 'Delicious rice dishes',
        image: '/images/subcategories/rice.jpg',
      },
      {
        name: 'Noodles',
        slug: 'noodles',
        description: 'Authentic Asian noodles',
        image: '/images/subcategories/noodles.jpg',
      },
      {
        name: 'Flat Bread',
        slug: 'flat-bread',
        description: 'Crispy Cong You Bing',
        image: '/images/subcategories/flat-bread.jpg',
      },
      {
        name: 'Savoury Pillow Brioche',
        slug: 'pillow-brioche',
        description: 'Fluffy savory brioche',
        image: '/images/subcategories/pillow-brioche.jpg',
      },
    ],
  },
  'sweet-bites': {
    title: 'Asian Sweet Bites',
    description: 'Delicious mochis & desserts',
    video: '/videos/sweet-bites.mp4',
    subcategories: [
      {
        name: 'Mochi',
        slug: 'mochi',
        description: 'Soft Japanese mochi',
        image: '/images/subcategories/mochi.jpg',
      },
      {
        name: 'Boba Creme Caramel',
        slug: 'desserts',
        description: 'Creamy boba dessert',
        image: '/images/subcategories/boba-creme.jpg',
      },
      {
        name: 'Sweet Pillow Brioche',
        slug: 'sweet-pillow-brioche',
        description: 'Sweet fluffy brioche',
        image: '/images/subcategories/sweet-brioche.jpg',
      },
    ],
  },
};

// Placeholder images for subcategories (gradient backgrounds)
const placeholderColors: Record<string, string> = {
  'black-tea': 'from-amber-900 to-amber-700',
  'oolong-tea': 'from-yellow-700 to-yellow-500',
  'green-tea': 'from-green-700 to-green-500',
  'matcha': 'from-green-600 to-lime-400',
  'taro': 'from-purple-600 to-purple-400',
  'slush': 'from-blue-500 to-cyan-400',
  'iced-coffee': 'from-amber-800 to-amber-600',
  'hot-coffee': 'from-amber-900 to-amber-700',
  'hot-cocoa': 'from-amber-800 to-red-900',
  'tea-pot': 'from-orange-700 to-orange-500',
  'rice': 'from-yellow-100 to-yellow-300',
  'noodles': 'from-orange-400 to-red-500',
  'flat-bread': 'from-yellow-600 to-amber-500',
  'pillow-brioche': 'from-amber-400 to-yellow-300',
  'mochi': 'from-pink-400 to-rose-300',
  'desserts': 'from-amber-500 to-orange-400',
  'sweet-brioche': 'from-pink-300 to-rose-200',
};

export default function CategorySubcategories() {
  const params = useParams<{ category: string }>();
  const [, navigate] = useLocation();
  const categorySlug = params.category || '';
  
  const category = categoryData[categorySlug];
  
  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <p className="text-muted-foreground mb-6">The category you're looking for doesn't exist.</p>
          <Link href="/menu">
            <Button>Back to Menu</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with Video Background */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={category.video} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12">
          <button 
            onClick={() => navigate('/menu')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 w-fit"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Categories</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{category.title}</h1>
          <p className="text-white/80 text-lg">{category.description}</p>
        </div>
      </div>

      {/* Subcategory Cards Grid */}
      <div className="container py-8 md:py-12">
        <h2 className="text-xl font-semibold mb-6">Choose a Subcategory</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {category.subcategories.map((sub) => {
            const colorKey = sub.slug.replace('organic-', '').replace('-blend', '').replace('-in-pot', '-pot');
            const gradientClass = placeholderColors[colorKey] || 'from-gray-600 to-gray-400';
            
            return (
              <Link 
                key={sub.slug} 
                href={`/menu?category=${encodeURIComponent(category.title.split(' / ')[0])}&subcategory=${encodeURIComponent(sub.name)}`}
              >
                <Card className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  {/* Portrait Image Container */}
                  <div className={`aspect-[3/4] relative bg-gradient-to-br ${gradientClass}`}>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white/30 text-6xl font-bold">
                        {sub.name.charAt(0)}
                      </span>
                    </div>
                    {/* Overlay with name */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <h3 className="text-white font-semibold text-lg">{sub.name}</h3>
                      <p className="text-white/70 text-sm line-clamp-1">{sub.description}</p>
                    </div>
                  </div>
                  {/* Card Footer */}
                  <div className="p-3 flex items-center justify-between bg-card">
                    <span className="text-sm text-muted-foreground">View Products</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
