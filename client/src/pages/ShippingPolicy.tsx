import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function ShippingPolicy() {
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
          <h1 className="text-3xl font-bold mb-2">Shipping & Delivery Policy</h1>
          <p className="text-muted-foreground mb-8"><strong>Last Updated:</strong> December 6, 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Overview</h2>
            <p>
              Taiwan Maami is committed to delivering fresh, high-quality Taiwanese bubble tea, mochi, and desserts to your doorstep. This Shipping and Delivery Policy outlines our delivery areas, timelines, and procedures to ensure you receive your order in perfect condition.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Delivery Areas</h2>

            <h3 className="text-lg font-medium mt-4 mb-2">2.1 Website Delivery</h3>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <p className="font-semibold text-amber-800">⚠️ Important: Website orders are delivered ONLY from our T Nagar outlet</p>
            </div>
            <p className="mb-2">We currently deliver to the following areas in Chennai from our T Nagar location:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>T Nagar, Nandanam, Saidapet, West Mambalam</li>
              <li>Kodambakkam, Vadapalani, Ashok Nagar</li>
              <li>Guindy, Adyar, Mylapore, Triplicane</li>
              <li>Anna Nagar, Kilpauk, Egmore</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">2.2 Extended Delivery Zone</h3>
            <p>
              We may deliver to other areas in Chennai on a case-by-case basis. Additional delivery charges may apply for locations beyond our primary delivery zone. Please contact us at <strong>+91 78450 53909</strong> to confirm delivery availability to your location.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">2.3 Self-Pickup Option</h3>
            <p className="mb-2">Customers can choose to pick up their orders from our outlets:</p>
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-secondary rounded-lg">
                <p className="font-semibold">T Nagar Outlet (Delivery Available)</p>
                <p>New No.29 Burkit Road, T Nagar, Chennai - 600017</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="font-semibold">Velachery Outlet (Dine-in & Takeaway Only)</p>
                <p>Palladium Mall, Velachery, Chennai</p>
                <p className="text-sm text-muted-foreground mt-1">Note: This outlet does not offer delivery services</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Delivery Timelines</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Estimated Delivery Time:</strong> 30-60 minutes from order confirmation (depending on location and order volume)</li>
              <li><strong>Peak Hours:</strong> Delivery times may be longer during weekends and peak hours (12 PM - 2 PM, 6 PM - 9 PM)</li>
              <li><strong>Order Tracking:</strong> You will receive SMS/WhatsApp updates on your order status</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Delivery Charges</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Delivery charges vary based on distance from our T Nagar outlet</li>
              <li>Delivery charges will be displayed at checkout before payment</li>
              <li>Free delivery may be available for orders above a certain value (check promotions)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Delivery Instructions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Please ensure someone is available to receive the order at the delivery address</li>
              <li>Provide accurate address details including landmarks for faster delivery</li>
              <li>Keep your phone accessible as our delivery partner may call for directions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Failed Delivery Attempts</h2>
            <p className="mb-2">If delivery cannot be completed due to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Customer unavailable at the delivery address</li>
              <li>Incorrect address or phone number</li>
              <li>Customer not responding to calls</li>
            </ul>
            <p className="mt-4">
              We will attempt to contact you. If unreachable within 15 minutes, the order may be cancelled without refund as the products are perishable.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Product Handling</h2>
            <p>
              Our products are packed in food-grade containers designed to maintain freshness during transit. For bubble tea, we recommend consuming within 2 hours of delivery for the best experience.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Contact Us</h2>
            <p>For delivery-related queries, please contact us at:</p>
            <div className="mt-4 p-4 bg-secondary rounded-lg">
              <p className="font-semibold">Thamarai Foods and Trading Private Limited</p>
              <p>Phone: +91 78450 53909</p>
              <p>Email: info@taiwanmaami.com</p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t flex gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link href="/refund" className="text-primary hover:underline">Refund Policy</Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
