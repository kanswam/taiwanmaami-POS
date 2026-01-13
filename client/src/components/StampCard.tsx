import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Stamp, Gift, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'wouter';

export function StampCard({ compact = false }: { compact?: boolean }) {
  const { data: stampCard, isLoading } = trpc.loyalty.getStampCard.useQuery();

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!stampCard) return null;

  const stamps = stampCard.stampCount % 10;
  const hasReward = stampCard.availableRewards.length > 0;

  if (compact) {
    return (
      <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Stamp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{stamps}/10 Stamps</p>
              <p className="text-xs text-muted-foreground">
                {stampCard.stampsToNextReward} more to free drink
              </p>
            </div>
          </div>
          {hasReward && (
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <Gift className="w-4 h-4" />
              <span>1 Reward</span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Taiwan Maami Rewards</h3>
            <p className="text-amber-100 text-sm">Collect stamps, earn free drinks!</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Stamp className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Stamp Grid */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                i < stamps
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-400 border-2 border-dashed border-gray-200'
              }`}
            >
              {i < stamps ? (
                <Stamp className="w-4 h-4" />
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
          ))}
        </div>

        {/* Progress Text */}
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            {stamps === 0 ? (
              'Start collecting stamps with your next order!'
            ) : stamps < 10 ? (
              <>
                <span className="font-semibold text-foreground">{stampCard.stampsToNextReward} more stamps</span>
                {' '}until your free Large Bubble Tea
              </>
            ) : (
              'You have a reward ready!'
            )}
          </p>
        </div>

        {/* Reward Badge */}
        {hasReward && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Gift className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-800">Free Large Bubble Tea!</p>
                <p className="text-xs text-green-600">
                  Use code: {stampCard.availableRewards[0].voucherCode}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium">How it works:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Earn 1 stamp for every ₹450 spent</li>
            <li>• Collect 10 stamps = 1 FREE Large Bubble Tea</li>
          </ul>
        </div>

        {/* Lifetime Stats */}
        <div className="border-t mt-4 pt-4 flex justify-between text-sm">
          <div>
            <p className="text-muted-foreground">Lifetime Stamps</p>
            <p className="font-semibold">{stampCard.lifetimeStamps}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Rewards Earned</p>
            <p className="font-semibold">{Math.floor(stampCard.lifetimeStamps / 10)}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Mini version for checkout page
export function StampCardMini() {
  const { data: stampCard, isLoading } = trpc.loyalty.getStampCard.useQuery();
  const { data: preview } = trpc.loyalty.previewStamps.useQuery(
    { orderTotal: 50000 }, // Will be updated with actual order total
    { enabled: false }
  );

  if (isLoading || !stampCard) return null;

  const stamps = stampCard.stampCount % 10;

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${
              i < stamps ? 'bg-amber-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <span className="text-muted-foreground">{stamps}/10</span>
    </div>
  );
}
