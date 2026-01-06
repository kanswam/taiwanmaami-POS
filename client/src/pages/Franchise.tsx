import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Franchise() {
  const { data: cmsContent, isLoading } = trpc.cms.getContent.useQuery({ key: 'franchise_opportunity' });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-primary/10 to-secondary">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Franchise Opportunity</h1>
            <p className="text-lg text-muted-foreground">
              Partner with Taiwan Maami and bring authentic bubble tea to your city
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <Card className="p-8">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-48 mt-8" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : cmsContent ? (
                <div 
                  className="cms-content text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: cmsContent }}
                />
              ) : (
                <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
                  <h2 className="text-2xl font-bold text-foreground">Join the Taiwan Maami Family</h2>
                  <p>
                    Taiwan Maami is expanding! We're looking for passionate entrepreneurs who share our 
                    vision of bringing authentic Taiwanese bubble tea culture to India.
                  </p>

                  <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Why Partner With Us?</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong className="text-foreground">Proven Business Model:</strong> Our outlets in Chennai have demonstrated strong customer loyalty and consistent growth</li>
                    <li><strong className="text-foreground">Premium Brand:</strong> Taiwan Maami is known for quality, using imported Taiwanese tapioca pearls</li>
                    <li><strong className="text-foreground">Comprehensive Training:</strong> Full training program for you and your staff</li>
                    <li><strong className="text-foreground">Marketing Support:</strong> National and local marketing campaigns to drive traffic</li>
                    <li><strong className="text-foreground">Ongoing Support:</strong> Dedicated franchise support team to help you succeed</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Requirements</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Passion for the F&B industry</li>
                    <li>Commitment to quality and customer service</li>
                    <li>Minimum investment capability</li>
                    <li>Prime retail location (300-500 sq ft)</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Next Steps</h3>
                  <p>
                    If you're interested in becoming a Taiwan Maami franchise partner, please contact us 
                    to learn more about this exciting opportunity.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl font-bold mb-4">Interested in Franchising?</h2>
          <p className="mb-6 opacity-90">Contact us to learn more about franchise opportunities</p>
          <a 
            href="mailto:hello@taiwanmaami.com?subject=Franchise%20Inquiry"
            className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            <Mail className="w-5 h-5" />
            hello@taiwanmaami.com
          </a>
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
