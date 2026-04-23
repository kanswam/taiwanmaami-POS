import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/_core/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';
import { useLoginTransition } from '@/hooks/useLoginTransition';
import { Menu, ShoppingCart, User, LogOut, MapPin, Info, FileText, X, ClipboardList, BookOpen, UtensilsCrossed } from 'lucide-react';
import { formatPrice } from '@shared/types';
import { isPartnerNavVisible } from '@/lib/partnerGate';

export function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, total } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { triggerLogin, transitionPortal } = useLoginTransition();

  const partnerVisible = isPartnerNavVisible();
  const navLinks = [
    { href: '/#order-options', label: 'Menu' },
    { href: '/about', label: 'About Us' },
    { href: '/#outlets', label: 'Locations' },
    { href: '/events', label: 'Events' },
    { href: '/wholesale', label: 'Wholesale' },
    { href: '/blog', label: 'Blog' },
    ...(partnerVisible ? [{ href: '/partner', label: 'Partner' }] : []),
  ];

  const isActive = (href: string) => location === href;

  return (
    <div className="sticky top-0 z-50">

      <header className="bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <a
            href="/"
            className="flex items-center"
            onClick={(e) => {
              e.preventDefault();
              if (location === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                window.location.href = '/';
              }
            }}
          >
            <img 
              src="https://files.manuscdn.com/user_upload_by_module/session_file/114675165/PNSTmVAGBQQgOlVy.png" 
              alt="Taiwan Maami™" 
              fetchPriority="high"
              className="h-16 md:h-24 w-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              link.href.startsWith('/#') ? (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    const hash = link.href.split('#')[1];
                    if (window.location.pathname === '/') {
                      // Already on home page, just scroll
                      const element = document.getElementById(hash);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    } else {
                      // Store the hash in sessionStorage and navigate to home
                      sessionStorage.setItem('scrollToSection', hash);
                      window.location.href = '/';
                    }
                  }}
                  className={`text-base font-semibold transition-colors hover:text-primary text-foreground cursor-pointer whitespace-nowrap`}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-base font-semibold transition-colors hover:text-primary whitespace-nowrap ${
                    isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              )
            ))}

            {/* Order Now CTA */}
            <Link href="/menu?type=delivery">
              <Button 
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-200 text-sm"
              >
                <UtensilsCrossed className="w-4 h-4 mr-1.5" />
                Order Now
              </Button>
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Cart button */}
            <Link href="/cart">
              <Button variant="ghost" size="sm" className="relative">
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {itemCount}
                    </span>
                    <span className="hidden sm:inline ml-2 text-sm font-medium">
                      {formatPrice(Math.round(total))}
                    </span>
                  </>
                )}
              </Button>
            </Link>

            {/* User menu */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/profile">
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4 mr-1" />
                    Profile
                  </Button>
                </Link>
                <Link href="/orders">
                  <Button variant="ghost" size="sm">
                    My Orders
                  </Button>
                </Link>

                {(user?.role === 'staff' || user?.role === 'admin') && (
                  <Link href="/staff/orders">
                    <Button variant="outline" size="sm">
                      Staff Orders
                    </Button>
                  </Link>
                )}

                {user?.role === 'admin' && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      Admin
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={() => logout()}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="hidden md:block" onClick={triggerLogin}>
                  <User className="w-4 h-4 mr-2" />
                  Login
              </Button>
            )}

            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col gap-4 mt-8">
                  {/* Order Now CTA - prominent at top of mobile menu */}
                  <Link
                    href="/menu?type=delivery"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 p-3 rounded-full bg-amber-600 text-white font-bold shadow-md"
                  >
                    <UtensilsCrossed className="w-5 h-5" />
                    Order Now
                  </Link>

                  <hr className="my-1" />

                  {navLinks.map((link) => (
                    link.href.startsWith('/#') ? (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={(e) => {
                          e.preventDefault();
                          setMobileMenuOpen(false);
                          const hash = link.href.split('#')[1];
                          if (location === '/') {
                            const element = document.getElementById(hash);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' });
                            }
                          } else {
                            // Store the hash in sessionStorage and navigate to home
                            sessionStorage.setItem('scrollToSection', hash);
                            window.location.href = '/';
                          }
                        }}
                        className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-secondary cursor-pointer"
                      >
                        {link.href.includes('outlets') && <MapPin className="w-5 h-5" />}
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isActive(link.href)
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-secondary'
                        }`}
                      >
                        {link.href === '/menu' && <Menu className="w-5 h-5" />}
                        {link.href === '/about' && <Info className="w-5 h-5" />}
                        {link.href === '/blog' && <BookOpen className="w-5 h-5" />}
                        {link.label}
                      </Link>
                    )
                  ))}

                  <hr className="my-2" />

                  {isAuthenticated ? (
                    <>
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary"
                      >
                        <User className="w-5 h-5" />
                        My Profile
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary"
                      >
                        <FileText className="w-5 h-5" />
                        My Orders
                      </Link>

                      {(user?.role === 'staff' || user?.role === 'admin') && (
                        <Link
                          href="/staff/orders"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary"
                        >
                          <ClipboardList className="w-5 h-5" />
                          Staff Orders
                        </Link>
                      )}

                      {user?.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary"
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        className="justify-start gap-3 p-3"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-5 h-5" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Button className="w-full" onClick={triggerLogin}>
                        <User className="w-4 h-4 mr-2" />
                        Login
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
      {transitionPortal}
    </div>
  );
}
