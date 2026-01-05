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
            <p className="text-sm">Last updated: January 2026</p>

            <p>
              This Privacy Policy describes how <strong>Thamarai Foods and Trading Private Limited</strong> 
              ("Taiwan Maami", "we", "us", or "our") collects, uses, and protects your personal information 
              when you use our website (taiwanmaami.com) and services.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Information We Collect</h2>
              <p>
                When you use our website and services, we may collect the following information:
              </p>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Personal Information</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Name and contact information (phone number, email address)</li>
                <li>Delivery address and location data</li>
                <li>Order history and food preferences</li>
                <li>Account login credentials</li>
                <li>Feedback, reviews, and complaint information</li>
              </ul>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Payment Information</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Payment transactions are processed securely through Razorpay</li>
                <li>We do not store your credit/debit card details on our servers</li>
                <li>Transaction IDs and payment status are retained for order records</li>
              </ul>
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Technical Information</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Device type and browser information</li>
                <li>IP address and approximate location</li>
                <li>Website usage patterns and preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Process and deliver your orders accurately</li>
                <li>Communicate about your orders (confirmations, updates, delivery status)</li>
                <li>Provide customer support and resolve complaints</li>
                <li>Manage your loyalty rewards and store credits</li>
                <li>Improve our products, services, and website experience</li>
                <li>Send promotional offers and updates (with your consent)</li>
                <li>Prevent fraud and ensure security</li>
                <li>Comply with legal and regulatory obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Your Consent</h2>
              <p>
                By using our website and services, you consent to the collection, use, and storage of your 
                personal information as described in this Privacy Policy. When you create an account or place 
                an order, you acknowledge that:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Your personal contact data (name, phone, email, address) will be stored securely for order processing and customer service</li>
                <li><strong>We will not share your information with external third parties for marketing purposes</strong></li>
                <li>We may occasionally send you promotional offers, discounts, and updates about our products and services</li>
                <li>You can opt out of promotional communications at any time by contacting us</li>
              </ul>
              <p className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <strong>Our Promise:</strong> Your data is stored solely for our internal use to serve you better. 
                We will not spam you with excessive messages. Promotional communications will be occasional and relevant 
                to your interests as a valued customer.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Information Sharing</h2>
              <p>
                <strong>We do not sell your personal information.</strong> We may share your information with:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Delivery partners:</strong> Name, phone number, and address to fulfill delivery orders</li>
                <li><strong>Payment processors (Razorpay):</strong> For secure transaction processing</li>
                <li><strong>Cloud service providers:</strong> For secure data storage and website hosting</li>
                <li><strong>Analytics providers:</strong> To understand website usage (anonymized data)</li>
                <li><strong>Legal authorities:</strong> When required by law or to protect our rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures to protect your 
                personal information, including:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Encrypted data transmission (HTTPS/SSL)</li>
                <li>Secure database storage with access controls</li>
                <li>PCI-DSS compliant payment processing through Razorpay</li>
                <li>Regular security assessments and updates</li>
              </ul>
              <p className="mt-2">
                While we strive to protect your information, no method of transmission over the internet 
                is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Cookies and Tracking</h2>
              <p>
                Our website uses cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Remember your login status and preferences</li>
                <li>Maintain your shopping cart across sessions</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Improve website functionality and user experience</li>
              </ul>
              <p className="mt-2">
                You can control cookie settings through your browser. Disabling cookies may affect 
                some website features.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Provide our services and maintain your account</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Resolve disputes and enforce our agreements</li>
              </ul>
              <p className="mt-2">
                Order history and transaction records are retained for a minimum of 7 years as required 
                by Indian tax regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Your Rights</h2>
              <p>Under applicable data protection laws, you have the right to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Portability:</strong> Request your data in a portable format</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, please contact us at hello@taiwanmaami.com. We will respond 
                to your request within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Children's Privacy</h2>
              <p>
                Our services are not directed to children under 13 years of age. We do not knowingly 
                collect personal information from children. If you believe we have collected information 
                from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any 
                significant changes by posting the new policy on this page with an updated revision date.
                Your continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">11. Contact Us</h2>
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

          <div className="mt-12 pt-8 border-t flex gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">Terms and Conditions</Link>
            <Link href="/refund" className="text-primary hover:underline">Refund Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
