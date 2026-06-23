

// // src/controllers/equipo.controller.js
// import { supabase } from '../config/supabase.js';
// import { pool } from '../config/supabaseAuthModule.js';

// /**
//  * CREATE EQUIPO
//  * Ahora solo crea el equipo. La OT se crea por separado desde createOrdenTrabajo.
//  */
// export const createEquipo = async (req, res) => {
//   const {
//     tipo,
//     marca,
//     modelo,
//     imei      = null,
//     cliente_id,
//     estado_id,
//   } = req.body || {};

//   if (
//     !tipo || !marca || !modelo ||
//     !Number.isInteger(Number(cliente_id)) ||
//     !Number.isInteger(Number(estado_id))
//   ) {
//     return res.status(400).json({
//       success: false,
//       error: "Campos requeridos: tipo, marca, modelo, cliente_id (int) y estado_id (int).",
//     });
//   }

//   const v_tipo      = String(tipo).trim();
//   const v_marca     = String(marca).trim();
//   const v_modelo    = String(modelo).trim();
//   const v_imei      = imei == null ? null : String(imei).trim();
//   const v_clienteId = Number(cliente_id);
//   const v_estadoId  = Number(estado_id);

//   try {
//     const { data: equipo, error: errorEquipo } = await supabase
//       .from('equipo')
//       .insert([{
//         tipo:       v_tipo,
//         marca:      v_marca,
//         modelo:     v_modelo,
//         imei:       v_imei,
//         cliente_id: v_clienteId,
//         estado_id:  v_estadoId,
//         created_at: new Date(),
//         updated_at: new Date(),
//       }])
//       .select()
//       .single();

//     if (errorEquipo) throw errorEquipo;

//     return res.status(201).json({ success: true, data: equipo });
//   } catch (err) {
//     console.error("❌ Error en createEquipo:", err);
//     return res.status(500).json({
//       success: false,
//       error: err.message || "Error al registrar el equipo",
//     });
//   }
// };

// /**
//  * GET ALL EQUIPOS
//  * Incluye la última falla reportada de la última orden_trabajo del equipo.
//  */
// // export const getEquipos = async (req, res) => {
// //   try {
// //     const { data, error } = await supabase
// //       .from('equipo')
// //       .select(`
// //         id,
// //         tipo,
// //         marca,
// //         modelo,
// //         imei,
// //         estado_id,
// //         cliente_id,
// //         created_at,
// //         cliente:cliente_id ( nombre, apellido, celular, direccion )
// //       `)
// //       .neq('estado_id', 18)
// //       .order('created_at', { ascending: false });

// //     if (error) throw error;

// //     const equipoIds = (data || []).map(e => e.id);
// //     let ultimasOTs = {};

// //     if (equipoIds.length > 0) {
// //       const { data: ots } = await supabase
// //         .from('orden_trabajo')
// //         .select('equipo_id, falla_reportada, fecha_ingreso, password, patron')
// //         .in('equipo_id', equipoIds)
// //         .order('fecha_ingreso', { ascending: false });

// //       for (const ot of (ots || [])) {
// //         if (!ultimasOTs[ot.equipo_id]) {
// //           ultimasOTs[ot.equipo_id] = ot;
// //         }
// //       }
// //     }

// //     const rows = (data || []).map(item => {
// //       const clienteRec = Array.isArray(item.cliente) ? item.cliente[0] : item.cliente;
// //       const ultimaOT   = ultimasOTs[item.id];
// //       return {
// //         id:                item.id,
// //         tipo:              item.tipo,
// //         marca:             item.marca,
// //         modelo:            item.modelo,
// //         imei:              item.imei,
// //         // fecha_ingreso viene de la última OT, con fallback a created_at del equipo
// //         fecha_ingreso:     ultimaOT?.fecha_ingreso ?? item.created_at,
// //         estado_id:         item.estado_id,
// //         cliente_id:        item.cliente_id,
// //         cliente_nombre:    clienteRec?.nombre    ?? null,
// //         cliente_apellido:  clienteRec?.apellido  ?? null,
// //         cliente_celular:   clienteRec?.celular   ?? null,
// //         cliente_direccion: clienteRec?.direccion ?? null,
// //         ultima_falla:      ultimaOT?.falla_reportada ?? null,
// //         ultima_password:   ultimaOT?.password        ?? null,
// //         ultimo_patron:     ultimaOT?.patron           ?? null,
// //       };
// //     });

// //     res.status(200).json(rows);
// //   } catch (err) {
// //     res.status(500).json({ error: err.message });
// //   }
// // };


// export const getEquipos = async (req, res) => {
//   try {
//     // 1. Traer todos los equipos activos
//     const { data, error } = await supabase
//       .from('equipo')
//       .select(`
//         id,
//         tipo,
//         marca,
//         modelo,
//         imei,
//         estado_id,
//         cliente_id,
//         created_at,
//         cliente:cliente_id ( nombre, apellido, celular, direccion )
//       `)
//       .neq('estado_id', 18);

//     if (error) throw error;

//     const equipoIds = (data || []).map(e => e.id);
//     let ultimasOTs = {};

//     if (equipoIds.length > 0) {
//       // 2. Traer la última OT de cada equipo
//       const { data: ots, error: otsError } = await supabase
//         .from('orden_trabajo')
//         .select('equipo_id, falla_reportada, fecha_ingreso, password, patron')
//         .in('equipo_id', equipoIds)
//         .order('fecha_ingreso', { ascending: false });

//       if (otsError) {
//         console.error('❌ Error trayendo OTs:', otsError);
//       } else {
//         console.log(`✅ OTs traídas: ${ots?.length ?? 0}`);
//         console.log('🔍 OTs equipo 360:', ots?.filter(o => o.equipo_id === 360));

//         for (const ot of (ots || [])) {
//           // Nos quedamos con la más reciente por equipo
//           if (!ultimasOTs[ot.equipo_id]) {
//             ultimasOTs[ot.equipo_id] = ot;
//           }
//         }
//       }
//     }

//     const rows = (data || []).map(item => {
//       const clienteRec = Array.isArray(item.cliente) ? item.cliente[0] : item.cliente;
//       const ultimaOT   = ultimasOTs[item.id];
//       const fechaOrden = ultimaOT?.fecha_ingreso ?? item.created_at;

//       return {
//         id:                item.id,
//         tipo:              item.tipo,
//         marca:             item.marca,
//         modelo:            item.modelo,
//         imei:              item.imei,
//         fecha_ingreso:     fechaOrden,
//         estado_id:         item.estado_id,
//         cliente_id:        item.cliente_id,
//         cliente_nombre:    clienteRec?.nombre    ?? null,
//         cliente_apellido:  clienteRec?.apellido  ?? null,
//         cliente_celular:   clienteRec?.celular   ?? null,
//         cliente_direccion: clienteRec?.direccion ?? null,
//         ultima_falla:      ultimaOT?.falla_reportada ?? null,
//         ultima_password:   ultimaOT?.password        ?? null,
//         ultimo_patron:     ultimaOT?.patron           ?? null,
//         tiene_orden:       !!ultimaOT,
//       };
//     });

//     // Ordenar por fecha de la última OT (más reciente primero)
//     rows.sort((a, b) => new Date(b.fecha_ingreso) - new Date(a.fecha_ingreso));

//     return res.status(200).json(rows);
//   } catch (err) {
//     console.error('❌ Error en getEquipos:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };
// /**
//  * GET EQUIPO BY ID
//  * Devuelve equipo + cliente + última orden_trabajo + último presupuesto.
//  */
// export const getEquipoById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // 1. Equipo + cliente
//     const { data: equipoData, error: equipoError } = await supabase
//       .from('equipo')
//       .select(`
//         id, tipo, marca, modelo, imei, fecha_ingreso,
//         cliente:cliente_id (
//           id, nombre, apellido, direccion, celular, celular_contacto
//         )
//       `)
//       .eq('id', id)
//       .single();

//     if (equipoError) throw equipoError;
//     if (!equipoData) return res.status(404).json({ msg: 'Equipo no encontrado' });

//     // 2. Última orden_trabajo del equipo
//     const { data: otData, error: otError } = await supabase
//       .from('orden_trabajo')
//       .select('*')
//       .eq('equipo_id', id)
//       .order('fecha_ingreso', { ascending: false })
//       .limit(1)
//       .maybeSingle();

//     if (otError && otError.code !== 'PGRST116') throw otError;

//     // 3. Último presupuesto vinculado a esa OT
//     let presupuestoData = null;
//     if (otData) {
//       const { data: presupuesto, error: presupuestoError } = await supabase
//         .from('presupuesto')
//         .select('*')
//         .eq('orden_trabajo_id', otData.id)
//         .order('fecha', { ascending: false })
//         .limit(1)
//         .maybeSingle();

//       if (presupuestoError && presupuestoError.code !== 'PGRST116') throw presupuestoError;
//       presupuestoData = presupuesto || null;
//     }

//     const response = {
//       equipo: {
//         id:            equipoData.id,
//         tipo:          equipoData.tipo,
//         marca:         equipoData.marca,
//         modelo:        equipoData.modelo,
//         imei:          equipoData.imei,
//         fecha_ingreso: equipoData.fecha_ingreso,
//       },
//       cliente: {
//         id:               equipoData.cliente.id,
//         nombre:           equipoData.cliente.nombre,
//         apellido:         equipoData.cliente.apellido,
//         direccion:        equipoData.cliente.direccion,
//         celular:          equipoData.cliente.celular,
//         celular_contacto: equipoData.cliente.celular_contacto,
//       },
//       detalles: {
//         // Mantenemos la key 'ingreso' por compatibilidad con el frontend
//         ingreso: otData ? {
//           id:              otData.id,
//           fecha_ingreso:   otData.fecha_ingreso,
//           fecha_egreso:    otData.fecha_egreso,
//           estado_id:       otData.estado_id,  // ← corregido: antes era 'estado'
//           falla_reportada: otData.falla_reportada,
//           diagnostico:     otData.diagnostico,
//           password:        otData.password,
//           patron:          otData.patron,
//         } : null,
//         presupuesto: presupuestoData ? {
//           id:            presupuestoData.id,
//           fecha:         presupuestoData.fecha,
//           costo:         presupuestoData.costo,
//           total:         presupuestoData.total,
//           observaciones: presupuestoData.observaciones,
//         } : null,
//       },
//     };

//     res.json(response);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * GET EQUIPOS BY CLIENTE ID
//  */
// export const obtenerEquiposbyClientId = async (req, res) => {
//   const { cliente_id } = req.params;
//   try {
//     const { data, error } = await supabase
//       .from('equipo')
//       .select('*')
//       .eq('cliente_id', cliente_id)
//       .neq('estado_id', 18)
//       .order('fecha_ingreso', { ascending: false });

//     if (error) throw error;
//     if (!data || data.length === 0) {
//       return res.status(404).json({ msg: 'No se encontraron equipos para este cliente' });
//     }
//     res.status(200).json(data);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * UPDATE EQUIPO
//  * Solo actualiza datos del equipo (tipo, marca, modelo, imei, cliente_id, estado_id).
//  * Los datos de la visita (falla, password, patron) van en la OT.
//  */
// export const updateEquipo = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const equipoId = Number.parseInt(id, 10);
//     if (Number.isNaN(equipoId)) return res.status(400).json({ error: 'ID inválido' });

//     const { tipo, marca, modelo, imei, cliente_id, estado_id } = req.body;

//     const updatePayload = {};
//     if (tipo       != null) updatePayload.tipo       = String(tipo).trim();
//     if (marca      != null) updatePayload.marca      = String(marca).trim();
//     if (modelo     != null) updatePayload.modelo     = String(modelo).trim();
//     if (imei       != null) updatePayload.imei       = String(imei).trim();
//     if (cliente_id != null) updatePayload.cliente_id = Number(cliente_id);
//     if (estado_id  != null) updatePayload.estado_id  = Number(estado_id);
//     updatePayload.updated_at = new Date();

//     const { data, error } = await supabase
//       .from('equipo')
//       .update(updatePayload)
//       .eq('id', equipoId)
//       .select()
//       .single();

//     if (error) throw error;
//     if (!data)  return res.status(404).json({ error: 'Equipo no encontrado' });

//     return res.json({ equipo: data });
//   } catch (err) {
//     console.error('Error en updateEquipo:', err);
//     return res.status(500).json({ error: err?.message || String(err) });
//   }
// };

// /**
//  * DELETE EQUIPO (baja lógica: estado_id = 18)
//  */
// export const deleteEquipo = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // 1. Dar de baja el equipo
//     const { error: equipoError } = await supabase
//       .from('equipo')
//       .update({ estado_id: 18 })
//       .eq('id', id);
//     if (equipoError) throw equipoError;

//     // 2. Dar de baja sus órdenes de trabajo
//     const { error: otError, data: ots } = await supabase
//       .from('orden_trabajo')
//       .update({ estado_id: 18 })
//       .eq('equipo_id', id)
//       .select('id');
//     if (otError) throw otError;

//     // 3. Dar de baja presupuestos vinculados a esas OTs
//     if (ots && ots.length > 0) {
//       const otIds = ots.map(o => o.id);
//       const { error: presupuestoError } = await supabase
//         .from('presupuesto')
//         .update({ estado_id: 18 })
//         .in('orden_trabajo_id', otIds);
//       if (presupuestoError) throw presupuestoError;
//     }

//     res.json({ msg: 'Equipo dado de baja correctamente' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * GET EQUIPOS BY TIPO (via RPC)
//  */
// export const getEquiposByTipo = async (req, res) => {
//   try {
//     const { tipo } = req.params;
//     if (!tipo) return res.status(400).json({ error: 'Parámetro tipo requerido' });

//     const { data, error } = await supabase
//       .rpc('obtener_equipos_por_tipo', { _tipo: tipo });

//     if (error) { console.error('Error RPC obtener_equipos_por_tipo:', error); return res.status(500).json({ error: 'Error interno del servidor' }); }

//     const rows = data ?? [];
//     return res.json({ status: 'success', count: rows.length, data: rows });
//   } catch (err) {
//     return res.status(500).json({ error: 'Error interno del servidor' });
//   }
// };

// /**
//  * GET EQUIPOS FILTRADOS (via RPC)
//  */
// export const getEquiposFiltrados = async (req, res) => {
//   try {
//     const { tipos } = req.query;
//     if (!tipos) return res.status(400).json({ error: 'Debes enviar el parámetro ?tipos=...' });

//     const tiposArray = tipos.split(',').map(t => t.trim()).filter(Boolean);
//     if (tiposArray.length === 0) return res.status(400).json({ error: 'Parametro tipos inválido' });

//     const { data, error } = await supabase
//       .rpc('obtener_equipos_filtrados', { _tipos: tiposArray });

//     if (error) { console.error('Error RPC obtener_equipos_filtrados:', error); return res.status(500).json({ error: 'Error interno del servidor' }); }

//     const rows = data ?? [];
//     return res.json({ status: 'success', count: rows.length, data: rows });
//   } catch (err) {
//     return res.status(500).json({ error: 'Error interno del servidor' });
//   }
// };

// /**
//  * GET EQUIPOS BY CLIENTE (via RPC)
//  */
// export const getEquiposByCliente = async (req, res) => {
//   try {
//     const { cliente_id } = req.params;
//     if (!cliente_id) return res.status(400).json({ error: 'cliente_id requerido' });

//     const { data, error } = await supabase
//       .rpc('obtener_equipos_por_cliente', { _cliente_id: Number(cliente_id) });

//     if (error) { console.error('Error RPC obtener_equipos_por_cliente:', error); return res.status(500).json({ error: 'Error interno del servidor' }); }

//     const rows = data ?? [];
//     if (rows.length === 0) {
//       return res.status(201).json({ success: true, message: 'No se encontraron equipos para este cliente.' });
//     }
//     return res.json({ status: 'success', count: rows.length, data: rows });
//   } catch (err) {
//     return res.status(500).json({ error: 'Error interno del servidor' });
//   }
// };

// /**
//  * GET EQUIPOS CON DETALLE (via RPC)
//  */
// export const getEquiposConDetalle = async (_req, res) => {
//   try {
//     const { data, error } = await supabase.rpc('obtener_equipos_con_detalle');
//     if (error) { console.error('Error RPC obtener_equipos_con_detalle:', error); return res.status(500).json({ error: error.message || 'Error interno' }); }
//     return res.json(data ?? []);
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * GET EQUIPO BY MARCA, MODELO Y DNI
//  */
// export const getEquipoByMarcaModeloDni = async (req, res) => {
//   try {
//     const { marca, modelo, dni } = req.body;
//     const query = `
//       SELECT e.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
//              c.dni AS cliente_dni, es.nombre AS estado_nombre
//       FROM equipo e
//       INNER JOIN cliente c ON e.cliente_id = c.id
//       LEFT JOIN estado es ON e.estado_id = es.id
//       WHERE LOWER(e.marca) = LOWER($1) AND LOWER(e.modelo) = LOWER($2) AND c.dni = $3
//       ORDER BY e.fecha_ingreso DESC LIMIT 1;
//     `;
//     const { rows } = await pool.query(query, [marca, modelo, dni]);
//     if (rows.length === 0) return res.status(404).json({ msg: 'Equipo no encontrado' });
//     res.json(rows[0]);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// export const checkEquipoRoute = async (req, res) => {
//   return res.status(501).json({ msg: 'checkEquipoRoute no implementado' });
// };

// export default {
//   getEquipos,
//   getEquipoById,
//   createEquipo,
//   updateEquipo,
//   deleteEquipo,
//   getEquiposByTipo,
//   getEquiposFiltrados,
//   getEquiposByCliente,
//   getEquiposConDetalle,
//   obtenerEquiposbyClientId,
//   getEquipoByMarcaModeloDni,
//   checkEquipoRoute,
// };

// src/controllers/equipo.controller.js
import { supabase } from '../config/supabase.js';
import { pool } from '../config/supabaseAuthModule.js';

/**
 * CREATE EQUIPO
 * Solo crea el equipo. La OT se crea por separado desde createOrdenTrabajo.
 */
export const createEquipo = async (req, res) => {
  const {
    tipo,
    marca,
    modelo,
    imei      = null,
    cliente_id,
    estado_id,
  } = req.body || {};

  if (
    !tipo || !marca || !modelo ||
    !Number.isInteger(Number(cliente_id)) ||
    !Number.isInteger(Number(estado_id))
  ) {
    return res.status(400).json({
      success: false,
      error: "Campos requeridos: tipo, marca, modelo, cliente_id (int) y estado_id (int).",
    });
  }

  const v_tipo      = String(tipo).trim();
  const v_marca     = String(marca).trim();
  const v_modelo    = String(modelo).trim();
  const v_imei      = imei == null ? null : String(imei).trim();
  const v_clienteId = Number(cliente_id);
  const v_estadoId  = Number(estado_id);

  try {
    const { data: equipo, error: errorEquipo } = await supabase
      .from('equipo')
      .insert([{
        tipo:       v_tipo,
        marca:      v_marca,
        modelo:     v_modelo,
        imei:       v_imei,
        cliente_id: v_clienteId,
        estado_id:  v_estadoId,
        created_at: new Date(),
        updated_at: new Date(),
      }])
      .select()
      .single();

    if (errorEquipo) throw errorEquipo;

    return res.status(201).json({ success: true, data: equipo });
  } catch (err) {
    console.error("❌ Error en createEquipo:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Error al registrar el equipo",
    });
  }
};

/**
 * GET ALL EQUIPOS
 * Incluye la última OT de cada equipo (falla, password, patron, id de la OT).
 */
export const getEquipos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('equipo')
      .select(`
        id,
        tipo,
        marca,
        modelo,
        imei,
        estado_id,
        cliente_id,
        created_at,
        cliente:cliente_id ( nombre, apellido, celular, direccion )
      `)
      .neq('estado_id', 18);

    if (error) throw error;

    const equipoIds = (data || []).map(e => e.id);
    let ultimasOTs = {};

    if (equipoIds.length > 0) {
      const { data: ots, error: otsError } = await supabase
        .from('orden_trabajo')
        .select('id, equipo_id, falla_reportada, fecha_ingreso, password, patron')
        .in('equipo_id', equipoIds)
        .order('fecha_ingreso', { ascending: false });

      if (otsError) {
        console.error('❌ Error trayendo OTs:', otsError);
      } else {
        for (const ot of (ots || [])) {
          if (!ultimasOTs[ot.equipo_id]) {
            ultimasOTs[ot.equipo_id] = ot;
          }
        }
      }
    }

    const rows = (data || []).map(item => {
      const clienteRec = Array.isArray(item.cliente) ? item.cliente[0] : item.cliente;
      const ultimaOT   = ultimasOTs[item.id];
      const fechaOrden = ultimaOT?.fecha_ingreso ?? item.created_at;

      return {
        id:                item.id,
        tipo:              item.tipo,
        marca:             item.marca,
        modelo:            item.modelo,
        imei:              item.imei,
        fecha_ingreso:     fechaOrden,
        estado_id:         item.estado_id,
        cliente_id:        item.cliente_id,
        cliente_nombre:    clienteRec?.nombre    ?? null,
        cliente_apellido:  clienteRec?.apellido  ?? null,
        cliente_celular:   clienteRec?.celular   ?? null,
        cliente_direccion: clienteRec?.direccion ?? null,
        ultima_falla:      ultimaOT?.falla_reportada ?? null,
        ultima_password:   ultimaOT?.password        ?? null,
        ultimo_patron:     ultimaOT?.patron           ?? null,
        ultima_ot_id:      ultimaOT?.id              ?? null,
        tiene_orden:       !!ultimaOT,
      };
    });

    rows.sort((a, b) => new Date(b.fecha_ingreso) - new Date(a.fecha_ingreso));

    return res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error en getEquipos:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET EQUIPO BY ID
 */
export const getEquipoById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: equipoData, error: equipoError } = await supabase
      .from('equipo')
      .select(`
        id, tipo, marca, modelo, imei, fecha_ingreso,
        cliente:cliente_id (
          id, nombre, apellido, direccion, celular, celular_contacto
        )
      `)
      .eq('id', id)
      .single();

    if (equipoError) throw equipoError;
    if (!equipoData) return res.status(404).json({ msg: 'Equipo no encontrado' });

    const { data: otData, error: otError } = await supabase
      .from('orden_trabajo')
      .select('*')
      .eq('equipo_id', id)
      .order('fecha_ingreso', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otError && otError.code !== 'PGRST116') throw otError;

    let presupuestoData = null;
    if (otData) {
      const { data: presupuesto, error: presupuestoError } = await supabase
        .from('presupuesto')
        .select('*')
        .eq('orden_trabajo_id', otData.id)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (presupuestoError && presupuestoError.code !== 'PGRST116') throw presupuestoError;
      presupuestoData = presupuesto || null;
    }

    const response = {
      equipo: {
        id:            equipoData.id,
        tipo:          equipoData.tipo,
        marca:         equipoData.marca,
        modelo:        equipoData.modelo,
        imei:          equipoData.imei,
        fecha_ingreso: equipoData.fecha_ingreso,
      },
      cliente: {
        id:               equipoData.cliente.id,
        nombre:           equipoData.cliente.nombre,
        apellido:         equipoData.cliente.apellido,
        direccion:        equipoData.cliente.direccion,
        celular:          equipoData.cliente.celular,
        celular_contacto: equipoData.cliente.celular_contacto,
      },
      detalles: {
        ingreso: otData ? {
          id:              otData.id,
          fecha_ingreso:   otData.fecha_ingreso,
          fecha_egreso:    otData.fecha_egreso,
          estado_id:       otData.estado_id,
          falla_reportada: otData.falla_reportada,
          diagnostico:     otData.diagnostico,
          password:        otData.password,
          patron:          otData.patron,
        } : null,
        presupuesto: presupuestoData ? {
          id:            presupuestoData.id,
          fecha:         presupuestoData.fecha,
          costo:         presupuestoData.costo,
          total:         presupuestoData.total,
          observaciones: presupuestoData.observaciones,
        } : null,
      },
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET EQUIPOS BY CLIENTE ID
 */
export const obtenerEquiposbyClientId = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const { data, error } = await supabase
      .from('equipo')
      .select('*')
      .eq('cliente_id', cliente_id)
      .neq('estado_id', 18)
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

/**
 * UPDATE EQUIPO
 */
export const updateEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const equipoId = Number.parseInt(id, 10);
    if (Number.isNaN(equipoId)) return res.status(400).json({ error: 'ID inválido' });

    const { tipo, marca, modelo, imei, cliente_id, estado_id } = req.body;

    const updatePayload = {};
    if (tipo       != null) updatePayload.tipo       = String(tipo).trim();
    if (marca      != null) updatePayload.marca      = String(marca).trim();
    if (modelo     != null) updatePayload.modelo     = String(modelo).trim();
    if (imei       != null) updatePayload.imei       = String(imei).trim();
    if (cliente_id != null) updatePayload.cliente_id = Number(cliente_id);
    if (estado_id  != null) updatePayload.estado_id  = Number(estado_id);
    updatePayload.updated_at = new Date();

    const { data, error } = await supabase
      .from('equipo')
      .update(updatePayload)
      .eq('id', equipoId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Equipo no encontrado' });

    return res.json({ equipo: data });
  } catch (err) {
    console.error('Error en updateEquipo:', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
};

/**
 * DELETE EQUIPO (baja lógica)
 */
export const deleteEquipo = async (req, res) => {
  try {
    const { id } = req.params;

    const { error: equipoError } = await supabase
      .from('equipo')
      .update({ estado_id: 18 })
      .eq('id', id);
    if (equipoError) throw equipoError;

    const { error: otError, data: ots } = await supabase
      .from('orden_trabajo')
      .update({ estado_id: 18 })
      .eq('equipo_id', id)
      .select('id');
    if (otError) throw otError;

    if (ots && ots.length > 0) {
      const otIds = ots.map(o => o.id);
      const { error: presupuestoError } = await supabase
        .from('presupuesto')
        .update({ estado_id: 18 })
        .in('orden_trabajo_id', otIds);
      if (presupuestoError) throw presupuestoError;
    }

    res.json({ msg: 'Equipo dado de baja correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET EQUIPOS BY TIPO (via RPC)
 */
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
    return res.json({ status: 'success', count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET EQUIPOS FILTRADOS (via RPC)
 */
export const getEquiposFiltrados = async (req, res) => {
  try {
    const { tipos } = req.query;
    if (!tipos) return res.status(400).json({ error: 'Debes enviar el parámetro ?tipos=...' });

    const tiposArray = tipos.split(',').map(t => t.trim()).filter(Boolean);
    if (tiposArray.length === 0) return res.status(400).json({ error: 'Parametro tipos inválido' });

    const { data, error } = await supabase
      .rpc('obtener_equipos_filtrados', { _tipos: tiposArray });

    if (error) {
      console.error('Error RPC obtener_equipos_filtrados:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    const rows = data ?? [];
    return res.json({ status: 'success', count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET EQUIPOS BY CLIENTE (via RPC)
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
      return res.status(201).json({ success: true, message: 'No se encontraron equipos para este cliente.' });
    }
    return res.json({ status: 'success', count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET EQUIPOS CON DETALLE (via RPC)
 */
export const getEquiposConDetalle = async (_req, res) => {
  try {
    const { data, error } = await supabase.rpc('obtener_equipos_con_detalle');
    if (error) {
      console.error('Error RPC obtener_equipos_con_detalle:', error);
      return res.status(500).json({ error: error.message || 'Error interno' });
    }
    return res.json(data ?? []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET EQUIPO BY MARCA, MODELO Y DNI
 */
export const getEquipoByMarcaModeloDni = async (req, res) => {
  try {
    const { marca, modelo, dni } = req.body;
    const query = `
      SELECT e.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
             c.dni AS cliente_dni, es.nombre AS estado_nombre
      FROM equipo e
      INNER JOIN cliente c ON e.cliente_id = c.id
      LEFT JOIN estado es ON e.estado_id = es.id
      WHERE LOWER(e.marca) = LOWER($1) AND LOWER(e.modelo) = LOWER($2) AND c.dni = $3
      ORDER BY e.fecha_ingreso DESC LIMIT 1;
    `;
    const { rows } = await pool.query(query, [marca, modelo, dni]);
    if (rows.length === 0) return res.status(404).json({ msg: 'Equipo no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const checkEquipoRoute = async (req, res) => {
  return res.status(501).json({ msg: 'checkEquipoRoute no implementado' });
};

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
  getEquipoByMarcaModeloDni,
  checkEquipoRoute,
};