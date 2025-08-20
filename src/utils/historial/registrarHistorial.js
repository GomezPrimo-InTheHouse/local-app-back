// src/utils/historial/registrarHistorial.js
import { pool } from '../../config/db.js';

/**
 * Registra un evento de historial de login.
 * @param {Object} params
 * @param {string} params.username - Nombre del usuario que intenta autenticarse
 * @param {string} params.accion - Acción realizada ('login', 'logout', etc.)
 * @param {string} params.estado - Estado del evento ('exitoso', 'error', etc.)
 * @param {string} params.mensaje - Mensaje descriptivo del evento
 * @returns {Promise<Object|null>} - Registro insertado o null si falla
 */
export const registrarHistorial = async ({ username, accion, estado, mensaje }) => {
  console.log('📌 registrarHistorial() llamado con:', { username, accion, estado, mensaje });

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO historial_login (username, accion, estado, mensaje)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [username, accion, estado, mensaje]
    );

    console.log('✅ Registro insertado correctamente:', rows[0]);
    return rows[0];
  } catch (error) {
    console.error('❌ Error registrando historial:', error.message);
    return null;
  }
};

export default { registrarHistorial };


