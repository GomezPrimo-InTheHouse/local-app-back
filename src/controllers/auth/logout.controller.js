import {pool} from '../../config/db.js';
import registrarHistorial from '../../utils/historial/registrarHistorial.js';
export const logout = async (req, res) => {
  const { email } = req.body;
  const estadoInactivoId = 2;

  if (!email) {
    return res.status(400).json({ error: 'Falta el email' });
  }

  try {
    // Buscar el usuario por email
    const result = await pool.query(
      `SELECT id FROM usuario WHERE email = $1`,
      [email]
    );

    if(result.rows.length === 0) {
        await registrarHistorial({
              username: email,
              accion: 'logout',
              estado: 'exitoso',
              mensaje: 'Logout exitoso',
            });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userId = result.rows[0].id;

    // Marcar sesiones como inactivas
    await pool.query(
      `UPDATE sesion SET estado_id = $1, actualizado_en = NOW()
       WHERE usuario_id = $2 AND estado_id = 1`,
      [estadoInactivoId, userId]
    );

    return res.status(200).json({ message: 'Sesión finalizada correctamente' });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export default { logout };