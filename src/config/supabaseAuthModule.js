// // src/config/db.js
// import pkg from 'pg';
// import dotenv from 'dotenv';
// dotenv.config();

// const { Pool } = pkg;

// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false }, // Supabase requiere SSL
// });

// pool.on('connect', () => {
//   console.log('✅ Conectado a la base de datos Supabase (modo SQL crudo)');
// });

// pool.on('error', (err) => {
//   console.error('❌ Error en la conexión con Supabase:', err);
// });
// export const testDbConnection = async () => {
//     try {
//         const client = await pool.connect();    
//         const res = await
//             client.query('SELECT NOW()');
//         console.log('✅ Conexión a la base de datos Supabase exitosa:', res.rows[0]);
//         client.release();
//     } catch (err) {
//         console.error('❌ Error al conectar a la base de datos Supabase:', err);
//     }
// };

// // Prueba la conexión al iniciar el módulo
// testDbConnection();


// src/config/db.js
import 'dotenv/config'; // en dev local carga .env; en Render usa Environment
import pkg from 'pg';
const { Pool } = pkg;

// Log seguro de la URL (oculta password)
const redact = (url) =>
  url ? url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : '(sin DATABASE_URL)';

function warnIfNotPooler(dbUrl) {
  if (!dbUrl) return;
  try {
    const u = new URL(dbUrl);
    const host = u.hostname;
    const port = u.port || '5432';
    if (!host.includes('pooler.supabase.com') || port !== '6543') {
      console.warn(
        `⚠️  DATABASE_URL no parece usar el Pooler (host=${host}, port=${port}). ` +
        `Usá aws-1-us-east-2.pooler.supabase.com:6543 con ?sslmode=require`
      );
    }
  } catch {
    // no-op
  }
}

const DB_URL = process.env.DATABASE_URL;
console.log('DATABASE_URL:', redact(DB_URL));
warnIfNotPooler(DB_URL);

export const pool = new Pool({
  connectionString: DB_URL,                 // Debe apuntar al pooler:6543
  ssl: { rejectUnauthorized: false },       // o usa ?sslmode=require en la URL
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('✅ Pool PG listo (SQL crudo).');
});

pool.on('error', (err) => {
  console.error('❌ Error en Pool PG:', err);
});

// Ping rápido
export async function pingDb() {
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT 1 AS ok');
    return r.rows[0]?.ok === 1;
  } finally {
    client.release();
  }
}

// Test de conexión con log claro
export async function testDbConnection() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as now');
    console.log('✅ Conexión a la base de datos Supabase exitosa:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('❌ Error al conectar a la base de datos Supabase:', err);
  }
}
