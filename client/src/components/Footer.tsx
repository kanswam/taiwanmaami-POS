import { Link } from 'wouter';
import { Instagram, Facebook, Twitter, Youtube } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Social Media Links */}
          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <a 
                href="https://www.instagram.com/taiwan_maami/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
                title="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://www.threads.net/@taiwan_maami" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
                title="Threads"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.73 2.108-1.152 3.457-1.187 1.357-.035 2.56.269 3.476.765.034-.996-.04-1.872-.293-2.609l1.903-.576c.37 1.074.476 2.39.353 3.908.838.477 1.55 1.09 2.104 1.822.758 1.003 1.14 2.164 1.14 3.455 0 .655-.088 1.327-.264 2.005-.52 2.005-1.756 3.67-3.68 4.95-1.795 1.197-4.08 1.855-6.604 1.903zm1.07-8.852c-.095-.003-.189-.003-.283 0-1.17.03-2.099.313-2.688.817-.477.408-.67.882-.645 1.334.028.506.282.932.716 1.2.53.327 1.261.468 2.06.396 1.063-.06 1.876-.453 2.416-1.168.417-.552.678-1.292.782-2.202-.71-.262-1.53-.396-2.358-.377z"/>
                </svg>
              </a>
              <a 
                href="https://www.facebook.com/Taiwanmaami" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
                title="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="https://x.com/taiwanmaami" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
                title="X (Twitter)"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://youtube.com/@theresahucy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
                title="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Contact</h4>
              <div className="space-y-1 text-sm text-background/70">
                <a href="mailto:hello@taiwanmaami.com" className="block hover:text-background">
                  hello@taiwanmaami.com
                </a>
                <a href="tel:+917845053909" className="block hover:text-background">
                  +91 78450 53909
                </a>
                <a href="tel:+919150570557" className="block hover:text-background">
                  +91 91505 70557 (T Nagar)
                </a>
              </div>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link href="/menu" className="hover:text-background">Menu</Link></li>
              <li><Link href="/about" className="hover:text-background">About Us</Link></li>
              <li><Link href="/terms" className="hover:text-background">Terms & Conditions</Link></li>
              <li><Link href="/privacy" className="hover:text-background">Privacy Policy</Link></li>
              <li><Link href="/refund" className="hover:text-background">Refund Policy</Link></li>
              <li><Link href="/shipping" className="hover:text-background">Shipping Policy</Link></li>
              <li><Link href="/faq" className="hover:text-background">FAQ</Link></li>
              <li><Link href="/blog" className="hover:text-background">Blog</Link></li>
              <li><Link href="/franchise" className="hover:text-background">Franchise Opportunity</Link></li>
              <li><Link href="/events" className="hover:text-background">Events & Workshops</Link></li>
            </ul>
          </div>
          
          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4">Hours</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><strong>Palladium:</strong> 10am - 10pm</li>
              <li><strong>T Nagar:</strong> 12pm - 12am</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-background/20 mt-8 pt-8 text-center text-sm text-background/50">
          <p>© {new Date().getFullYear()} Taiwan Maami™. All rights reserved.</p>
          <p className="mt-1">A unit of Thamarai Foods and Trading Private Limited</p>
        </div>
      </div>
    </footer>
  );
}
