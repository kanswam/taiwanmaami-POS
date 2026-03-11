import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { formatPrice } from '@shared/types';
import { Save, Star, StarOff, GripVertical, Eye, EyeOff, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

export default function HomepageSettingsTab() {
  const [activeSection, setActiveSection] = useState('announcement');
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Homepage Settings</h2>
          <p className="text-muted-foreground">Manage the content displayed on your landing page</p>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="announcement">Announcement</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="freshness">Freshness Story</TabsTrigger>
          <TabsTrigger value="featured">Featured Items</TabsTrigger>
        </TabsList>

        <TabsContent value="announcement" className="mt-6">
          <AnnouncementEditor />
        </TabsContent>

        <TabsContent value="hero" className="mt-6">
          <HeroEditor />
        </TabsContent>

        <TabsContent value="freshness" className="mt-6">
          <FreshnessStoryEditor />
        </TabsContent>

        <TabsContent value="featured" className="mt-6">
          <FeaturedProductsEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ ANNOUNCEMENT BAR EDITOR ============
function AnnouncementEditor() {
  const utils = trpc.useUtils();
  const { data: sections } = trpc.homepage.getSections.useQuery();
  const updateSection = trpc.homepage.updateSection.useMutation({
    onSuccess: () => {
      utils.homepage.getSections.invalidate();
      toast.success('Announcement bar updated');
    },
    onError: (e) => toast.error(e.message),
  });

  const section = sections?.find((s: any) => s.sectionKey === 'announcement_bar');
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState([
    { icon: '🚚', text: 'Free Delivery Above ₹2500' },
    { icon: '⭐', text: '10 Stamps = 1 Free Drink' },
    { icon: '🎉', text: 'BOBALOVE10 — 10% Off First Order' },
  ]);

  useEffect(() => {
    if (section) {
      setIsActive(section.isActive ?? true);
      const content = section.content as any;
      if (content?.items) {
        setItems(content.items);
      }
    }
  }, [section]);

  const handleSave = () => {
    updateSection.mutate({
      sectionKey: 'announcement_bar',
      title: 'Announcement Bar',
      isActive,
      content: { items },
    });
  };

  const updateItem = (index: number, field: 'icon' | 'text', value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { icon: '📢', text: 'New announcement' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Announcement Bar</h3>
          <p className="text-sm text-muted-foreground">The static bar below the header showing offers and promotions</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="announcement-active">Active</Label>
          <Switch id="announcement-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <Input
              value={item.icon}
              onChange={(e) => updateItem(index, 'icon', e.target.value)}
              className="w-16 text-center"
              placeholder="🎉"
            />
            <Input
              value={item.text}
              onChange={(e) => updateItem(index, 'text', e.target.value)}
              className="flex-1"
              placeholder="Announcement text"
            />
            <Button variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={items.length <= 1}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
        <Button onClick={handleSave} disabled={updateSection.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateSection.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}

// ============ HERO SECTION EDITOR ============
function HeroEditor() {
  const utils = trpc.useUtils();
  const { data: sections } = trpc.homepage.getSections.useQuery();
  const updateSection = trpc.homepage.updateSection.useMutation({
    onSuccess: () => {
      utils.homepage.getSections.invalidate();
      toast.success('Hero section updated');
    },
    onError: (e) => toast.error(e.message),
  });

  const section = sections?.find((s: any) => s.sectionKey === 'hero');
  const [title, setTitle] = useState('Authentic Taiwanese\nBubble Tea');
  const [subtitle, setSubtitle] = useState('Crafted with imported tapioca pearls from Taiwan. Experience the true taste of premium bubble tea at Taiwan Maami.');
  const [ctaText, setCtaText] = useState('Order Online & Save!');
  const [ctaSubtext, setCtaSubtext] = useState('Skip the queue • Earn loyalty stamps • Get exclusive offers');

  useEffect(() => {
    if (section) {
      if (section.title) setTitle(section.title);
      if (section.subtitle) setSubtitle(section.subtitle);
      const content = section.content as any;
      if (content?.ctaText) setCtaText(content.ctaText);
      if (content?.ctaSubtext) setCtaSubtext(content.ctaSubtext);
    }
  }, [section]);

  const handleSave = () => {
    updateSection.mutate({
      sectionKey: 'hero',
      title,
      subtitle,
      content: { ctaText, ctaSubtext },
    });
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Hero Section</h3>
        <p className="text-sm text-muted-foreground">The main banner at the top of the homepage with video background</p>
      </div>

      <div className="grid gap-4">
        <div>
          <Label>Heading (use \n for line breaks)</Label>
          <Textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2} />
        </div>
        <div>
          <Label>Subtitle</Label>
          <Textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>CTA Button Text</Label>
            <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
          </div>
          <div>
            <Label>CTA Subtext</Label>
            <Input value={ctaSubtext} onChange={(e) => setCtaSubtext(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSection.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateSection.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}

// ============ FRESHNESS STORY EDITOR ============
function FreshnessStoryEditor() {
  const utils = trpc.useUtils();
  const { data: sections } = trpc.homepage.getSections.useQuery();
  const updateSection = trpc.homepage.updateSection.useMutation({
    onSuccess: () => {
      utils.homepage.getSections.invalidate();
      toast.success('Freshness story updated');
    },
    onError: (e) => toast.error(e.message),
  });

  const section = sections?.find((s: any) => s.sectionKey === 'freshness_story');
  const [isActive, setIsActive] = useState(true);
  const [title, setTitle] = useState('Freshly Crafted. Authentically Taiwanese.');
  const [subtitle, setSubtitle] = useState('Every drink and food item is prepared fresh in-store using ingredients imported directly from Taiwan. No shortcuts, no compromises — just genuine Taiwanese flavours crafted with care.');
  const [pillars, setPillars] = useState([
    { icon: '🍵', title: 'Organic Whole-Leaf Tea', description: 'Sourced from certified organic farms in Nantou, Taiwan' },
    { icon: '🍞', title: 'Handmade Mochi', description: 'Prepared fresh daily using premium Japanese rice flour' },
    { icon: '🥧', title: 'Real Tapioca Pearls', description: 'Cooked in small batches every 4 hours for perfect texture' },
    { icon: '🌎', title: 'Imported Ingredients', description: 'Key ingredients flown in directly from Taiwan & Japan' },
  ]);

  useEffect(() => {
    if (section) {
      setIsActive(section.isActive ?? true);
      if (section.title) setTitle(section.title);
      if (section.subtitle) setSubtitle(section.subtitle);
      const content = section.content as any;
      if (content?.pillars) setPillars(content.pillars);
    }
  }, [section]);

  const handleSave = () => {
    updateSection.mutate({
      sectionKey: 'freshness_story',
      title,
      subtitle,
      isActive,
      content: { pillars },
    });
  };

  const updatePillar = (index: number, field: string, value: string) => {
    const newPillars = [...pillars];
    newPillars[index] = { ...newPillars[index], [field]: value };
    setPillars(newPillars);
  };

  const addPillar = () => {
    setPillars([...pillars, { icon: '✨', title: 'New Pillar', description: 'Description here' }]);
  };

  const removePillar = (index: number) => {
    setPillars(pillars.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Freshness Story</h3>
          <p className="text-sm text-muted-foreground">The brand story section highlighting your quality pillars</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="freshness-active">Active</Label>
          <Switch id="freshness-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>

      <div className="grid gap-4">
        <div>
          <Label>Section Heading</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Section Description</Label>
          <Textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={3} />
        </div>
      </div>

      <div>
        <Label className="mb-3 block">Quality Pillars</Label>
        <div className="space-y-4">
          {pillars.map((pillar, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              <Input
                value={pillar.icon}
                onChange={(e) => updatePillar(index, 'icon', e.target.value)}
                className="w-16 text-center"
                placeholder="🍵"
              />
              <div className="flex-1 space-y-2">
                <Input
                  value={pillar.title}
                  onChange={(e) => updatePillar(index, 'title', e.target.value)}
                  placeholder="Pillar title"
                />
                <Input
                  value={pillar.description}
                  onChange={(e) => updatePillar(index, 'description', e.target.value)}
                  placeholder="Pillar description"
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => removePillar(index)} disabled={pillars.length <= 1}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addPillar}>
          <Plus className="w-4 h-4 mr-2" /> Add Pillar
        </Button>
        <Button onClick={handleSave} disabled={updateSection.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateSection.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}

// ============ FEATURED PRODUCTS EDITOR ============
function FeaturedProductsEditor() {
  const utils = trpc.useUtils();
  const { data: featuredProducts } = trpc.homepage.getFeaturedProducts.useQuery();
  const { data: allProducts } = trpc.admin.getAllProducts.useQuery();
  const toggleFeatured = trpc.homepage.toggleFeatured.useMutation({
    onSuccess: () => {
      utils.homepage.getFeaturedProducts.invalidate();
      utils.admin.getAllProducts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const reorderFeatured = trpc.homepage.reorderFeatured.useMutation({
    onSuccess: () => {
      utils.homepage.getFeaturedProducts.invalidate();
      toast.success('Order updated');
    },
    onError: (e) => toast.error(e.message),
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Filter non-featured products for the "Add" section
  const nonFeaturedProducts = (allProducts || [])
    .filter((p: any) => !p.featured && p.isActive)
    .filter((p: any) => 
      !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 20);

  const handleToggle = (productId: number, featured: boolean) => {
    toggleFeatured.mutate({ productId, isFeatured: featured });
  };

  const handleMoveUp = (productId: number) => {
    if (!featuredProducts) return;
    const index = featuredProducts.findIndex((p: any) => p.id === productId);
    if (index <= 0) return;
    const ids = featuredProducts.map((p: any) => p.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    reorderFeatured.mutate({ productIds: ids });
  };

  const handleMoveDown = (productId: number) => {
    if (!featuredProducts) return;
    const index = featuredProducts.findIndex((p: any) => p.id === productId);
    if (index >= featuredProducts.length - 1) return;
    const ids = featuredProducts.map((p: any) => p.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    reorderFeatured.mutate({ productIds: ids });
  };

  return (
    <div className="space-y-6">
      {/* Current Featured Products */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Featured Products ({featuredProducts?.length || 0})</h3>
            <p className="text-sm text-muted-foreground">These items appear in the "Customer Favourites" carousel on the homepage. Drag to reorder.</p>
          </div>
        </div>

        {featuredProducts && featuredProducts.length > 0 ? (
          <div className="space-y-2">
            {featuredProducts.map((product: any, index: number) => (
              <div key={product.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                <span className="text-sm font-mono text-muted-foreground w-6">{index + 1}</span>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">No img</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.categoryName} &middot; {product.subcategoryName}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleMoveUp(product.id)} disabled={index === 0}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleMoveDown(product.id)} disabled={index === featuredProducts.length - 1}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleToggle(product.id, false)}
                    className="text-destructive hover:text-destructive"
                  >
                    <StarOff className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No featured products yet. Add some below.</p>
        )}
      </Card>

      {/* Add Products */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Add Featured Products</h3>
          <p className="text-sm text-muted-foreground">Search and select products to feature on the homepage</p>
        </div>

        <Input
          placeholder="Search products by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        {nonFeaturedProducts.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {nonFeaturedProducts.map((product: any) => (
              <div key={product.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">No img</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.categoryName} &middot; {product.subcategoryName}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleToggle(product.id, true)}
                  className="gap-1"
                >
                  <Star className="w-4 h-4" /> Feature
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            {searchQuery ? 'No matching products found' : 'All active products are already featured'}
          </p>
        )}
      </Card>
    </div>
  );
}
