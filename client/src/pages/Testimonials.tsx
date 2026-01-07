import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Star, Quote, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function Testimonials() {
  const { data: reviews, isLoading } = trpc.reviews.getApproved.useQuery({ limit: 50 });
  const { data: stats } = trpc.reviews.getStats.useQuery();

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container pt-24 pb-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real reviews from our valued customers. We're grateful for every feedback that helps us serve you better.
          </p>
          
          {/* Stats */}
          {stats && stats.totalReviews > 0 && (
            <div className="flex items-center justify-center gap-6 mt-8">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(stats.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold">{stats.averageRating}</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="text-muted-foreground">
                <span className="font-semibold text-foreground">{stats.totalReviews}</span> reviews
              </div>
            </div>
          )}
        </div>

        {/* Reviews Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-4" />
                <div className="h-20 bg-muted rounded mb-4" />
                <div className="h-4 bg-muted rounded w-32" />
              </Card>
            ))}
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <Card key={review.id} className="p-6 relative">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
                
                <div className="mb-4">
                  {renderStars(review.rating)}
                </div>
                
                {review.comment && (
                  <p className="text-sm text-muted-foreground mb-4 italic">
                    "{review.comment}"
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{review.customerName || 'Happy Customer'}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
            <p className="text-muted-foreground">
              Be the first to share your experience with Taiwan Maami!
            </p>
          </Card>
        )}

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="p-8 bg-primary/5 border-primary/20">
            <h2 className="text-xl font-semibold mb-2">Enjoyed Your Experience?</h2>
            <p className="text-muted-foreground mb-4">
              We'd love to hear from you! Share your feedback after your next order.
            </p>
            <Link href="/menu">
              <Button>Order Now</Button>
            </Link>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
