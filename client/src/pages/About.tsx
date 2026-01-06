import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { MapPin, Clock, Phone, Instagram, ArrowRight, Facebook, Twitter, Youtube } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';


export default function About() {
  const { data: cmsContent, isLoading } = trpc.cms.getContent.useQuery({ key: 'about_us' });



  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-primary/10 to-secondary">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Story</h1>
            <p className="text-lg text-muted-foreground">
              Bringing authentic Taiwanese bubble tea culture to Chennai
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">About Taiwan Maami</h2>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full mt-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : cmsContent ? (
              <div 
                className="cms-content text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: cmsContent }}
              />
            ) : (
              <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
                <p>
                  Taiwan Maami is a flagship bubble tea brand under Thamarai Foods and Trading Private Limited. 
                  We opened our first outlet in Palladium Mall, Chennai in April 2024, and have been serving 
                  authentic premium bubble tea to our customers for over 20 months.
                </p>
                <p>
                  Our commitment to quality starts with our ingredients. We use imported Tapioca Pearls from Taiwan, 
                  ensuring that every sip delivers the authentic bubble tea experience that Taiwan is famous for. 
                  Each drink is crafted to perfection in our outlets by our trained staff.
                </p>
                <p>
                  In September 2025, we expanded with our second outlet in T Nagar, Chennai. This new location 
                  not only serves our beloved bubble tea but also features authentic Asian street food including 
                  Cong You Bing (Taiwanese scallion pancakes), Biang Biang Noodles, Yaki Onigiri, Omurice, and more.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <h2 className="text-2xl font-bold mb-8 text-center">What We Offer</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🧋</span>
              </div>
              <h3 className="font-semibold mb-2">Premium Bubble Tea</h3>
              <p className="text-sm text-muted-foreground">
                Authentic Taiwanese bubble tea with imported tapioca pearls in multiple flavors and sizes
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🍡</span>
              </div>
              <h3 className="font-semibold mb-2">Mochi Desserts</h3>
              <p className="text-sm text-muted-foreground">
                Fruit flavored and signature mochis including Rocher, Banoffee, and Dragon Fruit
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">☕</span>
              </div>
              <h3 className="font-semibold mb-2">Specialty Coffee</h3>
              <p className="text-sm text-muted-foreground">
                Iced and hot coffee options including Americano, Latte, Cappuccino, and Mocha
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🍜</span>
              </div>
              <h3 className="font-semibold mb-2">Asian Street Food</h3>
              <p className="text-sm text-muted-foreground">
                Authentic dishes like Cong You Bing, Biang Biang Noodles, and Yaki Onigiri
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="py-16" id="locations">
        <div className="container">
          <h2 className="text-2xl font-bold mb-8 text-center">Our Locations</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Palladium Mall</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    First Floor, Palladium Mall<br />
                    Velachery Main Road, Velachery<br />
                    Chennai - 600042
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-muted-foreground">10:00 AM - 10:00 PM (All days)</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-muted-foreground">+91 89259 14303</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">T Nagar (Moutan)</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    New No. 29, Burkit Road<br />
                    T Nagar<br />
                    Chennai - 600017
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-muted-foreground">12:00 PM - 12:00 AM (All days)</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-muted-foreground">+91 91505 70557</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-primary font-medium">
                  Now serving Asian Street Food!
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Media */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl font-bold mb-4">Follow Us</h2>
          <p className="mb-6 opacity-90">Stay updated with our latest offerings and promotions</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a 
              href="https://www.instagram.com/taiwan_maami/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-primary px-5 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              <Instagram className="w-5 h-5" />
              Instagram
            </a>
            <a 
              href="https://www.threads.net/@taiwan_maami" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-primary px-5 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.73 2.108-1.152 3.457-1.187 1.357-.035 2.56.269 3.476.765.034-.996-.04-1.872-.293-2.609l1.903-.576c.37 1.074.476 2.39.353 3.908.838.477 1.55 1.09 2.104 1.822.758 1.003 1.14 2.164 1.14 3.455 0 .655-.088 1.327-.264 2.005-.52 2.005-1.756 3.67-3.68 4.95-1.795 1.197-4.08 1.855-6.604 1.903zm1.07-8.852c-.095-.003-.189-.003-.283 0-1.17.03-2.099.313-2.688.817-.477.408-.67.882-.645 1.334.028.506.282.932.716 1.2.53.327 1.261.468 2.06.396 1.063-.06 1.876-.453 2.416-1.168.417-.552.678-1.292.782-2.202-.71-.262-1.53-.396-2.358-.377z"/>
              </svg>
              Threads
            </a>
            <a 
              href="https://www.facebook.com/Taiwanmaami" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-primary px-5 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              <Facebook className="w-5 h-5" />
              Facebook
            </a>
            <a 
              href="https://x.com/taiwanmaami" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-primary px-5 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              <Twitter className="w-5 h-5" />
              X
            </a>
            <a 
              href="https://youtube.com/@theresahucy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-primary px-5 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              <Youtube className="w-5 h-5" />
              YouTube
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Order?</h2>
          <p className="text-muted-foreground mb-6">
            Experience authentic Taiwanese bubble tea today
          </p>
          <Link href="/menu">
            <Button size="lg">
              View Our Menu
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Taiwan Maami. A brand of Thamarai Foods and Trading Private Limited.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link href="/refund" className="text-muted-foreground hover:text-foreground">Refund Policy</Link>
              <a 
                href="https://www.instagram.com/taiwan_maami/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
