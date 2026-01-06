import { Header } from '@/components/Header';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';

export default function Shipping() {
  const { data: cmsContent, isLoading } = trpc.cms.getContent.useQuery({ key: 'shipping_policy' });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Shipping & Delivery Policy</h1>
          
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-48 mt-8" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : cmsContent ? (
            <div 
              className="prose prose-lg max-w-none text-muted-foreground
                prose-headings:text-foreground prose-headings:font-semibold
                prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                prose-p:my-4 prose-ul:my-4 prose-ol:my-4 prose-li:my-1
                prose-strong:text-foreground
                prose-a:text-primary prose-a:hover:underline
                [&>h2]:border-b [&>h2]:border-border/50 [&>h2]:pb-2"
              dangerouslySetInnerHTML={{ __html: cmsContent }}
            />
          ) : (
            <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Delivery Areas</h2>
                <p>We currently deliver within a 15km radius of our outlets in Chennai:</p>
                <ul className="list-disc pl-6 mt-2">
                  <li><strong className="text-foreground">Palladium Mall, Velachery</strong></li>
                  <li><strong className="text-foreground">T Nagar</strong></li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Delivery Times</h2>
                <ul className="list-disc pl-6 mt-2">
                  <li><strong className="text-foreground">Standard Delivery:</strong> 30-45 minutes</li>
                  <li><strong className="text-foreground">Peak Hours:</strong> May take up to 60 minutes during busy periods</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Delivery Charges</h2>
                <ul className="list-disc pl-6 mt-2">
                  <li>Delivery charges are calculated based on distance from the nearest outlet</li>
                  <li>Minimum order value may apply for delivery orders</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Packaging</h2>
                <p>All items are carefully packaged to maintain freshness and quality during transit.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Contact</h2>
                <p>For any delivery-related queries, please contact us at hello@taiwanmaami.com</p>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
