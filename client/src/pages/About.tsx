import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { MapPin, Clock, Phone, Instagram, ArrowRight } from 'lucide-react';

export default function About() {
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
                    Palladium Mall, 4th Floor, Food Court<br />
                    Velachery Main Road, Velachery<br />
                    Chennai - 600042
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-muted-foreground">11:00 AM - 10:00 PM (All days)</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-muted-foreground">+91 98765 43210</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">T Nagar</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    Ground Floor, Shop No. 5<br />
                    Usman Road, T Nagar<br />
                    Chennai - 600017
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-muted-foreground">11:00 AM - 10:00 PM (All days)</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-muted-foreground">+91 98765 43211</p>
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
          <a 
            href="https://www.instagram.com/taiwan_maami/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            <Instagram className="w-5 h-5" />
            @taiwan_maami
          </a>
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
              © 2025 Taiwan Maami. A brand of Thamarai Foods and Trading Private Limited.
            </p>
            <div className="flex gap-4 text-sm">
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link href="/refund" className="text-muted-foreground hover:text-foreground">Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
