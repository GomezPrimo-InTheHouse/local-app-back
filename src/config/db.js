// import pg from 'pg';
// import { config } from 'dotenv';

// config();
// const { Pool } = pg;

// // Pool de conexiones
// export const pool = new Pool({
//   host: process.env.DB_HOST || 'localhost',
//   port: process.env.DB_PORT || 5433,
//   user: process.env.DB_USER || 'postgres',
//   password: process.env.DB_PASS || '1995',
//   database: process.env.DB_NAME || 'local'
// });

// // Test de conexión
// pool.connect()
//   .then(client => {
//     console.log('✅ Conectado a PostgreSQL');
//     client.release();
//   })
//   .catch(err => console.error('❌ Error de conexión:', err));


// export default { pool };