import { Header } from '@/components/Header';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { formatLegalContent } from '@/lib/textToHtml';

export default function FAQ() {
  const { data: cmsContent, isLoading } = trpc.cms.getContent.useQuery({ key: 'faq' });

  // Auto-format plain text content to HTML
  const formattedContent = useMemo(() => {
    if (!cmsContent) return '';
    return formatLegalContent(cmsContent);
  }, [cmsContent]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Frequently Asked Questions</h1>
          
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-64 mt-8" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : formattedContent ? (
            <div 
              className="prose prose-lg max-w-none text-muted-foreground
                prose-headings:text-foreground prose-headings:font-semibold
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                prose-p:my-4 prose-ul:my-4 prose-ol:my-4 prose-li:my-1
                prose-strong:text-foreground
                prose-a:text-primary prose-a:hover:underline
                [&>h3]:border-l-4 [&>h3]:border-primary [&>h3]:pl-4"
              dangerouslySetInnerHTML={{ __html: formattedContent }}
            />
          ) : (
            <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">What are your operating hours?</h2>
                <p><strong className="text-foreground">Palladium Mall:</strong> 10am - 10pm daily</p>
                <p><strong className="text-foreground">T Nagar (Moutan):</strong> 12pm - 12am daily</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Do you offer delivery?</h2>
                <p>Yes! We deliver within a 15km radius of our outlets. Delivery charges are calculated based on distance.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">What payment methods do you accept?</h2>
                <p>We accept cash, all major credit/debit cards, UPI, and digital wallets.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Are your drinks customizable?</h2>
                <p>Yes! You can customize sugar levels (0%, 25%, 50%, 75%, 100%) and ice levels for most drinks.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Do you have vegetarian options?</h2>
                <p>Yes, most of our menu items are vegetarian. Please check individual item descriptions for details.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">How can I contact you?</h2>
                <p>Email us at hello@taiwanmaami.com or call our outlets directly.</p>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
