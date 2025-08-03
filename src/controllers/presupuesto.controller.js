const { pool } = require ('../config/db.js');

// Obtener todos los presupuestos
const getPresupuestos = async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, 
             e.tipo AS equipo_tipo, e.marca AS equipo_marca, e.modelo AS equipo_modelo
      FROM presupuesto p
      INNER JOIN cliente c ON p.cliente_id = c.id
      INNER JOIN equipo e ON p.equipo_id = e.id
      ORDER BY p.fecha DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener presupuestos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nuevo presupuesto
const createPresupuesto = async (req, res) => {
  try {
    const { fecha, total, observaciones, cliente_id, equipo_id } = req.body;

    

    const query = `
      INSERT INTO presupuesto (fecha, total, observaciones, cliente_id, equipo_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [fecha || new Date(), total, observaciones || null, cliente_id, equipo_id];

    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear presupuesto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar presupuesto
const updatePresupuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, total, observaciones } = req.body;

    const query = `
      UPDATE presupuesto
      SET fecha = $1, total = $2, observaciones = $3
      WHERE id = $4
      RETURNING *;
    `;
    const values = [fecha || new Date(), total, observaciones || null, id];

    const { rows } = await pool.query(query, values);
    if (rows.length === 0) return res.status(404).json({ message: 'Presupuesto no encontrado' });

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al actualizar presupuesto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar presupuesto
const deletePresupuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM presupuesto WHERE id = $1', [id]);

    if (rowCount === 0) return res.status(404).json({ message: 'Presupuesto no encontrado' });

    res.json({ message: 'Presupuesto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar presupuesto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getPresupuestos,
  createPresupuesto,
  updatePresupuesto,
  deletePresupuesto
};
