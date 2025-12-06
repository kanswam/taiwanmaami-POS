import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
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
          <h1 className="text-3xl font-bold mb-2">Terms & Conditions</h1>
          <p className="text-muted-foreground mb-8"><strong>Last Updated:</strong> December 6, 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By placing an order with Thamarai Foods & Taiwan Maami ("we", "us", or "our"), you agree to be bound by these Terms and Conditions. Please read them carefully before placing your order.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Self-Pickup Orders</h2>
            <p className="font-semibold mb-2">All orders are self-pickup only.</p>
            <p className="mb-4">By placing an order, you acknowledge and agree that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>It is your sole responsibility to collect your order from our outlet at Palladium Mall, Velachery, Chennai.</li>
              <li>You must collect your order within the specified timeframe communicated to you.</li>
              <li>We are not responsible for arranging pickup or delivery services on your behalf.</li>
              <li>Uncollected orders after 24 hours may be cancelled without refund.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Payment Terms</h2>
            <p className="font-semibold mb-2">Prepayment is mandatory for all orders.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All payments must be made online through our secure payment gateway (Razorpay) before order confirmation.</li>
              <li>We accept UPI, credit cards, debit cards, and net banking.</li>
              <li>Orders will only be processed after successful payment verification.</li>
              <li>All prices displayed are inclusive of 5% GST (2.5% CGST + 2.5% SGST) as per Indian tax laws.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Order Cancellation & Refunds</h2>
            <p className="font-semibold mb-2">Cancellation Policy:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Orders can be cancelled only before food preparation begins.</li>
              <li>After food preparation starts, orders cannot be cancelled or changed.</li>
              <li>Refunds for cancelled orders will be processed within 5-7 business days to the original payment method.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Product Quality</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All products are freshly prepared upon order.</li>
              <li>We use high-quality ingredients imported from Taiwan.</li>
              <li>Product images are for illustration purposes; actual products may vary slightly.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Allergen Information</h2>
            <p>
              Our products may contain allergens including but not limited to milk, eggs, nuts, soy, and gluten. Please inform our staff of any allergies before ordering. We cannot guarantee a completely allergen-free environment.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Thamarai Foods and Trading Private Limited shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our services or products.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Governing Law</h2>
            <p>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting on our website. Your continued use of our services constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Contact Us</h2>
            <p>For questions about these Terms and Conditions, please contact us at:</p>
            <div className="mt-4 p-4 bg-secondary rounded-lg">
              <p className="font-semibold">Thamarai Foods and Trading Private Limited</p>
              <p>34/8 Singarar Street, Triplicane, Chennai - 600005</p>
              <p>Email: info@taiwanmaami.com</p>
              <p>GSTIN: 33AAKCT4782H1Z1</p>
              <p>CIN: U47219TN2023PTC164226</p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t flex gap-4 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link href="/refund" className="text-primary hover:underline">Refund Policy</Link>
            <Link href="/shipping" className="text-primary hover:underline">Shipping Policy</Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
