import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Link } from 'wouter';
import { User, Phone, Mail, Cake, MapPin, Gift, Star, Edit2, Plus, Trash2, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  
  // Profile data
  const { data: profile, isLoading: profileLoading } = trpc.profile.getProfile.useQuery(undefined, {
    enabled: !!user
  });
  
  // Addresses
  const { data: addresses, isLoading: addressesLoading } = trpc.addresses.getUserAddresses.useQuery(undefined, {
    enabled: !!user
  });
  
  // Delivery areas for address form
  const { data: deliveryAreas } = trpc.addresses.getDeliveryAreas.useQuery();
  
  // Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingBirthday, setIsEditingBirthday] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  
  // Form states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [birthDay, setBirthDay] = useState<number | null>(null);
  
  // Address form
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  
  // Mutations
  const updateProfileMutation = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated successfully');
      utils.profile.getProfile.invalidate();
      setIsEditingProfile(false);
    },
    onError: () => {
      toast.error('Failed to update profile');
    }
  });
  
  const updateBirthdayMutation = trpc.profile.updateBirthday.useMutation({
    onSuccess: () => {
      toast.success('Birthday saved! You\'ll receive a special treat on your birthday week!');
      utils.profile.getProfile.invalidate();
      setIsEditingBirthday(false);
    },
    onError: () => {
      toast.error('Failed to save birthday');
    }
  });
  
  const createAddressMutation = trpc.addresses.create.useMutation({
    onSuccess: () => {
      toast.success('Address added successfully');
      utils.addresses.getUserAddresses.invalidate();
      setIsAddingAddress(false);
      resetAddressForm();
    },
    onError: () => {
      toast.error('Failed to add address');
    }
  });
  
  // Initialize edit forms when profile loads
  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditPhone(profile.phone || '');
      setBirthMonth(profile.birthMonth || null);
      setBirthDay(profile.birthDay || null);
    }
  }, [profile]);
  
  const resetAddressForm = () => {
    setAddressLine1('');
    setAddressLine2('');
    setSelectedArea('');
    setPincode('');
    setLandmark('');
  };
  
  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      name: editName,
      phone: editPhone
    });
  };
  
  const handleSaveBirthday = () => {
    if (birthMonth && birthDay) {
      updateBirthdayMutation.mutate({
        birthMonth,
        birthDay
      });
    }
  };
  
  const handleAddAddress = () => {
    if (!addressLine1 || !selectedArea || !pincode) {
      toast.error('Please fill in all required fields');
      return;
    }
    createAddressMutation.mutate({
      addressLine1,
      addressLine2: addressLine2 || undefined,
      area: selectedArea,
      pincode,
      landmark: landmark || undefined,
      isDefault: (addresses?.length || 0) === 0
    });
  };
  
  const getDaysInMonth = (month: number | null) => {
    if (!month) return 31;
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonth[month - 1];
  };
  
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <Card className="p-8 text-center">
            <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sign in to view your profile</h2>
            <p className="text-muted-foreground mb-6">
              Access your account details, saved addresses, and loyalty rewards
            </p>
            <Link href="/menu">
              <Button className="bg-primary hover:bg-primary/90">
                Browse Menu
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }
  
  const stampsToNextReward = 10 - (profile?.loyaltyStamps || 0) % 10;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Header />
      
      <div className="container py-8 max-w-4xl">
        {/* Back button */}
        <Link href="/menu">
          <Button variant="ghost" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Menu
          </Button>
        </Link>
        
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account details and preferences</p>
        </div>
        
        {/* Profile Card */}
        <Card className="p-6 mb-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Personal Information
            </h2>
            {!isEditingProfile && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
          
          {isEditingProfile ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={profile?.email || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{profile?.name || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{profile?.phone || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email || 'Not set'}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
        
        {/* Birthday Card */}
        <Card className="p-6 mb-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Cake className="w-5 h-5 text-pink-500" />
              Birthday
            </h2>
            {!isEditingBirthday && !profile?.birthMonth && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingBirthday(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Add
              </Button>
            )}
          </div>
          
          {isEditingBirthday ? (
            <div className="space-y-4">
              <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                <p className="text-sm text-pink-700">
                  🎂 Share your birthday and get a <strong>FREE large boba drink</strong> (worth over ₹450) with any food or drink purchase during your birthday week!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Month</Label>
                  <Select
                    value={birthMonth?.toString() || ''}
                    onValueChange={(v) => setBirthMonth(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Day</Label>
                  <Select
                    value={birthDay?.toString() || ''}
                    onValueChange={(v) => setBirthDay(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: getDaysInMonth(birthMonth) }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                We only need your birth month and day - your year stays private!
              </p>
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleSaveBirthday} 
                  disabled={!birthMonth || !birthDay || updateBirthdayMutation.isPending}
                  className="bg-pink-500 hover:bg-pink-600"
                >
                  {updateBirthdayMutation.isPending ? 'Saving...' : 'Save Birthday'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditingBirthday(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {profile?.birthMonth && profile?.birthDay ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                    <Gift className="w-5 h-5 text-pink-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Your Birthday</p>
                      <p className="font-medium">
                        {MONTHS.find(m => m.value === profile.birthMonth)?.label} {profile.birthDay}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Birthday cannot be changed once set. Contact us if you need to update it.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <Cake className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Add your birthday to get a free boba treat!</p>
                </div>
              )}
            </div>
          )}
        </Card>
        
        {/* Loyalty Card */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Star className="w-5 h-5" />
              Loyalty Rewards
            </h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-white/20 rounded-lg">
              <p className="text-3xl font-bold">{profile?.loyaltyStamps || 0}</p>
              <p className="text-sm opacity-90">Current Stamps</p>
            </div>
            <div className="text-center p-3 bg-white/20 rounded-lg">
              <p className="text-3xl font-bold">{profile?.totalStampsEarned || 0}</p>
              <p className="text-sm opacity-90">Total Earned</p>
            </div>
            <div className="text-center p-3 bg-white/20 rounded-lg">
              <p className="text-3xl font-bold">{profile?.freeRewardsEarned || 0}</p>
              <p className="text-sm opacity-90">Free Drinks</p>
            </div>
          </div>
          
          {/* Stamp Progress */}
          <div className="bg-white/20 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress to next free drink</span>
              <span>{(profile?.loyaltyStamps || 0) % 10}/10 stamps</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-3 rounded-full ${
                    i < (profile?.loyaltyStamps || 0) % 10
                      ? 'bg-white'
                      : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm mt-2 opacity-90">
              {stampsToNextReward === 10 
                ? 'Start collecting stamps with your next order!' 
                : `${stampsToNextReward} more stamp${stampsToNextReward > 1 ? 's' : ''} to your next free drink!`}
            </p>
          </div>
        </Card>
        
        {/* Addresses Card */}
        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Saved Addresses
            </h2>
            <Button variant="outline" size="sm" onClick={() => setIsAddingAddress(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          </div>
          
          {addressesLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          ) : addresses && addresses.length > 0 ? (
            <div className="space-y-3">
              {addresses.map((addr: any) => (
                <div key={addr.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{addr.addressLine1}</p>
                      {addr.addressLine2 && <p className="text-sm text-muted-foreground">{addr.addressLine2}</p>}
                      <p className="text-sm text-muted-foreground">
                        {addr.area}, {addr.pincode}
                      </p>
                      {addr.landmark && (
                        <p className="text-sm text-muted-foreground">Landmark: {addr.landmark}</p>
                      )}
                    </div>
                    {addr.isDefault && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No saved addresses yet</p>
              <p className="text-sm text-muted-foreground">Add an address for faster checkout</p>
            </div>
          )}
        </Card>
      </div>
      
      {/* Add Address Dialog */}
      <Dialog open={isAddingAddress} onOpenChange={setIsAddingAddress}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="addressLine1">Address Line 1 *</Label>
              <Input
                id="addressLine1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="House/Flat No., Building Name"
              />
            </div>
            <div>
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Street, Colony (optional)"
              />
            </div>
            <div>
              <Label>Area *</Label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your area" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryAreas?.map((area: any) => (
                    <SelectItem key={area.id} value={area.name}>
                      {area.name} - {area.pincode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="6-digit pincode"
              />
            </div>
            <div>
              <Label htmlFor="landmark">Landmark</Label>
              <Input
                id="landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Near... (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingAddress(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAddress} disabled={createAddressMutation.isPending}>
              {createAddressMutation.isPending ? 'Adding...' : 'Add Address'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
