

// controllers/equipos/getHistorialEquipo.sql.controller.js
// import { pool } from '../config/supabaseAuthModule.js';



// export const getHistorialCliente = async (req, res) => {
//   try {
//     const { equipoId } = req.params;
//     const id = Number(equipoId);

//     if (!Number.isFinite(id)) {
//       return res.status(400).json({ error: 'equipoId inválido' });
//     }

//     // SQL equivalente al RPC, parametrizado
//     const SQL = `
//       WITH base AS (
//         SELECT
//           e.cliente_id,
//           e.id AS equipo_id,
//           e.tipo,
//           e.marca,
//           e.modelo,
//           e.problema,
//           i.id AS ingreso_id,
//           i.fecha_ingreso,
//           i.fecha_egreso,
//           ei.id AS estado_ingreso_id,
//           ei.nombre AS estado_ingreso_nombre,
//           p.id AS presupuesto_id,
//           p.fecha AS fecha_presupuesto,
//           p.costo,
//           p.total,
//           p.observaciones,
//           ep.id AS estado_presupuesto_id,
//           ep.nombre AS estado_presupuesto_nombre
//         FROM equipo e
//         LEFT JOIN ingreso i       ON i.equipo_id = e.id
//         LEFT JOIN estado  ei      ON i.estado_id = ei.id
//         LEFT JOIN presupuesto p   ON p.ingreso_id = i.id
//         LEFT JOIN estado  ep      ON p.estado_id = ep.id
//         WHERE e.cliente_id = (SELECT cliente_id FROM equipo WHERE id = $1)
//       )
//       SELECT *
//       FROM base
      
//       ORDER BY equipo_id ASC,
//                fecha_ingreso DESC NULLS LAST,
//                fecha_presupuesto DESC NULLS LAST;
//     `;

//     const { rows: data } = await pool.query(SQL, [id]);

//     if (!data || data.length === 0) {
//       return res.status(404).json({ error: 'No se encontró el equipo.' });
//     }

//     const clienteId = data[0].cliente_id;

//     // Reagrupar y ORDENAR por fechas (desc)
//     const equiposMap = {};

//     for (const r of data) {
//       if (!equiposMap[r.equipo_id]) {
//         equiposMap[r.equipo_id] = {
//           equipo_id: r.equipo_id,
//           tipo: r.tipo,
//           marca: r.marca,
//           modelo: r.modelo,
//           problema: r.problema,
//           ingresos: {},      // map temporal para agrupar
//           _maxFecha: null,   // para ordenar equipos por su ingreso más reciente
//         };
//       }

//       if (r.ingreso_id) {
//         if (!equiposMap[r.equipo_id].ingresos[r.ingreso_id]) {
//           equiposMap[r.equipo_id].ingresos[r.ingreso_id] = {
//             ingreso_id: r.ingreso_id,
//             fecha_ingreso: r.fecha_ingreso,
//             fecha_egreso: r.fecha_egreso,
//             estado: {
//               id: r.estado_ingreso_id,
//               nombre: r.estado_ingreso_nombre,
//             },
//             presupuestos: [],
//           };
//         }

//         // trackear la fecha más reciente del equipo
//         const fi = r.fecha_ingreso ? new Date(r.fecha_ingreso).getTime() : null;
//         if (fi !== null) {
//           if (
//             equiposMap[r.equipo_id]._maxFecha === null ||
//             fi > equiposMap[r.equipo_id]._maxFecha
//           ) {
//             equiposMap[r.equipo_id]._maxFecha = fi;
//           }
//         }

//         if (r.presupuesto_id) {
//           equiposMap[r.equipo_id].ingresos[r.ingreso_id].presupuestos.push({
//             presupuesto_id: r.presupuesto_id,
//             fecha: r.fecha_presupuesto,
//             costo: r.costo,
//             total: r.total,
//             observaciones: r.observaciones,
//             estado: {
//               id: r.estado_presupuesto_id,
//               nombre: r.estado_presupuesto_nombre,
//             },
//           });
//         }
//       }
//     }

//     // Helpers de orden
//     const ts = (d) => (d ? new Date(d).getTime() : -Infinity);

//     // Convertir y ordenar
//     const equipos = Object.values(equiposMap)
//       .map((eq) => {
//         // Ordenar presupuestos dentro de cada ingreso (desc por fecha)
//         const ingresosOrdenados = Object.values(eq.ingresos)
//           .map((ing) => ({
//             ...ing,
//             presupuestos: [...ing.presupuestos].sort(
//               (a, b) => ts(b.fecha) - ts(a.fecha)
//             ),
//           }))
//           // Orden de ingresos: más recientes primero
//           .sort((a, b) => ts(b.fecha_ingreso) - ts(a.fecha_ingreso));

//         return {
//           equipo_id: eq.equipo_id,
//           tipo: eq.tipo,
//           marca: eq.marca,
//           modelo: eq.modelo,
//           problema: eq.problema,
//           ingresos: ingresosOrdenados,
//           _maxFecha: eq._maxFecha ?? -Infinity,
//         };
//       })
//       // Orden de equipos: por el ingreso más reciente
//       .sort((a, b) => (b._maxFecha - a._maxFecha));

//     // Remover campo interno
//     for (const e of equipos) delete e._maxFecha;

//     return res.json({
//       cliente_id: clienteId,
//       equipos,
//     });
//   } catch (error) {
//     console.error('Error en getHistorialEquipo (SQL):', error);
//     return res
//       .status(500)
//       .json({ error: 'Error al obtener historial de los equipos del cliente' });
//   }
// };


// export const getHistorialClienteByClienteId = async (req, res) => {
//   try {
//     const { clienteId } = req.params;
//     const id = Number(clienteId);

//     if (!Number.isFinite(id)) {
//       return res.status(400).json({ error: "clienteId inválido" });
//     }

//     // =========================
//     // 1) EQUIPOS / INGRESOS / PRESUPUESTOS
//     // =========================
//     const SQL_EQUIPOS = `
//       SELECT
//         e.cliente_id,
//         e.id AS equipo_id,
//         e.tipo,
//         e.marca,
//         e.modelo,
//         e.problema,
//         i.id AS ingreso_id,
//         i.fecha_ingreso,
//         i.fecha_egreso,
//         ei.id AS estado_ingreso_id,
//         ei.nombre AS estado_ingreso_nombre,
//         p.id AS presupuesto_id,
//         p.fecha AS fecha_presupuesto,
//         p.costo,
//         p.total,
//         p.observaciones,
//         ep.id AS estado_presupuesto_id,
//         ep.nombre AS estado_presupuesto_nombre
//       FROM equipo e
//       LEFT JOIN ingreso i     ON i.equipo_id = e.id
//       LEFT JOIN estado  ei    ON i.estado_id = ei.id
//       LEFT JOIN presupuesto p ON p.ingreso_id = i.id
//       LEFT JOIN estado  ep    ON p.estado_id = ep.id
//       WHERE e.cliente_id = $1
//       ORDER BY e.id ASC,
//                i.fecha_ingreso DESC NULLS LAST,
//                p.fecha         DESC NULLS LAST;
//     `;

//     // =========================
//     // 2) VENTAS + DETALLES (+ producto, estado, cupon)
//     // =========================
//     const SQL_VENTAS = `
//       SELECT
//         v.cliente_id,
//         v.id AS venta_id,
//         v.fecha AS fecha_venta,
//         v.total,
//         v.monto_abonado,
//         v.saldo,
//         v.canal,
//         ev.id AS estado_venta_id,
//         ev.nombre AS estado_venta_nombre,

//         v.cupon_id,
//         cc.codigo AS cupon_codigo,
//         cc.descuento_porcentaje AS cupon_descuento_porcentaje,
//         cc.descuento_monto AS cupon_descuento_monto,

//         dv.id AS detalle_venta_id,
//         dv.producto_id,
//         pr.nombre AS producto_nombre,
//         dv.cantidad,
//         dv.precio_unitario,
//         dv.subtotal
//       FROM venta v
//       LEFT JOIN estado ev        ON ev.id = v.estado_id
//       LEFT JOIN cupon_cliente cc ON cc.id = v.cupon_id
//       LEFT JOIN detalle_venta dv ON dv.venta_id = v.id
//       LEFT JOIN producto pr      ON pr.id = dv.producto_id
//       WHERE v.cliente_id = $1
//       ORDER BY v.fecha DESC NULLS LAST,
//                v.id DESC,
//                dv.id ASC NULLS LAST;
//     `;

//     // Ejecutamos ambas consultas en paralelo
//     const [equiposResp, ventasResp] = await Promise.all([
//       pool.query(SQL_EQUIPOS, [id]),
//       pool.query(SQL_VENTAS, [id]),
//     ]);

//     const equiposRows = equiposResp.rows || [];
//     const ventasRows = ventasResp.rows || [];

//     // Si no hay nada, devolvemos 404
//     if (equiposRows.length === 0 && ventasRows.length === 0) {
//       return res.status(404).json({ error: "No se encontró historial para este cliente." });
//     }

//     // cliente_id consistente
//     const cliente_id = equiposRows[0]?.cliente_id ?? ventasRows[0]?.cliente_id ?? id;

//     // =========================
//     // ARMAR EQUIPOS (tu misma lógica)
//     // =========================
//     const ts = (d) => (d ? new Date(d).getTime() : -Infinity);

//     const equiposMap = {};
//     for (const r of equiposRows) {
//       if (!equiposMap[r.equipo_id]) {
//         equiposMap[r.equipo_id] = {
//           equipo_id: r.equipo_id,
//           tipo: r.tipo,
//           marca: r.marca,
//           modelo: r.modelo,
//           problema: r.problema,
//           ingresos: {},
//           _maxFecha: -Infinity,
//         };
//       }

//       if (r.ingreso_id) {
//         if (!equiposMap[r.equipo_id].ingresos[r.ingreso_id]) {
//           equiposMap[r.equipo_id].ingresos[r.ingreso_id] = {
//             ingreso_id: r.ingreso_id,
//             fecha_ingreso: r.fecha_ingreso,
//             fecha_egreso: r.fecha_egreso,
//             estado: { id: r.estado_ingreso_id, nombre: r.estado_ingreso_nombre },
//             presupuestos: [],
//           };
//         }

//         const fi = ts(r.fecha_ingreso);
//         if (fi > equiposMap[r.equipo_id]._maxFecha) equiposMap[r.equipo_id]._maxFecha = fi;

//         if (r.presupuesto_id) {
//           equiposMap[r.equipo_id].ingresos[r.ingreso_id].presupuestos.push({
//             presupuesto_id: r.presupuesto_id,
//             fecha: r.fecha_presupuesto,
//             costo: r.costo,
//             total: r.total,
//             observaciones: r.observaciones,
//             estado: { id: r.estado_presupuesto_id, nombre: r.estado_presupuesto_nombre },
//           });
//         }
//       }
//     }

//     const equipos = Object.values(equiposMap)
//       .map((eq) => {
//         const ingresosOrdenados = Object.values(eq.ingresos)
//           .map((ing) => ({
//             ...ing,
//             presupuestos: [...ing.presupuestos].sort((a, b) => ts(b.fecha) - ts(a.fecha)),
//           }))
//           .sort((a, b) => ts(b.fecha_ingreso) - ts(a.fecha_ingreso));

//         return {
//           equipo_id: eq.equipo_id,
//           tipo: eq.tipo,
//           marca: eq.marca,
//           modelo: eq.modelo,
//           problema: eq.problema,
//           ingresos: ingresosOrdenados,
//           _maxFecha: eq._maxFecha,
//         };
//       })
//       .sort((a, b) => b._maxFecha - a._maxFecha)
//       .map(({ _maxFecha, ...rest }) => rest);

//     // =========================
//     // ARMAR VENTAS (venta -> detalles[])
//     // =========================
//     const ventasMap = {};

//     for (const r of ventasRows) {
//       if (!ventasMap[r.venta_id]) {
//         ventasMap[r.venta_id] = {
//           venta_id: r.venta_id,
//           fecha: r.fecha_venta,
//           total: r.total,
//           monto_abonado: r.monto_abonado,
//           saldo: r.saldo,
//           canal: r.canal,
//           estado: {
//             id: r.estado_venta_id ?? null,
//             nombre: r.estado_venta_nombre ?? null,
//           },
//           cupon: r.cupon_id
//             ? {
//                 id: r.cupon_id,
//                 codigo: r.cupon_codigo ?? null,
//                 descuento_porcentaje: r.cupon_descuento_porcentaje ?? null,
//                 descuento_monto: r.cupon_descuento_monto ?? null,
//               }
//             : null,
//           detalles: [],
//         };
//       }

//       if (r.detalle_venta_id) {
//         ventasMap[r.venta_id].detalles.push({
//           detalle_venta_id: r.detalle_venta_id,
//           producto_id: r.producto_id,
//           producto_nombre: r.producto_nombre ?? null,
//           cantidad: r.cantidad,
//           precio_unitario: r.precio_unitario,
//           subtotal: r.subtotal,
//         });
//       }
//     }

//     const ventas = Object.values(ventasMap).sort((a, b) => ts(b.fecha) - ts(a.fecha));

//     return res.json({ cliente_id, equipos, ventas });
//   } catch (error) {
//     console.error("Error en getHistorialClienteByClienteId:", error);
//     return res.status(500).json({ error: "Error al obtener historial del cliente" });
//   }
// };
// ;

import { supabase } from '../config/supabase.js';

// Helper para convertir fechas a timestamp para ordenamiento


export const getHistorialCliente = async (req, res) => {
  try {
    const { equipoId } = req.params;
    const id = Number(equipoId);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'equipoId inválido' });
    }

    // 1. Obtenemos el cliente_id de ese equipo primero
    const { data: equipoBase, error: errBase } = await supabase
      .from('equipo')
      .select('cliente_id')
      .eq('id', id)
      .single();

    if (errBase || !equipoBase) {
      return res.status(404).json({ error: 'No se encontró el equipo.' });
    }

    const clienteId = equipoBase.cliente_id;

    // 2. Traemos todos los equipos de ese cliente con sus relaciones
    const { data: equiposRows, error: errEquipos } = await supabase
      .from('equipo')
      .select(`
        id, tipo, marca, modelo, problema, cliente_id,
        ingreso (
          id, fecha_ingreso, fecha_egreso,
          estado:estado_id (id, nombre),
          presupuesto (
            id, fecha, costo, total, observaciones,
            estado:estado_id (id, nombre)
          )
        )
      `)
      .eq('cliente_id', clienteId);

    if (errEquipos) throw errEquipos;

    // 3. Formatear y ordenar los datos (Misma lógica original)
    const equipos = equiposRows.map(eq => {
      let maxFecha = -Infinity;

      const ingresosOrdenados = (eq.ingreso || []).map(ing => {
        const fi = ts(ing.fecha_ingreso);
        if (fi > maxFecha) maxFecha = fi;

        return {
          ingreso_id: ing.id,
          fecha_ingreso: ing.fecha_ingreso,
          fecha_egreso: ing.fecha_egreso,
          estado: ing.estado,
          presupuestos: (ing.presupuesto || []).map(p => ({
            presupuesto_id: p.id,
            fecha: p.fecha,
            costo: p.costo,
            total: p.total,
            observaciones: p.observaciones,
            estado: p.estado
          })).sort((a, b) => ts(b.fecha) - ts(a.fecha))
        };
      }).sort((a, b) => ts(b.fecha_ingreso) - ts(a.fecha_ingreso));

      return {
        equipo_id: eq.id,
        tipo: eq.tipo,
        marca: eq.marca,
        modelo: eq.modelo,
        problema: eq.problema,
        ingresos: ingresosOrdenados,
        _maxFecha: maxFecha
      };
    }).sort((a, b) => b._maxFecha - a._maxFecha)
      .map(({ _maxFecha, ...rest }) => rest);

    return res.json({
      cliente_id: clienteId,
      equipos,
    });

  } catch (error) {
    console.error('Error en getHistorialCliente:', error.message);
    return res.status(500).json({ error: 'Error al obtener historial' });
  }
};

// export const getHistorialClienteByClienteId = async (req, res) => {
//   try {
//     const { clienteId } = req.params;
//     const id = Number(clienteId);

//     if (!Number.isFinite(id)) {
//       return res.status(400).json({ error: "clienteId inválido" });
//     }

//     // Ejecutamos ambas consultas en paralelo usando el cliente de Supabase
//     const [equiposResp, ventasResp] = await Promise.all([
//       supabase
//         .from('equipo')
//         .select(`
//           id, tipo, marca, modelo, problema, cliente_id,
//           ingreso (
//             id, fecha_ingreso, fecha_egreso,
//             estado:estado_id (id, nombre),
//             presupuesto (
//               id, fecha, costo, total, observaciones,
//               estado:estado_id (id, nombre)
//             )
//           )
//         `)
//         .eq('cliente_id', id),
      
//       supabase
//         .from('venta')
//         .select(`
//           id, fecha, total, monto_abonado, saldo, canal,
//           estado:estado_id (id, nombre),
//           cupon:cupon_id (id, codigo, descuento_porcentaje, descuento_monto),
//           detalle_venta (
//             id, producto_id, cantidad, precio_unitario, subtotal,
//             producto:producto_id (nombre)
//           )
//         `)
//         .eq('cliente_id', id)
//     ]);

//     if (equiposResp.error) throw equiposResp.error;
//     if (ventasResp.error) throw ventasResp.error;

//     // --- PROCESAR EQUIPOS ---
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

//     // --- PROCESAR VENTAS ---
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
//         producto_nombre: dv.producto?.nombre || null,
//         cantidad: dv.cantidad,
//         precio_unitario: dv.precio_unitario,
//         subtotal: dv.subtotal
//       }))
//     })).sort((a, b) => ts(b.fecha) - ts(a.fecha));

//     if (equipos.length === 0 && ventas.length === 0) {
//       return res.status(404).json({ error: "No se encontró historial." });
//     }

//     return res.json({ cliente_id: id, equipos, ventas });

//   } catch (error) {
//     console.error("Error en getHistorialClienteByClienteId:", error.message);
//     return res.status(500).json({ error: "Error al obtener historial" });
//   }
// };

// Función auxiliar para convertir fechas a timestamp (para ordenamiento)





const ts = (d) => (d ? new Date(d).getTime() : -Infinity);

export const getHistorialClienteByClienteId = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const id = Number(clienteId);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "clienteId inválido" });
    }

    // 1. Ejecutamos ambas consultas en paralelo
    const [equiposResp, ventasResp] = await Promise.all([
      // CONSULTA DE EQUIPOS E INGRESOS
      supabase
        .from('equipo')
        .select(`
          id, tipo, marca, modelo, problema, cliente_id,
          ingreso (
            id, fecha_ingreso, fecha_egreso,
            estado:estado!estado_id (id, nombre),
            presupuesto (
              id, fecha, costo, total, observaciones,
              estado:estado!estado_id (id, nombre)
            )
          )
        `)
        .eq('cliente_id', id),
      
      // CONSULTA DE VENTAS Y DETALLES
      supabase
        .from('venta')
        .select(`
          id, fecha, total, monto_abonado, saldo, canal,
          estado:estado!estado_id (id, nombre),
          cupon:cupon_id (id, codigo, descuento_porcentaje, descuento_monto),
          detalle_venta (
            id, producto_id, cantidad, precio_unitario, subtotal,
            producto:producto!producto_id ( nombre ) 
          )
        `)
        .eq('cliente_id', id)
    ]);

    // Verificar errores de Supabase
    if (equiposResp.error) throw equiposResp.error;
    if (ventasResp.error) throw ventasResp.error;

    // 2. PROCESAR Y FORMATEAR EQUIPOS
    const equipos = (equiposResp.data || []).map(eq => {
      let maxFecha = -Infinity;
      
      const ingresos = (eq.ingreso || []).map(ing => {
        const fi = ts(ing.fecha_ingreso);
        if (fi > maxFecha) maxFecha = fi;
        
        return {
          ingreso_id: ing.id,
          fecha_ingreso: ing.fecha_ingreso,
          fecha_egreso: ing.fecha_egreso,
          estado: ing.estado,
          presupuestos: (ing.presupuesto || []).map(p => ({
            presupuesto_id: p.id,
            fecha: p.fecha,
            costo: p.costo,
            total: p.total,
            observaciones: p.observaciones,
            estado: p.estado
          })).sort((a, b) => ts(b.fecha) - ts(a.fecha))
        };
      }).sort((a, b) => ts(b.fecha_ingreso) - ts(a.fecha_ingreso));

      return {
        equipo_id: eq.id,
        tipo: eq.tipo,
        marca: eq.marca,
        modelo: eq.modelo,
        problema: eq.problema,
        ingresos,
        _maxFecha: maxFecha
      };
    }).sort((a, b) => b._maxFecha - a._maxFecha)
      .map(({ _maxFecha, ...rest }) => rest);

    // 3. PROCESAR Y FORMATEAR VENTAS
    const ventas = (ventasResp.data || []).map(v => ({
      venta_id: v.id,
      fecha: v.fecha,
      total: v.total,
      monto_abonado: v.monto_abonado,
      saldo: v.saldo,
      canal: v.canal,
      estado: v.estado,
      cupon: v.cupon,
      detalles: (v.detalle_venta || []).map(dv => ({
        detalle_venta_id: dv.id,
        producto_id: dv.producto_id,
        producto_nombre: dv.producto?.nombre || "Producto no encontrado",
        cantidad: dv.cantidad,
        precio_unitario: dv.precio_unitario,
        subtotal: dv.subtotal
      }))
    })).sort((a, b) => ts(b.fecha) - ts(a.fecha));

    // 4. RESPUESTA FINAL
    if (equipos.length === 0 && ventas.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "No se encontró historial para este cliente." 
      });
    }

    return res.json({ 
      success: true,
      cliente_id: id, 
      equipos, 
      ventas 
    });

  } catch (error) {
    console.error("❌ Error en getHistorialClienteByClienteId:", error.message || error);
    return res.status(500).json({ 
      success: false,
      error: "Error al obtener historial",
      details: error.message 
    });
  }
};