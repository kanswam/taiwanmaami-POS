import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Gift, Cake } from 'lucide-react';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

interface BirthdayPromptModalProps {
  open: boolean;
  onClose: () => void;
}

export function BirthdayPromptModal({ open, onClose }: BirthdayPromptModalProps) {
  const [month, setMonth] = useState<string>('');
  const [day, setDay] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateBirthday = trpc.profile.updateBirthday.useMutation({
    onSuccess: () => {
      onClose();
    },
    onError: (error) => {
      console.error('Failed to save birthday:', error);
      setIsSubmitting(false);
    }
  });

  const handleSubmit = () => {
    if (!month || !day) return;
    setIsSubmitting(true);
    updateBirthday.mutate({
      birthMonth: parseInt(month),
      birthDay: parseInt(day)
    });
  };

  const handleSkip = () => {
    localStorage.setItem('birthday-prompt-dismissed', 'true');
    onClose();
  };

  const getDaysInMonth = (monthNum: number) => {
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonth[monthNum - 1] || 31;
  };

  const days = month 
    ? Array.from({ length: getDaysInMonth(parseInt(month)) }, (_, i) => ({
        value: String(i + 1),
        label: String(i + 1)
      }))
    : [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-md bg-secondary">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Get a FREE Boba on Your Birthday!</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share your birthday with us and we'll send you a special treat - a FREE regular boba drink (up to ₹350) during your birthday week!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg text-sm">
            <Cake className="w-5 h-5 text-primary flex-shrink-0" />
            <span>We only need your birth month and day - your year stays private!</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Day</label>
              <Select value={day} onValueChange={setDay} disabled={!month}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSkip} className="flex-1">
            Maybe Later
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!month || !day || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Saving...' : 'Claim My Birthday Gift'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
