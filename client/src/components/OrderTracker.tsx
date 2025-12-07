import React from 'react';
import { Check, CreditCard, ChefHat, Package, Truck, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderTrackerProps {
  currentStatus: string;
  orderType: 'delivery' | 'pickup' | 'instore';
  paymentStatus?: string;
}

const deliverySteps = [
  { key: 'pending', label: 'Order Placed', icon: CreditCard },
  { key: 'confirmed', label: 'Payment Confirmed', icon: Check },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready', icon: Package },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'completed', label: 'Delivered', icon: CheckCircle },
];

const pickupSteps = [
  { key: 'pending', label: 'Order Placed', icon: CreditCard },
  { key: 'confirmed', label: 'Confirmed', icon: Check },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready for Pickup', icon: Package },
  { key: 'completed', label: 'Picked Up', icon: CheckCircle },
];

export function OrderTracker({ currentStatus, orderType, paymentStatus }: OrderTrackerProps) {
  const steps = orderType === 'delivery' ? deliverySteps : pickupSteps;
  
  const currentIndex = steps.findIndex(s => s.key === currentStatus);
  
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-muted z-0">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${Math.max(0, (currentIndex / (steps.length - 1)) * 100)}%` }}
          />
        </div>
        
        {/* Steps */}
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;
          
          return (
            <div key={step.key} className="flex flex-col items-center z-10">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/30",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span 
                className={cn(
                  "text-xs mt-2 text-center max-w-[80px]",
                  (isCompleted || isCurrent) ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Status message */}
      <div className="mt-6 text-center">
        {currentStatus === 'pending' && paymentStatus !== 'completed' && (
          <p className="text-amber-600 font-medium">Awaiting payment confirmation...</p>
        )}
        {currentStatus === 'confirmed' && (
          <p className="text-green-600 font-medium">Payment confirmed! Your order is being prepared.</p>
        )}
        {currentStatus === 'preparing' && (
          <p className="text-blue-600 font-medium">Our team is preparing your order with care.</p>
        )}
        {currentStatus === 'ready' && orderType === 'pickup' && (
          <p className="text-green-600 font-medium">Your order is ready! Please collect from the store.</p>
        )}
        {currentStatus === 'ready' && orderType === 'delivery' && (
          <p className="text-green-600 font-medium">Your order is ready and waiting for pickup by delivery partner.</p>
        )}
        {currentStatus === 'out_for_delivery' && (
          <p className="text-blue-600 font-medium">Your order is on the way!</p>
        )}
        {currentStatus === 'completed' && (
          <p className="text-green-600 font-medium">Order completed. Thank you!</p>
        )}
        {currentStatus === 'cancelled' && (
          <p className="text-red-600 font-medium">Order cancelled.</p>
        )}
      </div>
    </div>
  );
}
