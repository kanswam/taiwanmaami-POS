import mysql from 'mysql2/promise';

// Chennai localities with verified pincodes from India Post data
// Focusing on major residential/commercial areas within delivery range
const chennaiAreas = [
  // Central Chennai (600001-600010)
  { name: "Parrys Corner", pincode: "600001" },
  { name: "George Town", pincode: "600001" },
  { name: "Anna Road", pincode: "600002" },
  { name: "Park Town", pincode: "600003" },
  { name: "Mylapore", pincode: "600004" },
  { name: "Triplicane", pincode: "600005" },
  { name: "Chepauk", pincode: "600005" },
  { name: "Greams Road", pincode: "600006" },
  { name: "Thousand Lights", pincode: "600006" },
  { name: "Nungambakkam", pincode: "600034" },
  { name: "Egmore", pincode: "600008" },
  { name: "Fort St George", pincode: "600009" },
  { name: "Kilpauk", pincode: "600010" },
  
  // South Chennai (600011-600020)
  { name: "Perambur", pincode: "600011" },
  { name: "Perambur Barracks", pincode: "600012" },
  { name: "Royapuram", pincode: "600013" },
  { name: "Saidapet", pincode: "600015" },
  { name: "Alandur", pincode: "600016" },
  { name: "T Nagar", pincode: "600017" },
  { name: "Alwarpet", pincode: "600018" },
  { name: "R A Puram", pincode: "600028" },
  { name: "Abiramapuram", pincode: "600018" },
  { name: "Washermanpet", pincode: "600021" },
  { name: "Adyar", pincode: "600020" },
  { name: "Thiruvanmiyur", pincode: "600041" },
  { name: "Velachery", pincode: "600042" },
  
  // West Chennai (600021-600040)
  { name: "Ayanavaram", pincode: "600023" },
  { name: "Kodambakkam", pincode: "600024" },
  { name: "Guindy", pincode: "600032" },
  { name: "West Mambalam", pincode: "600033" },
  { name: "Ashok Nagar", pincode: "600083" },
  { name: "K K Nagar", pincode: "600078" },
  { name: "Vadapalani", pincode: "600026" },
  { name: "Virugambakkam", pincode: "600092" },
  { name: "Shenoy Nagar", pincode: "600030" },
  { name: "Chetpet", pincode: "600031" },
  { name: "Anna Nagar", pincode: "600040" },
  { name: "Anna Nagar East", pincode: "600102" },
  { name: "Anna Nagar West", pincode: "600101" },
  
  // South Chennai Extended
  { name: "Chromepet", pincode: "600044" },
  { name: "Pallavaram", pincode: "600043" },
  { name: "Tambaram", pincode: "600045" },
  { name: "Medavakkam", pincode: "600100" },
  { name: "Sholinganallur", pincode: "600119" },
  { name: "Perungudi", pincode: "600096" },
  { name: "Taramani", pincode: "600113" },
  { name: "Besant Nagar", pincode: "600090" },
  { name: "Adambakkam", pincode: "600088" },
  { name: "Nanganallur", pincode: "600061" },
  
  // North Chennai
  { name: "Tondiarpet", pincode: "600081" },
  { name: "Kolathur", pincode: "600099" },
  { name: "Villivakkam", pincode: "600049" },
  { name: "Ambattur", pincode: "600053" },
  { name: "Mogappair", pincode: "600037" },
  { name: "Padi", pincode: "600050" },
  
  // Other important areas
  { name: "Gopalapuram", pincode: "600086" },
  { name: "Teynampet", pincode: "600018" },
  { name: "Nandanam", pincode: "600035" },
  { name: "Kotturpuram", pincode: "600085" },
  { name: "Mandaveli", pincode: "600028" },
  { name: "Luz", pincode: "600004" },
  { name: "Choolaimedu", pincode: "600094" },
  { name: "Jafferkhanpet", pincode: "600095" },
  { name: "Ekkaduthangal", pincode: "600097" },
  { name: "Porur", pincode: "600116" },
  { name: "Valasaravakkam", pincode: "600087" },
  { name: "Ramapuram", pincode: "600089" },
  { name: "Manapakkam", pincode: "600125" },
  { name: "OMR (Thoraipakkam)", pincode: "600097" },
  { name: "Palavakkam", pincode: "600041" },
  { name: "Neelankarai", pincode: "600041" },
  { name: "Injambakkam", pincode: "600115" },
  { name: "Kottivakkam", pincode: "600041" },
];

const DATABASE_URL = process.env.DATABASE_URL;

async function populateAreas() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('Connected to database');
  console.log(`Inserting ${chennaiAreas.length} Chennai localities...`);
  
  // First, clear existing areas
  await connection.execute('DELETE FROM delivery_areas');
  console.log('Cleared existing delivery areas');
  
  // Insert new areas with default delivery charge of 5000 paise (₹50)
  for (const area of chennaiAreas) {
    try {
      await connection.execute(
        'INSERT INTO delivery_areas (areaName, pincode, deliveryCharge, isActive) VALUES (?, ?, ?, ?)',
        [area.name, area.pincode, 5000, true]
      );
      console.log(`Added: ${area.name} - ${area.pincode}`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`Skipped duplicate: ${area.name}`);
      } else {
        console.error(`Error adding ${area.name}:`, err.message);
      }
    }
  }
  
  // Get count
  const [rows] = await connection.execute('SELECT COUNT(*) as count FROM delivery_areas');
  console.log(`\nTotal areas in database: ${rows[0].count}`);
  
  await connection.end();
  console.log('Done!');
}

populateAreas().catch(console.error);
