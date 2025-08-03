// src/middlewares/validatePresupuesto.js
const { pool } = require ('../config/db.js');

const validatePresupuesto = async (req, res, next) => {
  const { cliente_id, equipo_id } = req.body;

  try {
    // Validar que cliente exista
    const clienteResult = await pool.query('SELECT id FROM cliente WHERE id = $1', [cliente_id]);
    if (clienteResult.rowCount === 0) {
      return res.status(400).json({ error: `El cliente con id ${cliente_id} no existe` });
    }

    // Validar que equipo exista
    const equipoResult = await pool.query('SELECT id FROM equipo WHERE id = $1', [equipo_id]);
    if (equipoResult.rowCount === 0) {
      return res.status(400).json({ error: `El equipo con id ${equipo_id} no existe` });
    }

    // Todo OK → pasar al controlador
    next();
  } catch (error) {
    console.error('Error en validación de presupuesto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = validatePresupuesto;
