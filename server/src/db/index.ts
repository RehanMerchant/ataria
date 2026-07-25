// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


export const db = drizzle(pool, { schema });


export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('\x1b[32m%s\x1b[0m', 'PostgreSQL Connected Successfully');
    client.release();
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'PostgreSQL Connection Failed:', error);
    process.exit(1);
  }
};