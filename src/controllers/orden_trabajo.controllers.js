// // src/controllers/orden_trabajo.controller.js

// import { supabase } from '../config/supabase.js';

// /**
//  * CREATE ORDEN DE TRABAJO
//  */
// export const createOrdenTrabajo = async (req, res) => {
//   try {
//     const {
//       equipo_id,
//       fecha_ingreso,
//       fecha_egreso,
//       estado_id,
//       falla_reportada,
//       patron,
//       password,
//       diagnostico
//     } = req.body;

//     if (!equipo_id) {
//       return res.status(400).json({ error: 'equipo_id es obligatorio' });
//     }
//     if (!falla_reportada) {
//       return res.status(400).json({ error: 'falla_reportada es obligatoria' });
//     }
//     if (!estado_id) {
//       return res.status(400).json({ error: 'estado_id es obligatorio' });
//     }

//     const { data, error } = await supabase
//       .from('orden_trabajo')
//       .insert([{
//         equipo_id,
//         fecha_ingreso,
//         fecha_egreso,
//         estado_id,
//         falla_reportada,
//         patron:   patron   ?? null,
//         password: password ?? null,
//         diagnostico: diagnostico ?? null
//       }])
//       .select()
//       .single();

//     if (error) {
//       console.error('Error creando orden de trabajo (Supabase):', error);
//       return res.status(500).json({ error: error.message || 'Error creando orden de trabajo' });
//     }

//     return res.status(201).json(data);
//   } catch (err) {
//     console.error('Excepción createOrdenTrabajo:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * GET ALL ÓRDENES DE TRABAJO
//  */
// export const getOrdenesTrabajo = async (_req, res) => {
//   try {
//     const { data, error } = await supabase
//       .from('orden_trabajo')
//       .select('*')
//       .order('fecha_ingreso', { ascending: false });

//     if (error) {
//       console.error('Error obteniendo órdenes de trabajo (Supabase):', error);
//       return res.status(500).json({ error: error.message || 'Error obteniendo órdenes de trabajo' });
//     }

//     return res.status(200).json(data || []);
//   } catch (err) {
//     console.error('Excepción getOrdenesTrabajo:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * GET ÓRDENES DE TRABAJO POR EQUIPO
//  * Devuelve el historial completo de visitas de un equipo
//  */
// export const getOrdenesByEquipo = async (req, res) => {
//   try {
//     const { equipoId } = req.params;

//     const { data, error } = await supabase
//       .from('orden_trabajo')
//       .select('*')
//       .eq('equipo_id', equipoId)
//       .order('fecha_ingreso', { ascending: false });

//     if (error) {
//       console.error('Error getOrdenesByEquipo (Supabase):', error);
//       return res.status(500).json({ error: error.message || 'Error obteniendo órdenes por equipo' });
//     }

//     return res.status(200).json(data || []);
//   } catch (err) {
//     console.error('Excepción getOrdenesByEquipo:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * GET ÓRDENES DE TRABAJO POR CLIENTE
//  * Devuelve todas las OTs de todos los equipos de un cliente
//  */
// export const getOrdenesByCliente = async (req, res) => {
//   try {
//     const { clienteId } = req.params;

//     const { data, error } = await supabase
//       .from('orden_trabajo')
//       .select(`
//         *,
//         equipo:equipo_id (
//           id, tipo, marca, modelo, imei
//         )
//       `)
//       .eq('equipo.cliente_id', clienteId)
//       .order('fecha_ingreso', { ascending: false });

//     if (error) {
//       console.error('Error getOrdenesByCliente (Supabase):', error);
//       return res.status(500).json({ error: error.message || 'Error obteniendo órdenes por cliente' });
//     }

//     return res.status(200).json(data || []);
//   } catch (err) {
//     console.error('Excepción getOrdenesByCliente:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * GET ORDEN DE TRABAJO POR ID
//  */
// export const getOrdenTrabajoById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const { data, error } = await supabase
//       .from('orden_trabajo')
//       .select(`
//         *,
//         equipo:equipo_id (
//           id, tipo, marca, modelo, imei,
//           cliente:cliente_id (
//             id, nombre, apellido, celular, email
//           )
//         ),
//         estado:estado_id ( id, nombre )
//       `)
//       .eq('id', id)
//       .single();

//     if (error) {
//       console.error('Error getOrdenTrabajoById (Supabase):', error);
//       return res.status(500).json({ error: error.message || 'Error obteniendo orden de trabajo' });
//     }

//     if (!data) {
//       return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
//     }

//     return res.status(200).json(data);
//   } catch (err) {
//     console.error('Excepción getOrdenTrabajoById:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * UPDATE ORDEN DE TRABAJO
//  */
// export const updateOrdenTrabajo = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       fecha_ingreso,
//       fecha_egreso,
//       estado_id,
//       falla_reportada,
//       patron,
//       password,
//       diagnostico
//     } = req.body;

//     const params = {
//       _id:              Number(id),
//       _fecha_ingreso:   fecha_ingreso   ?? null,
//       _fecha_egreso:    fecha_egreso    ?? null,
//       _estado_id:       estado_id       ?? null,
//       _falla_reportada: falla_reportada ?? null,
//       _patron:          patron          ?? null,
//       _password:        password        ?? null,
//       _diagnostico:     diagnostico     ?? null
//     };

//     const { data, error } = await supabase.rpc('actualizar_orden_trabajo', params);

//     if (error) {
//       console.error('Error RPC actualizar_orden_trabajo:', error);
//       return res.status(500).json({ error: error.message || 'Error actualizando orden de trabajo' });
//     }

//     const updated = Array.isArray(data) && data.length > 0 ? data[0] : data;

//     if (!updated) {
//       return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
//     }

//     return res.status(200).json(updated);
//   } catch (err) {
//     console.error('Excepción updateOrdenTrabajo:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * DELETE ORDEN DE TRABAJO
//  */
// export const deleteOrdenTrabajo = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const { data, error } = await supabase
//       .from('orden_trabajo')
//       .delete()
//       .eq('id', id)
//       .select()
//       .single();

//     if (error) {
//       if (error.code === 'PGRST116') {
//         return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
//       }
//       console.error('Error eliminando orden de trabajo (Supabase):', error);
//       return res.status(500).json({ error: error.message || 'Error eliminando orden de trabajo' });
//     }

//     if (!data) {
//       return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
//     }

//     return res.json({ message: 'Orden de trabajo eliminada correctamente' });
//   } catch (err) {
//     console.error('Excepción deleteOrdenTrabajo:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// export default {
//   createOrdenTrabajo,
//   getOrdenesTrabajo,
//   getOrdenesByEquipo,
//   getOrdenesByCliente,
//   getOrdenTrabajoById,
//   updateOrdenTrabajo,
//   deleteOrdenTrabajo
// };

// src/controllers/orden_trabajo.controller.js
import { supabase } from '../config/supabase.js';
import axios from 'axios';

// URL del microservicio de Twilio (ajustá si en producción es distinta)
const TWILIO_SERVICE_URL = process.env.TWILIO_SERVICE_URL || 'http://localhost:7002';

/**
 * CREATE ORDEN DE TRABAJO
 * Crea la OT y, si tiene éxito, dispara el mensaje de WhatsApp al cliente.
 * El envío del mensaje NUNCA bloquea ni hace fallar la creación de la OT.
 */
export const createOrdenTrabajo = async (req, res) => {
  try {
    const {
      equipo_id,
      fecha_ingreso,
      fecha_egreso,
      estado_id,
      falla_reportada,
      patron,
      password,
      diagnostico
    } = req.body;

    if (!equipo_id)        return res.status(400).json({ error: 'equipo_id es obligatorio' });
    if (!falla_reportada)  return res.status(400).json({ error: 'falla_reportada es obligatoria' });
    if (!estado_id)        return res.status(400).json({ error: 'estado_id es obligatorio' });

    const { data: orden, error } = await supabase
      .from('orden_trabajo')
      .insert([{
        equipo_id,
        fecha_ingreso,
        fecha_egreso,
        estado_id,
        falla_reportada,
        patron:      patron      ?? null,
        password:    password    ?? null,
        diagnostico: diagnostico ?? null
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creando orden de trabajo (Supabase):', error);
      return res.status(500).json({ error: error.message || 'Error creando orden de trabajo' });
    }

    // ====== ENVÍO DE WHATSAPP (no bloqueante para la respuesta) ======
    let mensajeInfo = null;
    try {
      // 1. Traer datos del equipo + cliente
      const { data: equipoData } = await supabase
        .from('equipo')
        .select('tipo, marca, modelo, cliente_id, cliente:cliente_id ( nombre, apellido, celular )')
        .eq('id', equipo_id)
        .single();

      const cliente = Array.isArray(equipoData?.cliente) ? equipoData.cliente[0] : equipoData?.cliente;

      if (cliente?.celular) {
        const equipoDescripcion = `${equipoData.tipo} ${equipoData.marca} ${equipoData.modelo}`;

        const twilioRes = await axios.post(`${TWILIO_SERVICE_URL}/twilio/enviar-mensaje`, {
          numero:  cliente.celular,
          cliente: { nombre: cliente.nombre, apellido: cliente.apellido },
          equipo:  equipoDescripcion,
        });

        mensajeInfo = { enviado: true, sid: twilioRes.data?.sid };
      } else {
        mensajeInfo = { enviado: false, motivo: 'Cliente sin celular registrado' };
      }
    } catch (twilioErr) {
      console.error('⚠️ Error al enviar WhatsApp (no bloquea la creación de la OT):', twilioErr?.message);
      mensajeInfo = { enviado: false, motivo: 'Error al enviar el mensaje' };
    }

    return res.status(201).json({ ...orden, mensaje: mensajeInfo });
  } catch (err) {
    console.error('Excepción createOrdenTrabajo:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET ALL ÓRDENES DE TRABAJO
 */
export const getOrdenesTrabajo = async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('orden_trabajo')
      .select('*')
      .order('fecha_ingreso', { ascending: false });

    if (error) {
      console.error('Error obteniendo órdenes de trabajo (Supabase):', error);
      return res.status(500).json({ error: error.message || 'Error obteniendo órdenes de trabajo' });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('Excepción getOrdenesTrabajo:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const getOrdenesByEquipo = async (req, res) => {
  try {
    const { equipoId } = req.params;
    const { data, error } = await supabase
      .from('orden_trabajo')
      .select('*')
      .eq('equipo_id', equipoId)
      .order('fecha_ingreso', { ascending: false });

    if (error) {
      console.error('Error getOrdenesByEquipo (Supabase):', error);
      return res.status(500).json({ error: error.message || 'Error obteniendo órdenes por equipo' });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('Excepción getOrdenesByEquipo:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const getOrdenesByCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { data, error } = await supabase
      .from('orden_trabajo')
      .select(`*, equipo:equipo_id ( id, tipo, marca, modelo, imei )`)
      .eq('equipo.cliente_id', clienteId)
      .order('fecha_ingreso', { ascending: false });

    if (error) {
      console.error('Error getOrdenesByCliente (Supabase):', error);
      return res.status(500).json({ error: error.message || 'Error obteniendo órdenes por cliente' });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('Excepción getOrdenesByCliente:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const getOrdenTrabajoById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('orden_trabajo')
      .select(`
        *,
        equipo:equipo_id ( id, tipo, marca, modelo, imei, cliente:cliente_id ( id, nombre, apellido, celular, email ) ),
        estado:estado_id ( id, nombre )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getOrdenTrabajoById (Supabase):', error);
      return res.status(500).json({ error: error.message || 'Error obteniendo orden de trabajo' });
    }
    if (!data) return res.status(404).json({ error: 'Orden de trabajo no encontrada' });

    return res.status(200).json(data);
  } catch (err) {
    console.error('Excepción getOrdenTrabajoById:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const updateOrdenTrabajo = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_ingreso, fecha_egreso, estado_id, falla_reportada, patron, password, diagnostico } = req.body;

    const params = {
      _id:              Number(id),
      _fecha_ingreso:   fecha_ingreso   ?? null,
      _fecha_egreso:    fecha_egreso    ?? null,
      _estado_id:       estado_id       ?? null,
      _falla_reportada: falla_reportada ?? null,
      _patron:          patron          ?? null,
      _password:        password        ?? null,
      _diagnostico:     diagnostico     ?? null
    };

    const { data, error } = await supabase.rpc('actualizar_orden_trabajo', params);

    if (error) {
      console.error('Error RPC actualizar_orden_trabajo:', error);
      return res.status(500).json({ error: error.message || 'Error actualizando orden de trabajo' });
    }

    const updated = Array.isArray(data) && data.length > 0 ? data[0] : data;
    if (!updated) return res.status(404).json({ error: 'Orden de trabajo no encontrada' });

    return res.status(200).json(updated);
  } catch (err) {
    console.error('Excepción updateOrdenTrabajo:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const deleteOrdenTrabajo = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('orden_trabajo')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
      console.error('Error eliminando orden de trabajo (Supabase):', error);
      return res.status(500).json({ error: error.message || 'Error eliminando orden de trabajo' });
    }
    if (!data) return res.status(404).json({ error: 'Orden de trabajo no encontrada' });

    return res.json({ message: 'Orden de trabajo eliminada correctamente' });
  } catch (err) {
    console.error('Excepción deleteOrdenTrabajo:', err);
    return res.status(500).json({ error: err.message });
  }
};

export default {
  createOrdenTrabajo,
  getOrdenesTrabajo,
  getOrdenesByEquipo,
  getOrdenesByCliente,
  getOrdenTrabajoById,
  updateOrdenTrabajo,
  deleteOrdenTrabajo
};