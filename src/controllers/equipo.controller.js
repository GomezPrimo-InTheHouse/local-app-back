

import { supabase } from '../config/supabase.js';
import axios from 'axios';
import { pool } from '../config/supabaseAuthModule.js';

// export const createEquipo = async (req, res) => {
//   try {
//     const { tipo, marca, modelo, problema, password, patron, cliente_id, estado_id, fecha_ingreso } = req.body;

//     if (!tipo || !marca || !modelo || !cliente_id || !fecha_ingreso || !problema) {
//       return res.status(400).json({
//         error: "Campos obligatorios: tipo, marca, modelo, cliente_id, fecha_ingreso, problema"
//       });
//     }

//     const { data, error } = await supabase
//       .rpc('crear_equipo_y_ingreso', {
//         _tipo: tipo,
//         _marca: marca,
//         _modelo: modelo,
//         _problema: problema,
//         _password: password,
//         _patron: patron,
//         _cliente_id: cliente_id,
//         _estado_id: estado_id,
//         _fecha_ingreso: fecha_ingreso
//       });

//     if (error) throw error;

//     // aqui quisiera enviar mensaje por twilio avisando de nuevo ingreso
//     // ruta router.post('/enviar-mensaje', enviarMensaje);
//     //puerto process.env.MS2PORT

//     // const cliente = await supabase
//     //   .from('cliente')
//     //   .select('telefono')
//     //   .eq('id', cliente_id)
//     //   .single();

//     // const enviarMensaje = async () => {
//     //   const fetch = await import('node-fetch');
//     //   const response = await fetch.default(`http://localhost:${process.env.MS2PORT}/enviar-mensaje`, {
//     //     method: 'POST',
//     //     headers: { 'Content-Type': 'application/json' },
//     //     body: JSON.stringify({
//     //       to: cliente.data.telefono,
//     //       message: `Hola! Su equipo ha sido ingresado correctamente al taller. ID de equipo: ${data.equipo_id}. Gracias por confiar en nosotros!`
//     //     })
//     //   });
//     // } 

//     res.status(201).json(data);

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

//create equipo con supabase y una funcion rpc que cree el equipo y el ingreso asociado


// Obtener todos los equipos con supabase


// controllers/equipo.controller.js

// controllers/equipo.controller.js


/**
 * POST /equipo
 * Crea equipo + ingreso (mismo controller y transacción), y luego intenta enviar WhatsApp.
 * Equivale funcionalmente al RPC crear_equipo_y_ingreso.
 */
export const createEquipo = async (req, res) => {
  const {
    tipo,
    marca,
    modelo,
    password = null,
    problema = null,
    fecha_ingreso = null,   // date (YYYY-MM-DD) para equipo.fecha_ingreso
    patron = null,
    cliente_id,
    estado_id,
  } = req.body || {};

  // Validación mínima
  if (
    !tipo || !marca || !modelo ||
    !Number.isInteger(Number(cliente_id)) ||
    !Number.isInteger(Number(estado_id))
  ) {
    return res.status(400).json({
      success: false,
      error:
        "Campos requeridos: tipo, marca, modelo, cliente_id (int) y estado_id (int).",
    });
  }

  // Normalización
  const v_tipo = String(tipo).trim();
  const v_marca = String(marca).trim();
  const v_modelo = String(modelo).trim();
  const v_password = password == null ? null : String(password).trim();
  const v_problema = problema == null ? null : String(problema).trim();
  const v_patron = patron == null ? null : String(patron).trim();
  const v_clienteId = Number(cliente_id);
  const v_estadoId = Number(estado_id);
  const v_fechaIngreso = fecha_ingreso ? String(fecha_ingreso) : null;

  const client = await pool.connect();
  try {
    // ================== TRANSACCIÓN ==================
    await client.query('BEGIN');

    // 1) INSERT equipo (igual que el RPC: usa _fecha_ingreso para el campo date del equipo)
    const insertEquipoSQL = `
      INSERT INTO equipo
        (tipo, marca, modelo, problema, password, patron, cliente_id, estado_id, fecha_ingreso, created_at, updated_at)
      VALUES
        ($1::varchar, $2::varchar, $3::varchar, $4::text, $5::varchar, $6::varchar,
         $7::int, $8::int, COALESCE($9::date, CURRENT_DATE), CURRENT_DATE, CURRENT_DATE)
      RETURNING id, tipo, marca, modelo, problema, password, patron, cliente_id, estado_id, fecha_ingreso, created_at, updated_at
    `;
    const equipoParams = [
      v_tipo, v_marca, v_modelo, v_problema, v_password, v_patron,
      v_clienteId, v_estadoId, v_fechaIngreso
    ];
    const eqRes = await client.query(insertEquipoSQL, equipoParams);
    const equipo = eqRes.rows[0];

    // 2) INSERT ingreso asociado (usa ahora en zona horaria de Argentina)
    // RPC: v_fecha_arg := now() at time zone 'America/Argentina/Buenos_Aires';
    const insertIngresoSQL = `
      INSERT INTO ingreso (equipo_id, fecha_ingreso, fecha_egreso, estado_id)
      VALUES (
        $1::int,
        (now() at time zone 'America/Argentina/Buenos_Aires')::timestamp,
        NULL,
        $2::int
      )
      RETURNING id, equipo_id, fecha_ingreso, fecha_egreso, estado_id
    `;
    const ingParams = [equipo.id, v_estadoId];
    const ingRes = await client.query(insertIngresoSQL, ingParams);
    const ingreso = ingRes.rows[0];

    // 3) COMMIT (equipo+ingreso listos, como el RPC)
    await client.query('COMMIT');

    // ================== ENVÍO DE MENSAJE (fuera de la transacción) ==================
    // Obtener datos del cliente
    const clienteRes = await pool.query(
      `SELECT nombre, apellido, celular FROM cliente WHERE id = $1::int`,
      [v_clienteId]
    );
    const cliente = clienteRes.rows[0];

    if (!cliente) {
      // Si no hay cliente, devolvemos igual equipo & ingreso (como haría el RPC)
      return res.status(201).json({
        success: true,
        data: { equipo, ingreso },
        message: 'Equipo e ingreso registrados. Cliente no encontrado para enviar mensaje.',
      });
    }

    // Armar mensaje (número fijo, como pediste)
    const numeroDestino = '+5493534275476';
    const equipoDescripcion = `${v_tipo} ${v_marca} ${v_modelo}`;
    const fechaEquipoAR = new Date(equipo.fecha_ingreso).toLocaleDateString('es-AR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });

    // Si tu ms-twilio acepta solo {numero, cliente, equipo}, mandamos eso:
    const payloadMs = {
      numero: numeroDestino,
      cliente,
      equipo: equipoDescripcion,
      // Si ya implementaste "textoPersonalizado" en ms-twilio, podés enviar este campo:
      // textoPersonalizado: `Hola ${cliente.nombre} ${cliente.apellido} ...`
    };

    try {
      const twilioResponse = await axios.post(
        'http://localhost:7002/twilio/enviar-mensaje',
        payloadMs
      );

      return res.status(201).json({
        success: true,
        data: { equipo, ingreso, mensaje: twilioResponse.data },
        message: 'Equipo e ingreso registrados; mensaje enviado correctamente.',
      });
    } catch (twilioErr) {
      console.error('⚠️ Error al enviar mensaje (Twilio):', twilioErr?.message || twilioErr);
      return res.status(201).json({
        success: true,
        data: { equipo, ingreso },
        warning: 'Equipo e ingreso registrados, pero no se pudo enviar el mensaje al cliente.',
      });
    }
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { }
    console.error('❌ Error en createEquipo (SQL txn):', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error al registrar equipo e ingreso',
    });
  } finally {
    client.release();
  }
};




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

// obtener un equipo por la marca, el modelo y el dni del cliente asociado con SQL PURO

export const getEquipoByMarcaModeloDni = async (req, res) => {

  // return res.status(501).json({ msg: 'getEquipoByMarcaModeloDni no implementado aún con Supabase' });
  try {
    const { marca, modelo, dni } = req.body;
    // quisiera obtener el estado del ingreso vinculado al equipo y el nombre del estado del equipo tambien
const query = `
    SELECT 
        e.*,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.dni AS cliente_dni,
        es.nombre AS estado_nombre  -- 👈 Nombre del estado obtenido directamente del equipo
    FROM 
        equipo e
    INNER JOIN 
        cliente c ON e.cliente_id = c.id
    LEFT JOIN 
        estado es ON e.estado_id = es.id  -- 👈 Conexión directa a la tabla de estados
    WHERE 
        LOWER(e.marca) = LOWER($1)
        AND LOWER(e.modelo) = LOWER($2)
        AND c.dni = $3
    ORDER BY 
        e.fecha_ingreso DESC
    LIMIT 1;
`;

    const { rows } = await pool.query(query, [marca, modelo, dni]);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Equipo no encontrado' });
    }

    res.json(rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });

  }
}


export const checkEquipoRoute = async (id) => {
  return res.status(501).json({ msg: 'checkEquipoRoute no implementado aún con Supabase' });
}


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
  getEquiposConDetalle,
  obtenerEquiposbyClientId,
  checkEquipoRoute
};

