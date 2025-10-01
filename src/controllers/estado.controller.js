import { pool } from '../config/db.js';
import { supabase } from '../config/supabase.js';

// export const getEstados = async (req, res) => {
//   try {
//     const { rows } = await pool.query('SELECT * FROM estado');
//     res.json(rows);
//   } catch (error) {
//     console.error("Error obteniendo estados:", error);
//     res.status(500).json({ error: "Error obteniendo estados" });
//   }
// };

// //crear estado nuevo
// export const createEstado = async (req, res) => {
//   const { nombre, descripcion, ambito } = req.body;

//   if(!nombre || !descripcion || !ambito) {
//     return res.status(400).json({ error: "Nombre y descripcion son requeridos" });
//   }

//   try {
//     const { rows } = await pool.query(
//       `INSERT INTO estado (nombre, descripcion, ambito) VALUES ($1, $2, $3) RETURNING *`,
//       [nombre, descripcion, ambito]
//     );
//     res.status(201).json(rows[0]);
//   } catch (error) {
//     console.error("Error creando estado:", error);
//     res.status(500).json({ error: "Error creando estado" });
//   }
// };

// export const getEstadosById = async (req, res) => {
//   const { id } = req.params;
//   try {
//     const { rows } = await pool.query('SELECT * FROM estado WHERE id = $1', [id]);
//     if (rows.length === 0) {
//       return res.status(404).json({ error: "Estado no encontrado" });
//     }
//     res.json(rows[0]);
//   } catch (error) {
//     console.error("Error obteniendo estado por ID:", error);
//     res.status(500).json({ error: "Error obteniendo estado por ID" });
//   }
// };

// export const deleteEstado = async (req, res) => {
//   const { id } = req.params;
//   try {
//     const { rowCount } = await pool.query('DELETE FROM estado WHERE id = $1', [id]);
//     if (rowCount === 0) {
//       return res.status(404).json({ error: "Estado no encontrado" });
//     }
//     res.status(204).send();
//   } catch (error) {
//     console.error("Error eliminando estado:", error);
//     res.status(500).json({ error: "Error eliminando estado" });
//   }
// };

// export const updateEstado = async (req, res) => {
//   const { id } = req.params;
//   const { nombre, descripcion, ambito } = req.body;

//   try {
//     const { rowCount } = await pool.query(
//       `UPDATE estado SET 
//         nombre = COALESCE($1, nombre), 
//         descripcion = COALESCE($2, descripcion), 
//         ambito = COALESCE($3, ambito)
//       WHERE id = $4`,
//       [nombre, descripcion, ambito, id]
//     );

//     if (rowCount === 0) {
//       return res.status(404).json({ error: "Estado no encontrado" });
//     }

//     res.status(200).json({ message: "Estado actualizado correctamente" });
//   } catch (error) {
//     console.error("Error actualizando estado:", error);
//     res.status(500).json({ error: "Error actualizando estado" });
//   }
// };

// export const getEstadoByAmbito = async (req, res) => {
//   const { ambito } = req.params;
//   try {
//     const { rows } = await pool.query('SELECT * FROM estado WHERE ambito = $1', [ambito]);
//     if (rows.length === 0) {
//       return res.status(404).json({ error: "No se encontraron estados para el ámbito especificado" });
//     }
//     res.json(rows);
//   } catch (error) {
//     console.error("Error obteniendo estados por ámbito:", error);
//     res.status(500).json({ error: "Error obteniendo estados por ámbito" });
//   }
// }

// export default {
//   getEstados,
//   createEstado,
//   getEstadosById,
//   deleteEstado,
//   updateEstado,
//   getEstadoByAmbito
// };
  


// controllers/estadoController.js


/**
 * Obtener todos los estados
 */
export const getEstados = async (req, res) => {
  try {
    const { data, error } = await supabase.from('estado').select('*');

    if (error) {
      console.error('Error obteniendo estados (Supabase):', error);
      return res.status(500).json({ error: 'Error obteniendo estados' });
    }

    // Igual que tu versión original: devolver array (puede ser vacío)
    return res.json(data || []);
  } catch (err) {
    console.error('Error obteniendo estados:', err);
    return res.status(500).json({ error: 'Error obteniendo estados' });
  }
};

/**
 * Crear estado nuevo
 */
export const createEstado = async (req, res) => {
  const { nombre, descripcion, ambito } = req.body;

  if (!nombre || !descripcion || !ambito) {
    return res.status(400).json({ error: 'Nombre y descripcion son requeridos' });
  }

  try {
    const { data, error } = await supabase
      .from('estado')
      .insert([{ nombre, descripcion, ambito }])
      .select()
      .single();

    if (error) {
      console.error('Error creando estado (Supabase):', error);
      return res.status(500).json({ error: 'Error creando estado' });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('Error creando estado:', err);
    return res.status(500).json({ error: 'Error creando estado' });
  }
};

/**
 * Obtener estado por ID
 */
export const getEstadosById = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('estado').select('*').eq('id', id).single();

    // Si no existe, single() suele producir error; también chequeamos data por seguridad
    if (error) {
      // si es "no rows" -> 404
      if (error.code === 'PGRST116' || String(error.message).toLowerCase().includes('no rows')) {
        return res.status(404).json({ error: 'Estado no encontrado' });
      }
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Estado no encontrado' });
    }

    return res.json(data);
  } catch (err) {
    console.error('Error obteniendo estado por ID:', err);
    return res.status(500).json({ error: 'Error obteniendo estado por ID' });
  }
};

/**
 * Eliminar estado
 * Mantiene comportamiento original: DELETE -> 204 o 404
 */
export const deleteEstado = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('estado')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Si no hay filas -> 404
      if (error.code === 'PGRST116' || String(error.message).toLowerCase().includes('no rows')) {
        return res.status(404).json({ error: 'Estado no encontrado' });
      }
      console.error('Error eliminando estado (Supabase):', error);
      return res.status(500).json({ error: 'Error eliminando estado' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Estado no encontrado' });
    }

    // Igual que tu versión original: 204 sin contenido
    return res.status(204).send();
  } catch (err) {
    console.error('Error eliminando estado:', err);
    return res.status(500).json({ error: 'Error eliminando estado' });
  }
};

/**
 * Actualizar estado (usa RPC 'actualizar_estado' para COALESCE + atomicidad)
 */
export const updateEstado = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, ambito } = req.body;

  try {
    const params = {
      _id: Number(id),
      _nombre: nombre ?? null,
      _descripcion: descripcion ?? null,
      _ambito: ambito ?? null
    };

    const { data, error } = await supabase.rpc('actualizar_estado', params);

    if (error) {
      console.error('Error RPC actualizar_estado:', error);
      return res.status(500).json({ error: 'Error actualizando estado' });
    }

    // rpc devuelve setof -> array (o [])
    const updated = Array.isArray(data) && data.length > 0 ? data[0] : data;

    if (!updated || (Array.isArray(updated) && updated.length === 0)) {
      return res.status(404).json({ error: 'Estado no encontrado' });
    }

    // Igual que tu versión original: devuelve mensaje de éxito (no la fila)
    return res.status(200).json({ message: 'Estado actualizado correctamente' });
  } catch (err) {
    console.error('Error actualizando estado:', err);
    return res.status(500).json({ error: 'Error actualizando estado' });
  }
};

/**
 * Obtener estados por ámbito
 */
export const getEstadoByAmbito = async (req, res) => {
  const { ambito } = req.params;
  try {
    const { data, error } = await supabase.from('estado').select('*').eq('ambito', ambito);

    if (error) {
      console.error('Error obteniendo estados por ámbito (Supabase):', error);
      return res.status(500).json({ error: 'Error obteniendo estados por ámbito' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No se encontraron estados para el ámbito especificado' });
    }

    return res.json(data);
  } catch (err) {
    console.error('Error obteniendo estados por ámbito:', err);
    return res.status(500).json({ error: 'Error obteniendo estados por ámbito' });
  }
};
