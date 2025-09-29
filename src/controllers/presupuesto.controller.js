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

// export const getBalancePresupuestos = async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         i.id AS ingreso_id,
//         i.equipo_id,
//         i.fecha_ingreso,
//         COALESCE(SUM(p.costo), 0) AS costo,
//         COALESCE(SUM(p.total), 0) AS total
//       FROM ingreso i
//       LEFT JOIN presupuesto p ON p.ingreso_id = i.id
//       GROUP BY i.id, i.equipo_id
//       ORDER BY i.id;
//     `;

//     const { rows } = await pool.query(query);

//     //formatear fecha para mostrar año / mes / dia
//     rows.forEach(r => {
//       r.fecha_ingreso = new Date(r.fecha_ingreso).toLocaleDateString('es-ES');
//     });

//     // Calcular balance_final para cada ingreso
//     const balances = rows.map(r => ({
//       ingreso_id: r.ingreso_id,
//       equipo_id: r.equipo_id,
//       fecha_ingreso: r.fecha_ingreso,
//       costo: Number(r.costo),
//       total: Number(r.total),
//       balance_final: Number(r.total) - Number(r.costo)
//     }));

//     res.json({ balances });


//   } catch (error) {
//     console.error('Error en getBalancePresupuestos:', error.message);
//     res.status(500).json({ error: 'Error al obtener balances de presupuestos' });
//   }
// };

// export const getBalancePresupuestos = async (req, res) => {
//   try {
//     const { equipo_id } = req.query; // opcional: ?equipo_id=50

//     const query = `
//       WITH per_ingreso AS (
//         SELECT
//           i.id AS ingreso_id,
//           i.equipo_id,
//           i.fecha_ingreso,
//           COALESCE(SUM(p.costo), 0)::numeric AS costo_ingreso,
//           COALESCE(SUM(p.total), 0)::numeric AS total_ingreso
//         FROM ingreso i
//         LEFT JOIN presupuesto p ON p.ingreso_id = i.id
//         ${ equipo_id ? 'WHERE i.equipo_id = $1' : '' }
//         GROUP BY i.id, i.equipo_id, i.fecha_ingreso
//       )
//       SELECT
//         pi.equipo_id,
//         json_agg(
//           json_build_object(
//             'ingreso_id', pi.ingreso_id,
//             'fecha_ingreso', TO_CHAR(pi.fecha_ingreso, 'DD/MM/YYYY'),
//             'costo', (pi.costo_ingreso)::numeric,
//             'total', (pi.total_ingreso)::numeric,
//             'balance', (pi.total_ingreso - pi.costo_ingreso)::numeric
//           ) ORDER BY pi.fecha_ingreso DESC
//         ) AS ingresos,
//         SUM(pi.costo_ingreso)::numeric AS costo_total,
//         SUM(pi.total_ingreso)::numeric AS total_total,
//         SUM(pi.total_ingreso - pi.costo_ingreso)::numeric AS balance_final
//       FROM per_ingreso pi
//       GROUP BY pi.equipo_id
//       ORDER BY pi.equipo_id;
//     `;

//     const { rows } = equipo_id
//       ? await pool.query(query, [equipo_id])
//       : await pool.query(query);

//     // Convertir numeros (numeric) a Number y devolver formato consistente
//     const data = rows.map(r => ({
//       equipo_id: Number(r.equipo_id),
//       ingresos: (r.ingresos || []).map(i => ({
//         ingreso_id: Number(i.ingreso_id),
//         fecha_ingreso: i.fecha_ingreso,            // 'DD/MM/YYYY' según TO_CHAR
//         costo: Number(i.costo),
//         total: Number(i.total),
//         balance: Number(i.balance)
//       })),
//       costo_total: Number(r.costo_total ?? 0),
//       total_total: Number(r.total_total ?? 0),
//       balance_final: Number(r.balance_final ?? 0)
//     }));

//     return res.status(200).json({ success: true, data });
//   } catch (error) {
//     console.error('Error en getBalancePresupuestosPorEquipo:', error);
//     return res.status(500).json({ success: false, error: 'Error al obtener balances por equipo' });
//   }
// };


export const getBalancePresupuestos = async (req, res) => {
  try {
    const { equipo_id } = req.query; // opcional

    const query = `
      SELECT
        i.equipo_id,
        MAX(e.tipo)          AS tipo,
        MAX(e.marca)         AS marca,
        MAX(e.modelo)        AS modelo,
        TO_CHAR(date_trunc('month', COALESCE(p.fecha, i.fecha_ingreso)), 'MM/YYYY') AS mes,
        json_agg(
          json_build_object(
            'presupuesto_id', p.id,
            'ingreso_id', i.id,
            'fecha_presupuesto', TO_CHAR(p.fecha, 'DD/MM/YYYY'),
            'costo_presupuesto', COALESCE(p.costo, 0),
            'total_presupuesto', COALESCE(p.total, 0),
            'balance', (COALESCE(p.total,0) - COALESCE(p.costo,0))
          ) ORDER BY COALESCE(p.fecha, i.fecha_ingreso) DESC NULLS LAST
        ) FILTER (WHERE p.id IS NOT NULL) AS presupuestos,
        SUM(COALESCE(p.costo,0))::numeric AS costo_total,
        SUM(COALESCE(p.total,0))::numeric AS total_total,
        SUM(COALESCE(p.total,0) - COALESCE(p.costo,0))::numeric AS balance_final
      FROM ingreso i
      LEFT JOIN presupuesto p ON p.ingreso_id = i.id
      LEFT JOIN equipo e ON e.id = i.equipo_id
      ${equipo_id ? "WHERE i.equipo_id = $1" : ""}
      GROUP BY i.equipo_id, date_trunc('month', COALESCE(p.fecha, i.fecha_ingreso))
      ORDER BY i.equipo_id, date_trunc('month', COALESCE(p.fecha, i.fecha_ingreso)) DESC;
    `;

    const result = equipo_id
      ? await pool.query(query, [equipo_id])
      : await pool.query(query);

    const rows = result.rows;

    // Mapear a JSON consistente
    const data = rows.map((r) => ({
      equipo_id: Number(r.equipo_id),
      tipo: r.tipo ?? null,
      marca: r.marca ?? null,
      modelo: r.modelo ?? null,
      mes: r.mes, // "MM/YYYY"
      presupuestos: (r.presupuestos || []).map((p) => ({
        presupuesto_id: Number(p.presupuesto_id),
        ingreso_id: Number(p.ingreso_id),
        fecha_presupuesto: p.fecha_presupuesto || null,
        costo_presupuesto: Number(p.costo_presupuesto ?? 0),
        total_presupuesto: Number(p.total_presupuesto ?? 0),
        balance: Number(p.balance ?? 0),
      })),
      costo_total: Number(r.costo_total ?? 0),
      total_total: Number(r.total_total ?? 0),
      balance_final: Number(r.balance_final ?? 0),
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en getBalancePresupuestos:", error);
    return res
      .status(500)
      .json({ success: false, error: "Error al obtener balances por equipo y mes" });
  }
};




export default  {
  createPresupuesto,
  getPresupuestos,
  getPresupuestosByIngreso,
  updatePresupuesto,
  deletePresupuesto,
  getPresupuestosByEquipo,
  getBalancePresupuestos
};

