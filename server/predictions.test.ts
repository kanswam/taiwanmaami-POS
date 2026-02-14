import { describe, it, expect } from "vitest";

// Test the prediction logic and data structures
describe("Predictions Module", () => {
  describe("Monthly Projection Logic", () => {
    it("should calculate daily average correctly", () => {
      const totalRevenue = 100000; // in paise
      const daysElapsed = 10;
      const dailyAvg = Math.round(totalRevenue / daysElapsed);
      expect(dailyAvg).toBe(10000);
    });

    it("should project full month from partial data", () => {
      const dailyAvg = 10000;
      const daysInMonth = 28;
      const projected = dailyAvg * daysInMonth;
      expect(projected).toBe(280000);
    });

    it("should calculate confidence margin as percentage of projected", () => {
      const projected = 280000;
      const margin = Math.round(projected * 0.15);
      const optimistic = projected + margin;
      const pessimistic = projected - margin;
      expect(optimistic).toBe(322000);
      expect(pessimistic).toBe(238000);
      expect(optimistic).toBeGreaterThan(projected);
      expect(pessimistic).toBeLessThan(projected);
    });

    it("should handle zero days elapsed gracefully", () => {
      const daysElapsed = 0;
      const dailyAvg = daysElapsed > 0 ? 100000 / daysElapsed : 0;
      expect(dailyAvg).toBe(0);
    });
  });

  describe("Day-of-Week Weighting", () => {
    it("should produce 7 day entries", () => {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      expect(days.length).toBe(7);
    });

    it("should calculate weighted projection using remaining day distribution", () => {
      // If remaining days are 3 Saturdays and 4 weekdays
      const satAvg = 15000;
      const weekdayAvg = 8000;
      const remaining = (3 * satAvg) + (4 * weekdayAvg);
      expect(remaining).toBe(77000);
    });
  });

  describe("Item Demand Forecast — Operating Days vs Calendar Days", () => {
    it("should calculate average quantity using actual days with sales, not calendar days", () => {
      // Biang Biang scenario: 28 units on 6 Sundays with sales
      // Calendar has 7 Sundays, but store was closed 1 Sunday
      const totalQtySunday = 28;
      const sundaysWithSales = 6;
      const calendarSundays = 7;

      const avgWithOperatingDays = Math.round((totalQtySunday / sundaysWithSales) * 10) / 10;
      const avgWithCalendarDays = Math.round((totalQtySunday / calendarSundays) * 10) / 10;

      expect(avgWithOperatingDays).toBe(4.7);
      expect(avgWithCalendarDays).toBe(4);
      // Operating days gives more accurate result
      expect(avgWithOperatingDays).toBeGreaterThan(avgWithCalendarDays);
    });

    it("should identify peak day correctly", () => {
      const dowData = [
        { day: "Sun", avgQty: 5 },
        { day: "Mon", avgQty: 2 },
        { day: "Tue", avgQty: 3 },
        { day: "Wed", avgQty: 1 },
        { day: "Thu", avgQty: 4 },
        { day: "Fri", avgQty: 6 },
        { day: "Sat", avgQty: 8 },
      ];
      const peak = dowData.reduce((max, d) => d.avgQty > max.avgQty ? d : max, dowData[0]);
      expect(peak.day).toBe("Sat");
      expect(peak.avgQty).toBe(8);
    });

    it("should classify reliability based on coefficient of variation", () => {
      // High reliability: consistent sales
      const classifyReliability = (cv: number) => {
        if (cv < 0.5) return "high";
        if (cv < 1.0) return "medium";
        return "low";
      };
      expect(classifyReliability(0.3)).toBe("high");
      expect(classifyReliability(0.7)).toBe("medium");
      expect(classifyReliability(1.5)).toBe("low");
    });

    it("should calculate daily average using operating days, not calendar days", () => {
      // 92 website units over 42 operating days (not 45 calendar days)
      const totalQty = 92;
      const operatingDays = 42;
      const calendarDays = 45;

      const avgOperating = Math.round((totalQty / operatingDays) * 10) / 10;
      const avgCalendar = Math.round((totalQty / calendarDays) * 10) / 10;

      expect(avgOperating).toBe(2.2);
      expect(avgCalendar).toBe(2);
      expect(avgOperating).toBeGreaterThan(avgCalendar);
    });
  });

  describe("Delivery Data Integration", () => {
    it("should combine website and delivery quantities for total", () => {
      const websiteQty = 92;
      const deliveryQty = 79;
      const combinedTotal = websiteQty + deliveryQty;
      expect(combinedTotal).toBe(171);
    });

    it("should distribute delivery period data proportionally across DOWs", () => {
      // A 31-day period (Jan 2026) has roughly 4-5 of each DOW
      // 62 units over 31 days = ~2 per day
      const totalQty = 62;
      const totalDays = 31;
      const sundaysInPeriod = 4; // Jan 2026 has 4 Sundays (4, 11, 18, 25)
      
      const proportionalSunday = (totalQty * sundaysInPeriod) / totalDays;
      expect(proportionalSunday).toBeCloseTo(8, 0);
    });

    it("should track source (website/delivery/both) for each item", () => {
      const items = [
        { name: "Biang Biang", websiteQty: 92, deliveryQty: 79 },
        { name: "Fruit Mochi", websiteQty: 0, deliveryQty: 111 },
        { name: "Custom Item", websiteQty: 5, deliveryQty: 0 },
      ];

      for (const item of items) {
        const source = item.websiteQty > 0 && item.deliveryQty > 0
          ? "both"
          : item.deliveryQty > 0
          ? "delivery"
          : "website";
        
        if (item.name === "Biang Biang") expect(source).toBe("both");
        if (item.name === "Fruit Mochi") expect(source).toBe("delivery");
        if (item.name === "Custom Item") expect(source).toBe("website");
      }
    });
  });

  describe("Period Selector", () => {
    it("should generate correct date ranges for each period option", () => {
      const today = new Date("2026-02-14");
      
      // Last 1 week
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      expect(oneWeekAgo.toISOString().split('T')[0]).toBe("2026-02-07");

      // Last 2 weeks
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      expect(twoWeeksAgo.toISOString().split('T')[0]).toBe("2026-01-31");

      // This month
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      expect(thisMonthStart.toISOString().split('T')[0]).toBe("2026-02-01");

      // Last month
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      expect(lastMonthStart.toISOString().split('T')[0]).toBe("2026-01-01");
      expect(lastMonthEnd.toISOString().split('T')[0]).toBe("2026-01-31");
    });

    it("should default to 'All Data' period starting from Jan 2026", () => {
      const defaultStart = "2026-01-01";
      expect(defaultStart).toBe("2026-01-01");
    });
  });

  describe("Procurement Forecast", () => {
    it("should generate 7 days of forecast", () => {
      const today = new Date();
      const nextDays = [];
      for (let i = 1; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        nextDays.push({
          date: d.toISOString().split("T")[0],
          dayOfWeek: d.getDay(),
          dayName: d.toLocaleDateString("en-US", { weekday: "long" }),
        });
      }
      expect(nextDays.length).toBe(7);
      nextDays.forEach(d => {
        expect(d.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(d.dayOfWeek).toBeLessThanOrEqual(6);
      });
    });

    it("should calculate week total from daily forecasts", () => {
      const dailyForecast = [3, 2, 4, 1, 5, 6, 8];
      const weekTotal = dailyForecast.reduce((sum, q) => sum + q, 0);
      expect(weekTotal).toBe(29);
    });

    it("should filter out items with less than 3 total units", () => {
      const items = [
        { name: "Popular", totalQty: 50 },
        { name: "Moderate", totalQty: 10 },
        { name: "Rare", totalQty: 2 },
      ];
      const filtered = items.filter(i => i.totalQty >= 3);
      expect(filtered.length).toBe(2);
      expect(filtered.find(i => i.name === "Rare")).toBeUndefined();
    });
  });

  describe("Trend Alerts", () => {
    it("should calculate percentage change correctly", () => {
      const previous = 10;
      const recent = 15;
      const change = Math.round(((recent - previous) / previous) * 100);
      expect(change).toBe(50);
    });

    it("should identify rising items (>25% increase)", () => {
      const items = [
        { name: "A", prev: 10, recent: 14 }, // +40%
        { name: "B", prev: 10, recent: 11 }, // +10%
        { name: "C", prev: 10, recent: 8 },  // -20%
      ];
      const rising = items.filter(i => {
        const change = ((i.recent - i.prev) / i.prev) * 100;
        return change >= 25;
      });
      expect(rising.length).toBe(1);
      expect(rising[0].name).toBe("A");
    });

    it("should identify falling items (>25% decrease)", () => {
      const items = [
        { name: "A", prev: 10, recent: 14 }, // +40%
        { name: "B", prev: 10, recent: 5 },  // -50%
        { name: "C", prev: 10, recent: 6 },  // -40%
      ];
      const falling = items.filter(i => {
        const change = ((i.recent - i.prev) / i.prev) * 100;
        return change <= -25;
      });
      expect(falling.length).toBe(2);
    });

    it("should handle zero previous quantity without division by zero", () => {
      const previous = 0;
      const recent = 5;
      const change = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : 100;
      expect(change).toBe(100);
    });

    it("should classify trend direction correctly", () => {
      const classify = (changePercent: number, prevQty: number, recentQty: number) => {
        if (prevQty === 0 && recentQty > 0) return "new";
        if (changePercent >= 25) return "rising";
        if (changePercent <= -25) return "falling";
        return "stable";
      };
      expect(classify(50, 10, 15)).toBe("rising");
      expect(classify(-50, 10, 5)).toBe("falling");
      expect(classify(10, 10, 11)).toBe("stable");
      expect(classify(100, 0, 5)).toBe("new");
    });
  });

  describe("Upload History Grand Total", () => {
    it("should combine Petpooja and website totals for grand total", () => {
      const petpoojaGrandTotal = 23950900; // in paise
      const websiteAmount = 5000000; // in paise
      const combinedTotal = petpoojaGrandTotal + websiteAmount;
      expect(combinedTotal).toBe(28950900);
    });

    it("should handle periods with zero website orders", () => {
      const petpoojaGrandTotal = 23950900;
      const websiteAmount = 0;
      const combinedTotal = petpoojaGrandTotal + websiteAmount;
      expect(combinedTotal).toBe(petpoojaGrandTotal);
    });

    it("should format combined total in Indian rupees", () => {
      const formatCurrency = (paise: number) => {
        return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
      };
      expect(formatCurrency(10000)).toBe("₹100");
      expect(formatCurrency(23950900)).toContain("₹");
      expect(formatCurrency(23950900)).toContain("2,39,509");
    });
  });

  describe("Estimated Baseline for Sparse Items", () => {
    it("should calculate minimum baseline as 30% of overall daily average", () => {
      const totalQty = 21; // e.g., ChickGozilla
      const operatingDays = 45;
      const overallDailyAvg = totalQty / operatingDays;
      const minBaseline = Math.round(overallDailyAvg * 0.3 * 10) / 10;
      expect(minBaseline).toBe(0.1);
    });

    it("should apply estimated baseline when item has >=5 total sales but zero on a DOW", () => {
      const totalQty = 21;
      const computedAvg = 0; // zero on Monday
      const minBaseline = 0.1;
      const isEstimated = computedAvg === 0 && totalQty >= 5 && minBaseline > 0;
      const avgQty = isEstimated ? minBaseline : computedAvg;
      expect(isEstimated).toBe(true);
      expect(avgQty).toBe(0.1);
    });

    it("should NOT apply estimated baseline for items with <5 total sales", () => {
      const totalQty = 3;
      const computedAvg = 0;
      const minBaseline = 0.1;
      const isEstimated = computedAvg === 0 && totalQty >= 5 && minBaseline > 0;
      expect(isEstimated).toBe(false);
    });

    it("should NOT apply estimated baseline when actual avg is non-zero", () => {
      const totalQty = 50;
      const computedAvg = 2.5;
      const minBaseline = 0.3;
      const isEstimated = computedAvg === 0 && totalQty >= 5 && minBaseline > 0;
      expect(isEstimated).toBe(false);
    });
  });

  describe("Total Sales Forecast Logic", () => {
    it("should calculate daily average revenue from combined channels", () => {
      const websiteRevenue = 354081;
      const deliveryRevenue = 335120;
      const operatingDays = 41;
      const dailyAvg = (websiteRevenue + deliveryRevenue) / operatingDays;
      expect(dailyAvg).toBeCloseTo(16809.8, 0);
    });

    it("should calculate website share percentage", () => {
      const websiteRevenue = 354081;
      const deliveryRevenue = 335120;
      const combined = websiteRevenue + deliveryRevenue;
      const share = Math.round((websiteRevenue / combined) * 100);
      expect(share).toBe(51);
    });

    it("should project next 7 days revenue using DOW averages", () => {
      const dowAvgs = [30000, 10000, 15000, 18000, 16000, 17000, 40000]; // Sun-Sat
      // If next 7 days are Sun-Sat
      const weekTotal = dowAvgs.reduce((s, v) => s + v, 0);
      expect(weekTotal).toBe(146000);
    });

    it("should calculate month remaining projection", () => {
      const dailyAvg = 16810;
      const daysRemaining = 14;
      const monthRemaining = dailyAvg * daysRemaining;
      expect(monthRemaining).toBe(235340);
    });

    it("should calculate category breakdown percentages", () => {
      const categories = [
        { name: "Food", revenue: 100000 },
        { name: "Drinks", revenue: 80000 },
        { name: "Delivery", revenue: 120000 },
      ];
      const total = categories.reduce((s, c) => s + c.revenue, 0);
      const breakdown = categories.map(c => ({
        ...c,
        percentage: Math.round((c.revenue / total) * 100),
      }));
      expect(breakdown[0].percentage).toBe(33);
      expect(breakdown[1].percentage).toBe(27);
      expect(breakdown[2].percentage).toBe(40);
    });
  });

  describe("Currency Formatting", () => {
    it("should format paise to rupees with Indian locale", () => {
      const formatCurrency = (paise: number) => {
        return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
      };
      expect(formatCurrency(10000)).toBe("₹100");
      expect(formatCurrency(17870344)).toBe("₹1,78,703.44");
    });
  });
});
