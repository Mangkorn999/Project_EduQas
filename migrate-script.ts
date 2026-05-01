import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const connectionString = 'postgresql://postgres:6610210631@localhost:5432/eila_dev';
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function run() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './backend/db/migrations' });
  console.log('Migrations complete!');
  process.exit(0);
}
run().catch(err => {
  console.error(err);
  process.exit(1);
});
