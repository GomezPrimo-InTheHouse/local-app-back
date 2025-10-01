import  {pool}  from '../config/db.js';

import { supabase } from '../config/supabase.js';

// export const createEquipo = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     const { tipo, marca, modelo, problema, password, patron, cliente_id, estado_id, fecha_ingreso } = req.body;

//     if(!tipo || !marca || !modelo || !cliente_id || !fecha_ingreso || !problema){
//       return res.status(400).json({ error: "Campos obligatorios: tipo, marca, modelo, cliente_id, fecha_ingreso, problema, password" });
//     }

//     const query = `
//       INSERT INTO equipo (tipo, marca, modelo, problema, password, patron, cliente_id, estado_id, fecha_ingreso)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
//       RETURNING *;
//     `;

//     const { rows } = await pool.query(query, [tipo, marca, modelo, problema, password, patron, cliente_id, estado_id, fecha_ingreso]);
//     const nuevoEquipo = rows[0];

//     // 2️⃣ Crear ingreso asociado automáticamente
//     const insertIngresoQuery = `
//       INSERT INTO ingreso (equipo_id, fecha_ingreso, fecha_egreso, estado_id)
//       VALUES ($1, NOW(), NULL, $2)
//       RETURNING *;
//     `;
//     const { rows: ingresoRows } = await client.query(insertIngresoQuery, [nuevoEquipo.id, estado_id]);
//     const nuevoIngreso = ingresoRows[0];

//     await client.query('COMMIT');

//     // 3️⃣ Devolver la respuesta estructurada
//     res.status(201).json({
//       equipo: nuevoEquipo,
//       ingreso: nuevoIngreso
//     });

//     res.status(201).json(rows[0]);

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// Obtener todos los equipos
// este controlador se llama para el template de EquipoPage.jsx
// export const getEquipos = async (req, res) => {
    
//   try {
//     const { rows } = await pool.query(
//       `
//       SELECT 
//       e.id, e.tipo, e.marca, e.modelo, e.problema, e.password, e.patron,
//       e.fecha_ingreso, e.estado_id, e.cliente_id,
//       c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
//       FROM equipo e
//       JOIN cliente c ON e.cliente_id = c.id
//       ORDER BY e.fecha_ingreso DESC
//       `
//       );
//     res.status(200).json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };




// controllers/equipoController.js





export const createEquipo = async (req, res) => {
  try {
    const { tipo, marca, modelo, problema, password, patron, cliente_id, estado_id, fecha_ingreso } = req.body;

    if (!tipo || !marca || !modelo || !cliente_id || !fecha_ingreso || !problema) {
      return res.status(400).json({
        error: "Campos obligatorios: tipo, marca, modelo, cliente_id, fecha_ingreso, problema"
      });
    }

    const { data, error } = await supabase
      .rpc('crear_equipo_y_ingreso', {
        _tipo: tipo,
        _marca: marca,
        _modelo: modelo,
        _problema: problema,
        _password: password,
        _patron: patron,
        _cliente_id: cliente_id,
        _estado_id: estado_id,
        _fecha_ingreso: fecha_ingreso
      });

    if (error) throw error;

    res.status(201).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
//create equipo con supabase y una funcion rpc que cree el equipo y el ingreso asociado


// Obtener todos los equipos con supabase
export const getEquipos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('equipo')
      .select(`
        id,
        tipo,
        marca,
        modelo,
        problema,
        password,
        patron,
        fecha_ingreso,
        estado_id,
        cliente_id,
        cliente:cliente_id ( nombre, apellido )
      `)
      //solo los equipos que no tengan estado_id = 18 (dado de baja)
      .neq('estado_id', 18)
      .order('fecha_ingreso', { ascending: false });

    if (error) throw error;

    // Aplanar la estructura para devolver exactamente las mismas keys
    const rows = (data || []).map(item => {
      // cliente puede venir como objeto o como array (por seguridad lo manejamos)
      const clienteRec = Array.isArray(item.cliente)
        ? item.cliente[0]
        : item.cliente;

      return {
        id: item.id,
        tipo: item.tipo,
        marca: item.marca,
        modelo: item.modelo,
        problema: item.problema,
        password: item.password,
        patron: item.patron,
        fecha_ingreso: item.fecha_ingreso,
        estado_id: item.estado_id,
        cliente_id: item.cliente_id,
        cliente_nombre: clienteRec?.nombre ?? null,
        cliente_apellido: clienteRec?.apellido ?? null
      };
    });

    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Obtener equipo por ID
// export const getEquipoById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const query = `
//       SELECT 
//           -- Equipo
//           e.id AS equipo_id,
//           e.tipo,
//           e.marca,
//           e.modelo,
//           e.password,
//           e.problema,
//           e.fecha_ingreso,
//           e.patron,

//           -- Cliente
//           c.id AS cliente_id,
//           c.nombre AS cliente_nombre,
//           c.apellido AS cliente_apellido,
//           c.direccion AS cliente_direccion,
//           c.celular AS cliente_celular,
//           c.celular_contacto AS cliente_celular_contacto,

//           -- Último ingreso
//           i.id AS ingreso_id,
//           i.fecha_ingreso,
//           i.fecha_egreso,
//           i.estado_id as estado_ingreso,
          

//           -- Último presupuesto
//           p.id AS presupuesto_id,
//           p.fecha AS fecha_presupuesto,
//           p.costo AS costo_presupuesto,
//           p.total AS total_presupuesto,
//           p.observaciones AS observaciones_presupuesto

//       FROM equipo e
//       INNER JOIN cliente c ON e.cliente_id = c.id

//       LEFT JOIN LATERAL (
//           SELECT *
//           FROM ingreso i
//           WHERE i.equipo_id = e.id
//           ORDER BY i.fecha_ingreso DESC
//           LIMIT 1
//       ) i ON true

//       LEFT JOIN LATERAL (
//           SELECT *
//           FROM presupuesto p
//           WHERE p.ingreso_id = i.id
//           ORDER BY p.fecha DESC
//           LIMIT 1
//       ) p ON true

//       WHERE e.id = $1
//     `;

//     const { rows } = await pool.query(query, [id]);

//     if (rows.length === 0) {
//       return res.status(404).json({ msg: 'Equipo no encontrado' });
//     }

//     const r = rows[0];

//     const response = {
//       equipo: {
//         id: r.equipo_id,
//         tipo: r.tipo,
//         marca: r.marca,
//         modelo: r.modelo,
//         password: r.password,
//         problema: r.problema,
//         fecha_ingreso: r.fecha_ingreso,
//         presupuesto: r.presupuesto,
//         patron: r.patron
//       },
//       cliente: {
//         id: r.cliente_id,
//         nombre: r.cliente_nombre,
//         apellido: r.cliente_apellido,
//         direccion: r.cliente_direccion,
//         celular: r.cliente_celular,
//         celular_contacto: r.cliente_celular_contacto
//       },
//       detalles: {
//         ingreso: r.ingreso_id
//           ? {
//               id: r.ingreso_id,
//               fecha_ingreso: r.fecha_ingreso,
//               fecha_egreso: r.fecha_egreso,
//               estado: r.estado_ingreso
//             }
//           : null,
//         presupuesto: r.presupuesto_id
//           ? {
//               id: r.presupuesto_id,
//               fecha: r.fecha_presupuesto,
//               costo: r.costo_presupuesto,
//               total: r.total_presupuesto,
//               observaciones: r.observaciones_presupuesto
//             }
//           : null
//       }
//     };

//     res.json(response);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
export const getEquipoById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Obtener equipo + cliente
    const { data: equipoData, error: equipoError } = await supabase
      .from('equipo')
      .select(`
        id,
        tipo,
        marca,
        modelo,
        password,
        problema,
        fecha_ingreso,
        patron,
        cliente:cliente_id (
          id,
          nombre,
          apellido,
          direccion,
          celular,
          celular_contacto
        )
      `)
      .eq('id', id)
      .single();

    if (equipoError) throw equipoError;
    if (!equipoData) return res.status(404).json({ msg: 'Equipo no encontrado' });

    // 2. Último ingreso de este equipo
    const { data: ingresoData, error: ingresoError } = await supabase
      .from('ingreso')
      .select('*')
      .eq('equipo_id', id)
      .order('fecha_ingreso', { ascending: false })
      .limit(1)
      .single();

    if (ingresoError && ingresoError.code !== 'PGRST116') throw ingresoError; // PGRST116 = no rows found
    let presupuestoData = null;

    // 3. Si existe ingreso, buscar último presupuesto
    if (ingresoData) {
      const { data: presupuesto, error: presupuestoError } = await supabase
        .from('presupuesto')
        .select('*')
        .eq('ingreso_id', ingresoData.id)
        .order('fecha', { ascending: false })
        .limit(1)
        .single();

      if (presupuestoError && presupuestoError.code !== 'PGRST116') throw presupuestoError;
      presupuestoData = presupuesto || null;
    }

    // 4. Construir respuesta idéntica a la original
    const response = {
      equipo: {
        id: equipoData.id,
        tipo: equipoData.tipo,
        marca: equipoData.marca,
        modelo: equipoData.modelo,
        password: equipoData.password,
        problema: equipoData.problema,
        fecha_ingreso: equipoData.fecha_ingreso,
        patron: equipoData.patron,
        presupuesto: equipoData.presupuesto // si en tu tabla equipo existe este campo
      },
      cliente: {
        id: equipoData.cliente.id,
        nombre: equipoData.cliente.nombre,
        apellido: equipoData.cliente.apellido,
        direccion: equipoData.cliente.direccion,
        celular: equipoData.cliente.celular,
        celular_contacto: equipoData.cliente.celular_contacto
      },
      detalles: {
        ingreso: ingresoData
          ? {
              id: ingresoData.id,
              fecha_ingreso: ingresoData.fecha_ingreso,
              fecha_egreso: ingresoData.fecha_egreso,
              estado: ingresoData.estado_id
            }
          : null,
        presupuesto: presupuestoData
          ? {
              id: presupuestoData.id,
              fecha: presupuestoData.fecha,
              costo: presupuestoData.costo,
              total: presupuestoData.total,
              observaciones: presupuestoData.observaciones
            }
          : null
      }
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//obtener todos los equipos pertenecientes a un cliente por su cliente_id

export const obtenerEquiposbyClientId = async (req, res) => {
  const { cliente_id } = req.params;

  try {
    const { data, error } = await supabase
      .from('equipo')
      .select('*')
      .eq('cliente_id', cliente_id)   // cliente_id = X
      .neq('estado_id', 18)           // excluir los dados de baja
      .order('fecha_ingreso', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ msg: 'No se encontraron equipos para este cliente' });
    }

    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar equipo



/**
 * Actualiza equipo y su/los ingreso(s) asociados usando RPC transaccional en la DB.
 * Responde exactamente: { equipo: {...}, ingreso: {...} }  (ingreso puede ser null)
 */
export const updateEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const equipoId = Number.parseInt(id, 10);
    if (Number.isNaN(equipoId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const {
      tipo,
      marca,
      modelo,
      problema,
      password,
      patron,
      cliente_id,
      estado_id,
      fecha_ingreso
    } = req.body;

    // Pasar NULL explícito si no se envía el campo (para que la función use COALESCE)
    const params = {
      _id: equipoId,
      _tipo: tipo ?? null,
      _marca: marca ?? null,
      _modelo: modelo ?? null,
      _problema: problema ?? null,
      _password: password ?? null,
      _patron: patron ?? null,
      _cliente_id: cliente_id ?? null,
      _estado_id: estado_id ?? null,
      _fecha_ingreso: fecha_ingreso ?? null
    };

    const { data, error } = await supabase.rpc('actualizar_equipo_y_ingreso', params);

    if (error) {
      // Detectar si la excepción lanzada por la función indica "Equipo no encontrado"
      if (error.message && error.message.toLowerCase().includes('equipo no encontrado')) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }
      // Otros errores de Supabase/Postgres
      throw error;
    }

    // La función RETURNS TABLE(...) -> supabase devuelve un array con un objeto (fila).
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

    // Aseguramos devolver exactamente la misma estructura que tenías:
    // { equipo: {...}, ingreso: {...} }
    return res.json(result);

  } catch (err) {
    console.error('Error en updateEquipo:', err);
    // En caso de que err sea un objeto Supabase error, intentar enviar su mensaje
    const msg = err?.message || String(err);
    return res.status(500).json({ error: msg });
  }
};

// Eliminar equipo
// export const deleteEquipo = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { rowCount } = await pool.query('DELETE FROM equipo WHERE id = $1', [id]);
//     if (rowCount === 0) return res.status(404).json({ msg: 'Equipo no encontrado' });
//     res.json({ msg: 'Equipo eliminado correctamente' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


export const deleteEquipo = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Actualizar el equipo
    const { error: equipoError } = await supabase
      .from('equipo')
      .update({ estado_id: 18 })
      .eq('id', id);

    if (equipoError) throw equipoError;

    // 2. Actualizar ingresos relacionados
    const { error: ingresoError, data: ingresos } = await supabase
      .from('ingreso')
      .update({ estado_id: 18 })
      .eq('equipo_id', id)
      .select('id');

    if (ingresoError) throw ingresoError;

    // 3. Actualizar presupuestos relacionados a esos ingresos
    if (ingresos.length > 0) {
      const ingresoIds = ingresos.map(i => i.id);
      const { error: presupuestoError } = await supabase
        .from('presupuesto')
        .update({ estado_id: 18 })
        .in('ingreso_id', ingresoIds);

      if (presupuestoError) throw presupuestoError;
    }

    res.json({ msg: 'Equipo dado de baja correctamente (estado actualizado a 18)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



//FILTROS SIN SUPABASE (FALTA MIGRAR A SUPABASE)


// // 1) Filtrar por tipo exacto, devuelve tmb el nombre del cliemte
// export const getEquiposByTipo = async (req, res) => {
//   const { tipo } = req.params;

//   try {
//     const query = `
//       SELECT
//         e.*,
//         c.nombre AS cliente_nombre,
//         c.apellido AS cliente_apellido
//       FROM
//         equipo e
//       INNER JOIN
//         cliente c ON e.cliente_id = c.id
//       WHERE
//         LOWER(e.tipo) = LOWER($1)
//       ORDER BY
//         e.fecha_ingreso DESC;
//     `;
//     const { rows } = await pool.query(query, [tipo]);

//     res.json({
//       status: 'success',
//       count: rows.length,
//       data: rows,
//     });
//   } catch (error) {
//     console.error('Error al filtrar equipos por tipo:', error);
//     res.status(500).json({ error: 'Error interno del servidor' });
//   }
// };

// // 2) Filtrar múltiples tipos (ej: /equipo/filtrar?tipos=celular,notebook)
// export const getEquiposFiltrados = async (req, res) => {
//   const { tipos } = req.query;

//   if (!tipos) {
//     return res.status(400).json({ error: 'Debes enviar el parámetro ?tipos=...' });
//   }

//   // Convertimos a array y normalizamos
//   const tiposArray = tipos.split(',').map(t => t.trim().toLowerCase());

//   try {
//     const query = `
//       SELECT * FROM equipo
//       WHERE LOWER(tipo) = ANY($1::text[])
//       ORDER BY fecha_ingreso DESC
//     `;
//     const { rows } = await pool.query(query, [tiposArray]);

//     res.json({
//       status: 'success',
//       count: rows.length,
//       data: rows
//     });
//   } catch (error) {
//     console.error('Error al filtrar múltiples tipos de equipos:', error);
//     res.status(500).json({ error: 'Error interno del servidor' });
//   }
// };


// export const getEquiposByCliente = async (req, res) => {
//   const { cliente_id } = req.params;

//   try {
//     const query = `
//       SELECT e.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
//       FROM equipo e
//       INNER JOIN cliente c ON e.cliente_id = c.id
//       WHERE e.cliente_id = $1
//       ORDER BY e.fecha_ingreso DESC
//     `;
//     const { rows } = await pool.query(query, [cliente_id]);

//     if (rows.length === 0) {
//       return res.status(201).json({ 
//         success: true,
//         message: 'No se encontraron equipos para este cliente.' 
//       });
//     }

//     res.json({
//       status: 'success',
//       count: rows.length,
//       data: rows
//     });
//   } catch (error) {
//     console.error('Error al buscar equipos por cliente:', error);
//     res.status(500).json({ error: 'Error interno del servidor' });
//   }
// };


// // Obtener todos los equipos con último ingreso y presupuesto


// export const getEquiposConDetalle = async (_req, res) => {
//   try {
//     const query = `
//       SELECT 
//           e.id AS equipo_id,
//           e.tipo,
//           e.marca,
//           e.modelo,
//           e.problema,
//           e.patron,
//           e.cliente_id,
//           es_eq.id AS estado_equipo_id,
//           es_eq.nombre AS estado_equipo_nombre,

//           i.id AS ingreso_id,
//           i.fecha_ingreso,
//           i.fecha_egreso,
//           es_in.id AS estado_ingreso_id,
//           es_in.nombre AS estado_ingreso_nombre,

//           p.id AS presupuesto_id,
//           p.costo AS costo_presupuesto,
//           p.total AS total_presupuesto,
//           p.fecha AS fecha_presupuesto,
//           p.observaciones AS observaciones_presupuesto,
//           es_pr.id AS estado_presupuesto_id,
//           es_pr.nombre AS estado_presupuesto_nombre

//       FROM equipo e
//       JOIN estado es_eq ON es_eq.id = e.estado_id

//       LEFT JOIN LATERAL (
//           SELECT *
//           FROM ingreso i
//           WHERE i.equipo_id = e.id
//           ORDER BY i.fecha_ingreso DESC
//           LIMIT 1
//       ) i ON true
//       LEFT JOIN estado es_in ON es_in.id = i.estado_id

//       LEFT JOIN LATERAL (
//           SELECT *
//           FROM presupuesto p
//           WHERE p.ingreso_id = i.id
//           ORDER BY p.fecha DESC
//           LIMIT 1
//       ) p ON true
//       LEFT JOIN estado es_pr ON es_pr.id = p.estado_id

//       ORDER BY e.id;
//     `;

//     const { rows } = await pool.query(query);
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


export const getEquiposByTipo = async (req, res) => {
  try {
    const { tipo } = req.params;
    if (!tipo) return res.status(400).json({ error: 'Parámetro tipo requerido' });

    const { data, error } = await supabase
      .rpc('obtener_equipos_por_tipo', { _tipo: tipo });

    if (error) {
      console.error('Error RPC obtener_equipos_por_tipo:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    const rows = data ?? [];

    return res.json({
      status: 'success',
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Error al filtrar equipos por tipo:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * 2) Filtrar múltiples tipos (ej: /equipo/filtrar?tipos=celular,notebook)
 * Respuesta: { status: 'success', count, data }
 */
export const getEquiposFiltrados = async (req, res) => {
  try {
    const { tipos } = req.query;
    if (!tipos) {
      return res.status(400).json({ error: 'Debes enviar el parámetro ?tipos=...' });
    }

    // Convertimos a array y eliminamos vacíos
    const tiposArray = tipos.split(',').map(t => t.trim()).filter(Boolean);
    if (tiposArray.length === 0) {
      return res.status(400).json({ error: 'Parametro tipos inválido' });
    }

    // Llamamos al RPC que normaliza a lower internamente
    const { data, error } = await supabase
      .rpc('obtener_equipos_filtrados', { _tipos: tiposArray });

    if (error) {
      console.error('Error RPC obtener_equipos_filtrados:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    const rows = data ?? [];

    return res.json({
      status: 'success',
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Error al filtrar múltiples tipos de equipos:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * 3) Obtener equipos por cliente
 * Si no hay resultados -> responde 201 con { success: true, message: 'No se encontraron equipos para este cliente.' }
 * Si hay -> { status: 'success', count, data }
 */
export const getEquiposByCliente = async (req, res) => {
  try {
    const { cliente_id } = req.params;
    if (!cliente_id) return res.status(400).json({ error: 'cliente_id requerido' });

    const { data, error } = await supabase
      .rpc('obtener_equipos_por_cliente', { _cliente_id: Number(cliente_id) });

    if (error) {
      console.error('Error RPC obtener_equipos_por_cliente:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    const rows = data ?? [];

    if (rows.length === 0) {
      return res.status(201).json({
        success: true,
        message: 'No se encontraron equipos para este cliente.'
      });
    }

    return res.json({
      status: 'success',
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Error al buscar equipos por cliente:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * 4) Obtener todos los equipos con último ingreso y presupuesto (exactamente igual que tu SQL original)
 * Responde con un array plano de filas (igual que tu versión con pool.query)
 */
export const getEquiposConDetalle = async (_req, res) => {
  try {
    const { data, error } = await supabase.rpc('obtener_equipos_con_detalle');

    if (error) {
      console.error('Error RPC obtener_equipos_con_detalle:', error);
      return res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }

    return res.json(data ?? []);
  } catch (err) {
    console.error('Error getEquiposConDetalle:', err);
    return res.status(500).json({ error: err.message });
  }
};


// Exportar las funciones para ser utilizadas en las rutas
export default {
    getEquipos,
    getEquipoById,
    createEquipo,
    updateEquipo,
    deleteEquipo,
    getEquiposByTipo,
    getEquiposFiltrados,
    getEquiposByCliente,
    getEquiposConDetalle
};

