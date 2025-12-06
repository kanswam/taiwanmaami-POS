import { Header } from '@/components/Header';
import { Link } from 'wouter';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm">Last updated: December 2025</p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Information We Collect</h2>
              <p>
                When you use our website and services, we may collect the following information:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Name and contact information (phone number, email address)</li>
                <li>Delivery address</li>
                <li>Order history and preferences</li>
                <li>Payment information (processed securely through Razorpay)</li>
                <li>Device and browser information for website functionality</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Process and deliver your orders</li>
                <li>Communicate about your orders and our services</li>
                <li>Improve our products and services</li>
                <li>Send promotional offers (with your consent)</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Information Sharing</h2>
              <p>
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Delivery partners (to fulfill your orders)</li>
                <li>Payment processors (Razorpay) for secure transactions</li>
                <li>Service providers who assist our operations</li>
                <li>Legal authorities when required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information. 
                Payment transactions are processed through Razorpay's secure payment gateway, 
                which is PCI-DSS compliant.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Cookies</h2>
              <p>
                Our website uses cookies to enhance your browsing experience and remember your 
                preferences. You can control cookie settings through your browser.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, please contact us using the details below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any 
                significant changes by posting the new policy on this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Contact Us</h2>
              <p>
                For any privacy-related questions or concerns, please contact us:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Email: privacy@taiwanmaami.com</li>
                <li>Phone: +91 98765 43210</li>
                <li>Address: Palladium Mall, Velachery, Chennai - 600042</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t flex gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">Terms and Conditions</Link>
            <Link href="/refund" className="text-primary hover:underline">Refund Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
