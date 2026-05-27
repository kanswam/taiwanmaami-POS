with open('server/_core/index.ts', 'r') as f:
    content = f.read()

# Fix 1: Suppress zero-order outlets
old_channel_loop = """          for (const key of channelOrder) {
            const data = byChannel[key];
            if (data) {
              lines.push(`${channelLabels[key]}: \u20b9${Math.round(data.subtotal).toLocaleString('en-IN')} (${data.orders.size} orders)`);
            } else {
              lines.push(`${channelLabels[key]}: \u20b90 (0 orders)`);
            }
          }"""

new_channel_loop = """          for (const key of channelOrder) {
            const data = byChannel[key];
            if (data && data.orders.size > 0) {
              lines.push(`${channelLabels[key]}: \u20b9${Math.round(data.subtotal).toLocaleString('en-IN')} (${data.orders.size} orders)`);
            }
            // Suppress outlets with zero orders
          }"""

if old_channel_loop in content:
    content = content.replace(old_channel_loop, new_channel_loop)
    print("Fixed: zero-order outlet suppression")
else:
    print("WARNING: Could not find channel loop to fix")

with open('server/_core/index.ts', 'w') as f:
    f.write(content)
