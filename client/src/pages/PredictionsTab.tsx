import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  Package,
  RefreshCw,
  DollarSign,
  Download,
  FileSpreadsheet,
} from "lucide-react";

const formatCurrency = (paise: number) => {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type PeriodOption = {
  label: string;
  value: string;
  getRange: () => { start: string; end: string };
};

function getPeriodOptions(): PeriodOption[] {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];

  return [
    {
      label: "All Data (Jan 2026+)",
      value: "all",
      getRange: () => ({ start: "2026-01-01", end: todayStr }),
    },
    {
      label: "Last 1 Week",
      value: "1w",
      getRange: () => ({ start: daysAgo(7), end: todayStr }),
    },
    {
      label: "Last 2 Weeks",
      value: "2w",
      getRange: () => ({ start: daysAgo(14), end: todayStr }),
    },
    {
      label: "This Month",
      value: "this_month",
      getRange: () => ({ start: monthStart, end: todayStr }),
    },
    {
      label: "Last Month",
      value: "last_month",
      getRange: () => ({ start: lastMonthStart, end: lastMonthEnd }),
    },
  ];
}

export default function PredictionsTab() {
  const today = new Date();
  const [projYear] = useState(today.getFullYear());
  const [projMonth] = useState(today.getMonth() + 1);
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  const periodOptions = useMemo(() => getPeriodOptions(), []);
  const currentPeriod = useMemo(
    () => periodOptions.find((p) => p.value === selectedPeriod) || periodOptions[0],
    [selectedPeriod, periodOptions]
  );
  const dateRange = useMemo(() => currentPeriod.getRange(), [currentPeriod]);

  // Queries — all use period selector except monthly projection
  const { data: projection, isLoading: loadingProj, refetch: refetchProj } =
    trpc.analytics.getMonthlyProjection.useQuery({ year: projYear, month: projMonth });

  const { data: totalForecast, isLoading: loadingTotal, refetch: refetchTotal } =
    trpc.analytics.getTotalSalesForecast.useQuery({
      startDate: dateRange.start,
      endDate: dateRange.end,
    });

  const { data: itemForecast, isLoading: loadingItems, refetch: refetchItems } =
    trpc.analytics.getItemDemandForecast.useQuery({
      startDate: dateRange.start,
      endDate: dateRange.end,
    });

  const { data: procurement, isLoading: loadingProc, refetch: refetchProc } =
    trpc.analytics.getProcurementForecast.useQuery({
      startDate: dateRange.start,
      endDate: dateRange.end,
    });

  const { data: trends, isLoading: loadingTrends } =
    trpc.analytics.getTrendAlerts.useQuery(undefined);

  const { data: accuracy } =
    trpc.analytics.getForecastAccuracy.useQuery({ year: projYear, month: projMonth });

  const isLoading = loadingProj || loadingItems || loadingProc || loadingTrends || loadingTotal;

  const handleRefresh = () => {
    refetchProj();
    refetchTotal();
    refetchItems();
    refetchProc();
  };

  // ========== Excel Export Functions ==========
  const exportToCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => {
      // Escape cells containing commas or quotes
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportTotalSalesForecast = () => {
    if (!totalForecast) return;
    const headers = ['Metric', 'Value'];
    const rows: string[][] = [
      ['Period', `${totalForecast.dateRange.start} to ${totalForecast.dateRange.end}`],
      ['Operating Days', String(totalForecast.totalOperatingDays)],
      ['Daily Avg Revenue (paise)', String(totalForecast.dailyAvgRevenue)],
      ['Daily Avg Orders', String(totalForecast.dailyAvgOrders)],
      ['Website Revenue (paise)', String(totalForecast.websiteRevenue)],
      ['Delivery Revenue (paise)', String(totalForecast.deliveryRevenue)],
      ['Combined Revenue (paise)', String(totalForecast.combinedRevenue)],
      ['Website Share %', `${totalForecast.websiteShare}%`],
      ['Next 7 Days Projected Revenue (paise)', String(totalForecast.next7Revenue)],
      ['Next 7 Days Projected Orders', String(totalForecast.next7Orders)],
      ['Month Remaining Revenue (paise)', String(totalForecast.monthRemainingRevenue)],
      ['Days Remaining in Month', String(totalForecast.daysRemaining)],
      ['', ''],
      ['--- Next 7 Days Breakdown ---', ''],
      ['Date', 'Day', 'Website Revenue', 'Delivery Revenue', 'Total Revenue', 'Est. Orders'],
    ];
    for (const day of totalForecast.next7Days) {
      rows.push([day.date, day.dayName, String(day.websiteRevenue), String(day.deliveryRevenue), String(day.totalRevenue), String(day.estOrders)]);
    }
    rows.push(['', ''], ['--- Category Breakdown ---', '']);
    rows.push(['Category', 'Revenue (paise)', 'Items', 'Percentage']);
    for (const cat of totalForecast.categoryBreakdown) {
      rows.push([cat.name, String(cat.revenue), String(cat.items), `${cat.percentage}%`]);
    }
    rows.push(['', ''], ['--- DOW Revenue Averages ---', '']);
    rows.push(['Day', 'Website Revenue', 'Delivery Revenue', 'Total Revenue', 'Total Orders']);
    for (const dow of totalForecast.dowAverages) {
      rows.push([dow.dayFull, String(Math.round(dow.websiteRevenue)), String(Math.round(dow.deliveryRevenue)), String(Math.round(dow.totalRevenue)), String(Math.round(dow.totalOrders * 10) / 10)]);
    }
    exportToCSV(`total-sales-forecast-${dateRange.start}-${dateRange.end}`, headers, rows);
  };

  const exportItemDemandHeatmap = () => {
    if (!itemForecast) return;
    const headers = ['Product', 'Total Qty', 'Website Qty', 'Delivery Qty', 'Daily Avg', 'Peak Day', 'Reliability', ...DOW_SHORT.map(d => `${d} Avg`), ...DOW_SHORT.map(d => `${d} Estimated?`)];
    const rows: string[][] = itemForecast.items.map((item: any) => [
      item.productName,
      String(item.totalQty),
      String(item.websiteQty),
      String(item.deliveryQty),
      String(item.dailyAvg),
      item.peakDay,
      item.reliability,
      ...item.dowBreakdown.map((d: any) => String(d.avgQty)),
      ...item.dowBreakdown.map((d: any) => d.isEstimated ? 'Yes' : 'No'),
    ]);
    exportToCSV(`item-demand-heatmap-${dateRange.start}-${dateRange.end}`, headers, rows);
  };

  const exportProcurementForecast = () => {
    if (!procurement) return;
    const dayHeaders = procurement.nextDays.map((d: any) => `${d.dayName} (${d.date})`);
    const headers = ['Product', 'Week Total', 'Peak Day', 'Reliability', ...dayHeaders];
    const rows: string[][] = procurement.items.map((item: any) => [
      item.productName,
      String(item.weekTotal),
      item.peakDay,
      item.reliability,
      ...item.dailyForecast.map((d: any) => String(d.expectedQty)),
    ]);
    exportToCSV(`procurement-forecast-${dateRange.start}-${dateRange.end}`, headers, rows);
  };

  const exportAllPredictions = () => {
    exportTotalSalesForecast();
    setTimeout(() => exportItemDemandHeatmap(), 200);
    setTimeout(() => exportProcurementForecast(), 400);
  };

  // Heatmap color for item demand
  const getHeatColor = (qty: number, maxQty: number) => {
    if (qty === 0) return "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600";
    const intensity = maxQty > 0 ? qty / maxQty : 0;
    if (intensity > 0.75) return "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100 font-bold";
    if (intensity > 0.5) return "bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100 font-semibold";
    if (intensity > 0.25) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    return "bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200";
  };

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            Predictive Analytics
          </h2>
          <p className="text-muted-foreground mt-1">
            Revenue, order & food item forecasts combining website + delivery channel data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Training period" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportAllPredictions} disabled={isLoading || (!totalForecast && !itemForecast && !procurement)}>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-3 animate-pulse text-amber-500" />
          <p>Crunching numbers...</p>
        </div>
      ) : (
        <>
          {/* ========== SECTION 0: Total Sales Forecast ========== */}
          {totalForecast && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                    Total Sales Forecast — All Categories
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={exportTotalSalesForecast} title="Export to CSV">
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">CSV</span>
                  </Button>
                </div>
                <CardDescription>
                  Revenue & order predictions across all products (drinks, food, desserts, delivery)
                  {" · "}Based on {totalForecast.dateRange.start} to {totalForecast.dateRange.end}
                  {" · "}{totalForecast.totalOperatingDays} operating days
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-4">
                    <div className="text-sm text-emerald-600 dark:text-emerald-400">Daily Avg Revenue</div>
                    <div className="text-xl font-bold mt-1">{formatCurrency(totalForecast.dailyAvgRevenue)}</div>
                    <div className="text-xs text-muted-foreground">All channels combined</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                    <div className="text-sm text-blue-600 dark:text-blue-400">Daily Avg Orders</div>
                    <div className="text-xl font-bold mt-1">{totalForecast.dailyAvgOrders}</div>
                    <div className="text-xs text-muted-foreground">Website + Delivery</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4">
                    <div className="text-sm text-amber-600 dark:text-amber-400">Next 7 Days</div>
                    <div className="text-xl font-bold mt-1">{formatCurrency(totalForecast.next7Revenue)}</div>
                    <div className="text-xs text-muted-foreground">~{totalForecast.next7Orders} orders</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
                    <div className="text-sm text-purple-600 dark:text-purple-400">Month Remaining</div>
                    <div className="text-xl font-bold mt-1">{formatCurrency(totalForecast.monthRemainingRevenue)}</div>
                    <div className="text-xs text-muted-foreground">{totalForecast.daysRemaining} days left</div>
                  </div>
                </div>

                {/* Period totals by channel */}
                <div>
                  <h4 className="font-semibold mb-3">Period Totals by Channel</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Website Revenue</div>
                      <div className="text-lg font-bold">{formatCurrency(totalForecast.websiteRevenue)}</div>
                      <div className="text-xs text-muted-foreground">{totalForecast.websiteOrders} orders · {totalForecast.websiteItems} items</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Delivery Revenue</div>
                      <div className="text-lg font-bold">{formatCurrency(totalForecast.deliveryRevenue)}</div>
                      <div className="text-xs text-muted-foreground">{totalForecast.deliveryOrders} orders</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Combined Total</div>
                      <div className="text-lg font-bold">{formatCurrency(totalForecast.combinedRevenue)}</div>
                      <div className="text-xs text-muted-foreground">{totalForecast.combinedOrders} total orders</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Website Share</div>
                      <div className="text-lg font-bold">{totalForecast.websiteShare}%</div>
                      <div className="text-xs text-muted-foreground">of total revenue</div>
                    </div>
                  </div>
                </div>

                {/* Next 7 days daily breakdown */}
                <div>
                  <h4 className="font-semibold mb-3">Next 7 Days — Daily Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Day</th>
                          <th className="text-right p-2">Website Rev</th>
                          <th className="text-right p-2">Delivery Rev</th>
                          <th className="text-right p-2 font-bold">Total Rev</th>
                          <th className="text-center p-2">Est. Orders</th>
                          <th className="text-center p-2">Est. Items</th>
                        </tr>
                      </thead>
                      <tbody>
                        {totalForecast.next7Days.map((day) => (
                          <tr key={day.date} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div className="font-medium">{day.dayShort}</div>
                              <div className="text-xs text-muted-foreground">{day.date.slice(5)}</div>
                            </td>
                            <td className="text-right p-2">{formatCurrency(day.websiteRevenue)}</td>
                            <td className="text-right p-2 text-muted-foreground">{formatCurrency(day.deliveryRevenue)}</td>
                            <td className="text-right p-2 font-semibold">{formatCurrency(day.totalRevenue)}</td>
                            <td className="text-center p-2">{day.estOrders}</td>
                            <td className="text-center p-2">{day.estItems}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/50 font-bold">
                          <td className="p-2">Week Total</td>
                          <td className="text-right p-2">{formatCurrency(totalForecast.next7Days.reduce((s, d) => s + d.websiteRevenue, 0))}</td>
                          <td className="text-right p-2">{formatCurrency(totalForecast.next7Days.reduce((s, d) => s + d.deliveryRevenue, 0))}</td>
                          <td className="text-right p-2">{formatCurrency(totalForecast.next7Revenue)}</td>
                          <td className="text-center p-2">{totalForecast.next7Orders}</td>
                          <td className="text-center p-2">{Math.round(totalForecast.next7Days.reduce((s, d) => s + d.estItems, 0) * 10) / 10}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Revenue by DOW chart */}
                <div>
                  <h4 className="font-semibold mb-3">Revenue by Day of Week (All Channels)</h4>
                  <div className="grid grid-cols-7 gap-2">
                    {totalForecast.dowAverages.map((dow) => {
                      const maxRev = Math.max(...totalForecast.dowAverages.map((d) => d.totalRevenue));
                      const websiteHeight = maxRev > 0 ? Math.max(5, (dow.websiteRevenue / maxRev) * 100) : 5;
                      const deliveryHeight = maxRev > 0 ? Math.max(3, (dow.deliveryRevenue / maxRev) * 100) : 3;
                      return (
                        <div key={dow.day} className="text-center">
                          <div className="h-24 flex items-end justify-center mb-1">
                            <div className="w-full max-w-[40px] flex flex-col items-stretch">
                              <div
                                className="bg-gradient-to-t from-blue-500 to-blue-300 dark:from-blue-600 dark:to-blue-400 rounded-t-md"
                                style={{ height: `${websiteHeight}%` }}
                                title={`Website: ${formatCurrency(dow.websiteRevenue)}`}
                              />
                              <div
                                className="bg-gradient-to-t from-orange-400 to-orange-300 dark:from-orange-600 dark:to-orange-500"
                                style={{ height: `${deliveryHeight}%` }}
                                title={`Delivery: ${formatCurrency(dow.deliveryRevenue)}`}
                              />
                            </div>
                          </div>
                          <div className="text-xs font-medium">{dow.day}</div>
                          <div className="text-[10px] text-muted-foreground">{formatCurrency(dow.totalRevenue)}</div>
                          <div className="text-[10px] text-muted-foreground">{Math.round(dow.totalOrders * 10) / 10} ord</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground justify-center">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Website</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block" /> Delivery</span>
                  </div>
                </div>

                {/* Category breakdown */}
                <div>
                  <h4 className="font-semibold mb-3">Revenue by Category</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {totalForecast.categoryBreakdown.map((cat) => (
                      <div key={cat.name} className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{cat.name}</span>
                          <span className="text-xs text-muted-foreground">{cat.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
                          <div
                            className={`h-1.5 rounded-full ${cat.name === "Delivery Channels" ? "bg-orange-400" : "bg-blue-400"}`}
                            style={{ width: `${Math.min(100, cat.percentage)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(cat.revenue)} · {cat.items} items</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ========== SECTION 2: Item Demand Heatmap ========== */}
          {itemForecast && itemForecast.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  Food Item Demand by Day of Week
                </CardTitle>
                <CardDescription>
                  Average daily quantity from {itemForecast.dateRange.start} to {itemForecast.dateRange.end}
                  {" · "}{itemForecast.totalFoodItems} food items
                  {" · "}{itemForecast.totalOperatingDays} operating days
                  {" · "}Website + Delivery channels combined
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 min-w-[160px]">Item</th>
                        {DOW_SHORT.map((d) => (
                          <th key={d} className="text-center p-2 min-w-[50px]">{d}</th>
                        ))}
                        <th className="text-center p-2 min-w-[60px]">Daily Avg</th>
                        <th className="text-center p-2 min-w-[50px]">Total</th>
                        <th className="text-center p-2 min-w-[60px]">Peak</th>
                        <th className="text-center p-2 min-w-[70px]">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemForecast.items.slice(0, 25).map((item) => {
                        const maxQty = Math.max(...item.dowBreakdown.map((d) => d.avgQty));
                        return (
                          <tr key={item.productName} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{item.productName}</td>
                            {item.dowBreakdown.map((dow) => (
                              <td
                                key={dow.day}
                                className={`text-center p-2 ${dow.isEstimated ? "bg-blue-50 dark:bg-blue-950" : getHeatColor(dow.avgQty, maxQty)}`}
                              >
                                {dow.avgQty > 0 ? (
                                  dow.isEstimated ? (
                                    <span className="italic text-blue-500 dark:text-blue-400 text-xs">~{dow.avgQty}</span>
                                  ) : (
                                    dow.avgQty
                                  )
                                ) : "—"}
                              </td>
                            ))}
                            <td className="text-center p-2 font-semibold">{item.dailyAvg}</td>
                            <td className="text-center p-2 text-muted-foreground">{item.totalQty}</td>
                            <td className="text-center p-2">
                              <Badge variant="outline" className="text-xs">{item.peakDay}</Badge>
                            </td>
                            <td className="text-center p-2">
                              {item.websiteQty > 0 && item.deliveryQty > 0 ? (
                                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-[10px]">
                                  Both
                                </Badge>
                              ) : item.deliveryQty > 0 ? (
                                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-[10px]">
                                  Delivery
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[10px]">
                                  Website
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900 inline-block" /> High demand</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-800 inline-block" /> Medium-high</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900 inline-block" /> Moderate</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 dark:bg-green-900 inline-block" /> Low</span>
                  <span className="italic text-blue-500">~Estimated</span>
                  <span className="ml-2">|</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 dark:bg-purple-900 inline-block" /> Both channels</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900 inline-block" /> Website only</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900 inline-block" /> Delivery only</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ========== SECTION 3: Procurement Planner ========== */}
          {procurement && procurement.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  7-Day Procurement Forecast
                </CardTitle>
                <CardDescription>
                  Expected food item demand for the next 7 days based on day-of-week patterns
                  {procurement.dateRange && ` · Training data: ${procurement.dateRange.start} to ${procurement.dateRange.end}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 min-w-[160px]">Item</th>
                        {procurement.nextDays.map((day) => (
                          <th key={day.date} className="text-center p-2 min-w-[70px]">
                            <div className="font-semibold">{day.dayName.slice(0, 3)}</div>
                            <div className="text-xs text-muted-foreground font-normal">{day.date.slice(5)}</div>
                          </th>
                        ))}
                        <th className="text-center p-2 min-w-[70px] bg-muted/50">Week Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {procurement.items.map((item) => (
                        <tr key={item.productName} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">
                            {item.productName}
                            {item.reliability === "low" && (
                              <span title="Low reliability — limited data"><AlertTriangle className="h-3 w-3 text-yellow-500 inline ml-1" /></span>
                            )}
                          </td>
                          {item.dailyForecast.map((day) => (
                            <td key={day.date} className="text-center p-2">
                              {day.expectedQty > 0 ? (
                                <span className={day.expectedQty >= 3 ? "font-semibold text-orange-600 dark:text-orange-400" : ""}>
                                  {day.expectedQty}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          ))}
                          <td className="text-center p-2 bg-muted/50 font-bold">{item.weekTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  These are average expected quantities based on past sales patterns. Adjust for known events, festivals, or weather.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ========== SECTION 4: Trend Alerts ========== */}
          {trends && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rising Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                    Rising Items
                  </CardTitle>
                  <CardDescription>
                    Last 2 weeks vs previous 2 weeks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trends.rising.length > 0 ? (
                    <div className="space-y-3">
                      {trends.rising.map((item) => (
                        <div key={item.productName} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.previousQty} → {item.recentQty} units
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            +{item.changePercent}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">No significant increases detected</p>
                  )}
                </CardContent>
              </Card>

              {/* Falling Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <TrendingDown className="h-5 w-5" />
                    Declining Items
                  </CardTitle>
                  <CardDescription>
                    Last 2 weeks vs previous 2 weeks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trends.falling.length > 0 ? (
                    <div className="space-y-3">
                      {trends.falling.map((item) => (
                        <div key={item.productName} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.previousQty} → {item.recentQty} units
                            </div>
                          </div>
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                            {item.changePercent}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">No significant declines detected</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========== SECTION 5: Accuracy Tracking ========== */}
          {accuracy && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  Actual Performance — {accuracy.month}
                </CardTitle>
                <CardDescription>
                  {accuracy.isComplete ? "Complete month data" : "Month in progress"} · Compare against projections to refine future forecasts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Actual Revenue</div>
                    <div className="text-xl font-bold">{formatCurrency(accuracy.actualRevenue)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Actual Orders</div>
                    <div className="text-xl font-bold">{accuracy.actualOrders}</div>
                  </div>
                </div>

                {/* Top actual items */}
                {accuracy.actualItems.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Top Food Items (Actual)</h4>
                    <div className="space-y-2">
                      {accuracy.actualItems.slice(0, 10).map((item, idx) => (
                        <div key={item.productName} className="flex items-center justify-between py-1 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-5">{idx + 1}.</span>
                            <span className="font-medium text-sm">{item.productName}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span>{item.qty} units</span>
                            <span className="text-muted-foreground">{formatCurrency(item.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Methodology note */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                How Predictions Work
              </h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Data sources:</strong> Predictions combine website order data with delivery channel data
                  (Zomato/Swiggy/Dine-in from Petpooja uploads) for complete demand forecasting across all channels.
                </p>
                <p>
                  <strong>Total Sales Forecast</strong> covers ALL categories (drinks, food, desserts) and combines
                  website + delivery revenue for daily, weekly, and monthly projections.
                </p>
                <p>
                  <strong>Daily averages</strong> are calculated using actual operating days (days with sales), not calendar days.
                  This prevents closed days from deflating the averages.
                </p>
                <p>
                  <strong>Estimated values</strong> (shown as <span className="italic text-blue-500">~value</span>) appear for items
                  with sparse data on specific days. These use 30% of the item's overall daily average as a minimum baseline.
                </p>
                <p>
                  <strong>Period selector</strong> controls which historical data the forecasts are based on.
                  Use shorter periods (1-2 weeks) for recent trends, or "All Data" for stable long-term patterns.
                </p>
                <p className="italic">
                  As more data accumulates, predictions will become more accurate. Upload Petpooja data regularly for best results.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
