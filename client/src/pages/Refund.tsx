import { Header } from '@/components/Header';
import { Link } from 'wouter';

export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Refund and Cancellation Policy</h1>
          
          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm">Last updated: December 2025</p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Order Cancellation</h2>
              <div className="bg-secondary/50 p-4 rounded-lg border-l-4 border-primary">
                <p className="font-medium text-foreground">Important Notice:</p>
                <p>
                  Orders can only be cancelled before food preparation begins. Once preparation has started, 
                  orders cannot be cancelled or changed.
                </p>
              </div>
              <p className="mt-4">
                To request a cancellation, please contact us immediately at the store. We will process 
                your cancellation request only if the preparation has not yet begun.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Refund Eligibility</h2>
              <p>Refunds may be issued in the following circumstances:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Order cancelled before preparation begins</li>
                <li>Wrong item delivered (different from what was ordered)</li>
                <li>Order not delivered within reasonable time</li>
                <li>Quality issues with the product</li>
                <li>Payment charged but order not confirmed</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Non-Refundable Situations</h2>
              <p>Refunds will not be provided for:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Orders cancelled after preparation has begun</li>
                <li>Change of mind after order confirmation</li>
                <li>Incorrect address provided by customer</li>
                <li>Customer unavailable at delivery location</li>
                <li>Taste preferences (unless there is a quality issue)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. How to Request a Refund</h2>
              <p>To request a refund:</p>
              <ol className="list-decimal pl-6 mt-2 space-y-1">
                <li>Contact us within 24 hours of your order</li>
                <li>Provide your order number and details of the issue</li>
                <li>Include photos if applicable (e.g., wrong item, quality issue)</li>
                <li>Our team will review your request within 2 business days</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Refund Process</h2>
              <p>
                Once your refund is approved:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Refunds will be processed to the original payment method</li>
                <li>Credit/debit card refunds may take 5-7 business days to reflect</li>
                <li>UPI refunds are typically processed within 2-3 business days</li>
                <li>You will receive a confirmation email once the refund is initiated</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Partial Refunds</h2>
              <p>
                In some cases, partial refunds may be issued:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>If only part of the order was affected</li>
                <li>If the issue was partially due to customer error</li>
                <li>Delivery charges may not be refunded in certain cases</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Contact Us</h2>
              <p>
                For refund requests or questions about this policy:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Email: hello@taiwanmaami.com</li>
                <li>Phone: +91 89259 14303 (Palladium) / +91 91505 70557 (T Nagar)</li>
                <li>Store: Visit us at Palladium Mall or T Nagar outlet</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t flex gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">Terms and Conditions</Link>
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
