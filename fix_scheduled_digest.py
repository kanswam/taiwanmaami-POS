with open('server/_core/index.ts', 'r') as f:
    content = f.read()

count = 0

# Fix 1: Suppress zero-order outlets in SCHEDULED digest (same pattern as service endpoint)
old_scheduled_channel = """        for (const key of channelOrder) {
          const data = byChannel[key];
          if (data) {
            lines.push(`${channelLabels[key]}: \u20b9${Math.round(data.subtotal).toLocaleString('en-IN')} (${data.orders.size} orders)`);
          } else {
            lines.push(`${channelLabels[key]}: \u20b90 (0 orders)`);
          }
        }"""

new_scheduled_channel = """        for (const key of channelOrder) {
          const data = byChannel[key];
          if (data && data.orders.size > 0) {
            lines.push(`${channelLabels[key]}: \u20b9${Math.round(data.subtotal).toLocaleString('en-IN')} (${data.orders.size} orders)`);
          }
          // Suppress outlets with zero orders
        }"""

if old_scheduled_channel in content:
    content = content.replace(old_scheduled_channel, new_scheduled_channel)
    count += 1
    print("Fixed: scheduled digest zero-order suppression")
else:
    print("WARNING: Could not find scheduled channel loop")

# Fix 2: Replace old marginRawData queries with recipe-based COGS in SCHEDULED digest
old_margin_queries = """      // Query margin data
      const { data: marginRawData } = await supabase
        .from('sales_facts')
        .select('outlet, item_quantity, item_unit_price_rupees, ingredient_cost_inr, gross_margin_inr')
        .eq('order_date', dateStr)
        .not('ingredient_cost_inr', 'is', null);
      const { count: totalLineCount } = await supabase
        .from('sales_facts')
        .select('*', { count: 'exact', head: true })
        .eq('order_date', dateStr);"""

new_margin_queries = """      // -- GROSS MARGIN: fetch recipes + ingredient_costs for live COGS calculation --
      const { data: recipesData } = await supabase
        .from('recipes')
        .select('menu_item_name, size_variant, outlet, ingredient_name, quantity_per_serving, unit');
      const { data: ingCostsData } = await supabase
        .from('ingredient_costs')
        .select('item_name, unit, unit_cost_inr');
      // Build COGS lookup from recipes + ingredient_costs
      const convertCostGM = (recipeQty: number, recipeUnit: string, costPerUnit: number, costUnit: string): number => {
        const ru = recipeUnit.toLowerCase().trim();
        const cu = costUnit.toLowerCase().trim();
        if (ru === 'ml' && cu === 'ltr') return (recipeQty / 1000) * costPerUnit;
        if (ru === 'g' && (cu === 'kg' || cu === 'kgs')) return (recipeQty / 1000) * costPerUnit;
        if (ru === 'g' && cu === 'bag') return (recipeQty / 3000) * costPerUnit;
        if (ru === 'pcs' && cu === 'pcs') return recipeQty * costPerUnit;
        return 0;
      };
      const ingCostMap = new Map<string, { cost: number; unit: string }>();
      for (const ic of (ingCostsData || [])) {
        ingCostMap.set(ic.item_name.toLowerCase().trim(), { cost: Number(ic.unit_cost_inr), unit: ic.unit });
      }
      const cogsByKey = new Map<string, number>();
      for (const r of (recipesData || [])) {
        const key = `${r.menu_item_name.toLowerCase()}|${(r.size_variant || '').toLowerCase()}|${r.outlet}`;
        const ing = ingCostMap.get(r.ingredient_name.toLowerCase().trim());
        if (!ing) continue;
        const lineCost = convertCostGM(Number(r.quantity_per_serving), r.unit, ing.cost, ing.unit);
        cogsByKey.set(key, (cogsByKey.get(key) || 0) + lineCost);
      }
      const parseSalesItemGM = (itemName: string): { base: string; size: string } => {
        const base = (itemName.indexOf('(') > 0 ? itemName.slice(0, itemName.indexOf('(')).trim() : itemName.trim()).toLowerCase();
        const lower = itemName.toLowerCase();
        let size = '';
        if (/16oz|470\\s*ml/.test(lower)) size = 'regular';
        else if (/24oz|700\\s*ml/.test(lower)) size = 'large';
        else if (/\\bregular\\b/.test(lower)) size = 'regular';
        else if (/\\blarge\\b/.test(lower)) size = 'large';
        return { base, size };
      };
      const lookupCogsGM = (itemName: string, outlet: string): number | null => {
        const { base, size } = parseSalesItemGM(itemName);
        return cogsByKey.get(`${base}|${size}|${outlet}`)
          ?? cogsByKey.get(`${base}|${size}|all`)
          ?? cogsByKey.get(`${base}||${outlet}`)
          ?? cogsByKey.get(`${base}||all`)
          ?? null;
      };"""

if old_margin_queries in content:
    content = content.replace(old_margin_queries, new_margin_queries)
    count += 1
    print("Fixed: replaced marginRawData queries with recipe-based COGS")
else:
    print("WARNING: Could not find old margin queries")

# Fix 3: Replace old GM output block with new recipe-based output
old_gm_output = """        lines.push('');
        if (marginRawData && marginRawData.length > 0) {
          const marginByOutlet: Record<string, { revenue: number; margin: number }> = {};
          for (const row of marginRawData) {
            const outlet = row.outlet || 'unknown';
            if (!marginByOutlet[outlet]) marginByOutlet[outlet] = { revenue: 0, margin: 0 };
            const qty = parseInt(row.item_quantity) || 1;
            marginByOutlet[outlet].revenue += (parseFloat(row.item_unit_price_rupees) || 0) * qty;
            marginByOutlet[outlet].margin += parseFloat(row.gross_margin_inr) || 0;
          }
          const costedCount = marginRawData.length;
          const coveragePct = totalLineCount ? Math.round((costedCount / totalLineCount) * 100) : 0;
          lines.push(`\ud83d\udcca *GROSS MARGIN* _(\${coveragePct}% of items costed)_`);
          const outletOrder = ['palladium', 'tnagar', 'annanagar'];
          let combinedMargin = 0;
          let combinedRevenue = 0;
          for (const outlet of outletOrder) {
            const data = marginByOutlet[outlet];
            if (data) {
              const pct = data.revenue > 0 ? (data.margin / data.revenue * 100) : 0;
              const outletName = outlet === 'tnagar' ? 'T.Nagar' : outlet === 'annanagar' ? 'Anna Nagar' : 'Palladium';
              lines.push(`\${outletName}: \u20b9\${Math.round(data.margin).toLocaleString('en-IN')} (\${pct.toFixed(1)}%)`);
              combinedMargin += data.margin;
              combinedRevenue += data.revenue;
            }
          }
          const combinedPct = combinedRevenue > 0 ? (combinedMargin / combinedRevenue * 100) : 0;
          lines.push(`*Combined: \u20b9\${Math.round(combinedMargin).toLocaleString('en-IN')} (\${combinedPct.toFixed(1)}%)*`);
        } else {
          lines.push(`\ud83d\udcca *GROSS MARGIN*`);
          lines.push(`_(populates once recipe costing is complete)_`);
        }"""

new_gm_output = """        // GROSS MARGIN section - live calculation from recipes + ingredient_costs
        const FOOD_CATS_GM = new Set([
          'Fruit Mochi', 'Fruit Mochi Collection', 'Signature Mochi Collection',
          'Boba Creme Caramel', 'Noodles', 'Deluxe Set'
        ]);
        const { data: salesWithCat } = await supabase
          .from('sales_facts')
          .select('outlet, item_name, item_category, item_quantity, item_total_rupees')
          .eq('order_date', dateStr);
        const gmByOutlet: Record<string, { revenue: number; cogs: number; total: Set<string>; covered: Set<string> }> = {};
        for (const row of (salesWithCat || [])) {
          if (!row.item_category || FOOD_CATS_GM.has(row.item_category)) continue;
          const outlet = row.outlet || 'unknown';
          if (!gmByOutlet[outlet]) gmByOutlet[outlet] = { revenue: 0, cogs: 0, total: new Set(), covered: new Set() };
          const o = gmByOutlet[outlet];
          const qty = Number(row.item_quantity || 0);
          const rev = Number(row.item_total_rupees || 0);
          o.revenue += rev;
          o.total.add(row.item_name);
          const cogs = lookupCogsGM(row.item_name, outlet);
          if (cogs !== null && cogs > 0) {
            o.cogs += qty * cogs;
            o.covered.add(row.item_name);
          }
        }
        lines.push('');
        lines.push(`\ud83d\udcca *GROSS MARGIN (Drinks)*`);
        const gmOutletOrder = ['palladium', 'tnagar', 'annanagar'];
        let gmCombinedRevenue = 0, gmCombinedCogs = 0;
        let gmHasData = false;
        for (const outlet of gmOutletOrder) {
          const o = gmByOutlet[outlet];
          if (!o || o.revenue === 0) continue;
          gmHasData = true;
          const gm = ((o.revenue - o.cogs) / o.revenue * 100).toFixed(1);
          const gmRs = Math.round(o.revenue - o.cogs);
          const coverage = o.total.size > 0 ? Math.round(o.covered.size / o.total.size * 100) : 0;
          const outletName = outlet === 'tnagar' ? 'T.Nagar' : outlet === 'annanagar' ? 'Anna Nagar' : 'Palladium';
          lines.push(`\${outletName}: \u20b9\${gmRs.toLocaleString('en-IN')} | \${gm}% (\${coverage}% recipe coverage)`);
          gmCombinedRevenue += o.revenue;
          gmCombinedCogs += o.cogs;
        }
        if (!gmHasData) {
          lines.push(`_(no drinks sales data for \${dateStr})_`);
        } else {
          const combinedGm = gmCombinedRevenue > 0 ? ((gmCombinedRevenue - gmCombinedCogs) / gmCombinedRevenue * 100).toFixed(1) : '0.0';
          lines.push(`*Combined: \${combinedGm}%*`);
        }"""

if old_gm_output in content:
    content = content.replace(old_gm_output, new_gm_output)
    count += 1
    print("Fixed: replaced old GM output with recipe-based COGS output")
else:
    print("WARNING: Could not find old GM output block")
    # Debug: show what's around the margin section
    lines_list = content.split('\n')
    for i, line in enumerate(lines_list):
        if 'marginRawData' in line and 'length' in line:
            print(f"  Found marginRawData check at line {i+1}: {line.strip()[:80]}")

with open('server/_core/index.ts', 'w') as f:
    f.write(content)

print(f"\nTotal fixes applied: {count}")
