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
            <p className="text-sm">Last updated: January 2026</p>

            <p>
              This policy outlines the refund and cancellation terms for orders placed with 
              <strong> Taiwan Maami</strong>, operated by Thamarai Foods and Trading Private Limited.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Order Cancellation</h2>
              <div className="bg-secondary/50 p-4 rounded-lg border-l-4 border-primary">
                <p className="font-medium text-foreground">Important Notice:</p>
                <p>
                  Orders can only be cancelled before food preparation begins. Once preparation has started, 
                  orders cannot be cancelled or changed. This is because we prepare fresh food for each order 
                  and cannot reuse prepared items.
                </p>
              </div>
              <p className="mt-4">
                To request a cancellation, please contact us immediately at the store:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Palladium: +91 89259 14303</li>
                <li>T Nagar: +91 91505 70557</li>
                <li>Email: hello@taiwanmaami.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Delivery Service Area</h2>
              <div className="bg-primary/10 p-4 rounded-lg border-l-4 border-primary">
                <p className="font-medium text-foreground">Delivery Radius:</p>
                <p>
                  We deliver within a <strong>15 kilometer radius</strong> of our T Nagar location in Chennai. 
                  Orders placed from addresses outside this area cannot be fulfilled for delivery.
                </p>
              </div>
              <p className="mt-4">
                If your delivery address is outside our service area, you may:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Choose pickup from our T Nagar or Palladium location</li>
                <li>Dine in at either of our outlets</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Refund Eligibility</h2>
              <p>Refunds may be issued in the following circumstances:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Order cancelled before preparation begins (full refund)</li>
                <li>Wrong item delivered (replacement or full refund)</li>
                <li>Order not delivered within reasonable time (full refund)</li>
                <li>Quality issues with the product (full or partial refund)</li>
                <li>Payment charged but order not confirmed (full refund)</li>
                <li>Missing items from order (refund for missing items)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Non-Refundable Situations</h2>
              <p>Refunds will not be provided for:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Orders cancelled after preparation has begun</li>
                <li>Change of mind after order confirmation</li>
                <li>Incorrect address provided by customer</li>
                <li>Customer unavailable at delivery location after multiple attempts</li>
                <li>Taste preferences (unless there is a genuine quality issue)</li>
                <li>Orders placed outside delivery area that were accepted in error</li>
                <li>Delays due to factors beyond our control (traffic, weather, etc.)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. How to Request a Refund</h2>
              <p>To request a refund, please follow these steps:</p>
              <ol className="list-decimal pl-6 mt-2 space-y-2">
                <li>
                  <strong>Contact us within 24 hours</strong> of receiving your order (or when the issue occurred)
                </li>
                <li>
                  <strong>Submit a complaint</strong> through our website at{' '}
                  <Link href="/complaint" className="text-primary hover:underline">taiwanmaami.com/complaint</Link>{' '}
                  or email hello@taiwanmaami.com
                </li>
                <li>
                  <strong>Provide details:</strong> Order number, description of the issue, and photos if applicable
                </li>
                <li>
                  <strong>Wait for review:</strong> Our team will review your request within 2 business days
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Refund Options</h2>
              <p>
                Based on the nature of your complaint, we may offer:
              </p>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Full Refund</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Processed to the original payment method</li>
                <li>Credit/debit card refunds: 5-7 business days</li>
                <li>UPI refunds: 2-3 business days</li>
                <li>Net banking refunds: 5-7 business days</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Store Credit</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Credit added to your Taiwan Maami account</li>
                <li>Can be used on future orders</li>
                <li>No expiry date</li>
                <li>Automatically applied at checkout</li>
              </ul>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Replacement</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>For wrong or damaged items</li>
                <li>Subject to availability</li>
                <li>Delivered as soon as possible</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Partial Refunds</h2>
              <p>
                In some cases, partial refunds may be issued:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>If only part of the order was affected</li>
                <li>If the issue was partially due to customer error</li>
                <li>Delivery charges may not be refunded in certain cases</li>
                <li>Proportional refund for missing items from a larger order</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Dispute Resolution</h2>
              <p>
                If you are not satisfied with our resolution:
              </p>
              <ol className="list-decimal pl-6 mt-2 space-y-1">
                <li>Request escalation to management via email</li>
                <li>We will review your case within 5 business days</li>
                <li>Final decision will be communicated via email</li>
              </ol>
              <p className="mt-2">
                For unresolved disputes, you may contact the Consumer Disputes Redressal Forum 
                in Chennai as per the Consumer Protection Act, 2019.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Contact Us</h2>
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

          <div className="mt-12 pt-8 border-t flex gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">Terms and Conditions</Link>
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
