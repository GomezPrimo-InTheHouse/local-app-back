// src/controllers/ingreso.controller.js
import  {pool}  from '../config/db.js';
import { supabase } from '../config/supabase.js';
// Crear ingreso
// const createIngreso = async (req, res) => {
//   try {
//     const { equipo_id, fecha_ingreso, fecha_egreso, estado } = req.body;

//     const query = `
//       INSERT INTO ingreso (equipo_id, fecha_ingreso, fecha_egreso, estado)
//       VALUES ($1, $2, $3, $4)
//       RETURNING *;
//     `;

//     const values = [
//       equipo_id,
//       fecha_ingreso || new Date(),
//       fecha_egreso || null,
//       estado || 'En reparación'
//     ];

//     const { rows } = await pool.query(query, values);
//     res.status(201).json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // CREATE INGRESO
// export const createIngreso = async (req, res) => {
//   try {
//     const { equipo_id, fecha_ingreso, fecha_egreso, estado_id } = req.body;

//     const query = `
//       INSERT INTO ingreso (equipo_id, fecha_ingreso, fecha_egreso, estado_id)
//       VALUES ($1, $2, $3, $4)
//       RETURNING *;
//     `;

//     const { rows } = await pool.query(query, [equipo_id, fecha_ingreso, fecha_egreso, estado_id]);
//     res.status(201).json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Obtener todos los ingresos
// export const getIngresos = async (_req, res) => {
//   try {
//     const { rows } = await pool.query('SELECT * FROM ingreso ORDER BY fecha_ingreso DESC');
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Obtener ingresos por equipo, más recientes primero
// export const getIngresosByEquipo = async (req, res) => {
//   try {
//     const { equipoId } = req.params;
//     const query = `
//       SELECT * 
//       FROM ingreso 
//       WHERE equipo_id = $1
//       ORDER BY fecha_ingreso DESC, fecha_egreso ASC NULLS FIRST;
//     `;
//     const { rows } = await pool.query(query, [equipoId]);
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Actualizar ingreso

// export const updateIngreso = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { fecha_ingreso, fecha_egreso, estado_id } = req.body;

//     const { rows } = await pool.query(
//       `UPDATE ingreso
//        SET fecha_ingreso = COALESCE($1, fecha_ingreso),
//            fecha_egreso = COALESCE($2, fecha_egreso),
//            estado_id = COALESCE($3, estado_id)
//        WHERE id = $4
//        RETURNING *`,
//       [fecha_ingreso, fecha_egreso, estado_id, id]
//     );

//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'Ingreso no encontrado' });
//     }

//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };



/**
 * CREATE INGRESO
 * Igual que tu versión original: inserta y devuelve la fila insertada (status 201).
 */
export const createIngreso = async (req, res) => {
  try {
    const { equipo_id, fecha_ingreso, fecha_egreso, estado_id } = req.body;

    const { data, error } = await supabase
      .from('ingreso')
      .insert([
        { equipo_id, fecha_ingreso, fecha_egreso, estado_id }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creando ingreso (Supabase):', error);
      return res.status(500).json({ error: error.message || 'Error creando ingreso' });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('Excepción createIngreso:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Obtener todos los ingresos
 * Devuelve todos los registros ordenados por fecha_ingreso DESC (igual que tu SELECT).
 */
export const getIngresos = async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('ingreso')
      .select('*')
      .order('fecha_ingreso', { ascending: false });

    if (error) {
      console.error('Error obteniendo ingresos (Supabase):', error);
      return res.status(500).json({ error: error.message || 'Error obteniendo ingresos' });
    }

    // Igual que tu versión original: devolver array (puede ser vacío)
    return res.status(200).json(data || []);
  } catch (err) {
    console.error('Excepción getIngresos:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Obtener ingresos por equipo, más recientes primero
 * Orden: fecha_ingreso DESC, luego fecha_egreso ASC (NULLs first por comportamiento estándar de Postgres).
 */
export const getIngresosByEquipo = async (req, res) => {
  try {
    const { equipoId } = req.params;

    const { data, error } = await supabase
      .from('ingreso')
      .select('*')
      .eq('equipo_id', equipoId)
      .order('fecha_ingreso', { ascending: false })
      .order('fecha_egreso', { ascending: true });

    if (error) {
      console.error('Error getIngresosByEquipo (Supabase):', error);
      return res.status(500).json({ error: error.message || 'Error obteniendo ingresos por equipo' });
    }

    // Igual que tu versión original: devolver array (puede ser vacío)
    return res.status(200).json(data || []);
  } catch (err) {
    console.error('Excepción getIngresosByEquipo:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Actualizar ingreso
 * Usamos la RPC 'actualizar_ingreso' para mantener COALESCE y atomicidad.
 * Responde exactamente: la fila actualizada o 404 si no existe.
 */
export const updateIngreso = async (req, res) => {
  try {
    const { id } = req.params;

    const { fecha_ingreso, fecha_egreso, estado_id } = req.body;

    // Pasar NULL explícito cuando el campo no viene (para que la RPC use COALESCE y mantenga el valor)
    const params = {
      _id: Number(id),
      _fecha_ingreso: fecha_ingreso ?? null,
      _fecha_egreso: fecha_egreso ?? null,
      _estado_id: (typeof estado_id !== 'undefined') ? estado_id : null
    };

    const { data, error } = await supabase.rpc('actualizar_ingreso', params);

    if (error) {
      console.error('Error RPC actualizar_ingreso:', error);
      return res.status(500).json({ error: error.message || 'Error actualizando ingreso' });
    }

    // rpc devuelve setof -> array (o [])
    const updated = Array.isArray(data) && data.length > 0 ? data[0] : data;

    if (!updated || (Array.isArray(updated) && updated.length === 0)) {
      return res.status(404).json({ error: 'Ingreso no encontrado' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error('Excepción updateIngreso:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Eliminar ingreso

export const deleteIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM ingreso WHERE id = $1', [id]);

    if (rowCount === 0) return res.status(404).json({ error: 'Ingreso no encontrado' });

    res.json({ message: 'Ingreso eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





export default {
  createIngreso,
  getIngresos,
  getIngresosByEquipo,
  updateIngreso,
  deleteIngreso
};
