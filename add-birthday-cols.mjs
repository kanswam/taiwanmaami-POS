import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Check if columns exist
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' 
    AND COLUMN_NAME IN ('birthMonth', 'birthDay', 'birthdayCodeUsedYear')
  `);
  
  const existingCols = columns.map(c => c.COLUMN_NAME);
  
  if (!existingCols.includes('birthMonth')) {
    await connection.query('ALTER TABLE users ADD COLUMN birthMonth INT NULL');
    console.log('Added birthMonth column');
  }
  
  if (!existingCols.includes('birthDay')) {
    await connection.query('ALTER TABLE users ADD COLUMN birthDay INT NULL');
    console.log('Added birthDay column');
  }
  
  if (!existingCols.includes('birthdayCodeUsedYear')) {
    await connection.query('ALTER TABLE users ADD COLUMN birthdayCodeUsedYear INT NULL');
    console.log('Added birthdayCodeUsedYear column');
  }
  
  console.log('Done!');
  await connection.end();
}

main().catch(console.error);
