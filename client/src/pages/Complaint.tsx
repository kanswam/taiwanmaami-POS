import { useState } from 'react';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'wouter';

const COMPLAINT_TYPES = [
  { value: 'delivery_issue', label: 'Delivery Issue', description: 'Late delivery, wrong address, etc.' },
  { value: 'quality_issue', label: 'Quality Issue', description: 'Food quality, taste, freshness' },
  { value: 'missing_item', label: 'Missing Item', description: 'Items missing from order' },
  { value: 'wrong_order', label: 'Wrong Order', description: 'Received incorrect items' },
  { value: 'late_delivery', label: 'Late Delivery', description: 'Order arrived significantly late' },
  { value: 'payment_issue', label: 'Payment Issue', description: 'Overcharged, refund needed' },
  { value: 'staff_behavior', label: 'Staff Behavior', description: 'Service-related concerns' },
  { value: 'other', label: 'Other', description: 'Any other issue' },
];

export default function Complaint() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    orderNumber: '',
    customerName: user?.name || '',
    customerEmail: user?.email || '',
    customerPhone: '',
    complaintType: '' as string,
    description: '',
  });

  const submitComplaint = trpc.complaints.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Complaint submitted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit complaint');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.complaintType) {
      toast.error('Please select a complaint type');
      return;
    }
    
    if (formData.description.length < 10) {
      toast.error('Please provide more details about your complaint');
      return;
    }

    submitComplaint.mutate({
      orderNumber: formData.orderNumber || undefined,
      customerName: formData.customerName,
      customerEmail: formData.customerEmail || undefined,
      customerPhone: formData.customerPhone || undefined,
      complaintType: formData.complaintType as any,
      description: formData.description,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container pt-24 pb-12">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Complaint Submitted</h1>
            <p className="text-muted-foreground mb-6">
              Thank you for bringing this to our attention. Our team will review your complaint and get back to you within 24-48 hours.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/">
                <Button>Back to Home</Button>
              </Link>
              {isAuthenticated && (
                <Link href="/my-orders">
                  <Button variant="outline">View My Orders</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Submit a Complaint</h1>
              <p className="text-muted-foreground">We're sorry you had a bad experience. Let us make it right.</p>
            </div>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Order Number (Optional) */}
              <div>
                <Label htmlFor="orderNumber">Order Number (Optional)</Label>
                <Input
                  id="orderNumber"
                  placeholder="e.g., 00001"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If you have an order number, please provide it for faster resolution
                </p>
              </div>

              {/* Contact Details */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Your Name *</Label>
                  <Input
                    id="customerName"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customerEmail">Email Address</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We'll use this to send you updates about your complaint
                </p>
              </div>

              {/* Complaint Type */}
              <div>
                <Label>Type of Complaint *</Label>
                <Select
                  value={formData.complaintType}
                  onValueChange={(value) => setFormData({ ...formData, complaintType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select complaint type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLAINT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Describe Your Issue *</Label>
                <Textarea
                  id="description"
                  required
                  rows={5}
                  placeholder="Please provide as much detail as possible about what happened..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 10 characters. Include details like date, time, items affected, etc.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={submitComplaint.isPending}
              >
                {submitComplaint.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Complaint'
                )}
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            For urgent matters, please call us directly at{' '}
            <a href="tel:+918925914303" className="text-primary underline">+91 89259 14303</a> (Palladium) or{' '}
            <a href="tel:+919150570557" className="text-primary underline">+91 91505 70557</a> (T Nagar)
          </p>
        </div>
      </div>
    </div>
  );
}
