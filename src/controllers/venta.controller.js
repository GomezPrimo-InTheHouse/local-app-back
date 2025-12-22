

import { supabase } from "../config/supabase.js";
import { updateProducto } from "./producto/producto.controller.js";


// ✅ Crear una nueva venta el que utilizo 21/12
export const createVenta = async (req, res) => {
  const { cliente_id, detalle_venta, monto_abonado } = req.body;

  console.log('createVenta body:', req.body);
  try {
    // 1️⃣ Calcular total y saldo
    let totalVenta = 0;
    for (const detalle of detalle_venta) {
      const { cantidad, precio_unitario } = detalle;
      totalVenta += Number(cantidad) * Number(precio_unitario);
    }
    const saldoVenta = totalVenta - (Number(monto_abonado) || 0);

    // 2️⃣ Insertar venta principal
    const { data: venta, error: ventaError } = await supabase
      .from("venta")
      .insert([
        {
          fecha: new Date(),
          total: totalVenta,
          monto_abonado: Number(monto_abonado) || 0,
          saldo: saldoVenta,
          cliente_id,
        },
      ])
      .select()
      .single();

    if (ventaError) throw ventaError;

    // 3️⃣ Insertar detalles de la venta
    const detallesInsert = detalle_venta.map((d) => ({
      venta_id: venta.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      subtotal: Number(d.cantidad) * Number(d.precio_unitario),
    }));

    const { error: detalleError } = await supabase
      .from("detalle_venta")
      .insert(detallesInsert);

    if (detalleError) throw detalleError;

    res.status(201).json({ success: true, data: venta });
  } catch (error) {
    console.error("Error en createVenta:", error.message);
    res.status(500).json({ success: false, error: "Error al crear la venta" });
  }
};


// ✅ Obtener todas las ventas con detalles where estado_id = 19
// ✅ Obtener todas las ventas con detalles where estado_id = 19, incluyendo costo del producto
// export const getVentas = async (req, res) => {
//   try {
//     const { data, error } = await supabase
//       .from("venta")
//       .select(`
//         id,
//         fecha,
//         total,
//         monto_abonado,
//         saldo,
//         canal,
//         cliente:cliente_id (
//           id,
//           nombre,
//           apellido
//         ),
//         detalle_venta (
//           id,
//           producto_id,
//           cantidad,
//           precio_unitario,
//           subtotal,
//           producto:producto_id (
//             id,
//             nombre,
//             costo
//           )
//         )
//       `)
//       .eq("estado_id", 19) // solo activas
//       .order("fecha", { ascending: false });

//     if (error) throw error;

//     res.status(200).json({ success: true, data });
//   } catch (error) {
//     console.error("Error en getVentas:", error.message);
//     res.status(500).json({ success: false, error: "Error al obtener ventas" });
//   }
// };

//nuevo getVentas con filtro por canal de venta
// controllers/ventaController.js (o donde lo tengas definido)

// export const getVentas = async (req, res) => {
//   try {
//     const { canal } = req.query; // "local", "web_shop" o "todos" (opcional)

//     // ✅ Solo traemos cupón si el resultado puede traer ventas web
//     const includeCupon = !canal || canal === "web_shop" || canal === "todos";

//     const baseSelect = `
//       id,
//       fecha,
//       total,
//       monto_abonado,
//       saldo,
//       canal,
//       cliente:cliente_id (
//         id,
//         nombre,
//         apellido,
//         dni,
//         email
//       ),
//       detalle_venta (
//         id,
//         producto_id,
//         cantidad,
//         precio_unitario,
//         subtotal,
//         producto:producto_id (
//           id,
//           nombre,
//           costo
//         )
//       )
//     `;

//     const selectWithOptionalCupon = includeCupon
//       ? `${baseSelect},
//          cupon:cupon_id (
//            id,
//            codigo,
//            descripcion,
//            descuento_porcentaje,
//            descuento_monto
//          )`
//       : baseSelect;

//     let query = supabase
//       .from("venta")
//       .select(selectWithOptionalCupon)
//       .in("estado_id", [19, 26])
//       .order("saldo", { ascending: false })
//      .order("fecha", { ascending: false });

//     if (canal && canal !== "todos") {
//       query = query.eq("canal", canal);
//     }

//     const { data, error } = await query;

//     if (error) {
//       console.error("Supabase error getVentas:", error);
//       return res
//         .status(500)
//         .json({ success: false, error: "Error Supabase al obtener ventas" });
//     }

//     // ✅ Calcular descuento real SOLO para web_shop
//     const enriched = (data || []).map((v) => {
//       const detalles = Array.isArray(v.detalle_venta) ? v.detalle_venta : [];
//       const total = Number(v.total) || 0;

//       let subtotal_items = 0;
//       let descuento_real = 0;

//       if (v.canal === "web_shop") {
//         subtotal_items = detalles.reduce((acc, d) => {
//           const st =
//             Number(d.subtotal) ||
//             (Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0);
//           return acc + st;
//         }, 0);

//         descuento_real = Math.max(0, subtotal_items - total);
//       }

//       return {
//         ...v,
//         subtotal_items,
//         descuento_real,
//         cupon: v.canal === "web_shop" ? (v.cupon ?? null) : null,
//       };
//     });

//     return res.status(200).json({ success: true, data: enriched });
//   } catch (error) {
//     console.error("Error en getVentas:", error?.message || error);
//     return res
//       .status(500)
//       .json({ success: false, error: "Error al obtener ventas" });
//   }
// };



const formatVentaDate = (dateString) => {
    try {
        const fechaUTC = new Date(dateString);
        if (isNaN(fechaUTC.getTime())) return dateString; 

        // Configuración para el formato y la zona horaria
        const formatter = new Intl.DateTimeFormat('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false, // Formato 24 horas
            timeZone: 'America/Argentina/Buenos_Aires', // 🎯 Zona horaria deseada
        });

        const partes = formatter.formatToParts(fechaUTC);
        
        // Reconstrucción manual para asegurar el formato YYYY-MM-DD HH:MM:SS
        const year = partes.find(p => p.type === 'year')?.value;
        const month = partes.find(p => p.type === 'month')?.value;
        const day = partes.find(p => p.type === 'day')?.value;
        const hour = partes.find(p => p.type === 'hour')?.value;
        const minute = partes.find(p => p.type === 'minute')?.value;
        const second = partes.find(p => p.type === 'second')?.value;

        // Devuelve la cadena formateada, asegurando que todas las partes existen
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    } catch (e) {
        // En caso de error, devolvemos la cadena original
        console.error("Error en formato de fecha con Intl:", e);
        return dateString; 
    }
};


/**
 * @description Obtiene una lista de ventas con detalles, ordenadas por saldo pendiente y fecha.
 */
export const getVentas = async (req, res) => {
  const canalQuery = req.query.canal; 

  // --- 1. Validación de Inputs ---
  const canalesValidos = ["local", "web_shop", "todos", undefined];
  if (canalQuery && !canalesValidos.includes(canalQuery)) {
    return res.status(400).json({
      success: false,
      error: `Valor de 'canal' inválido. Debe ser 'local', 'web_shop' o 'todos'.`,
    });
  }
  
  const canal = canalQuery === 'todos' ? undefined : canalQuery; 
  
  try {
    // --- 2. Construcción de Query a Supabase ---
    const includeCupon = !canal || canal === "web_shop";

    const baseSelect = `
      id,
      fecha,
      total,
      monto_abonado,
      saldo,
      canal,
      cliente:cliente_id (
        id,
        nombre,
        apellido,
        dni,
        email
      ),
      detalle_venta (
        id,
        producto_id,
        cantidad,
        precio_unitario,
        subtotal,
        producto:producto_id (
          id,
          nombre,
          costo
        )
      )
    `;

    const selectStatement = includeCupon
      ? `${baseSelect}, cupon:cupon_id (id, codigo, descripcion, descuento_porcentaje, descuento_monto)`
      : baseSelect;

    let query = supabase
      .from("venta")
      .select(selectStatement)
      .in("estado_id", [19, 26]) // Estados: Saldada, Pendiente de Pago
      .order("saldo", { ascending: false }) 
      .order("fecha", { ascending: false });

    if (canal) {
      query = query.eq("canal", canal);
    }

    // --- 3. Ejecución de Query ---
    const { data, error } = await query;

    if (error) {
      console.error("Supabase error getVentas:", error);
      return res
        .status(500)
        .json({ success: false, error: "Error de infraestructura al obtener ventas" });
    }

    // --- 4. Post-procesamiento y Enriquecimiento de Datos ---
    const enriched = (data || []).map((v) => {
      const detalles = Array.isArray(v.detalle_venta) ? v.detalle_venta : [];
      const total = Number(v.total) || 0;

      let subtotal_items = 0;
      let descuento_real = 0;

      // Cálculo de subtotal y descuento real (Web Shop)
      if (v.canal === "web_shop") {
        subtotal_items = detalles.reduce((acc, d) => {
          const cantidad = Number(d.cantidad) || 0;
          const precio_unitario = Number(d.precio_unitario) || 0;
          const subtotal_d = Number(d.subtotal) || (cantidad * precio_unitario); 
          return acc + subtotal_d;
        }, 0);

        descuento_real = Math.max(0, subtotal_items - total);
      }
      
      return {
        ...v,
        // ✅ Uso de la función sin dependencia externa
        fecha: formatVentaDate(v.fecha), 
        subtotal_items: subtotal_items, 
        descuento_real: descuento_real, 
        cupon: v.canal === "web_shop" ? (v.cupon ?? null) : null,
      };
    });

    // --- 5. Respuesta Exitosa ---
    return res.status(200).json({ success: true, data: enriched });
    
  } catch (error) {
    // --- 6. Manejo de Errores Críticos ---
    console.error("Error crítico en getVentas:", error?.message || error);
    return res
      .status(500)
      .json({ success: false, error: "Error interno del servidor al procesar la solicitud" });
  }
};





// ✅ Obtener una venta por ID
export const getVentaById = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("venta")
      .select(`
        id, fecha, total, monto_abonado, saldo,
        cliente:cliente_id (id, nombre, apellido),
        detalle_venta (
          id, cantidad, precio_unitario, subtotal,
          producto:producto_id (id, nombre)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en getVentaById:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener venta" });
  }
};


// ✅ Eliminar venta cambiando a estado_id = 20 (inactivo)


export const deleteVenta = async (req, res) => {
  const { id } = req.params;

  try {
    // 1️⃣ Obtener detalles de la venta
    const { data: detalles, error: detalleFetchError } = await supabase
      .from("detalle_venta")
      .select("producto_id, cantidad")
      .eq("venta_id", id)
      .eq("estado_id", 19); // solo los activos

    if (detalleFetchError) throw detalleFetchError;

    if (!detalles || detalles.length === 0) {
     return res.status(200).json({ success: true, message: "Venta ya estaba dada de baja o sin detalles activos" });


      // return res.status(404).json({ error: "No se encontraron detalles de la venta." });
    }

    // 2️⃣ Restaurar stock de cada producto
    for (const detalle of detalles) {
      try {
        // const url = `http://localhost:7001/producto/${detalle.producto_id}`; // ajustá el host/puerto/basepath
        // console.log("Llamando a:", url);
        // console.log("Payload:", { cantidad: detalle.cantidad, operacion: "incrementar" });

        // await axios.put(
        //   url, // ajustá el host/puerto/basepath
        //   { cantidad: detalle.cantidad, operacion: "incrementar" } // 🚨 convención: que updateProducto interprete operacion
        // );

        // Usar la función interna para evitar llamada HTTP
        await updateProducto(
          { params: { id: detalle.producto_id }, body: { cantidad: detalle.cantidad, operacion: "incrementar" } },
          { status: () => ({ json: () => { } }) } // mock res
        );
      } catch (stockError) {
        console.error(
          `Error al actualizar stock del producto ${detalle.producto_id}:`,
          stockError.message
        );
      }
    }

    // 3️⃣ Marcar los detalles como CANCELADOS - id = 28 (antes estaba el id 20)
    const { error: detalleError } = await supabase
      .from("detalle_venta")
      .update({ estado_id: 28 }) // Estado "CANCELADO"
      .eq("venta_id", id);

    if (detalleError) throw detalleError;

    // 4️⃣ Marcar la venta como inactiva
    const { error: ventaError } = await supabase
      .from("venta")
      .update({ estado_id: 28 }) // Estado "CANCELADO"
      .eq("id", id);

    if (ventaError) throw ventaError;

    res.json({ success: true, message: "Venta dada de baja correctamente y stock restaurado" });
  } catch (error) {
    console.error("Error en deleteVenta:", error.message);
    res.status(500).json({ success: false, error: "Error al dar de baja la venta" });
  }
};


// controllers/venta.controller.js






// export const updateVenta = async (req, res) => {
//   const ventaId = Number(req.params.id);
//   const { cliente_id, detalles = [], monto_abonado } = req.body || {};

//   if (!Number.isInteger(ventaId)) {
//     return res.status(400).json({ success: false, error: 'ID de venta inválido' });
//   }

//   const nextDetails = Array.isArray(detalles) ? detalles : [];

//   const client = await pool.connect();
//   try {
//     // ====== INICIO TRANSACCIÓN ======
//     await client.query('BEGIN');

//     // 1) Verificar/bloquear cabecera
//     const lockVenta = await client.query(
//       `SELECT id FROM venta WHERE id = $1::int FOR UPDATE`,
//       [ventaId]
//     );
//     if (lockVenta.rowCount === 0) {
//       throw new Error(`La venta ${ventaId} no existe`);
//     }

//     // 2) Traer detalles actuales
//     const curr = await client.query(
//       `SELECT id, producto_id, cantidad, precio_unitario, subtotal
//          FROM detalle_venta
//         WHERE venta_id = $1::int
//         ORDER BY id`,
//       [ventaId]
//     );
//     const currentDetails = curr.rows;

//     const currentById = new Map(currentDetails.map(d => [String(d.id), d]));
//     const nextById = new Map(nextDetails.filter(d => d.id != null).map(d => [String(d.id), d]));

//     // 3) Calcular diffs
//     const toInsert = [];
//     const toUpdate = [];
//     const toDelete = [];

//     // INSERTS: items sin id
//     for (const d of nextDetails) {
//       if (d.id == null) {
//         if (!Number.isInteger(d.producto_id)) throw new Error('producto_id (int) requerido en item nuevo');
//         const c = Number(d.cantidad);
//         if (!Number.isFinite(c) || c <= 0) throw new Error('cantidad inválida en item nuevo');

//         toInsert.push({
//           producto_id: Number(d.producto_id),
//           cantidad: c,
//           precio_unitario: d.precio_unitario ?? null, // si es null, tomamos producto.precio
//         });
//       }
//     }

//     // UPDATES: items con id donde cambió algo
//     for (const [detId, oldRow] of currentById.entries()) {
//       if (nextById.has(detId)) {
//         const newRow = nextById.get(detId);

//         const oldCantidad = Number(oldRow.cantidad) || 0;
//         const newCantidad = Number(newRow.cantidad) || 0;
//         const qty_delta = newCantidad - oldCantidad;

//         const oldProd = Number(oldRow.producto_id);
//         const newProd = Number(newRow.producto_id ?? oldProd);

//         const precio_unitario =
//           newRow.precio_unitario != null ? Number(newRow.precio_unitario) : (oldRow.precio_unitario ?? null);

//         const productChanged = newProd !== oldProd;
//         const anyFieldChanged =
//           productChanged || qty_delta !== 0 ||
//           (precio_unitario ?? null) !== (oldRow.precio_unitario ?? null);

//         if (anyFieldChanged) {
//           toUpdate.push({
//             id: Number(detId),
//             old_producto_id: oldProd,
//             new_producto_id: newProd,
//             old_cantidad: oldCantidad,
//             new_cantidad: newCantidad,
//             qty_delta,
//             precio_unitario,
//           });
//         }
//       }
//     }

//     // DELETES: detalles que estaban y ya no
//     for (const [detId, oldRow] of currentById.entries()) {
//       if (!nextById.has(detId)) {
//         toDelete.push({
//           id: Number(detId),
//           producto_id: Number(oldRow.producto_id),
//           cantidad: Number(oldRow.cantidad) || 0,
//         });
//       }
//     }

//     // 4) Actualizar cabecera si vino algo
//     if (cliente_id != null || monto_abonado != null) {
//       await client.query(
//         `UPDATE venta
//             SET cliente_id    = COALESCE($2::int, cliente_id),
//                 monto_abonado = COALESCE($3::numeric, monto_abonado)
//           WHERE id = $1::int`,
//         [ventaId, cliente_id, monto_abonado]
//       );
//     }

//     // 5) Aplicar diffs (orden seguro)

//     // 5.a) DELETES → devolver stock y borrar detalle
//     for (const item of toDelete) {
//       const { id: detId, producto_id, cantidad } = item;

//       if (cantidad > 0) {
//         await client.query(
//           `UPDATE producto
//               SET stock = stock + $2::int
//             WHERE id = $1::int`,
//           [producto_id, cantidad]
//         );
//       }

//       await client.query(
//         `DELETE FROM detalle_venta
//           WHERE id = $1::int AND venta_id = $2::int`,
//         [detId, ventaId]
//       );
//     }

//     // 5.b) UPDATES → mover o ajustar delta y actualizar fila
//     for (const u of toUpdate) {
//       const {
//         id: detId,
//         old_producto_id,
//         new_producto_id,
//         old_cantidad,
//         new_cantidad,
//         qty_delta,
//         precio_unitario,
//       } = u;

//       if (new_producto_id !== old_producto_id) {
//         // Mover: devolver todo al viejo, descontar todo del nuevo (con validación)
//         if (old_cantidad > 0) {
//           await client.query(
//             `UPDATE producto SET stock = stock + $2::int WHERE id = $1::int`,
//             [old_producto_id, old_cantidad]
//           );
//         }

//         if (new_cantidad > 0) {
//           const updNew = await client.query(
//             `UPDATE producto
//                 SET stock = stock - $2::int
//               WHERE id = $1::int
//                 AND stock >= $2::int`,
//             [new_producto_id, new_cantidad]
//           );
//           if (updNew.rowCount === 0) {
//             throw new Error(`Stock insuficiente para producto ${new_producto_id} (requiere ${new_cantidad})`);
//           }
//         }
//       } else if (qty_delta !== 0) {
//         // Mismo producto: ajustar solo delta
//         if (qty_delta > 0) {
//           const upd = await client.query(
//             `UPDATE producto
//                 SET stock = stock - $2::int
//               WHERE id = $1::int
//                 AND stock >= $2::int`,
//             [new_producto_id, qty_delta]
//           );
//           if (upd.rowCount === 0) {
//             throw new Error(`Stock insuficiente para producto ${new_producto_id} (delta ${qty_delta})`);
//           }
//         } else {
//           await client.query(
//             `UPDATE producto
//                 SET stock = stock + $2::int
//               WHERE id = $1::int`,
//             [new_producto_id, Math.abs(qty_delta)]
//           );
//         }
//       }

//       // Actualizar detalle (casteos explícitos para evitar 42P08)
//       await client.query(
//         `UPDATE detalle_venta
//             SET producto_id     = $2::int,
//                 cantidad        = $3::int,
//                 precio_unitario = $4::numeric,
//                 subtotal        = ($3::numeric * COALESCE($4::numeric, 0::numeric))
//           WHERE id = $1::int
//             AND venta_id = $5::int`,
//         [detId, new_producto_id, new_cantidad, precio_unitario, ventaId]
//       );
//     }

//     // 5.c) INSERTS → descontar stock y crear detalle
//     for (const ins of toInsert) {
//       const { producto_id, cantidad } = ins;

//       // Descontar stock con validación
//       const upd = await client.query(
//         `UPDATE producto
//             SET stock = stock - $2::int
//           WHERE id = $1::int
//             AND stock >= $2::int`,
//         [producto_id, cantidad]
//       );
//       if (upd.rowCount === 0) {
//         throw new Error(`Stock insuficiente para producto ${producto_id} (requiere ${cantidad})`);
//       }

//       // Tomar precio por defecto si no vino
//       let precio_unit = ins.precio_unitario;
//       if (precio_unit == null) {
//         const pr = await client.query(`SELECT precio FROM producto WHERE id = $1::int`, [producto_id]);
//         if (pr.rowCount === 0) throw new Error(`Producto ${producto_id} inexistente`);
//         // producto.precio es DECIMAL -> usar como NUMERIC
//         precio_unit = Number(pr.rows[0].precio) || 0;
//       }

//       await client.query(
//         `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal)
//          VALUES ($1::int, $2::int, $3::int, $4::numeric, ($3::numeric * COALESCE($4::numeric, 0::numeric)))`,
//         [ventaId, producto_id, cantidad, precio_unit]
//       );
//     }

//     // 6) Recalcular total y saldo (ambos NUMERIC)
//     const recalc = await client.query(
//       `WITH t AS (
//          SELECT COALESCE(SUM(subtotal), 0::numeric) AS total
//            FROM detalle_venta
//           WHERE venta_id = $1::int
//        )
//        UPDATE venta v
//           SET total = t.total,
//               saldo = t.total - COALESCE(v.monto_abonado::numeric, 0::numeric)
//          FROM t
//         WHERE v.id = $1::int
//         RETURNING v.id, v.cliente_id, v.monto_abonado, v.total, v.saldo`,
//       [ventaId]
//     );

//     // Detalles finales para respuesta
//     const detFinal = await client.query(
//       `SELECT id, producto_id, cantidad, precio_unitario, subtotal
//          FROM detalle_venta
//         WHERE venta_id = $1::int
//         ORDER BY id`,
//       [ventaId]
//     );

//     // ====== COMMIT ======
//     await client.query('COMMIT');

//     return res.status(200).json({
//       success: true,
//       data: {
//         venta: recalc.rows[0],
//         detalles: detFinal.rows,
//       },
//     });
//   } catch (err) {
//     try { await client.query('ROLLBACK'); } catch {}
//     console.error('Error en updateVenta (SQL):', err);
//     return res.status(500).json({ success: false, error: err.message || 'Error al actualizar venta' });
//   } finally {
//     client.release();
//   }
// };

// export const updateVenta = async (req, res) => {
//   const ventaId = Number(req.params.id);

//   if (!Number.isInteger(ventaId)) {
//     return res.status(400).json({ success: false, error: "ID de venta inválido" });
//   }

//   // ✅ soporta payload plano y payload web { venta: {...}, detalles: [...] }
//   const body = req.body || {};
//   const ventaBody = body.venta && typeof body.venta === "object" ? body.venta : {};

//   const cliente_id =
//     body.cliente_id != null ? Number(body.cliente_id) :
//     ventaBody.cliente_id != null ? Number(ventaBody.cliente_id) :
//     null;

//   const monto_abonado =
//     body.monto_abonado != null ? body.monto_abonado :
//     ventaBody.monto_abonado != null ? ventaBody.monto_abonado :
//     null;

//   const detalles = Array.isArray(body.detalles) ? body.detalles : [];
//   const nextDetails = detalles;

//   const client = await pool.connect();
//   try {
//     // ====== INICIO TRANSACCIÓN ======
//     await client.query('BEGIN');

//     // 1) Verificar/bloquear cabecera
//     const lockVenta = await client.query(
//       `SELECT id FROM venta WHERE id = $1::int FOR UPDATE`,
//       [ventaId]
//     );
//     if (lockVenta.rowCount === 0) {
//       throw new Error(`La venta ${ventaId} no existe`);
//     }

//     // 2) Traer detalles actuales
//     const curr = await client.query(
//       `SELECT id, producto_id, cantidad, precio_unitario, subtotal
//          FROM detalle_venta
//         WHERE venta_id = $1::int
//         ORDER BY id`,
//       [ventaId]
//     );
//     const currentDetails = curr.rows;

//     const currentById = new Map(currentDetails.map(d => [String(d.id), d]));
//     const nextById = new Map(nextDetails.filter(d => d.id != null).map(d => [String(d.id), d]));

//     // 3) Calcular diffs
//     const toInsert = [];
//     const toUpdate = [];
//     const toDelete = [];

//     // INSERTS: items sin id
//     for (const d of nextDetails) {
//       if (d.id == null) {
//         if (!Number.isInteger(d.producto_id)) throw new Error('producto_id (int) requerido en item nuevo');
//         const c = Number(d.cantidad);
//         if (!Number.isFinite(c) || c <= 0) throw new Error('cantidad inválida en item nuevo');

//         toInsert.push({
//           producto_id: Number(d.producto_id),
//           cantidad: c,
//           precio_unitario: d.precio_unitario ?? null, // si es null, tomamos producto.precio
//         });
//       }
//     }

//     // UPDATES: items con id donde cambió algo
//     for (const [detId, oldRow] of currentById.entries()) {
//       if (nextById.has(detId)) {
//         const newRow = nextById.get(detId);

//         const oldCantidad = Number(oldRow.cantidad) || 0;
//         const newCantidad = Number(newRow.cantidad) || 0;
//         const qty_delta = newCantidad - oldCantidad;

//         const oldProd = Number(oldRow.producto_id);
//         const newProd = Number(newRow.producto_id ?? oldProd);

//         const precio_unitario =
//           newRow.precio_unitario != null ? Number(newRow.precio_unitario) : (oldRow.precio_unitario ?? null);

//         const productChanged = newProd !== oldProd;
//         const anyFieldChanged =
//           productChanged || qty_delta !== 0 ||
//           (precio_unitario ?? null) !== (oldRow.precio_unitario ?? null);

//         if (anyFieldChanged) {
//           toUpdate.push({
//             id: Number(detId),
//             old_producto_id: oldProd,
//             new_producto_id: newProd,
//             old_cantidad: oldCantidad,
//             new_cantidad: newCantidad,
//             qty_delta,
//             precio_unitario,
//           });
//         }
//       }
//     }

//     // DELETES: detalles que estaban y ya no
//     for (const [detId, oldRow] of currentById.entries()) {
//       if (!nextById.has(detId)) {
//         toDelete.push({
//           id: Number(detId),
//           producto_id: Number(oldRow.producto_id),
//           cantidad: Number(oldRow.cantidad) || 0,
//         });
//       }
//     }

//     // 4) Actualizar cabecera si vino algo
//     if (cliente_id != null || monto_abonado != null) {
//       await client.query(
//         `UPDATE venta
//             SET cliente_id    = COALESCE($2::int, cliente_id),
//                 monto_abonado = COALESCE($3::numeric, monto_abonado)
//           WHERE id = $1::int`,
//         [ventaId, cliente_id, monto_abonado]
//       );
//     }

//     // 5) Aplicar diffs (orden seguro)

//     // 5.a) DELETES → devolver stock y borrar detalle
//     for (const item of toDelete) {
//       const { id: detId, producto_id, cantidad } = item;

//       if (cantidad > 0) {
//         await client.query(
//           `UPDATE producto
//               SET stock = stock + $2::int
//             WHERE id = $1::int`,
//           [producto_id, cantidad]
//         );
//       }

//       await client.query(
//         `DELETE FROM detalle_venta
//           WHERE id = $1::int AND venta_id = $2::int`,
//         [detId, ventaId]
//       );
//     }

//     // 5.b) UPDATES → mover o ajustar delta y actualizar fila
//     for (const u of toUpdate) {
//       const {
//         id: detId,
//         old_producto_id,
//         new_producto_id,
//         old_cantidad,
//         new_cantidad,
//         qty_delta,
//         precio_unitario,
//       } = u;

//       if (new_producto_id !== old_producto_id) {
//         // Mover: devolver todo al viejo, descontar todo del nuevo (con validación)
//         if (old_cantidad > 0) {
//           await client.query(
//             `UPDATE producto SET stock = stock + $2::int WHERE id = $1::int`,
//             [old_producto_id, old_cantidad]
//           );
//         }

//         if (new_cantidad > 0) {
//           const updNew = await client.query(
//             `UPDATE producto
//                 SET stock = stock - $2::int
//               WHERE id = $1::int
//                 AND stock >= $2::int`,
//             [new_producto_id, new_cantidad]
//           );
//           if (updNew.rowCount === 0) {
//             throw new Error(`Stock insuficiente para producto ${new_producto_id} (requiere ${new_cantidad})`);
//           }
//         }
//       } else if (qty_delta !== 0) {
//         // Mismo producto: ajustar solo delta
//         if (qty_delta > 0) {
//           const upd = await client.query(
//             `UPDATE producto
//                 SET stock = stock - $2::int
//               WHERE id = $1::int
//                 AND stock >= $2::int`,
//             [new_producto_id, qty_delta]
//           );
//           if (upd.rowCount === 0) {
//             throw new Error(`Stock insuficiente para producto ${new_producto_id} (delta ${qty_delta})`);
//           }
//         } else {
//           await client.query(
//             `UPDATE producto
//                 SET stock = stock + $2::int
//               WHERE id = $1::int`,
//             [new_producto_id, Math.abs(qty_delta)]
//           );
//         }
//       }

//       // Actualizar detalle (casteos explícitos para evitar 42P08)
//       await client.query(
//         `UPDATE detalle_venta
//             SET producto_id     = $2::int,
//                 cantidad        = $3::int,
//                 precio_unitario = $4::numeric,
//                 subtotal        = ($3::numeric * COALESCE($4::numeric, 0::numeric))
//           WHERE id = $1::int
//             AND venta_id = $5::int`,
//         [detId, new_producto_id, new_cantidad, precio_unitario, ventaId]
//       );
//     }

//     // 5.c) INSERTS → descontar stock y crear detalle
//     for (const ins of toInsert) {
//       const { producto_id, cantidad } = ins;

//       // Descontar stock con validación
//       const upd = await client.query(
//         `UPDATE producto
//             SET stock = stock - $2::int
//           WHERE id = $1::int
//             AND stock >= $2::int`,
//         [producto_id, cantidad]
//       );
//       if (upd.rowCount === 0) {
//         throw new Error(`Stock insuficiente para producto ${producto_id} (requiere ${cantidad})`);
//       }

//       // Tomar precio por defecto si no vino
//       let precio_unit = ins.precio_unitario;
//       if (precio_unit == null) {
//         const pr = await client.query(`SELECT precio FROM producto WHERE id = $1::int`, [producto_id]);
//         if (pr.rowCount === 0) throw new Error(`Producto ${producto_id} inexistente`);
//         // producto.precio es DECIMAL -> usar como NUMERIC
//         precio_unit = Number(pr.rows[0].precio) || 0;
//       }

//       await client.query(
//         `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal)
//          VALUES ($1::int, $2::int, $3::int, $4::numeric, ($3::numeric * COALESCE($4::numeric, 0::numeric)))`,
//         [ventaId, producto_id, cantidad, precio_unit]
//       );
//     }

//     // 6) Recalcular total y saldo (ambos NUMERIC)
//     const recalc = await client.query(
//       `WITH t AS (
//          SELECT COALESCE(SUM(subtotal), 0::numeric) AS total
//            FROM detalle_venta
//           WHERE venta_id = $1::int
//        )
//        UPDATE venta v
//           SET total = t.total,
//               saldo = t.total - COALESCE(v.monto_abonado::numeric, 0::numeric)
//          FROM t
//         WHERE v.id = $1::int
//         RETURNING v.id, v.cliente_id, v.monto_abonado, v.total, v.saldo`,
//       [ventaId]
//     );

//     // Detalles finales para respuesta
//     const detFinal = await client.query(
//       `SELECT id, producto_id, cantidad, precio_unitario, subtotal
//          FROM detalle_venta
//         WHERE venta_id = $1::int
//         ORDER BY id`,
//       [ventaId]
//     );

//     // ====== COMMIT ======
//     await client.query('COMMIT');

//     return res.status(200).json({
//       success: true,
//       data: {
//         venta: recalc.rows[0],
//         detalles: detFinal.rows,
//       },
//     });
//   } catch (err) {
//     try { await client.query('ROLLBACK'); } catch {}
//     console.error('Error en updateVenta (SQL):', err);
//     return res.status(500).json({ success: false, error: err.message || 'Error al actualizar venta' });
//   } finally {
//     client.release();
//   }
// };

export const updateVenta = async (req, res) => {
  const ventaId = Number(req.params.id);

  if (!Number.isInteger(ventaId)) {
    return res.status(400).json({ success: false, error: "ID de venta inválido" });
  }

  const body = req.body || {};
  const ventaBody = body.venta && typeof body.venta === "object" ? body.venta : {};

  // Normalización de datos (Idéntica a la original)
  const cliente_id = body.cliente_id != null ? Number(body.cliente_id) :
                     ventaBody.cliente_id != null ? Number(ventaBody.cliente_id) : null;
  const monto_abonado = body.monto_abonado != null ? body.monto_abonado :
                        ventaBody.monto_abonado != null ? ventaBody.monto_abonado : null;

  const nextDetails = Array.isArray(body.detalles) ? body.detalles : [];

  try {
    // 1) Verificar existencia de la venta
    const { data: ventaActual, error: errorVenta } = await supabase
      .from('venta')
      .select('id, monto_abonado')
      .eq('id', ventaId)
      .single();

    if (errorVenta || !ventaActual) throw new Error(`La venta ${ventaId} no existe`);

    // 2) Obtener detalles actuales para calcular el Diff
    const { data: currentDetails, error: errorDetalles } = await supabase
      .from('detalle_venta')
      .select('id, producto_id, cantidad, precio_unitario')
      .eq('venta_id', ventaId);

    if (errorDetalles) throw errorDetalles;

    const currentById = new Map(currentDetails.map(d => [String(d.id), d]));
    const nextById = new Map(nextDetails.filter(d => d.id != null).map(d => [String(d.id), d]));

    // --- CLASIFICACIÓN DE OPERACIONES (Diffing) ---
    const toInsert = [];
    const toUpdate = [];
    const toDelete = [];

    // Identificar INSERTS
    for (const d of nextDetails) {
      if (d.id == null) {
        toInsert.push({
          producto_id: Number(d.producto_id),
          cantidad: Number(d.cantidad),
          precio_unitario: d.precio_unitario ?? null
        });
      }
    }

    // Identificar UPDATES y DELETES
    for (const [detId, oldRow] of currentById.entries()) {
      if (nextById.has(detId)) {
        const newRow = nextById.get(detId);
        const qty_delta = (Number(newRow.cantidad) || 0) - (Number(oldRow.cantidad) || 0);
        
        if (qty_delta !== 0 || Number(newRow.producto_id) !== Number(oldRow.producto_id) || newRow.precio_unitario !== oldRow.precio_unitario) {
          toUpdate.push({ id: Number(detId), oldRow, newRow, qty_delta });
        }
      } else {
        toDelete.push(oldRow);
      }
    }

    // --- EJECUCIÓN DE CAMBIOS EN STOCK Y TABLAS ---

    // A) Procesar DELETES: Devolver stock y borrar
    for (const item of toDelete) {
      await supabase.rpc('adjust_stock', { pid: item.producto_id, delta: item.cantidad }); // +stock
      await supabase.from('detalle_venta').delete().eq('id', item.id);
    }

    // B) Procesar UPDATES: Ajustar deltas de stock
    for (const u of toUpdate) {
      const { oldRow, newRow, qty_delta } = u;

      if (Number(newRow.producto_id) !== Number(oldRow.producto_id)) {
        // Cambio de producto: Devolver stock al viejo, quitar al nuevo
        await supabase.rpc('adjust_stock', { pid: oldRow.producto_id, delta: oldRow.cantidad });
        const { error: errStock } = await supabase.rpc('adjust_stock', { pid: newRow.producto_id, delta: -newRow.cantidad });
        if (errStock) throw new Error(`Stock insuficiente para producto ${newRow.producto_id}`);
      } else if (qty_delta !== 0) {
        // Mismo producto: ajustar solo la diferencia
        const { error: errStock } = await supabase.rpc('adjust_stock', { pid: oldRow.producto_id, delta: -qty_delta });
        if (errStock) throw new Error(`Stock insuficiente para producto ${oldRow.producto_id}`);
      }

      await supabase.from('detalle_venta').update({
        producto_id: newRow.producto_id,
        cantidad: newRow.cantidad,
        precio_unitario: newRow.precio_unitario,
        subtotal: Number(newRow.cantidad) * (Number(newRow.precio_unitario) || 0)
      }).eq('id', u.id);
    }

    // C) Procesar INSERTS: Quitar stock y crear fila
    for (const ins of toInsert) {
      let precio = ins.precio_unitario;
      if (precio == null) {
        const { data: p } = await supabase.from('producto').select('precio').eq('id', ins.producto_id).single();
        precio = p?.precio || 0;
      }

      const { error: errStock } = await supabase.rpc('adjust_stock', { pid: ins.producto_id, delta: -ins.cantidad });
      if (errStock) throw new Error(`Stock insuficiente para producto ${ins.producto_id}`);

      await supabase.from('detalle_venta').insert([{
        venta_id: ventaId,
        producto_id: ins.producto_id,
        cantidad: ins.cantidad,
        precio_unitario: precio,
        subtotal: ins.cantidad * precio
      }]);
    }

    // 4) Actualizar Cabecera y Recalcular Totales
    // Primero actualizamos los campos básicos
    if (cliente_id != null || monto_abonado != null) {
      await supabase.from('venta').update({
        cliente_id: cliente_id ?? undefined,
        monto_abonado: monto_abonado ?? undefined
      }).eq('id', ventaId);
    }

    // 5) Recalcular total y saldo final (Llamamos a una pequeña función RPC para consistencia)
    const { data: ventaFinal, error: errFinal } = await supabase.rpc('recalculate_venta_totals', { vid: ventaId });
    if (errFinal) throw errFinal;

    const { data: detallesFinales } = await supabase
      .from('detalle_venta')
      .select('id, producto_id, cantidad, precio_unitario, subtotal')
      .eq('venta_id', ventaId)
      .order('id');

    return res.status(200).json({
      success: true,
      data: {
        venta: ventaFinal,
        detalles: detallesFinales,
      },
    });

  } catch (err) {
    console.error('❌ Error en updateVenta:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Error al actualizar venta' });
  }
};