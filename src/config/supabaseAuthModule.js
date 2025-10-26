// src/config/db.js
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL_POOLED,
  ssl: { rejectUnauthorized: false }, // Supabase requiere SSL
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