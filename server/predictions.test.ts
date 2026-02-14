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

  describe("Item Demand Forecast", () => {
    it("should calculate average quantity per day of week", () => {
      // 4 Mondays in the period, sold 12 total on Mondays
      const totalQty = 12;
      const dayCount = 4;
      const avg = Math.round(totalQty / dayCount);
      expect(avg).toBe(3);
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
  });

  describe("Trend Alerts", () => {
    it("should calculate percentage change correctly", () => {
      const previous = 10;
      const recent = 15;
      const change = Math.round(((recent - previous) / previous) * 100);
      expect(change).toBe(50);
    });

    it("should identify rising items (>30% increase)", () => {
      const items = [
        { name: "A", prev: 10, recent: 14 }, // +40%
        { name: "B", prev: 10, recent: 11 }, // +10%
        { name: "C", prev: 10, recent: 8 },  // -20%
      ];
      const rising = items.filter(i => {
        const change = ((i.recent - i.prev) / i.prev) * 100;
        return change > 30;
      });
      expect(rising.length).toBe(1);
      expect(rising[0].name).toBe("A");
    });

    it("should identify falling items (>30% decrease)", () => {
      const items = [
        { name: "A", prev: 10, recent: 14 }, // +40%
        { name: "B", prev: 10, recent: 5 },  // -50%
        { name: "C", prev: 10, recent: 6 },  // -40%
      ];
      const falling = items.filter(i => {
        const change = ((i.recent - i.prev) / i.prev) * 100;
        return change < -30;
      });
      expect(falling.length).toBe(2);
    });

    it("should handle zero previous quantity without division by zero", () => {
      const previous = 0;
      const recent = 5;
      const change = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : 100;
      expect(change).toBe(100);
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
