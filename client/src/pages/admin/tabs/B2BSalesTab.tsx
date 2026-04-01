import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, FileText, IndianRupee, Building2, ChevronDown, ChevronUp, Eye } from 'lucide-react';

function formatCurrency(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | Date) {
  const d = typeof dateStr === 'string' ? new Date(dateStr + 'T00:00:00') : dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  popup_event: 'Popup Event',
  catering: 'Catering',
  corporate_order: 'Corporate Order',
  masterclass: 'Masterclass',
  franchise_fee: 'Franchise Fee',
  other: 'Other',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-800',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-200 text-red-900',
};

const TDS_SECTIONS = [
  { value: '194J', label: '194J - Professional Services (10%)' },
  { value: '194C', label: '194C - Contractors (1-2%)' },
  { value: '194H', label: '194H - Commission (5%)' },
  { value: '194I', label: '194I - Rent (10%)' },
  { value: 'other', label: 'Other' },
];

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number; // in rupees for form, converted to paise on submit
  hsnCode: string;
  gstRate: number;
}

export default function B2BSalesTab() {
  const utils = trpc.useUtils();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form state
  const [form, setForm] = useState({
    invoiceNumber: '',
    invoiceDate: todayStr,
    clientName: '',
    clientGstin: '',
    clientAddress: '',
    clientState: '',
    clientStateCode: '',
    category: 'popup_event' as string,
    description: '',
    gstRate: 18,
    isInterState: false,
    tdsApplicable: false,
    tdsSection: '',
    tdsRate: 0,
    paymentStatus: 'unpaid' as string,
    amountReceived: 0,
    paymentDate: '',
    paymentReference: '',
    paymentMode: '' as string,
    notes: '',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 18 },
  ]);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: 'paid' as string,
    amountReceived: 0,
    paymentDate: todayStr,
    paymentReference: '',
    paymentMode: 'bank_transfer' as string,
    tdsApplicable: false,
    tdsSection: '',
    tdsRate: 0,
    tdsAmount: 0,
    notes: '',
  });

  // Queries
  const queryInput = useMemo(() => ({
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(filterStatus !== 'all' ? { paymentStatus: filterStatus as any } : {}),
  }), [startDate, endDate, filterStatus]);

  const { data: invoices, isLoading } = trpc.b2b.list.useQuery(
    Object.keys(queryInput).length > 0 ? queryInput : undefined
  );
  const { data: summary } = trpc.b2b.summary.useQuery(
    startDate || endDate ? { startDate, endDate } : undefined
  );

  // Mutations
  const createMutation = trpc.b2b.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Invoice ${data.invoiceNumber} created. Total: ${formatCurrency(data.totalAmount)}`);
      utils.b2b.list.invalidate();
      utils.b2b.summary.invalidate();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updatePaymentMutation = trpc.b2b.updatePayment.useMutation({
    onSuccess: () => {
      toast.success('Payment details have been saved.');
      utils.b2b.list.invalidate();
      utils.b2b.summary.invalidate();
      setShowPaymentDialog(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.b2b.delete.useMutation({
    onSuccess: () => {
      toast.success('Invoice has been deleted.');
      utils.b2b.list.invalidate();
      utils.b2b.summary.invalidate();
    },
  });

  function resetForm() {
    setForm({
      invoiceNumber: '',
      invoiceDate: todayStr,
      clientName: '',
      clientGstin: '',
      clientAddress: '',
      clientState: '',
      clientStateCode: '',
      category: 'popup_event',
      description: '',
      gstRate: 18,
      isInterState: false,
      tdsApplicable: false,
      tdsSection: '',
      tdsRate: 0,
      paymentStatus: 'unpaid',
      amountReceived: 0,
      paymentDate: '',
      paymentReference: '',
      paymentMode: '',
      notes: '',
    });
    setLineItems([{ description: '', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 18 }]);
  }

  function addLineItem() {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, hsnCode: '', gstRate: 18 }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: any) {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  }

  const subtotalRupees = lineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const gstAmountRupees = subtotalRupees * (form.gstRate / 100);
  const totalRupees = subtotalRupees + gstAmountRupees;
  const tdsAmountRupees = form.tdsApplicable ? subtotalRupees * (form.tdsRate / 100) : 0;
  const netReceivableRupees = totalRupees - tdsAmountRupees;

  function handleSubmit() {
    if (!form.invoiceNumber || !form.clientName || lineItems.some(li => !li.description || li.unitPrice <= 0)) {
      toast.error('Please fill in all required fields.');
      return;
    }
    createMutation.mutate({
      ...form,
      category: form.category as any,
      paymentStatus: form.paymentStatus as any,
      paymentMode: form.paymentMode ? form.paymentMode as any : undefined,
      items: lineItems.map(li => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: Math.round(li.unitPrice * 100), // Convert to paise
        hsnCode: li.hsnCode || undefined,
        gstRate: li.gstRate,
      })),
      amountReceived: Math.round(form.amountReceived * 100),
      tdsRate: form.tdsRate || undefined,
      tdsSection: form.tdsSection || undefined,
    });
  }

  function openPaymentDialog(invoiceId: number) {
    const inv = invoices?.find(i => i.id === invoiceId);
    if (inv) {
      setPaymentForm({
        paymentStatus: 'paid',
        amountReceived: inv.amountReceived / 100,
        paymentDate: todayStr,
        paymentReference: inv.paymentReference || '',
        paymentMode: inv.paymentMode || 'bank_transfer',
        tdsApplicable: inv.tdsApplicable,
        tdsSection: inv.tdsSection || '',
        tdsRate: inv.tdsRate || 0,
        tdsAmount: inv.tdsAmount / 100,
        notes: inv.notes || '',
      });
    }
    setSelectedInvoiceId(invoiceId);
    setShowPaymentDialog(true);
  }

  function handlePaymentSubmit() {
    if (!selectedInvoiceId) return;
    updatePaymentMutation.mutate({
      id: selectedInvoiceId,
      paymentStatus: paymentForm.paymentStatus as any,
      amountReceived: Math.round(paymentForm.amountReceived * 100),
      paymentDate: paymentForm.paymentDate || undefined,
      paymentReference: paymentForm.paymentReference || undefined,
      paymentMode: paymentForm.paymentMode ? paymentForm.paymentMode as any : undefined,
      tdsApplicable: paymentForm.tdsApplicable,
      tdsSection: paymentForm.tdsSection || undefined,
      tdsRate: paymentForm.tdsRate || undefined,
      tdsAmount: Math.round(paymentForm.tdsAmount * 100),
      notes: paymentForm.notes || undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">B2B Sales</h2>
          <p className="text-muted-foreground">Manage external invoices for popup events, catering, corporate orders, and masterclasses</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create B2B Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Invoice Number *</Label>
                  <Input value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="e.g., 2303" />
                </div>
                <div>
                  <Label>Invoice Date *</Label>
                  <Input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} />
                </div>
              </div>

              {/* Client Details */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Client Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Client Name *</Label>
                    <Input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="e.g., The Leela" />
                  </div>
                  <div>
                    <Label>Client GSTIN</Label>
                    <Input value={form.clientGstin} onChange={e => setForm({ ...form, clientGstin: e.target.value })} placeholder="e.g., 36AABCP1234A1ZF" />
                  </div>
                </div>
                <div>
                  <Label>Client Address</Label>
                  <Input value={form.clientAddress} onChange={e => setForm({ ...form, clientAddress: e.target.value })} placeholder="Full address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>State</Label>
                    <Input value={form.clientState} onChange={e => setForm({ ...form, clientState: e.target.value })} placeholder="e.g., Telangana" />
                  </div>
                  <div>
                    <Label>State Code</Label>
                    <Input value={form.clientStateCode} onChange={e => setForm({ ...form, clientStateCode: e.target.value })} placeholder="e.g., 36" />
                  </div>
                </div>
              </div>

              {/* Category & Description */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>GST Rate (%)</Label>
                  <Select value={String(form.gstRate)} onValueChange={v => setForm({ ...form, gstRate: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isInterState} onCheckedChange={v => setForm({ ...form, isInterState: v })} />
                <Label>Inter-state supply (IGST instead of CGST+SGST)</Label>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the sale" />
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Line Items</h3>
                  <Button variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                    <div className="col-span-5">
                      <Label className="text-xs">Description *</Label>
                      <Input value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} placeholder="Item description" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min={1} value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', Number(e.target.value))} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Unit Price (₹)</Label>
                      <Input type="number" min={0} step={0.01} value={item.unitPrice || ''} onChange={e => updateLineItem(idx, 'unitPrice', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1 text-right font-medium text-sm pt-5">
                      ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                    </div>
                    <div className="col-span-1 pt-5">
                      {lineItems.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLineItem(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* TDS Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={form.tdsApplicable} onCheckedChange={v => setForm({ ...form, tdsApplicable: v })} />
                  <Label>TDS Applicable</Label>
                </div>
                {form.tdsApplicable && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                    <div>
                      <Label>TDS Section</Label>
                      <Select value={form.tdsSection} onValueChange={v => {
                        const rate = v === '194J' ? 10 : v === '194C' ? 2 : v === '194H' ? 5 : v === '194I' ? 10 : 0;
                        setForm({ ...form, tdsSection: v, tdsRate: rate });
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                        <SelectContent>
                          {TDS_SECTIONS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>TDS Rate (%)</Label>
                      <Input type="number" min={0} max={100} value={form.tdsRate || ''} onChange={e => setForm({ ...form, tdsRate: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Totals */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal (before GST)</span>
                    <span className="font-medium">₹{subtotalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{form.isInterState ? `IGST (${form.gstRate}%)` : `CGST (${form.gstRate/2}%) + SGST (${form.gstRate/2}%)`}</span>
                    <span className="font-medium">₹{gstAmountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Invoice Total</span>
                    <span>₹{totalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {form.tdsApplicable && form.tdsRate > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-orange-600">
                        <span>TDS @ {form.tdsRate}% (on ₹{subtotalRupees.toLocaleString('en-IN')})</span>
                        <span>-₹{tdsAmountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-bold text-green-700">
                        <span>Net Receivable</span>
                        <span>₹{netReceivableRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total Invoiced</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalInvoiced)}</p>
              <p className="text-xs text-muted-foreground">{summary.invoiceCount} invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Amount Received</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalReceived)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalOutstanding)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">TDS Deducted</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(summary.totalTds)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">GST Collected</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(summary.totalGst)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setStartDate(''); setEndDate(''); setFilterStatus('all'); }}>
          Clear Filters
        </Button>
      </div>

      {/* Invoice List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
      ) : !invoices || invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No B2B Invoices</h3>
            <p className="text-muted-foreground mb-4">Create your first invoice to start tracking B2B sales.</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <Card key={inv.id} className="overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{inv.clientName}</span>
                      <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[inv.category] || inv.category}</Badge>
                      <Badge className={`text-xs ${PAYMENT_STATUS_COLORS[inv.paymentStatus]}`}>
                        {inv.paymentStatus.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Inv #{inv.invoiceNumber} &middot; {formatDate(inv.invoiceDate)}
                      {inv.clientGstin && <span> &middot; GSTIN: {inv.clientGstin}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(inv.totalAmount)}</p>
                    {inv.tdsAmount > 0 && (
                      <p className="text-xs text-orange-600">TDS: {formatCurrency(inv.tdsAmount)}</p>
                    )}
                  </div>
                  {expandedInvoice === inv.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedInvoice === inv.id && (
                <div className="border-t px-4 pb-4 pt-3 space-y-4 bg-muted/10">
                  {/* Line Items */}
                  {inv.items && inv.items.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Line Items</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-1">Description</th>
                            <th className="text-right py-1">Qty</th>
                            <th className="text-right py-1">Unit Price</th>
                            <th className="text-right py-1">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-dashed">
                              <td className="py-1">{item.description}</td>
                              <td className="text-right py-1">{item.quantity}</td>
                              <td className="text-right py-1">{formatCurrency(item.unitPrice)}</td>
                              <td className="text-right py-1">{formatCurrency(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Financial Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(inv.subtotal)}</span></div>
                      {inv.igst > 0 ? (
                        <div className="flex justify-between"><span>IGST ({inv.gstRate}%):</span><span>{formatCurrency(inv.igst)}</span></div>
                      ) : (
                        <>
                          <div className="flex justify-between"><span>CGST ({inv.gstRate/2}%):</span><span>{formatCurrency(inv.cgst)}</span></div>
                          <div className="flex justify-between"><span>SGST ({inv.gstRate/2}%):</span><span>{formatCurrency(inv.sgst)}</span></div>
                        </>
                      )}
                      <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>{formatCurrency(inv.totalAmount)}</span></div>
                    </div>
                    <div className="space-y-1 text-sm">
                      {inv.tdsApplicable && (
                        <>
                          <div className="flex justify-between text-orange-600">
                            <span>TDS ({inv.tdsSection} @ {inv.tdsRate}%):</span>
                            <span>-{formatCurrency(inv.tdsAmount)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-green-600">
                        <span>Received:</span><span>{formatCurrency(inv.amountReceived)}</span>
                      </div>
                      {inv.paymentReference && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Ref:</span><span>{inv.paymentReference}</span>
                        </div>
                      )}
                      {inv.paymentDate && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Payment Date:</span><span>{formatDate(inv.paymentDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {inv.notes && (
                    <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                      <strong>Notes:</strong> {inv.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openPaymentDialog(inv.id); }}>
                      <IndianRupee className="w-3 h-3 mr-1" /> Update Payment
                    </Button>
                    <Button size="sm" variant="destructive" onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this invoice? This cannot be undone.')) {
                        deleteMutation.mutate({ id: inv.id });
                      }
                    }}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Payment Update Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Payment Status</Label>
              <Select value={paymentForm.paymentStatus} onValueChange={v => setPaymentForm({ ...paymentForm, paymentStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount Received (₹)</Label>
              <Input type="number" min={0} step={0.01} value={paymentForm.amountReceived || ''} onChange={e => setPaymentForm({ ...paymentForm, amountReceived: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
            </div>
            <div>
              <Label>Payment Reference (NEFT/UTR)</Label>
              <Input value={paymentForm.paymentReference} onChange={e => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })} placeholder="e.g., NEFT ref number" />
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={paymentForm.paymentMode} onValueChange={v => setPaymentForm({ ...paymentForm, paymentMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={paymentForm.tdsApplicable} onCheckedChange={v => setPaymentForm({ ...paymentForm, tdsApplicable: v })} />
                <Label>TDS Deducted</Label>
              </div>
              {paymentForm.tdsApplicable && (
                <div className="grid grid-cols-2 gap-3 pl-4 border-l-2">
                  <div>
                    <Label className="text-xs">Section</Label>
                    <Select value={paymentForm.tdsSection} onValueChange={v => setPaymentForm({ ...paymentForm, tdsSection: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {TDS_SECTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">TDS Amount (₹)</Label>
                    <Input type="number" min={0} step={0.01} value={paymentForm.tdsAmount || ''} onChange={e => setPaymentForm({ ...paymentForm, tdsAmount: Number(e.target.value) })} />
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handlePaymentSubmit} disabled={updatePaymentMutation.isPending}>
              {updatePaymentMutation.isPending ? 'Saving...' : 'Save Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
