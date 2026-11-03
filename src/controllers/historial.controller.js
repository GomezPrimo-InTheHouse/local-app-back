// // src/controllers/historial.controller.js
// import { supabase } from '../config/supabase.js';

// /**
//  * GET /historial/equipo/:equipoId
//  * Historial de todas las OTs de un equipo específico
//  */
// export const getHistorialCliente = async (req, res) => {
//   const equipoId = parseInt(req.params.equipoId, 10);

//   if (isNaN(equipoId)) {
//     return res.status(400).json({ error: 'ID de equipo inválido' });
//   }

//   try {
//     const { data, error } = await supabase
//       .rpc('obtener_historial_por_equipo', { _equipo_id: equipoId });

//     if (error) throw error;

//     return res.status(200).json(data || []);
//   } catch (err) {
//     console.error('Error en getHistorialCliente:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * GET /historial/cliente/:clienteId
//  * Historial de todos los equipos de un cliente
//  */
// export const getHistorialClienteByClienteId = async (req, res) => {
//   const clienteId = parseInt(req.params.clienteId, 10);

//   if (isNaN(clienteId)) {
//     return res.status(400).json({ error: 'ID de cliente inválido' });
//   }

//   try {
//     const { data, error } = await supabase
//       .rpc('obtener_historial_por_cliente', { _cliente_id: clienteId });

//     if (error) throw error;

//     return res.status(200).json(data || []);
//   } catch (err) {
//     console.error('Error en getHistorialClienteByClienteId:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// src/controllers/historial.controller.js
import { supabase } from '../config/supabase.js';

/**
 * GET /historial/equipo/:equipoId
 * Historial de todas las OTs de un equipo específico
 */
export const getHistorialCliente = async (req, res) => {
  const equipoId = parseInt(req.params.equipoId, 10);

  if (isNaN(equipoId)) {
    return res.status(400).json({ error: 'ID de equipo inválido' });
  }

  try {
    const { data, error } = await supabase
      .rpc('obtener_historial_por_equipo', { _equipo_id: equipoId });

    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('Error en getHistorialCliente:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /historial/cliente/:clienteId
 * Historial de todos los equipos de un cliente
 */
export const getHistorialClienteByClienteId = async (req, res) => {
  const clienteId = parseInt(req.params.clienteId, 10);

  if (isNaN(clienteId)) {
    return res.status(400).json({ error: 'ID de cliente inválido' });
  }

  try {
    const { data, error } = await supabase
      .rpc('obtener_historial_por_cliente', { _cliente_id: clienteId });

    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('Error en getHistorialClienteByClienteId:', err);
    return res.status(500).json({ error: err.message });
  }
};
/**
 * GET /historial/resumen-clientes
 * Balance de todos los clientes en una sola consulta (pantalla Clientes)
 */
export const getResumenBalanceClientes = async (_req, res) => {
  try {
    const { data, error } = await supabase.rpc('resumen_balance_clientes');
    if (error) throw error;

    const rows = (data || []).map((r) => {
      const ingresos = Number(r.reparaciones_total || 0) + Number(r.ventas_total || 0);
      const costos = Number(r.reparaciones_costo || 0) + Number(r.ventas_costo || 0);
      return {
        cliente_id: r.cliente_id,
        reparaciones_total: Number(r.reparaciones_total || 0),
        reparaciones_costo: Number(r.reparaciones_costo || 0),
        ventas_total: Number(r.ventas_total || 0),
        ventas_costo: Number(r.ventas_costo || 0),
        saldo_pendiente: Number(r.saldo_pendiente || 0),
        ingresos,
        costos,
        balance: ingresos - costos,
      };
    });

    return res.status(200).json(rows);
  } catch (err) {
    console.error('Error en getResumenBalanceClientes:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /historial/cliente/:clienteId/ventas
 * Ventas (local y web) del cliente, con sus productos
 */
export const getVentasCliente = async (req, res) => {
  const clienteId = parseInt(req.params.clienteId, 10);
  if (isNaN(clienteId)) {
    return res.status(400).json({ error: 'ID de cliente inválido' });
  }

  try {
    const { data, error } = await supabase
      .from('venta')
      .select(`
        id, fecha, canal, total, descuento, monto_abonado, saldo, estado_id,
        estado:estado_id ( id, nombre ),
        detalle_venta (
          id, cantidad, precio_unitario, subtotal, estado_id,
          producto:producto_id ( id, nombre, costo )
        )
      `)
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });

    if (error) throw error;

    const ventas = (data || []).map((v) => ({
      ...v,
      detalle_venta: (v.detalle_venta || []).filter(
        (d) => Number(d.estado_id ?? 19) !== 28
      ),
    }));

    return res.status(200).json(ventas);
  } catch (err) {
    console.error('Error en getVentasCliente:', err);
    return res.status(500).json({ error: err.message });
  }
};