

// import { supabase } from '../config/supabase.js';

// // Helper para convertir fechas a timestamp para ordenamiento


// export const getHistorialCliente = async (req, res) => {
//   try {
//     const { equipoId } = req.params;
//     const id = Number(equipoId);

//     if (!Number.isFinite(id)) {
//       return res.status(400).json({ error: 'equipoId inválido' });
//     }

//     // 1. Obtenemos el cliente_id de ese equipo primero
//     const { data: equipoBase, error: errBase } = await supabase
//       .from('equipo')
//       .select('cliente_id')
//       .eq('id', id)
//       .single();

//     if (errBase || !equipoBase) {
//       return res.status(404).json({ error: 'No se encontró el equipo.' });
//     }

//     const clienteId = equipoBase.cliente_id;

//     // 2. Traemos todos los equipos de ese cliente con sus relaciones
//     const { data: equiposRows, error: errEquipos } = await supabase
//       .from('equipo')
//       .select(`
//         id, tipo, marca, modelo, problema, cliente_id,
//         ingreso (
//           id, fecha_ingreso, fecha_egreso,
//           estado:estado_id (id, nombre),
//           presupuesto (
//             id, fecha, costo, total, observaciones,
//             estado:estado_id (id, nombre)
//           )
//         )
//       `)
//       .eq('cliente_id', clienteId);

//     if (errEquipos) throw errEquipos;

//     // 3. Formatear y ordenar los datos (Misma lógica original)
//     const equipos = equiposRows.map(eq => {
//       let maxFecha = -Infinity;

//       const ingresosOrdenados = (eq.ingreso || []).map(ing => {
//         const fi = ts(ing.fecha_ingreso);
//         if (fi > maxFecha) maxFecha = fi;

//         return {
//           ingreso_id: ing.id,
//           fecha_ingreso: ing.fecha_ingreso,
//           fecha_egreso: ing.fecha_egreso,
//           estado: ing.estado,
//           presupuestos: (ing.presupuesto || []).map(p => ({
//             presupuesto_id: p.id,
//             fecha: p.fecha,
//             costo: p.costo,
//             total: p.total,
//             observaciones: p.observaciones,
//             estado: p.estado
//           })).sort((a, b) => ts(b.fecha) - ts(a.fecha))
//         };
//       }).sort((a, b) => ts(b.fecha_ingreso) - ts(a.fecha_ingreso));

//       return {
//         equipo_id: eq.id,
//         tipo: eq.tipo,
//         marca: eq.marca,
//         modelo: eq.modelo,
//         problema: eq.problema,
//         ingresos: ingresosOrdenados,
//         _maxFecha: maxFecha
//       };
//     }).sort((a, b) => b._maxFecha - a._maxFecha)
//       .map(({ _maxFecha, ...rest }) => rest);

//     return res.json({
//       cliente_id: clienteId,
//       equipos,
//     });

//   } catch (error) {
//     console.error('Error en getHistorialCliente:', error.message);
//     return res.status(500).json({ error: 'Error al obtener historial' });
//   }
// };



// const ts = (d) => (d ? new Date(d).getTime() : -Infinity);

// export const getHistorialClienteByClienteId = async (req, res) => {
//   try {
//     const { clienteId } = req.params;
//     const id = Number(clienteId);

//     if (!Number.isFinite(id)) {
//       return res.status(400).json({ error: "clienteId inválido" });
//     }

//     const [equiposResp, ventasResp] = await Promise.all([
//       // EQUIPOS
//       supabase
//         .from('equipo')
//         .select(`
//           id, tipo, marca, modelo, problema, cliente_id,
//           ingreso (
//             id, fecha_ingreso, fecha_egreso,
//             estado:estado!estado_id (id, nombre),
//             presupuesto (
//               id, fecha, costo, total, observaciones,
//               estado:estado!estado_id (id, nombre)
//             )
//           )
//         `)
//         .eq('cliente_id', id),

//       // VENTAS - Aquí aplicamos la solución al conflicto de FK
//       supabase
//         .from('venta')
//         .select(`
//           id, fecha, total, monto_abonado, saldo, canal,
//           estado:estado!estado_id (id, nombre),
//           cupon:cupon_id (id, codigo, descuento_porcentaje, descuento_monto),
//           detalle_venta (
//             id, producto_id, cantidad, precio_unitario, subtotal,
//             producto:producto!detalle_venta_producto_id_fkey ( nombre ) 
//           )
//         `)
//         .eq('cliente_id', id)
//     ]);

//     if (equiposResp.error) throw equiposResp.error;
//     if (ventasResp.error) throw ventasResp.error;

//     // PROCESAMIENTO DE EQUIPOS
//     const equipos = (equiposResp.data || []).map(eq => {
//       let maxFecha = -Infinity;
//       const ingresos = (eq.ingreso || []).map(ing => {
//         const fi = ts(ing.fecha_ingreso);
//         if (fi > maxFecha) maxFecha = fi;
//         return {
//           ingreso_id: ing.id,
//           fecha_ingreso: ing.fecha_ingreso,
//           fecha_egreso: ing.fecha_egreso,
//           estado: ing.estado,
//           presupuestos: (ing.presupuesto || []).map(p => ({
//             presupuesto_id: p.id,
//             fecha: p.fecha,
//             costo: p.costo,
//             total: p.total,
//             observaciones: p.observaciones,
//             estado: p.estado
//           })).sort((a, b) => ts(b.fecha) - ts(a.fecha))
//         };
//       }).sort((a, b) => ts(b.fecha_ingreso) - ts(a.fecha_ingreso));

//       return {
//         equipo_id: eq.id,
//         tipo: eq.tipo,
//         marca: eq.marca,
//         modelo: eq.modelo,
//         problema: eq.problema,
//         ingresos,
//         _maxFecha: maxFecha
//       };
//     }).sort((a, b) => b._maxFecha - a._maxFecha)
//       .map(({ _maxFecha, ...rest }) => rest);

//     // PROCESAMIENTO DE VENTAS
//     const ventas = (ventasResp.data || []).map(v => ({
//       venta_id: v.id,
//       fecha: v.fecha,
//       total: v.total,
//       monto_abonado: v.monto_abonado,
//       saldo: v.saldo,
//       canal: v.canal,
//       estado: v.estado,
//       cupon: v.cupon,
//       detalles: (v.detalle_venta || []).map(dv => ({
//         detalle_venta_id: dv.id,
//         producto_id: dv.producto_id,
//         producto_nombre: dv.producto?.nombre || "Sin nombre",
//         cantidad: dv.cantidad,
//         precio_unitario: dv.precio_unitario,
//         subtotal: dv.subtotal
//       }))
//     })).sort((a, b) => ts(b.fecha) - ts(a.fecha));

//     if (equipos.length === 0 && ventas.length === 0) {
//       return res.json({
//         success: true,
//         cliente_id: id,
//         equipos: equipos || [],
//         ventas: ventas || []
//       });
//     }

//     return res.json({ success: true, cliente_id: id, equipos, ventas });

//   } catch (error) {
//     console.error("❌ Error:", error.message);
//     return res.status(500).json({ success: false, error: "Error de servidor", details: error.message });
//   }
// };

// src/controllers/historial.controller.js
import { supabase } from '../config/supabase.js';

/**
 * GET /historial/equipo/:equipoId
 * Historial completo de un equipo: todas sus órdenes de trabajo + presupuestos
 */
export const getHistorialCliente = async (req, res) => {
  const { equipoId } = req.params;

  try {
    // 1. Datos del equipo + cliente
    const { data: equipo, error: equipoError } = await supabase
      .from('equipo')
      .select(`
        id, tipo, marca, modelo, imei, estado_id,
        cliente:cliente_id (
          id, nombre, apellido, celular, direccion, dni
        )
      `)
      .eq('id', equipoId)
      .single();

    if (equipoError) throw equipoError;
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

    // 2. Todas las órdenes de trabajo del equipo
    const { data: ordenes, error: ordenesError } = await supabase
      .from('orden_trabajo')
      .select(`
        id,
        fecha_ingreso,
        fecha_egreso,
        falla_reportada,
        diagnostico,
        password,
        patron,
        estado_id,
        estado:estado_id ( id, nombre )
      `)
      .eq('equipo_id', equipoId)
      .neq('estado_id', 18)
      .order('fecha_ingreso', { ascending: false });

    if (ordenesError) throw ordenesError;

    // 3. Para cada OT, traer sus presupuestos
    const ordenesConPresupuestos = await Promise.all(
      (ordenes || []).map(async (ot) => {
        const { data: presupuestos } = await supabase
          .from('presupuesto')
          .select(`
            id, fecha, costo, total, observaciones,
            estado:estado_id ( id, nombre )
          `)
          .eq('orden_trabajo_id', ot.id)
          .neq('estado_id', 18)
          .order('fecha', { ascending: false });

        return {
          ...ot,
          presupuestos: presupuestos || [],
        };
      })
    );

    return res.status(200).json({
      equipo,
      cliente:  equipo.cliente,
      ordenes:  ordenesConPresupuestos,
      total_ingresos: ordenesConPresupuestos.length,
    });
  } catch (err) {
    console.error('Error en getHistorialCliente:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /historial/cliente/:clienteId
 * Historial de todos los equipos de un cliente via RPC
 */
export const getHistorialClienteByClienteId = async (req, res) => {
  const clienteId = parseInt(req.params.clienteId, 10);

  if (isNaN(clienteId)) {
    return res.status(400).json({ error: 'ID de cliente inválido' });
  }

  try {
    const { data, error } = await supabase
      .rpc('obtener_historial_por_equipo', { _equipo_id: clienteId });

    if (error) {
      console.error('Error RPC obtener_historial_por_equipo:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Error en getHistorialClienteByClienteId:', err);
    return res.status(500).json({ error: err.message });
  }
};