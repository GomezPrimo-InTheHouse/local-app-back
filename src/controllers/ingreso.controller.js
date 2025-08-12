// src/controllers/ingreso.controller.js
const { pool } = require ('../config/db.js');
// Crear ingreso
const createIngreso = async (req, res) => {
  try {
    const { equipo_id, fecha_ingreso, fecha_egreso, estado } = req.body;

    const query = `
      INSERT INTO ingreso (equipo_id, fecha_ingreso, fecha_egreso, estado)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [
      equipo_id,
      fecha_ingreso || new Date(),
      fecha_egreso || null,
      estado || 'En reparación'
    ];

    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener todos los ingresos
const getIngresos = async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ingreso ORDER BY fecha_ingreso DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener ingresos por equipo, más recientes primero
const getIngresosByEquipo = async (req, res) => {
  try {
    const { equipoId } = req.params;
    const query = `
      SELECT * 
      FROM ingreso 
      WHERE equipo_id = $1
      ORDER BY fecha_ingreso DESC, fecha_egreso ASC NULLS FIRST;
    `;
    const { rows } = await pool.query(query, [equipoId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar ingreso
const updateIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_ingreso, fecha_egreso, estado } = req.body;

    const query = `
      UPDATE ingreso
      SET fecha_ingreso = COALESCE($1, fecha_ingreso),
          fecha_egreso = COALESCE($2, fecha_egreso),
          estado = COALESCE($3, estado)
      WHERE id = $4
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [fecha_ingreso, fecha_egreso, estado, id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Ingreso no encontrado' });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar ingreso
const deleteIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM ingreso WHERE id = $1', [id]);

    if (rowCount === 0) return res.status(404).json({ error: 'Ingreso no encontrado' });

    res.json({ message: 'Ingreso eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createIngreso,
  getIngresos,
  getIngresosByEquipo,
  updateIngreso,
  deleteIngreso
};
