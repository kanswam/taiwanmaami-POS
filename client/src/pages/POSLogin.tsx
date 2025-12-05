import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Store, Phone, LogIn } from 'lucide-react';
import { toast } from 'sonner';

// POS Session storage key
const POS_SESSION_KEY = 'pos_session';

export interface POSSessionData {
  sessionId: number;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeMobile: string;
  outletId: number;
  outletName: string;
  loginTime: number;
}

export function getPOSSession(): POSSessionData | null {
  const stored = localStorage.getItem(POS_SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setPOSSession(session: POSSessionData) {
  localStorage.setItem(POS_SESSION_KEY, JSON.stringify(session));
}

export function clearPOSSession() {
  localStorage.removeItem(POS_SESSION_KEY);
}

export default function POSLogin() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<'mobile' | 'outlet'>('mobile');
  const [mobile, setMobile] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState<number | null>(null);
  const [employeeData, setEmployeeData] = useState<{
    id: string;
    employeeCode: string;
    name: string;
    primaryOutlet?: string;
  } | null>(null);

  // Check for existing session
  useEffect(() => {
    const existingSession = getPOSSession();
    if (existingSession) {
      // Session exists, redirect to POS
      navigate('/pos');
    }
  }, [navigate]);

  // Fetch outlets
  const { data: outlets, isLoading: outletsLoading } = trpc.posAuth.getOutlets.useQuery();

  // Login mutation
  const loginMutation = trpc.posAuth.loginByMobile.useMutation({
    onSuccess: (result) => {
      if (result.success && result.employee) {
        setEmployeeData({
          id: result.employee.id,
          employeeCode: result.employee.employeeCode,
          name: result.employee.name,
          primaryOutlet: result.employee.primaryOutlet,
        });
        
        // If employee has a primary outlet, pre-select it
        if (result.employee.primaryOutlet && outlets) {
          const primaryOutlet = outlets.find(o => 
            o.name.toLowerCase().includes(result.employee!.primaryOutlet!.toLowerCase())
          );
          if (primaryOutlet) {
            setSelectedOutlet(primaryOutlet.id);
          }
        }
        
        setStep('outlet');
        toast.success(`Welcome, ${result.employee.name}!`);
      } else {
        toast.error(result.error || 'Authentication failed');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Authentication failed');
    },
  });

  // Create session mutation
  const createSessionMutation = trpc.posAuth.createSession.useMutation({
    onSuccess: (result) => {
      if (result.success && employeeData && selectedOutlet) {
        const outlet = outlets?.find(o => o.id === selectedOutlet);
        const sessionData: POSSessionData = {
          sessionId: result.sessionId,
          employeeId: employeeData.id,
          employeeCode: employeeData.employeeCode,
          employeeName: employeeData.name,
          employeeMobile: mobile,
          outletId: selectedOutlet,
          outletName: outlet?.name || '',
          loginTime: Date.now(),
        };
        setPOSSession(sessionData);
        toast.success('Session started successfully');
        navigate('/pos');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create session');
    },
  });

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      toast.error('Please enter a valid mobile number');
      return;
    }
    loginMutation.mutate({ mobile });
  };

  const handleOutletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutlet || !employeeData) {
      toast.error('Please select an outlet');
      return;
    }
    
    const outlet = outlets?.find(o => o.id === selectedOutlet);
    createSessionMutation.mutate({
      employeeId: employeeData.id,
      employeeCode: employeeData.employeeCode,
      employeeName: employeeData.name,
      employeeMobile: mobile,
      outletId: selectedOutlet,
      outletName: outlet?.name || '',
      deviceInfo: navigator.userAgent,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center">
            <Store className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-amber-900">Taiwan Maami POS</CardTitle>
          <CardDescription>
            {step === 'mobile' 
              ? 'Enter your registered mobile number to login'
              : `Welcome, ${employeeData?.name}! Select your outlet`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'mobile' ? (
            <form onSubmit={handleMobileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Use the mobile number registered in Employee Master
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={loginMutation.isPending || mobile.length < 10}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOutletSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label>Select Outlet</Label>
                {outletsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedOutlet?.toString()}
                    onValueChange={(value) => setSelectedOutlet(parseInt(value))}
                    className="space-y-2"
                  >
                    {outlets?.map((outlet) => (
                      <div
                        key={outlet.id}
                        className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          selectedOutlet === outlet.id
                            ? 'border-amber-600 bg-amber-50'
                            : 'border-gray-200 hover:border-amber-300'
                        }`}
                        onClick={() => setSelectedOutlet(outlet.id)}
                      >
                        <RadioGroupItem value={outlet.id.toString()} id={`outlet-${outlet.id}`} />
                        <div className="flex-1">
                          <Label htmlFor={`outlet-${outlet.id}`} className="font-medium cursor-pointer">
                            {outlet.name}
                          </Label>
                          <p className="text-sm text-gray-500 mt-1">{outlet.address}</p>
                          {outlet.openingHours && (
                            <p className="text-xs text-gray-400 mt-1">{outlet.openingHours}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep('mobile');
                    setEmployeeData(null);
                    setSelectedOutlet(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  disabled={createSessionMutation.isPending || !selectedOutlet}
                >
                  {createSessionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Session'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
