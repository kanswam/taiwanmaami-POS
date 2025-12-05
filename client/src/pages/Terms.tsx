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
            <p className="text-sm">Last updated: December 2025</p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Introduction</h2>
              <p>
                Welcome to Taiwan Maami. These Terms and Conditions govern your use of our website 
                and services operated by Thamarai Foods and Trading Private Limited ("Company", "we", "us", or "our").
              </p>
              <p>
                By accessing or using our website and services, you agree to be bound by these Terms. 
                If you disagree with any part of these terms, you may not access our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Orders and Payments</h2>
              <p>
                When you place an order through our website, you agree to provide accurate and complete 
                information. All prices displayed include applicable GST (5% - comprising 2.5% State GST 
                and 2.5% Central GST).
              </p>
              <p>
                We accept payments through Razorpay payment gateway. By making a payment, you agree to 
                Razorpay's terms of service in addition to ours.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Order Cancellation Policy</h2>
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
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Delivery</h2>
              <p>
                We offer delivery services within Chennai. Delivery times are estimates and may vary 
                based on traffic, weather, and order volume. We are not responsible for delays caused 
                by factors beyond our control.
              </p>
              <p>
                Please ensure someone is available to receive the order at the delivery address. 
                If delivery cannot be completed due to customer unavailability, additional charges may apply.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Product Information</h2>
              <p>
                We make every effort to display accurate product information, including ingredients and 
                allergen information. However, please inform our staff of any allergies before ordering.
              </p>
              <p>
                Product images are for illustration purposes and actual products may vary slightly in appearance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Intellectual Property</h2>
              <p>
                All content on this website, including logos, images, text, and design, is the property 
                of Thamarai Foods and Trading Private Limited and is protected by intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages arising from your use of our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India. 
                Any disputes shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>Email: support@taiwanmaami.com</li>
                <li>Phone: +91 98765 43210</li>
                <li>Address: Palladium Mall, Velachery, Chennai - 600042</li>
              </ul>
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
