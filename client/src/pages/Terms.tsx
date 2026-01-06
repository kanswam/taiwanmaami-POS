import { Header } from '@/components/Header';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';

export default function Terms() {
  const { data: cmsContent, isLoading } = trpc.cms.getContent.useQuery({ key: 'terms_conditions' });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Terms and Conditions</h1>
          
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-48 mt-8" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : cmsContent ? (
            <div 
              className="prose prose-lg max-w-none text-muted-foreground
                prose-headings:text-foreground prose-headings:font-semibold
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                prose-p:my-4 prose-ul:my-4 prose-li:my-1
                prose-strong:text-foreground
                prose-a:text-primary prose-a:hover:underline"
              dangerouslySetInnerHTML={{ __html: cmsContent }}
            />
          ) : (
            <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
              <p className="text-sm">Last updated: January 2026</p>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Introduction</h2>
                <p>
                  Welcome to Taiwan Maami. These Terms and Conditions govern your use of our website 
                  (taiwanmaami.com) and services operated by <strong>Thamarai Foods and Trading Private Limited</strong> 
                  ("Company", "we", "us", or "our"), a company registered in India.
                </p>
                <p>
                  By accessing or using our website and services, you agree to be bound by these Terms. 
                  If you disagree with any part of these terms, you may not access our services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Our Locations & Operating Hours</h2>
                <div className="bg-secondary/50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="font-medium text-foreground">Palladium Mall, Velachery</p>
                    <p>First Floor, Palladium Mall, Velachery, Chennai - 600042</p>
                    <p>Hours: 10:00 AM - 10:00 PM (Daily)</p>
                    <p>Phone: +91 89259 14303</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">T Nagar</p>
                    <p>Chennai - 600017</p>
                    <p>Hours: 12:00 PM - 12:00 AM (Daily)</p>
                    <p>Phone: +91 91505 70557</p>
                  </div>
                  <p>Email: hello@taiwanmaami.com</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Contact Us</h2>
                <p>
                  If you have any questions about these Terms, please contact us:
                </p>
                <ul className="list-disc pl-6 mt-2">
                  <li>Email: hello@taiwanmaami.com</li>
                  <li>Phone: +91 89259 14303 (Palladium) / +91 91505 70557 (T Nagar)</li>
                  <li>Address: First Floor, Palladium Mall, Velachery, Chennai - 600042</li>
                </ul>
                <p className="mt-4 text-sm">
                  <strong>Registered Company:</strong> Thamarai Foods and Trading Private Limited
                </p>
              </section>
            </div>
          )}

          <div className="mt-12 pt-8 border-t flex gap-4 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link href="/refund" className="text-primary hover:underline">Refund Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
