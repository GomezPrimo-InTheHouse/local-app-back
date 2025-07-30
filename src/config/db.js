const pg  = require('pg');
const dotenv = require('dotenv');

dotenv.config();
const { Pool } = pg;

// Pool de conexiones
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '1995',
  database: process.env.DB_NAME || 'local'
});

// Test de conexión
pool.connect()
  .then(client => {
    console.log('✅ Conectado a PostgreSQL');
    client.release();
  })
  .catch(err => console.error('❌ Error de conexión:', err));


  module.exports = { pool };