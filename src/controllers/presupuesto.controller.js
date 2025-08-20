// src/controllers/presupuesto.controller.js
import  {pool}  from '../config/db.js';

// const createPresupuesto = async (req, res) => {
//   try {
//     const { ingreso_id, fecha, costo, total, observaciones, estado } = req.body;

//     if (!ingreso_id || !fecha || !total) {
//       return res.status(400).json({ error: "Campos obligatorios: ingreso_id, fecha, total" });
//     }

//     const query = `
//       INSERT INTO presupuesto (ingreso_id, fecha, costo, total, observaciones, estado)
//       VALUES ($1, $2, $3, $4, $5, $6)
//       RETURNING *;
//     `;
//     const values = [
//       ingreso_id,
//       fecha,
//       costo || 0,
//       total,
//       observaciones || null,
//       estado || 'Pendiente'
//     ];

//     const { rows } = await pool.query(query, values);
//     res.status(201).json(rows[0]);
//   } catch (err) {
//     console.error('❌ Error al crear presupuesto:', err);
//     res.status(500).json({ error: err.message });
//   }
// };

export const createPresupuesto = async (req, res) => {
  const { ingreso_id, fecha, costo, total, observaciones, estado_id } = req.body;
  console.log(req.body)
  try {
    const result = await pool.query(
      `INSERT INTO presupuesto (ingreso_id, fecha, costo, total, observaciones, estado_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [ingreso_id, fecha, costo, total, observaciones, estado_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error creando presupuesto:", error);
    res.status(500).json({ error: "Error creando presupuesto" });
  }
};


// const getPresupuestos = async (_req, res) => {
//   try {
//     const { rows } = await pool.query('SELECT * FROM presupuesto ORDER BY fecha DESC');
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
export const getPresupuestos = async (req, res) => {
  try {
    const {rows} = await pool.query(
      `SELECT p.*, e.nombre AS estado_nombre
       FROM presupuesto p
       JOIN estado e ON p.estado_id = e.id
       ORDER BY p.fecha DESC`
    );

    if(rows.length === 0) {
      return res.status(404).json({ message: "No se encontraron presupuestos" });
    }

    if (rows.length > 0) {
      res.status(200).json(rows);
    }
  } catch (error) {
    console.error("Error obteniendo presupuestos:", error);
    res.status(500).json({ error: "Error obteniendo presupuestos" });
  }
};


export const getPresupuestosByIngreso = async (req, res) => {
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

// const updatePresupuesto = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { ingreso_id, fecha, costo, total, observaciones, estado } = req.body;

//     const { rows } = await pool.query(
//       `UPDATE presupuesto
//        SET ingreso_id   = COALESCE($1, ingreso_id),
//            fecha        = COALESCE($2, fecha),
//            costo        = COALESCE($3, costo),
//            total        = COALESCE($4, total),
//            observaciones = COALESCE($5, observaciones),
//            estado       = COALESCE($6, estado)
//        WHERE id = $7
//        RETURNING *`,
//       [ingreso_id, fecha, costo, total, observaciones, estado, id]
//     );

//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'Presupuesto no encontrado' });
//     }

//     res.json(rows[0]);
//   } catch (err) {
//     console.error('❌ Error al actualizar presupuesto:', err);
//     res.status(500).json({ error: err.message });
//   }
// };
export const updatePresupuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, costo, total, observaciones, estado_id } = req.body;

    const { rows } = await pool.query(
      `UPDATE presupuesto
       SET fecha = COALESCE($1, fecha),
           costo = COALESCE($2, costo),
           total = COALESCE($3, total),
           observaciones = COALESCE($4, observaciones),
           estado_id = COALESCE($5, estado_id)
       WHERE id = $6
       RETURNING *`,
      [fecha, costo, total, observaciones, estado_id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



export const deletePresupuesto = async (req, res) => {
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
// const getPresupuestosByEquipo = async (req, res) => {
//   try {
//     const { equipoId } = req.params;

//     const query = `
//       SELECT
//     e.id AS equipo_id,
//     e.tipo,
//     e.marca,
//     e.modelo,
//     e.problema,

//     i.id AS ingreso_id,
//     i.fecha_ingreso,
//     i.fecha_egreso,
//     i.estado AS estado_ingreso,

//     p.id AS presupuesto_id,

//     p.fecha AS fecha_presupuesto,
//     p.costo AS costo_presupuesto,
//     p.total AS total_presupuesto,
//     p.observaciones AS observaciones_presupuesto,
//     p.estado AS estado_presupuesto
    
// FROM equipo e
// LEFT JOIN LATERAL (
//     SELECT *
//     FROM ingreso i
//     WHERE i.equipo_id = e.id
//     ORDER BY i.fecha_ingreso DESC
   
// ) i ON true
// LEFT JOIN LATERAL (
//     SELECT *
//     FROM presupuesto p
//     WHERE p.ingreso_id = i.id
//     ORDER BY p.fecha DESC
    
// ) p ON true
// WHERE e.id = $1;
//     `;

//     const { rows } = await pool.query(query, [equipoId]);
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
export const getPresupuestosByEquipo = async (req, res) => {
  try {
    const { equipoId } = req.params;

    const query = `
      SELECT
        e.id AS equipo_id,
        e.tipo,
        e.marca,
        e.modelo,
        e.problema,
        es_eq.id AS estado_equipo_id,
        es_eq.nombre AS estado_equipo_nombre,

        i.id AS ingreso_id,
        i.fecha_ingreso,
        i.fecha_egreso,
        es_in.id AS estado_ingreso_id,
        es_in.nombre AS estado_ingreso_nombre,

        p.id AS presupuesto_id,
        p.fecha AS fecha_presupuesto,
        p.costo AS costo_presupuesto,
        p.total AS total_presupuesto,
        p.observaciones AS observaciones_presupuesto,
        es_pr.id AS estado_presupuesto_id,
        es_pr.nombre AS estado_presupuesto_nombre

      FROM equipo e
      JOIN estado es_eq ON es_eq.id = e.estado_id

      LEFT JOIN LATERAL (
          SELECT *
          FROM ingreso i
          WHERE i.equipo_id = e.id
          ORDER BY i.fecha_ingreso DESC
      ) i ON true
      LEFT JOIN estado es_in ON es_in.id = i.estado_id

      LEFT JOIN LATERAL (
          SELECT *
          FROM presupuesto p
          WHERE p.ingreso_id = i.id
          ORDER BY p.fecha DESC
      ) p ON true
      LEFT JOIN estado es_pr ON es_pr.id = p.estado_id

      WHERE e.id = $1;
    `;

    const { rows } = await pool.query(query, [equipoId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




export default  {
  createPresupuesto,
  getPresupuestos,
  getPresupuestosByIngreso,
  updatePresupuesto,
  deletePresupuesto,
  getPresupuestosByEquipo
};

