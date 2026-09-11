import { Pool, QueryResult, QueryResultRow } from 'pg';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
export const isDbConfigured = Boolean(connectionString);

let pool: Pool | null = null;
if (isDbConfigured) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  if (!pool) {
    throw new Error('Database connection string is not configured (POSTGRES_URL missing)');
  }
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[PG QUERY]', { text, duration, rows: res.rowCount });
  }
  return res;
}

export async function getClient() {
  if (!pool) {
    throw new Error('Database connection string is not configured (POSTGRES_URL missing)');
  }
  const client = await pool.connect();
  return client;
}

export default pool;
