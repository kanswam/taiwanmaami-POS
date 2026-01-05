import { Header } from '@/components/Header';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';

export default function Shipping() {
  const { data: content, isLoading } = trpc.cms.getContent.useQuery({ key: 'shipping_policy' });

  const defaultContent = `# Shipping & Delivery Policy

## Delivery Areas
We currently deliver within a 15km radius of our outlets in Chennai:
- **Palladium Mall, Velachery**
- **T Nagar**

## Delivery Times
- **Standard Delivery**: 30-45 minutes
- **Peak Hours**: May take up to 60 minutes during busy periods

## Delivery Charges
- Delivery charges are calculated based on distance from the nearest outlet
- Minimum order value may apply for delivery orders

## Packaging
All items are carefully packaged to maintain freshness and quality during transit.

## Contact
For any delivery-related queries, please contact us at hello@taiwanmaami.com`;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12">
        <div className="max-w-3xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="prose prose-lg max-w-none">
              {((content as any)?.value || defaultContent).split('\n').map((line: string, i: number) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i} className="text-3xl font-bold mb-6 text-foreground">{line.replace('# ', '')}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-xl font-semibold mt-8 mb-4 text-foreground">{line.replace('## ', '')}</h2>;
                } else if (line.startsWith('- ')) {
                  return <li key={i} className="ml-6 text-muted-foreground">{line.replace('- ', '')}</li>;
                } else if (line.trim()) {
                  return <p key={i} className="text-muted-foreground mb-4">{line}</p>;
                }
                return null;
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
