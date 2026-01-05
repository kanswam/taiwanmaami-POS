import { Header } from '@/components/Header';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';

export default function FAQ() {
  const { data: content, isLoading } = trpc.cms.getContent.useQuery({ key: 'faq' });

  const defaultContent = `# Frequently Asked Questions

## What are your operating hours?
**Palladium Mall:** 10am - 10pm daily
**T Nagar (Moutan):** 12pm - 12am daily

## Do you offer delivery?
Yes! We deliver within a 15km radius of our outlets. Delivery charges are calculated based on distance.

## What payment methods do you accept?
We accept cash, all major credit/debit cards, UPI, and digital wallets.

## Are your drinks customizable?
Yes! You can customize sugar levels (0%, 25%, 50%, 75%, 100%) and ice levels for most drinks.

## Do you have vegetarian options?
Yes, most of our menu items are vegetarian. Please check individual item descriptions for details.

## How can I contact you?
Email us at hello@taiwanmaami.com or call our outlets directly.`;

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
                } else if (line.startsWith('**') && line.includes(':**')) {
                  const parts = line.split(':**');
                  return <p key={i} className="text-muted-foreground mb-2"><strong className="text-foreground">{parts[0].replace('**', '')}:</strong>{parts[1]?.replace('**', '')}</p>;
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
