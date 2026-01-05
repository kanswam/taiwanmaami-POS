import { Header } from '@/components/Header';
import { Link } from 'wouter';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Terms and Conditions</h1>
          
          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm">Last updated: January 2026</p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Introduction</h2>
              <p>
                Welcome to Taiwan Maami. These Terms and Conditions govern your use of our website 
                (taiwanmaami.com) and services operated by <strong>Thamarai Foods and Trading Private Limited</strong> 
                ("Company", "we", "us", or "our"), a company registered in India.
              </p>
              <p>
                By accessing or using our website and services, you agree to be bound by these Terms. 
                If you disagree with any part of these terms, you may not access our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Our Locations & Operating Hours</h2>
              <div className="bg-secondary/50 p-4 rounded-lg space-y-3">
                <div>
                  <p className="font-medium text-foreground">Palladium Mall, Velachery</p>
                  <p>First Floor, Palladium Mall, Velachery, Chennai - 600042</p>
                  <p>Hours: 10:00 AM - 10:00 PM (Daily)</p>
                  <p>Phone: +91 89259 14303</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">T Nagar</p>
                  <p>Chennai - 600017</p>
                  <p>Hours: 12:00 PM - 12:00 AM (Daily)</p>
                  <p>Phone: +91 91505 70557</p>
                </div>
                <p>Email: hello@taiwanmaami.com</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Orders and Payments</h2>
              <p>
                When you place an order through our website, you agree to provide accurate and complete 
                information. All prices displayed are base prices. GST (5% - comprising 2.5% State GST 
                and 2.5% Central GST) is added at checkout as per Indian tax regulations.
              </p>
              <p>
                We accept payments through Razorpay payment gateway and cash payments for in-store orders. 
                By making an online payment, you agree to Razorpay's terms of service in addition to ours.
              </p>
              <p>
                <strong>Online Ordering Hours:</strong> Online orders can only be placed between 12:00 PM and 11:45 PM. 
                Orders placed outside these hours will not be accepted.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Delivery Policy</h2>
              <div className="bg-primary/10 p-4 rounded-lg border-l-4 border-primary">
                <p className="font-medium text-foreground">Delivery Service Area:</p>
                <p>
                  We currently offer delivery services within a <strong>15 kilometer radius</strong> of our 
                  T Nagar location in Chennai. Delivery is available from our T Nagar kitchen only.
                </p>
              </div>
              <p className="mt-4">
                Delivery times are estimates and may vary based on traffic, weather, and order volume. 
                We are not responsible for delays caused by factors beyond our control.
              </p>
              <p>
                Please ensure someone is available to receive the order at the delivery address. 
                If delivery cannot be completed due to customer unavailability after multiple attempts, 
                the order may be cancelled without refund.
              </p>
              <p>
                Delivery charges may apply based on distance and order value. These will be clearly 
                displayed at checkout before payment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Order Cancellation Policy</h2>
              <div className="bg-secondary/50 p-4 rounded-lg border-l-4 border-primary">
                <p className="font-medium text-foreground">Important:</p>
                <p>
                  Orders can only be cancelled before food preparation begins. Once preparation has started, 
                  orders cannot be cancelled or changed. This is because we prepare fresh food for each order 
                  and cannot reuse prepared items.
                </p>
              </div>
              <p className="mt-4">
                If you need to cancel an order, please contact us immediately at the store. Cancellation 
                requests will be processed only if the preparation has not yet begun.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Allergen Disclaimer</h2>
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border-l-4 border-amber-500">
                <p className="font-medium text-foreground">⚠️ Allergen Warning:</p>
                <p>
                  <strong>Our products may contain or come into contact with NUTS and other allergens.</strong> 
                  We use nuts (including but not limited to peanuts, cashews, almonds) in some of our products.
                </p>
                <p className="mt-2">
                  Due to the nature of our kitchen operations, we cannot guarantee that any product is 
                  completely free from allergens. Cross-contamination may occur.
                </p>
              </div>
              <p className="mt-4">
                If you have any food allergies or dietary restrictions, please:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Inform our staff before placing your order</li>
                <li>Check ingredient information carefully</li>
                <li>Ask about specific ingredients if unsure</li>
                <li>Consider the risk of cross-contamination</li>
              </ul>
              <p className="mt-2">
                We are not responsible for allergic reactions if customers fail to disclose their allergies 
                or ignore our allergen warnings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Product Information</h2>
              <p>
                We make every effort to display accurate product information, including ingredients and 
                pricing. However, product availability may vary by location.
              </p>
              <p>
                Product images are for illustration purposes and actual products may vary slightly in appearance.
                Prices are subject to change without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Customer Complaints</h2>
              <p>
                We value your feedback and take all complaints seriously. If you have any issues with 
                your order, please:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Contact us within 24 hours of receiving your order</li>
                <li>Provide your order number and details of the issue</li>
                <li>Include photos if applicable (for quality or delivery issues)</li>
              </ul>
              <p className="mt-2">
                You can submit complaints through our website at{' '}
                <Link href="/complaint" className="text-primary hover:underline">taiwanmaami.com/complaint</Link>{' '}
                or by emailing hello@taiwanmaami.com.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Intellectual Property</h2>
              <p>
                All content on this website, including logos, images, text, recipes, and design, is the property 
                of Thamarai Foods and Trading Private Limited and is protected by intellectual property laws.
                Unauthorized use, reproduction, or distribution is prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">10. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages arising from your use of our services.
              </p>
              <p>
                Our total liability for any claim arising from or related to our services shall not exceed 
                the amount paid by you for the specific order giving rise to the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">11. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Changes will be effective immediately 
                upon posting on our website. Your continued use of our services after any changes constitutes 
                acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">12. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India. 
                Any disputes shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">13. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Email: hello@taiwanmaami.com</li>
                <li>Phone: +91 89259 14303 (Palladium) / +91 91505 70557 (T Nagar)</li>
                <li>Address: First Floor, Palladium Mall, Velachery, Chennai - 600042</li>
              </ul>
              <p className="mt-4 text-sm">
                <strong>Registered Company:</strong> Thamarai Foods and Trading Private Limited
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t flex gap-4 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link href="/refund" className="text-primary hover:underline">Refund Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
