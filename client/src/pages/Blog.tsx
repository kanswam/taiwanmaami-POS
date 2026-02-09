import { Link } from 'wouter';
import { Calendar, Clock, ArrowRight, Eye } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';

export default function Blog() {
  // @ts-ignore - blog router types will be available after full rebuild
  const { data, isLoading } = (trpc as any).blog.getPublished.useQuery({ limit: 20 });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Blog - Bubble Tea Stories & Asian Food Culture"
        description="Read Taiwan Maami's blog for stories about bubble tea culture, Asian food traditions, recipes, and the latest from our Chennai cafes."
        keywords="Taiwan Maami blog, bubble tea blog, Asian food culture, Taiwanese food stories, boba tea articles"
        canonicalPath="/blog"
      />
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16">
        <div className="container">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Taiwan Maami Blog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Discover the world of bubble tea - from brewing techniques to flavor guides, 
            and everything in between. Your guide to authentic Taiwanese boba in Chennai.
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12 flex-1">
        <div className="container">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-video w-full rounded-lg" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : data?.articles && data.articles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.articles.map((article: any) => (
                <Link key={article.id} href={`/blog/${article.slug}`}>
                  <article className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-border h-full flex flex-col">
                    {/* Article Image */}
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
                      {article.imageUrl ? (
                        <img 
                          src={article.imageUrl} 
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl">🧋</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Article Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h2>
                      {article.excerpt && (
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-1">
                          {article.excerpt}
                        </p>
                      )}
                      
                      {/* Meta */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-border/50">
                        <div className="flex items-center gap-3">
                          {article.publishedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(article.publishedAt).toLocaleDateString('en-IN', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {article.viewCount}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-primary" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Coming Soon!
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                We're brewing up some exciting content about bubble tea, our recipes, 
                and the Taiwan Maami story. Check back soon!
              </p>
              <Link href="/menu">
                <button className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors">
                  Explore Our Menu
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-semibold mb-4">
              Your Guide to Authentic Bubble Tea in Chennai
            </h2>
            <p className="text-muted-foreground mb-6">
              At Taiwan Maami, we're passionate about bringing authentic Taiwanese bubble tea 
              culture to Chennai. Our blog covers everything from the history of boba to 
              tips on customizing your perfect drink. Whether you're a bubble tea newbie 
              or a seasoned boba lover, there's something here for everyone.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Bubble Tea Chennai', 'Boba Tea', 'Taiwan Milk Tea', 'Best Bubble Tea', 'Mochi Desserts', 'Taro Milk Tea'].map((tag) => (
                <span 
                  key={tag}
                  className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-primary/5">
        <div className="container text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Try Our Bubble Tea?</h2>
          <p className="text-muted-foreground mb-6">
            Order online and skip the queue. Earn loyalty stamps with every purchase!
          </p>
          <Link href="/menu">
            <button className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors">
              Order Now
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
