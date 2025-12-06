import { Header } from '@/components/Header';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 max-w-4xl">
        <Link href="/">
          <a className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
        </Link>

        <article className="prose prose-neutral max-w-none">
          <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
          <p className="text-muted-foreground mb-8"><strong>Last Updated:</strong> December 6, 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Overview</h2>
            <p>
              At Taiwan Maami, we strive to provide the highest quality Taiwanese bubble tea, mochi, and desserts. Customer satisfaction is our top priority. This Refund Policy outlines the circumstances under which refunds may be issued and the process for requesting them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Eligibility for Refunds</h2>
            <p className="mb-4">Refunds may be issued in the following situations:</p>

            <h3 className="text-lg font-medium mt-4 mb-2">2.1 Product Quality Issues</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Wrong Product:</strong> You received a product different from what you ordered</li>
              <li><strong>Wrong Quantity:</strong> You received an incorrect quantity of items</li>
              <li><strong>Poor Quality:</strong> The product does not meet our quality standards (spoiled, stale, or contaminated)</li>
              <li><strong>Spillage:</strong> The product was spilled or damaged during delivery</li>
              <li><strong>Missing Items:</strong> Items from your order are missing</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">2.2 Order Cancellation</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Before Preparation:</strong> Full refund if cancelled before order preparation begins</li>
              <li><strong>During Preparation:</strong> Partial refund may be issued at our discretion</li>
              <li><strong>After Dispatch:</strong> No refund available once the order has been dispatched for delivery</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Non-Refundable Situations</h2>
            <p className="mb-2">Refunds will NOT be issued for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Change of mind after order confirmation</li>
              <li>Incorrect address provided by the customer</li>
              <li>Customer unavailable at the time of delivery</li>
              <li>Orders not collected within the specified pickup time</li>
              <li>Products consumed or partially consumed</li>
              <li>Subjective taste preferences</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. How to Request a Refund</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Contact us within 24 hours of receiving your order</li>
              <li>Provide your order number and details of the issue</li>
              <li>Include photos of the product if applicable (for quality issues)</li>
              <li>Our team will review your request within 24-48 hours</li>
            </ol>
            <p className="mt-4">
              Contact us at: <strong>info@taiwanmaami.com</strong> or call <strong>+91 78450 53909</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Refund Processing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Approved refunds will be processed within <strong>5-7 business days</strong></li>
              <li>Refunds will be credited to the original payment method used for the order</li>
              <li>Bank processing times may vary; please allow additional time for the refund to appear in your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Replacements</h2>
            <p>
              In some cases, we may offer a replacement instead of a refund. This will be discussed with you during the refund request process.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Contact Us</h2>
            <p>For refund requests or questions about this policy, please contact us at:</p>
            <div className="mt-4 p-4 bg-secondary rounded-lg">
              <p className="font-semibold">Thamarai Foods and Trading Private Limited</p>
              <p>34/8 Singarar Street, Triplicane, Chennai - 600005</p>
              <p>Email: info@taiwanmaami.com</p>
              <p>Phone: +91 78450 53909</p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t flex gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link href="/shipping" className="text-primary hover:underline">Shipping Policy</Link>
          </div>
        </article>
      </main>
    </div>
  );
}
