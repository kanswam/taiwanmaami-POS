import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShoppingCart,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  BarChart3,
  Package,
  RefreshCw,
} from "lucide-react";

const formatCurrency = (paise: number) => {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
};

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PredictionsTab() {
  const today = new Date();
  const [projYear] = useState(today.getFullYear());
  const [projMonth] = useState(today.getMonth() + 1);

  // Queries
  const { data: projection, isLoading: loadingProj, refetch: refetchProj } =
    trpc.analytics.getMonthlyProjection.useQuery({ year: projYear, month: projMonth });

  const { data: itemForecast, isLoading: loadingItems } =
    trpc.analytics.getItemDemandForecast.useQuery(undefined);

  const { data: procurement, isLoading: loadingProc } =
    trpc.analytics.getProcurementForecast.useQuery();

  const { data: trends, isLoading: loadingTrends } =
    trpc.analytics.getTrendAlerts.useQuery();

  const { data: accuracy } =
    trpc.analytics.getForecastAccuracy.useQuery({ year: projYear, month: projMonth });

  const isLoading = loadingProj || loadingItems || loadingProc || loadingTrends;

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            Predictive Analytics
          </h2>
          <p className="text-muted-foreground mt-1">
            Forecasts based on historical data from January 2026 onwards. Food items only.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchProj()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-3 animate-pulse text-amber-500" />
          <p>Crunching numbers...</p>
        </div>
      ) : (
        <>
          {/* ========== SECTION 1: Monthly Revenue Projection ========== */}
          {projection && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Monthly Revenue Projection — {projection.month}
                </CardTitle>
                <CardDescription>
                  {projection.daysElapsed} of {projection.daysInMonth} days elapsed
                  {projection.daysRemaining > 0 && ` · ${projection.daysRemaining} days remaining`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key metrics row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                    <div className="text-sm text-blue-600 dark:text-blue-400">Actual So Far</div>
                    <div className="text-xl font-bold mt-1">{formatCurrency(projection.actualRevenue)}</div>
                    <div className="text-xs text-muted-foreground">{projection.actualOrders} orders</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4">
                    <div className="text-sm text-amber-600 dark:text-amber-400">Projected Total</div>
                    <div className="text-xl font-bold mt-1">{formatCurrency(projection.projectedTotal)}</div>
                    <div className="text-xs text-muted-foreground">~{projection.projectedOrders} orders</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                    <div className="text-sm text-green-600 dark:text-green-400">Daily Average</div>
                    <div className="text-xl font-bold mt-1">{formatCurrency(projection.actualDailyAvg)}</div>
                    <div className="text-xs text-muted-foreground">AOV: {formatCurrency(projection.projectedAOV)}</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
                    <div className="text-sm text-purple-600 dark:text-purple-400">Confidence Range</div>
                    <div className="text-lg font-bold mt-1">
                      {formatCurrency(projection.pessimistic)} — {formatCurrency(projection.optimistic)}
                    </div>
                    <div className="text-xs text-muted-foreground">±{formatCurrency(projection.confidenceMargin)}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress to projected total</span>
                    <span className="font-medium">
                      {projection.projectedTotal > 0 ? Math.round((projection.actualRevenue / projection.projectedTotal) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-amber-500 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(100, projection.projectedTotal > 0 ? (projection.actualRevenue / projection.projectedTotal) * 100 : 0)}%` }}
                    />
                  </div>
                </div>

                {/* vs Previous Month */}
                {projection.prevMonthRevenue > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm font-medium mb-2">vs Previous Month</div>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-muted-foreground text-sm">Last month actual: </span>
                        <span className="font-semibold">{formatCurrency(projection.prevMonthRevenue)}</span>
                      </div>
                      <div>
                        {projection.projectedTotal > projection.prevMonthRevenue ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            +{Math.round(((projection.projectedTotal - projection.prevMonthRevenue) / projection.prevMonthRevenue) * 100)}% projected
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                            {Math.round(((projection.projectedTotal - projection.prevMonthRevenue) / projection.prevMonthRevenue) * 100)}% projected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Day-of-week revenue pattern */}
                <div>
                  <h4 className="font-semibold mb-3">Revenue by Day of Week</h4>
                  <div className="grid grid-cols-7 gap-2">
                    {projection.dowBreakdown.map((dow) => {
                      const maxRev = Math.max(...projection.dowBreakdown.map((d) => d.avgRevenue));
                      const height = maxRev > 0 ? Math.max(20, (dow.avgRevenue / maxRev) * 100) : 20;
                      return (
                        <div key={dow.day} className="text-center">
                          <div className="h-24 flex items-end justify-center mb-1">
                            <div
                              className="w-full max-w-[40px] bg-gradient-to-t from-blue-500 to-blue-300 dark:from-blue-600 dark:to-blue-400 rounded-t-md transition-all"
                              style={{ height: `${height}%` }}
                              title={`${dow.dayFull}: ${formatCurrency(dow.avgRevenue)} avg`}
                            />
                          </div>
                          <div className="text-xs font-medium">{dow.day}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrency(dow.avgRevenue)}</div>
                          <div className="text-[10px] text-muted-foreground">{dow.avgOrders} ord</div>
                        </div>
                      );
                    })}
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
                  Average daily quantity based on data from {itemForecast.dateRange.start} to {itemForecast.dateRange.end}
                  {" · "}{itemForecast.totalFoodItems} food items tracked
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
                        <th className="text-center p-2 min-w-[60px]">Peak</th>
                        <th className="text-center p-2 min-w-[70px]">Reliability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemForecast.items.slice(0, 20).map((item) => {
                        const maxQty = Math.max(...item.dowBreakdown.map((d) => d.avgQty));
                        return (
                          <tr key={item.productName} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{item.productName}</td>
                            {item.dowBreakdown.map((dow) => (
                              <td key={dow.day} className={`text-center p-2 ${getHeatColor(dow.avgQty, maxQty)}`}>
                                {dow.avgQty > 0 ? dow.avgQty : "—"}
                              </td>
                            ))}
                            <td className="text-center p-2 font-semibold">{item.dailyAvg}</td>
                            <td className="text-center p-2">
                              <Badge variant="outline" className="text-xs">{item.peakDay}</Badge>
                            </td>
                            <td className="text-center p-2">
                              <Badge className={
                                item.reliability === "high" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                item.reliability === "medium" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                                "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }>
                                {item.reliability}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900 inline-block" /> High demand</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-800 inline-block" /> Medium-high</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900 inline-block" /> Moderate</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 dark:bg-green-900 inline-block" /> Low</span>
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
                  <strong>Monthly projection</strong> uses day-of-week weighted averages from your actual sales data.
                  Remaining days are projected based on which days of the week they fall on (weekends vs weekdays).
                </p>
                <p>
                  <strong>Item demand</strong> calculates average daily quantity sold per food item per day of week.
                  The heatmap shows where demand concentrates to help plan procurement.
                </p>
                <p>
                  <strong>Trend alerts</strong> compare the last 2 weeks against the previous 2 weeks to spot rising or declining items.
                </p>
                <p>
                  <strong>Reliability</strong> indicates how consistent the pattern is — "high" means the item sells consistently,
                  "low" means sales are sporadic and predictions are less certain.
                </p>
                <p className="italic">
                  As more data accumulates, predictions will become more accurate. Compare projections against actuals each month to calibrate.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
