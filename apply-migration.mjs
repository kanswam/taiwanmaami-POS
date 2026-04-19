import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await createConnection(url);

// Add new benefit types to the enum
try {
  console.log('Altering partner_benefits_log benefitType enum...');
  await conn.execute(`
    ALTER TABLE partner_benefits_log 
    MODIFY COLUMN benefitType ENUM(
      'free_biang_biang',
      'free_large_tea',
      'tea_discount',
      'maami_rupee_credit',
      'complimentary_item',
      'drink_discount',
      'workshop_discount'
    ) NOT NULL
  `);
  console.log('✓ benefitType enum updated');
} catch (e) {
  if (e.code === 'ER_DUP_ENTRY' || e.message.includes('already')) {
    console.log('benefitType enum already up to date');
  } else {
    console.error('Error updating benefitType:', e.message);
  }
}

// Update partner_config: update founding_price_paise to 250000 (₹2,500)
try {
  console.log('Updating founding_price_paise...');
  await conn.execute(`
    UPDATE partner_config SET configValue = '250000' WHERE configKey = 'founding_price_paise'
  `);
  console.log('✓ founding_price_paise updated to 250000');
} catch (e) {
  console.error('Error:', e.message);
}

// Update regular_price_paise to 350000 (₹3,500)
try {
  console.log('Updating regular_price_paise...');
  await conn.execute(`
    UPDATE partner_config SET configValue = '350000' WHERE configKey = 'regular_price_paise'
  `);
  console.log('✓ regular_price_paise updated to 350000');
} catch (e) {
  console.error('Error:', e.message);
}

// Add new config keys if they don't exist
const newConfigs = [
  { key: 'complimentary_items_per_year', value: '25', desc: 'Max complimentary food items per subscription year' },
  { key: 'drink_discount_percent', value: '5', desc: 'Discount percentage on drinks for partners' },
  { key: 'workshop_discount_percent', value: '10', desc: 'Discount percentage on workshops for partners' },
  { key: 'eligible_food_subcategories', value: 'saucy-noodles,flat-bread,pillow-brioche', desc: 'Subcategory slugs eligible for complimentary item (Food category)' },
  { key: 'eligible_sweet_subcategories', value: 'sweet-pillow-brioche', desc: 'Subcategory slugs eligible for complimentary item (Sweet Bites category)' },
];

for (const cfg of newConfigs) {
  try {
    const [existing] = await conn.execute(
      'SELECT id FROM partner_config WHERE configKey = ?', [cfg.key]
    );
    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO partner_config (configKey, configValue, description) VALUES (?, ?, ?)',
        [cfg.key, cfg.value, cfg.desc]
      );
      console.log(`✓ Added config: ${cfg.key} = ${cfg.value}`);
    } else {
      console.log(`Config ${cfg.key} already exists, skipping`);
    }
  } catch (e) {
    console.error(`Error adding ${cfg.key}:`, e.message);
  }
}

// Verify current config
const [configs] = await conn.execute('SELECT configKey, configValue FROM partner_config ORDER BY configKey');
console.log('\nCurrent partner_config:');
configs.forEach(c => console.log(`  ${c.configKey} = ${c.configValue}`));

await conn.end();
console.log('\n✓ Migration complete');
process.exit(0);
