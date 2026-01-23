import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Truck, CreditCard, Users, ArrowRight, CheckCircle } from 'lucide-react';

export default function WholesaleLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/wholesale-hero-pattern.svg')] opacity-5" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-4">
              B2B Wholesale Portal
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Premium Bubble Tea Supplies<br />
              <span className="text-amber-600">For Your Business</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Source authentic Taiwanese bubble tea ingredients directly from Taiwan Maami. 
              Quality products, competitive pricing, and reliable supply for cafes, restaurants, and retailers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/wholesale/register">
                <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white px-8">
                  Register as Retailer
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/wholesale/login">
                <Button size="lg" variant="outline" className="border-amber-600 text-amber-600 hover:bg-amber-50 px-8">
                  Login to View Prices
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Partner With Taiwan Maami?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Premium Quality</h3>
                <p className="text-gray-600 text-sm">
                  Authentic Taiwanese ingredients imported directly for the best taste
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Competitive Pricing</h3>
                <p className="text-gray-600 text-sm">
                  Bulk discounts and tiered pricing for regular orders
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Easy Pickup</h3>
                <p className="text-gray-600 text-sm">
                  Convenient pickup from our T. Nagar location in Chennai
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Expert Support</h3>
                <p className="text-gray-600 text-sm">
                  Training and guidance on product usage and recipes
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Product Categories Preview */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            What We Offer
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Register to view our complete catalog with pricing
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Tapioca Pearls', desc: 'Classic black, colored, and quick-cook varieties' },
              { name: 'Popping Boba', desc: 'Fruit-flavored bursting pearls in multiple flavors' },
              { name: 'Flavors & Syrups', desc: 'Taro, Matcha, Brown Sugar, and more' },
              { name: 'Equipment', desc: 'Sealers, shakers, and professional tools' },
            ].map((category, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                <div className="w-full h-32 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg mb-4 flex items-center justify-center">
                  <Package className="h-12 w-12 text-amber-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                <p className="text-gray-600 text-sm">{category.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link href="/wholesale/products">
              <Button variant="outline" size="lg" className="border-amber-600 text-amber-600 hover:bg-amber-50">
                Browse All Products
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          
          <div className="space-y-8">
            {[
              { step: 1, title: 'Register Your Business', desc: 'Create an account with your business details and GST number' },
              { step: 2, title: 'Browse & Order', desc: 'View our catalog, check prices, and add items to your cart' },
              { step: 3, title: 'Secure Payment', desc: 'Pay securely via Razorpay with GST invoice' },
              { step: 4, title: 'Pickup Your Order', desc: 'Collect your order from our T. Nagar store' },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-amber-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-amber-100 text-lg mb-8 max-w-2xl mx-auto">
            Join our network of retailers and cafes serving authentic Taiwanese bubble tea
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/wholesale/register">
              <Button size="lg" className="bg-white text-amber-600 hover:bg-amber-50 px-8">
                Register Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="tel:+919876543210">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-amber-700 px-8">
                Call Us: +91 98765 43210
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="mb-2">Taiwan Maami Wholesale - A division of Thamarai Foods and Trading Private Limited</p>
          <p className="text-sm">
            <Link href="/" className="hover:text-white">Main Website</Link>
            {' | '}
            <Link href="/terms-and-conditions" className="hover:text-white">Terms & Conditions</Link>
            {' | '}
            <Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
