import { Header } from '@/components/Header';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { formatLegalContent } from '@/lib/textToHtml';

export default function Privacy() {
  const { data: cmsContent, isLoading } = trpc.cms.getContent.useQuery({ key: 'privacy_policy' });

  // Auto-format plain text content to HTML
  const formattedContent = useMemo(() => {
    if (!cmsContent) return '';
    return formatLegalContent(cmsContent);
  }, [cmsContent]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
          
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
          ) : formattedContent ? (
            <div 
              className="prose prose-lg max-w-none text-muted-foreground
                prose-headings:text-foreground prose-headings:font-semibold
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                prose-p:my-4 prose-ul:my-4 prose-li:my-1
                prose-strong:text-foreground
                prose-a:text-primary prose-a:hover:underline
                [&>h2]:border-b [&>h2]:border-border/50 [&>h2]:pb-2"
              dangerouslySetInnerHTML={{ __html: formattedContent }}
            />
          ) : (
            <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
              <p className="text-sm">Last updated: January 2026</p>

              <p>
                This Privacy Policy describes how <strong>Thamarai Foods and Trading Private Limited</strong> 
                ("Taiwan Maami", "we", "us", or "our") collects, uses, and protects your personal information 
                when you use our website (taiwanmaami.com) and services.
              </p>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Contact Us</h2>
                <p>
                  For any privacy-related questions, concerns, or to exercise your rights, please contact us:
                </p>
                <ul className="list-disc pl-6 mt-2">
                  <li>Email: hello@taiwanmaami.com</li>
                  <li>Phone: +91 89259 14303 (Palladium) / +91 91505 70557 (T Nagar)</li>
                  <li>Address: First Floor, Palladium Mall, Velachery, Chennai - 600042</li>
                </ul>
                <p className="mt-4 text-sm">
                  <strong>Data Controller:</strong> Thamarai Foods and Trading Private Limited
                </p>
              </section>
            </div>
          )}

          <div className="mt-12 pt-8 border-t flex gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">Terms and Conditions</Link>
            <Link href="/refund" className="text-primary hover:underline">Refund Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
