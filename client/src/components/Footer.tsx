import { Link } from 'wouter';
import { Instagram, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="Taiwan Maami" className="h-10 w-auto" />
              <h3 className="font-bold text-lg">Taiwan Maami</h3>
            </div>
            <p className="text-sm text-background/70 mb-4">
              Authentic Taiwanese bubble tea crafted with premium imported ingredients from Taiwan.
            </p>
            <a
              href="https://www.instagram.com/taiwan_maami/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-background/70 hover:text-background transition-colors"
            >
              <Instagram className="w-5 h-5" />
              @taiwan_maami
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <div className="space-y-2 text-sm">
              <Link href="/menu" className="block text-background/70 hover:text-background transition-colors">
                Menu
              </Link>
              <Link href="/about" className="block text-background/70 hover:text-background transition-colors">
                About Us
              </Link>
              <Link href="/about#locations" className="block text-background/70 hover:text-background transition-colors">
                Locations
              </Link>
              <Link href="/track" className="block text-background/70 hover:text-background transition-colors">
                Track Order
              </Link>
            </div>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-semibold mb-4">Policies</h4>
            <div className="space-y-2 text-sm">
              <Link href="/terms" className="block text-background/70 hover:text-background transition-colors">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="block text-background/70 hover:text-background transition-colors">
                Privacy Policy
              </Link>
              <Link href="/refund" className="block text-background/70 hover:text-background transition-colors">
                Refund Policy
              </Link>
              <Link href="/shipping" className="block text-background/70 hover:text-background transition-colors">
                Shipping & Delivery
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3 text-sm text-background/70">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>Palladium Mall, Chennai</p>
                  <p>T Nagar, Chennai</p>
                </div>
              </div>
              <a 
                href="mailto:info@taiwanmaami.com"
                className="flex items-center gap-2 hover:text-background transition-colors"
              >
                <Mail className="w-4 h-4" />
                info@taiwanmaami.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/50">
            <p>© {new Date().getFullYear()} Thamarai Foods and Trading Private Limited. All rights reserved.</p>
            <p className="text-xs">
              GSTIN: 33AAKCT4782H1Z1 | CIN: U47219TN2023PTC164226
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
