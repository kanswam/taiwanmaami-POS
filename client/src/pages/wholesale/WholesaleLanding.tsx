import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Package, ArrowLeft, Mail } from 'lucide-react';

export default function WholesaleLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-lg text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Package className="h-10 w-10 text-amber-600" />
          </div>

          {/* Badge */}
          <span className="inline-block px-4 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-6">
            B2B Wholesale Portal
          </span>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Coming Soon
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Our wholesale portal for bubble tea supplies is currently under development. 
            We'll be offering premium Taiwanese ingredients, competitive bulk pricing, 
            and easy ordering for cafes, restaurants, and retailers.
          </p>

          {/* Contact CTA */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-amber-100 mb-8">
            <p className="text-gray-700 font-medium mb-1">Interested in wholesale orders?</p>
            <p className="text-gray-500 text-sm mb-4">
              Reach out to us directly and we'll get you set up.
            </p>
            <a href="mailto:taiwanmaami@gmail.com">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <Mail className="mr-2 h-4 w-4" />
                Contact Us
              </Button>
            </a>
          </div>

          {/* Back to main site */}
          <Link href="/">
            <Button variant="ghost" className="text-amber-700 hover:text-amber-800 hover:bg-amber-50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Taiwan Maami
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-gray-400 text-sm">
        <p>Taiwan Maami - A division of Thamarai Foods and Trading Private Limited</p>
      </footer>
    </div>
  );
}
