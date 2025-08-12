// src/controllers/presupuesto.controller.js
const { pool } = require ('../config/db.js');

const createPresupuesto = async (req, res) => {
  try {
    const { ingreso_id, fecha, costo, total, observaciones, estado } = req.body;

    if (!ingreso_id || !fecha || !total) {
      return res.status(400).json({ error: "Campos obligatorios: ingreso_id, fecha, total" });
    }

    const query = `
      INSERT INTO presupuesto (ingreso_id, fecha, costo, total, observaciones, estado)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      ingreso_id,
      fecha,
      costo || 0,
      total,
      observaciones || null,
      estado || 'Pendiente'
    ];

    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ Error al crear presupuesto:', err);
    res.status(500).json({ error: err.message });
  }
};


const getPresupuestos = async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM presupuesto ORDER BY fecha DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPresupuestosByIngreso = async (req, res) => {
  try {
    const { ingresoId } = req.params;
   

    const { rows } = await pool.query(
      'SELECT * FROM presupuesto WHERE ingreso_id = $1 ORDER BY fecha::timestamp DESC',
      [ingresoId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updatePresupuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const { ingreso_id, fecha, costo, total, observaciones, estado } = req.body;

    const { rows } = await pool.query(
      `UPDATE presupuesto
       SET ingreso_id   = COALESCE($1, ingreso_id),
           fecha        = COALESCE($2, fecha),
           costo        = COALESCE($3, costo),
           total        = COALESCE($4, total),
           observaciones = COALESCE($5, observaciones),
           estado       = COALESCE($6, estado)
       WHERE id = $7
       RETURNING *`,
      [ingreso_id, fecha, costo, total, observaciones, estado, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error al actualizar presupuesto:', err);
    res.status(500).json({ error: err.message });
  }
};



const deletePresupuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM presupuesto WHERE id = $1', [id]);

    if (rowCount === 0) return res.status(404).json({ error: 'Presupuesto no encontrado' });

    res.json({ message: 'Presupuesto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//obtener presupuestos por equipo
const getPresupuestosByEquipo = async (req, res) => {
  try {
    const { equipoId } = req.params;

    const query = `
      SELECT
    e.id AS equipo_id,
    e.tipo,
    e.marca,
    e.modelo,
    e.problema,

    i.id AS ingreso_id,
    i.fecha_ingreso,
    i.fecha_egreso,
    i.estado AS estado_ingreso,

    p.id AS presupuesto_id,
    p.fecha AS fecha_presupuesto,
    p.costo AS costo_presupuesto,
    p.total AS total_presupuesto,
    p.observaciones AS observaciones_presupuesto,
    p.estado AS estado_presupuesto
    
FROM equipo e
LEFT JOIN LATERAL (
    SELECT *
    FROM ingreso i
    WHERE i.equipo_id = e.id
    ORDER BY i.fecha_ingreso DESC
   
) i ON true
LEFT JOIN LATERAL (
    SELECT *
    FROM presupuesto p
    WHERE p.ingreso_id = i.id
    ORDER BY p.fecha DESC
    
) p ON true
WHERE e.id = $1;
    `;

    const { rows } = await pool.query(query, [equipoId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  createPresupuesto,
  getPresupuestos,
  getPresupuestosByIngreso,
  updatePresupuesto,
  deletePresupuesto,
  getPresupuestosByEquipo
};

