import { useState, useRef } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, Calendar, FileText, Send, Upload, ImageIcon, X, Loader2 } from 'lucide-react';

type ArticleStatus = 'draft' | 'pending_review' | 'published' | 'archived';

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  imageUrl: string | null;
  authorName: string | null;
  status: ArticleStatus;
  publishedAt: Date | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Image upload component used in both create and edit dialogs
function BlogImageUploader({ 
  currentImageUrl, 
  articleId,
  onImageChange,
  onImageUploaded,
}: { 
  currentImageUrl: string | null;
  articleId?: number; // Only for existing articles
  onImageChange: (url: string | null) => void;
  onImageUploaded?: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);

  // @ts-ignore
  const uploadMutation = (trpc as any).blog.uploadImage.useMutation({
    onSuccess: (data: { imageUrl: string }) => {
      toast.success('Image uploaded successfully');
      setPreviewUrl(data.imageUrl);
      onImageChange(data.imageUrl);
      onImageUploaded?.(data.imageUrl);
      setIsUploading(false);
      setPendingBase64(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload image');
      setIsUploading(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be less than 20MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreviewUrl(base64);
      
      if (articleId) {
        // For existing articles, upload immediately
        setIsUploading(true);
        uploadMutation.mutate({
          articleId,
          imageBase64: base64,
        });
      } else {
        // For new articles, store base64 for later upload
        setPendingBase64(base64);
        onImageChange(base64);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setPendingBase64(null);
    onImageChange(null);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        Featured Image
      </Label>
      
      {previewUrl ? (
        <div className="relative group">
          <img 
            src={previewUrl} 
            alt="Featured image preview" 
            className="w-full h-48 object-cover rounded-lg border border-border"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="flex items-center gap-2 text-white">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Uploading...</span>
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 bg-white/90 hover:bg-white shadow-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="w-3 h-3 mr-1" />
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-8 shadow-sm"
              onClick={handleRemoveImage}
              disabled={isUploading}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
        >
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Click to upload featured image</span>
          <span className="text-xs text-muted-foreground">JPG, PNG, WebP (max 20MB)</span>
        </button>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}

export default function AdminBlog() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [filterStatus, setFilterStatus] = useState<ArticleStatus | 'all'>('all');
  const [createImageBase64, setCreateImageBase64] = useState<string | null>(null);

  // @ts-ignore - blog router types
  const { data: articles, isLoading, refetch } = (trpc as any).blog.getAll.useQuery(
    filterStatus === 'all' ? {} : { status: filterStatus }
  );

  // @ts-ignore
  const createMutation = (trpc as any).blog.create.useMutation({
    onSuccess: async (data: { id: number }) => {
      // If there's a pending image, upload it now
      if (createImageBase64 && data.id) {
        try {
          // @ts-ignore
          await (trpc as any).blog.uploadImage.mutate({
            articleId: data.id,
            imageBase64: createImageBase64,
          });
        } catch (err) {
          // Image upload failed but article was created
          toast.info('Article created, but image upload failed. You can add the image later.');
        }
      }
      toast.success('Article created successfully');
      setIsCreateOpen(false);
      setCreateImageBase64(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create article');
    },
  });

  // @ts-ignore
  const uploadImageAfterCreate = (trpc as any).blog.uploadImage.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // @ts-ignore
  const updateMutation = (trpc as any).blog.update.useMutation({
    onSuccess: () => {
      toast.success('Article updated successfully');
      setEditingArticle(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update article');
    },
  });

  // @ts-ignore
  const deleteMutation = (trpc as any).blog.delete.useMutation({
    onSuccess: () => {
      toast.success('Article deleted');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete article');
    },
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const result = await createMutation.mutateAsync({
      title,
      slug,
      excerpt: formData.get('excerpt') as string || undefined,
      content: formData.get('content') as string,
      metaTitle: formData.get('metaTitle') as string || undefined,
      metaDescription: formData.get('metaDescription') as string || undefined,
      keywords: formData.get('keywords') as string || undefined,
      authorName: 'Taiwan Maami',
      status: 'draft',
    });

    // Upload image if one was selected
    if (createImageBase64 && result?.id) {
      uploadImageAfterCreate.mutate({
        articleId: result.id,
        imageBase64: createImageBase64,
      });
    }

    toast.success('Article created successfully');
    setIsCreateOpen(false);
    setCreateImageBase64(null);
    refetch();
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingArticle) return;
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    updateMutation.mutate({
      id: editingArticle.id,
      title,
      slug,
      excerpt: formData.get('excerpt') as string || undefined,
      content: formData.get('content') as string,
      metaTitle: formData.get('metaTitle') as string || undefined,
      metaDescription: formData.get('metaDescription') as string || undefined,
      keywords: formData.get('keywords') as string || undefined,
      status: formData.get('status') as ArticleStatus,
    });
  };

  const handleSubmitForReview = (article: Article) => {
    updateMutation.mutate({
      id: article.id,
      status: 'pending_review',
    });
    toast.info('Article submitted for Theresa\'s review');
  };

  const handlePublish = (article: Article) => {
    updateMutation.mutate({
      id: article.id,
      status: 'published',
    });
  };

  const getStatusBadge = (status: ArticleStatus) => {
    const variants: Record<ArticleStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      pending_review: { variant: 'outline', label: 'Pending Review' },
      published: { variant: 'default', label: 'Published' },
      archived: { variant: 'destructive', label: 'Archived' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Blog Management</h1>
            <p className="text-muted-foreground">Create and manage SEO-optimized blog articles</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) setCreateImageBase64(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Article</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Featured Image Upload */}
                <BlogImageUploader
                  currentImageUrl={null}
                  onImageChange={(url) => setCreateImageBase64(url)}
                />

                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" name="title" required placeholder="e.g., Best Bubble Tea Flavors in Chennai" />
                </div>
                <div>
                  <Label htmlFor="excerpt">Excerpt (Short Summary)</Label>
                  <Textarea id="excerpt" name="excerpt" rows={2} placeholder="A brief summary for the blog listing page" />
                </div>
                <div>
                  <Label htmlFor="content">Content (HTML) *</Label>
                  <Textarea id="content" name="content" required rows={10} placeholder="<h2>Introduction</h2><p>Your content here...</p>" />
                  <p className="text-xs text-muted-foreground mt-1">Use HTML tags: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt;</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="metaTitle">SEO Title</Label>
                    <Input id="metaTitle" name="metaTitle" placeholder="Page title for search engines" maxLength={60} />
                  </div>
                  <div>
                    <Label htmlFor="metaDescription">SEO Description</Label>
                    <Input id="metaDescription" name="metaDescription" placeholder="Description for search results" maxLength={160} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input id="keywords" name="keywords" placeholder="bubble tea Chennai, boba, Taiwan milk tea" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setCreateImageBase64(null); }}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Draft'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Label>Filter by status:</Label>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Articles</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Articles List */}
        {isLoading ? (
          <div className="text-center py-12">Loading articles...</div>
        ) : articles?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No articles yet</h3>
              <p className="text-muted-foreground mb-4">Create your first blog article to improve SEO</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Article
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {articles?.map((article: Article) => (
              <Card key={article.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    {article.imageUrl ? (
                      <img 
                        src={article.imageUrl} 
                        alt={article.title}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-border"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{article.title}</h3>
                        {getStatusBadge(article.status)}
                      </div>
                      {article.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{article.excerpt}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(article.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {article.viewCount} views
                        </span>
                        {article.keywords && (
                          <span className="truncate max-w-xs">Keywords: {article.keywords}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {article.status === 'draft' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSubmitForReview(article)}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Submit for Review
                        </Button>
                      )}
                      {article.status === 'pending_review' && (
                        <Button 
                          size="sm"
                          onClick={() => handlePublish(article)}
                        >
                          Publish
                        </Button>
                      )}
                      <Link href={`/blog/${article.slug}`} target="_blank">
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setEditingArticle(article)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Delete this article?')) {
                            deleteMutation.mutate({ id: article.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingArticle} onOpenChange={(open) => !open && setEditingArticle(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Article</DialogTitle>
            </DialogHeader>
            {editingArticle && (
              <form onSubmit={handleUpdate} className="space-y-4">
                {/* Featured Image Upload */}
                <BlogImageUploader
                  currentImageUrl={editingArticle.imageUrl}
                  articleId={editingArticle.id}
                  onImageChange={(url) => {
                    // Update the editing article state so the thumbnail updates
                    setEditingArticle(prev => prev ? { ...prev, imageUrl: url } : null);
                  }}
                  onImageUploaded={() => {
                    refetch(); // Refresh the list to show new thumbnail
                  }}
                />

                <div>
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input id="edit-title" name="title" required defaultValue={editingArticle.title} />
                </div>
                <div>
                  <Label htmlFor="edit-excerpt">Excerpt</Label>
                  <Textarea id="edit-excerpt" name="excerpt" rows={2} defaultValue={editingArticle.excerpt || ''} />
                </div>
                <div>
                  <Label htmlFor="edit-content">Content (HTML) *</Label>
                  <Textarea id="edit-content" name="content" required rows={10} defaultValue={editingArticle.content} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-metaTitle">SEO Title</Label>
                    <Input id="edit-metaTitle" name="metaTitle" defaultValue={editingArticle.metaTitle || ''} maxLength={60} />
                  </div>
                  <div>
                    <Label htmlFor="edit-metaDescription">SEO Description</Label>
                    <Input id="edit-metaDescription" name="metaDescription" defaultValue={editingArticle.metaDescription || ''} maxLength={160} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-keywords">Keywords</Label>
                  <Input id="edit-keywords" name="keywords" defaultValue={editingArticle.keywords || ''} />
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select name="status" defaultValue={editingArticle.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditingArticle(null)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
