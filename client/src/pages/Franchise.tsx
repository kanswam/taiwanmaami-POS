import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { ArrowRight, Mail } from 'lucide-react';

export default function Franchise() {
  // Fetch CMS content from database
  const { data: content } = trpc.cms.getContent.useQuery({ key: 'franchise_opportunity' });
  
  // Default content if not set in CMS
  const pageContent = ((content as any)?.value || '') || `
# Franchise Opportunity

## Join the Taiwan Maami Family

Taiwan Maami is expanding! We're looking for passionate entrepreneurs who share our vision of bringing authentic Taiwanese bubble tea culture to India.

### Why Partner With Us?

- **Proven Business Model**: Our outlets in Chennai have demonstrated strong customer loyalty and consistent growth
- **Premium Brand**: Taiwan Maami is known for quality, using imported Taiwanese tapioca pearls
- **Comprehensive Training**: Full training program for you and your staff
- **Marketing Support**: National and local marketing campaigns to drive traffic
- **Ongoing Support**: Dedicated franchise support team to help you succeed

### Investment Overview

Our franchise model is designed to be accessible while maintaining our high standards of quality and service.

### Requirements

- Passion for the F&B industry
- Commitment to quality and customer service
- Minimum investment capability
- Prime retail location (300-500 sq ft)

### Next Steps

If you're interested in becoming a Taiwan Maami franchise partner, please contact us to learn more about this exciting opportunity.
  `;

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
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: pageContent
                    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-8 mb-4">$1</h3>')
                    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
                    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-6">$1</h1>')
                    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
                    .replace(/\n\n/g, '</p><p class="mb-4">')
                    .replace(/^(?!<)/gm, '<p class="mb-4">')
                }}
              />
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
