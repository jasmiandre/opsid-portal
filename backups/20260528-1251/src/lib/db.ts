import pg from 'pg';

const pool = new pg.Pool({
  host:     '10.34.1.9',
  port:     5432,
  database: 'opsid_db',
  user:     'svc_portal',
  password: 'Sandiaman2026',
  max:      10,
  idleTimeoutMillis: 30000,
});

export default pool;
