import pg from 'pg';
const { Pool } = pg;
// Database connection pool
export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'frame_note',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});
// Test connection
pool.on('connect', () => {
    console.log('📦 Connected to PostgreSQL database');
});
pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
});
export default pool;
