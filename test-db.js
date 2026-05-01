const postgres = require('postgres');
const sql = postgres('postgresql://postgres:6610210631@localhost:5432/eila_dev');
sql`SELECT 1`.then(console.log).catch(console.error).finally(() => process.exit());
