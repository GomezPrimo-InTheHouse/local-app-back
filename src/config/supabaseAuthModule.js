// src/config/db.js
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
    ssl: {
    require: true,               // 🔥 fuerza TLS en Render
    rejectUnauthorized: false,   // 🔥 ignora CA no firmada
  },
});

pool.on('connect', () => {
  console.log('✅ Conectado a la base de datos Supabase (modo SQL crudo)');
});

pool.on('error', (err) => {
  console.error('❌ Error en la conexión con Supabase:', err);
});
export const testDbConnection = async () => {
    try {
        const client = await pool.connect();    
        const res = await
            client.query('SELECT NOW()');
        console.log('✅ Conexión a la base de datos Supabase exitosa:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error('❌ Error al conectar a la base de datos Supabase:', err);
    }
};

// Prueba la conexión al iniciar el módulo
testDbConnection();


// src/config/db.js
// src/config/supabaseAuthModule.js
// src/config/supabaseAuthModule.js
// src/config/supabaseAuthModule.js
// src/config/supabaseAuthModule.js
// import 'dotenv/config';
// import pkg from 'pg';
// import { resolve4 } from 'dns/promises';

// const { Pool } = pkg;

// const redact = (url) =>
//   url ? url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : '(sin DATABASE_URL)';

// function parseDbUrl(dbUrl) {
//   if (!dbUrl) throw new Error('DATABASE_URL no definida');
//   const u = new URL(dbUrl);
//   return {
//     proto: u.protocol, // "postgresql:"
//     user: decodeURIComponent(u.username),
//     pass: decodeURIComponent(u.password),
//     host: u.hostname,                          // hostname original (para SNI)
//     port: u.port ? Number(u.port) : 5432,
//     db: u.pathname?.replace(/^\//, '') || 'postgres',
//     // IMPORTANTE: NO usar u.search acá (evitamos sslmode desde query)
//   };
// }

// async function buildConnectionTarget(dbUrl) {
//   console.log('DATABASE_URL:', redact(dbUrl));
//   const cfg = parseDbUrl(dbUrl);

//   // Si estás en producción, intentamos IPv4 para evitar AAAA; en local, usamos hostname
//   const isProduction = process.env.NODE_ENV === 'production';

//   let ipv4 = null;
//   if (isProduction) {
//     try {
//       const A = await resolve4(cfg.host);
//       if (Array.isArray(A) && A.length > 0) {
//         ipv4 = A[0];
//         console.log(`🔎 ${cfg.host} → IPv4 ${ipv4}`);
//       }
//     } catch (e) {
//       console.warn(`⚠️ No se pudo resolver A(IPv4) de ${cfg.host}:`, e?.code || e?.message || e);
//     }
//   }

//   // Construimos connectionString SIN parámetros ?sslmode=… (lo forzamos vía objeto ssl)
//   const hostForConn = isProduction && ipv4 ? ipv4 : cfg.host;
//   const connectionString =
//     `${cfg.proto}//${encodeURIComponent(cfg.user)}:${encodeURIComponent(cfg.pass)}@` +
//     `${hostForConn}:${cfg.port}/${cfg.db}`;

//   // TLS: rechazamos verificación para evitar "self-signed", y SIEMPRE enviamos SNI = hostname real
//   const ssl = {
//     rejectUnauthorized: false,
//     servername: cfg.host,
//   };

//   if (isProduction && ipv4) {
//     console.log(`🔒 Forzando conexión por IPv4: ${hostForConn}:${cfg.port} (SNI=${cfg.host})`);
//   } else {
//     console.log(`🔒 Conexión por hostname: ${cfg.host}:${cfg.port} (SNI=${cfg.host})`);
//   }

//   return { connectionString, ssl };
// }

// // ——— mantiene EXACTAMENTE el mismo nombre de export ———
// const DB_URL = process.env.DATABASE_URL;
// const { connectionString, ssl } = await buildConnectionTarget(DB_URL);

// export const pool = new Pool({
//   connectionString,
//   ssl, // <- usamos el objeto ssl, no la query
//   max: 10,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 10000,
// });

// pool.on('connect', () => {
//   console.log('✅ Pool PG listo (SQL crudo).');
// });

// pool.on('error', (err) => {
//   console.error('❌ Error en Pool PG:', err);
// });

// // Helpers (no cambian nombres en otros módulos)
// export async function pingDb() {
//   const client = await pool.connect();
//   try {
//     const r = await client.query('SELECT 1 AS ok');
//     return r.rows[0]?.ok === 1;
//   } finally {
//     client.release();
//   }
// }

// export async function testDbConnection() {
//   try {
//     const client = await pool.connect();
//     const res = await client.query('SELECT NOW() as now');
//     console.log('✅ Conexión a la base de datos Supabase exitosa:', res.rows[0]);
//     client.release();
//   } catch (err) {
//     console.error('❌ Error al conectar a la base de datos Supabase:', err);
//   }
// }

