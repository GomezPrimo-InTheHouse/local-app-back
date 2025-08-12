// src/middlewares/validateIngreso.js
const pool = require('../config/db');

const validateIngreso = async (req, res, next) => {
  const { equipo_id } = req.body;

  try {
    // Validar que el equipo exista
    const equipoRes = await pool.query(
      'SELECT id, cliente_id FROM equipo WHERE id = $1',
      [equipo_id]
    );

    if (equipoRes.rowCount === 0) {
      return res.status(400).json({ error: `El equipo con id ${equipo_id} no existe` });
    }

    // Guardar datos del equipo en req para uso en controladores si hace falta
    req.equipo = equipoRes.rows[0];

    next();
  } catch (err) {
    console.error('Error en validación de ingreso:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = validateIngreso;
