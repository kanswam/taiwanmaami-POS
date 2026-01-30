import { Link, useParams, useLocation } from 'wouter';
import { Calendar, Clock, ArrowLeft, Share2, Eye } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Fallback static content for SEO articles (before database articles are added)
const staticArticles: Record<string, {
  title: string;
  date: string;
  readTime: string;
  category: string;
  excerpt: string;
  content: string;
  keywords: string;
}> = {
  'what-is-bubble-tea': {
    title: 'What is Bubble Tea? A Complete Guide',
    date: '2026-01-30',
    readTime: '5 min read',
    category: 'Education',
    excerpt: 'Discover the origins of bubble tea, what makes it special, and why this Taiwanese drink has taken the world by storm.',
    keywords: 'bubble tea, boba tea, pearl milk tea, Taiwan, tapioca pearls',
    content: `
<h2>The Origins of Bubble Tea</h2>
<p>Bubble tea, also known as boba tea or pearl milk tea, originated in Taiwan in the 1980s. This delightful drink has since become a global phenomenon, loved by millions for its unique combination of tea, milk, and chewy tapioca pearls.</p>

<h2>What Makes Bubble Tea Special?</h2>
<p>At its core, bubble tea consists of three main components:</p>

<h3>1. The Tea Base</h3>
<p>The foundation of any good bubble tea is quality tea. At Taiwan Maami, we use premium tea leaves sourced directly from Taiwan. Our selection includes:</p>
<ul>
<li>Classic Black Tea (紅茶)</li>
<li>Refreshing Green Tea (綠茶)</li>
<li>Aromatic Oolong Tea (烏龍茶)</li>
</ul>

<h3>2. The Milk or Creamer</h3>
<p>Traditional bubble tea uses fresh milk or non-dairy creamers to create that signature creamy texture. We offer options for every preference, including oat milk for our vegan customers.</p>

<h3>3. The Pearls (Boba)</h3>
<p>The "bubbles" in bubble tea refer to the chewy tapioca pearls that sink to the bottom of your drink. Made from tapioca starch, these pearls are cooked to perfection - soft on the outside with a slight chew in the center.</p>

<h2>Popular Bubble Tea Varieties</h2>
<p><strong>Classic Taiwan Milk Tea</strong> - The original and most beloved flavor, featuring robust black tea with creamy milk and brown sugar pearls.</p>
<p><strong>Taro Milk Tea</strong> - A purple-hued delight made from taro root, offering a subtly sweet and nutty flavor.</p>
<p><strong>Matcha Latte</strong> - For green tea lovers, our matcha is whisked to perfection and paired with smooth milk.</p>
<p><strong>Fruit Teas</strong> - Refreshing options featuring real fruit and light tea bases, perfect for Chennai's warm weather.</p>

<h2>Why Chennai Loves Bubble Tea</h2>
<p>Chennai's food scene has always been adventurous, and bubble tea fits right in. The combination of refreshing tea, customizable sweetness levels, and fun toppings makes it perfect for beating the Chennai heat, catching up with friends, or enjoying a sweet treat after a meal.</p>

<h2>Visit Taiwan Maami</h2>
<p>Ready to try authentic Taiwanese bubble tea? Visit us at T Nagar or order online for delivery. We craft each drink with care, using recipes perfected over years of passion for boba.</p>
<p><em>Order online at taiwanmaami.com and earn loyalty stamps with every purchase!</em></p>
    `
  },
  'best-bubble-tea-flavors-chennai': {
    title: 'Best Bubble Tea Flavors to Try in Chennai',
    date: '2026-01-30',
    readTime: '4 min read',
    category: 'Recommendations',
    excerpt: 'From classic Taiwan Milk Tea to refreshing Fruit Teas, explore the must-try flavors at Taiwan Maami.',
    keywords: 'best bubble tea Chennai, boba flavors, Taiwan milk tea, taro milk tea, matcha',
    content: `
<h2>Your Guide to Taiwan Maami's Best Sellers</h2>
<p>Not sure what to order? Here's our guide to the most popular bubble tea flavors at Taiwan Maami, perfect for both boba beginners and seasoned enthusiasts.</p>

<h2>For First-Timers</h2>
<h3>Classic Taiwan Milk Tea (經典台式奶茶)</h3>
<p>If you're new to bubble tea, start here. This is the drink that started it all - rich black tea, creamy milk, and chewy brown sugar pearls. It's comforting, familiar, and absolutely delicious.</p>
<p><em>Pro tip: Start with 50% sugar if you're watching your intake - it's still plenty sweet!</em></p>

<h3>Caramel Milk Tea (焦糖奶茶)</h3>
<p>Love caramel? This one's for you. The buttery caramel notes complement the tea beautifully, creating a drink that tastes like a liquid dessert.</p>

<h2>For the Adventurous</h2>
<h3>Taro Milk Tea (芋頭奶茶)</h3>
<p>Don't let the purple color intimidate you! Taro has a subtle, nutty sweetness that's unlike anything else. It's creamy, comforting, and surprisingly addictive.</p>

<h3>Iced Hong Kong Style Yuen-Yeung</h3>
<p>A unique blend of coffee and tea - the best of both worlds. Perfect for those mornings when you can't decide between chai and coffee.</p>

<h2>For Health-Conscious Sippers</h2>
<h3>Matcha Latte (抹茶拿鐵)</h3>
<p>Our ceremonial-grade matcha is whisked fresh for each order. Rich in antioxidants and naturally energizing, it's the perfect guilt-free indulgence.</p>

<h3>Fruit Teas</h3>
<p>Skip the milk and go for our refreshing fruit teas. Made with real fruit and light tea bases, they're lower in calories but big on flavor.</p>

<h2>Customize Your Perfect Drink</h2>
<p>At Taiwan Maami, every drink is made to order. Customize your sugar level (0%, 25%, 50%, 75%, or 100%), ice level, and choose from various toppings including boba pearls, coconut jelly, and grass jelly.</p>

<h2>Order Online & Save</h2>
<p>Skip the queue by ordering on our website. Plus, earn loyalty stamps with every purchase - 10 stamps = 1 free drink!</p>
    `
  },
  'taiwan-maami-story': {
    title: 'Taiwan Maami - Our Story',
    date: '2026-01-30',
    readTime: '6 min read',
    category: 'About Us',
    excerpt: "How a passion for authentic Taiwanese bubble tea led to creating Chennai's favorite boba destination.",
    keywords: 'Taiwan Maami, bubble tea Chennai, boba shop Chennai, Taiwanese tea',
    content: `
<h2>From Taiwan to Chennai with Love</h2>
<p>Taiwan Maami isn't just a bubble tea shop - it's a dream that traveled across oceans to bring authentic Taiwanese flavors to Chennai.</p>

<h2>The Beginning</h2>
<p>Our founder, Theresa, first fell in love with bubble tea during her travels to Taiwan. Walking through the night markets of Taipei, she discovered a world of flavors that didn't exist back home in Chennai. The perfect balance of tea, milk, and those addictive chewy pearls - it was love at first sip.</p>
<p>But more than the drink itself, it was the culture around it that captivated her. In Taiwan, bubble tea shops are gathering places - where friends catch up, students study, and families bond over shared drinks. She wanted to bring that same warmth to Chennai.</p>

<h2>Why "Maami"?</h2>
<p>In Tamil, "Maami" (மாமி) is an affectionate term for an aunt - someone who welcomes you with warmth and always has something delicious to offer. It represents the hospitality and care we put into every drink we serve.</p>
<p>Taiwan + Maami = Taiwan Maami - where Taiwanese craftsmanship meets South Indian hospitality.</p>

<h2>Our Promise</h2>
<h3>Authentic Recipes</h3>
<p>Every recipe at Taiwan Maami is crafted to honor traditional Taiwanese bubble tea. We source our tea leaves from Taiwan, cook our pearls fresh daily, and never compromise on quality.</p>

<h3>Made with Love</h3>
<p>Each drink is prepared to order by our trained baristas. We take pride in the craft - from the perfect tea steep to the ideal pearl texture.</p>

<h3>Community First</h3>
<p>We believe bubble tea is meant to be shared. That's why we've created spaces where you can relax, work, or catch up with friends. Our T Nagar outlet is designed to be your second home.</p>

<h2>Our Journey</h2>
<ul>
<li><strong>2024</strong> - Taiwan Maami opens its first outlet at Palladium Mall, Velachery</li>
<li><strong>2025</strong> - We expand to T Nagar, bringing boba closer to more Chennai neighborhoods</li>
<li><strong>2026</strong> - Launching online ordering with delivery across Chennai</li>
</ul>

<h2>Join Our Family</h2>
<p>Whether you're a boba veteran or trying bubble tea for the first time, we welcome you to Taiwan Maami. Come for the drinks, stay for the experience.</p>
<p><em>10 stamps = 1 free drink. Start collecting today!</em></p>
    `
  }
};

export default function BlogArticle() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const slug = params.id || '';
  
  // Try to fetch from database first
  // @ts-ignore - blog router types will be available after full rebuild
  const { data: dbArticle, isLoading, error } = (trpc as any).blog.getBySlug.useQuery(
    { slug },
    { 
      enabled: !!slug,
      retry: false // Don't retry if not found - we'll use static fallback
    }
  );

  // Check for static fallback
  const staticArticle = staticArticles[slug];
  const article = dbArticle || (staticArticle ? {
    id: 0,
    title: staticArticle.title,
    slug,
    excerpt: staticArticle.excerpt,
    content: staticArticle.content,
    metaTitle: staticArticle.title,
    metaDescription: staticArticle.excerpt,
    keywords: staticArticle.keywords,
    imageUrl: null,
    authorName: 'Taiwan Maami',
    status: 'published' as const,
    publishedAt: new Date(staticArticle.date),
    viewCount: 0,
    createdAt: new Date(staticArticle.date),
    updatedAt: new Date(staticArticle.date),
  } : null);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          text: article?.excerpt || '',
          url,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  if (isLoading && !staticArticle) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="container max-w-3xl">
            <Skeleton className="h-8 w-32 mb-8" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-6 w-48 mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📝</div>
            <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
            <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
            <Link href="/blog">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Header */}
      <header className="bg-gradient-to-br from-primary/10 to-secondary/10 py-8">
        <div className="container max-w-3xl">
          <Link href="/blog">
            <Button variant="ghost" className="-ml-4 mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
          
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {article.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {article.authorName && (
              <span>By {article.authorName}</span>
            )}
            {article.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(article.publishedAt).toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </span>
            )}
            {dbArticle && (
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {article.viewCount} views
              </span>
            )}
            <button 
              onClick={handleShare}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>

          {article.excerpt && (
            <p className="mt-6 text-lg text-muted-foreground border-l-4 border-primary pl-4">
              {article.excerpt}
            </p>
          )}
        </div>
      </header>

      {/* Featured Image */}
      {article.imageUrl && (
        <div className="container max-w-3xl py-8">
          <img 
            src={article.imageUrl} 
            alt={article.title}
            className="w-full h-auto rounded-xl"
          />
        </div>
      )}

      {/* Article Content */}
      <article className="py-8 flex-1">
        <div className="container max-w-3xl">
          <div 
            className="prose prose-lg max-w-none
              prose-headings:text-foreground 
              prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
              prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-2
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground
              prose-ul:text-muted-foreground prose-ul:my-4
              prose-li:my-1
              prose-em:text-muted-foreground
              prose-blockquote:border-primary prose-blockquote:text-muted-foreground
            "
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </article>

      {/* Tags/Keywords */}
      {article.keywords && (
        <section className="py-8 border-t border-border">
          <div className="container max-w-3xl">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Related Topics</h3>
            <div className="flex flex-wrap gap-2">
              {article.keywords.split(',').map((keyword: string) => (
                <span 
                  key={keyword.trim()}
                  className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                >
                  {keyword.trim()}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-12 bg-primary/5">
        <div className="container text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Try Our Bubble Tea?</h2>
          <p className="text-muted-foreground mb-6">
            Order online and skip the queue. Earn loyalty stamps with every purchase!
          </p>
          <Link href="/menu">
            <Button className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold">
              Order Now
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
