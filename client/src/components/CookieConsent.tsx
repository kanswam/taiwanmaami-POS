import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOKIE_CONSENT_KEY = "taiwan-maami-cookie-consent";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to avoid showing immediately on page load
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Cookie className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                We use cookies
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                We use cookies to enhance your browsing experience, remember your preferences, 
                and analyze site traffic. By clicking "Accept All", you consent to our use of cookies. 
                You can learn more about how we use cookies in our{" "}
                <Link href="/privacy" className="text-primary hover:underline font-medium">
                  Privacy Policy
                </Link>
                .
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAccept}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Accept All
                </Button>
                <Button
                  onClick={handleDecline}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Decline Non-Essential
                </Button>
              </div>
            </div>
            <button
              onClick={handleDecline}
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close cookie banner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
