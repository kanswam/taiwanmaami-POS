import { Header } from '@/components/Header';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';

export default function Refund() {
  const { data: cmsContent, isLoading } = trpc.cms.getContent.useQuery({ key: 'refund_policy' });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Refund and Cancellation Policy</h1>
          
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
              <p className="text-sm">Last updated: January 2026</p>

              <p>
                This policy outlines the refund and cancellation terms for orders placed with 
                <strong> Taiwan Maami</strong>, operated by Thamarai Foods and Trading Private Limited.
              </p>

              <section>
                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Contact Us</h2>
                <p>
                  For refund requests or questions about this policy:
                </p>
                <ul className="list-disc pl-6 mt-2">
                  <li>Email: hello@taiwanmaami.com</li>
                  <li>Phone: +91 89259 14303 (Palladium) / +91 91505 70557 (T Nagar)</li>
                  <li>Online: <Link href="/complaint" className="text-primary hover:underline">Submit a complaint</Link></li>
                  <li>In person: Visit us at Palladium Mall or T Nagar outlet</li>
                </ul>
                <p className="mt-4 text-sm">
                  <strong>Company:</strong> Thamarai Foods and Trading Private Limited
                </p>
              </section>
            </div>
          )}

          <div className="mt-12 pt-8 border-t flex gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">Terms and Conditions</Link>
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
