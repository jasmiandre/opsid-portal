import pg from 'pg';

const pool = new pg.Pool({
  host:               '10.34.1.9',
  port:               5432,
  database:           'opsid_db',
  user:               'svc_portal',
  password:           'Sandiaman2026',
  max:                10,
  idleTimeoutMillis:  30000,
  connectionTimeoutMillis: 5000,
});

// Log unexpected pool errors instead of crashing the process
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool client error:', err.message);
});

export default pool;
