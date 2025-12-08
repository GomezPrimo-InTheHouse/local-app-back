// import { pool } from "../config/db.js";

// // ✅ Crear una nueva venta
// export const createVenta = async (req, res) => {
//   const { cliente_id, detalles, monto_abonado } = req.body;

//   // if (!cliente_id || !detalles || detalles.length === 0) {
//   //   return res.status(400).json({ success: false, error: "Cliente y detalles son requeridos" });
//   // }

//   const client = await pool.connect();

//   try {
//     await client.query('BEGIN');

//     // 1️⃣ Calcular el total de la venta a partir de los detalles
//     let totalVenta = 0;
//     for (const detalle of detalles) {
//       const { cantidad, precio_unitario } = detalle;
//       totalVenta += Number(cantidad) * Number(precio_unitario);
//     }

//     // 2️⃣ Calcular el saldo
//     const saldoVenta = totalVenta - (Number(monto_abonado) || 0);

//     // 3️⃣ Insertar la venta principal con el total, monto_abonado y saldo
//     const { rows: ventaRows } = await client.query(
//       "INSERT INTO venta (fecha, total, monto_abonado, saldo, cliente_id) VALUES (NOW(), $1, $2, $3, $4) RETURNING *",
//       [totalVenta, Number(monto_abonado) || 0, saldoVenta, cliente_id]
//     );
//     const venta = ventaRows[0];

//     // 4️⃣ Insertar cada detalle de la venta y descontar el stock
//     for (const detalle of detalles) {
//       const { producto_id, cantidad, precio_unitario } = detalle;
//       const subtotal = Number(cantidad) * Number(precio_unitario);

//       await client.query(
//         `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal) 
//          VALUES ($1, $2, $3, $4, $5)`,
//         [venta.id, producto_id, cantidad, precio_unitario, subtotal]
//       );

//       await client.query(
//         "UPDATE producto SET stock = stock - $1 WHERE id = $2",
//         [cantidad, producto_id]
//       );
//     }

//     await client.query('COMMIT');
//     res.status(201).json({ success: true, data: venta });
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error("Error en createVenta:", error.message);
//     res.status(500).json({ success: false, error: "Error al crear la venta" });
//   } finally {
//     client.release();
//   }
// };

// // ✅ Obtener todas las ventas con detalles
// export const getVentas = async (req, res) => {
//   try {
//     const { rows } = await pool.query(`
//       SELECT 
//         v.id AS venta_id,
//         v.fecha,
//         v.total,
//         v.monto_abonado,
//         v.saldo,
//         v.cliente_id,
//         c.nombre AS cliente_nombre,
//         c.apellido AS cliente_apellido,
//         COALESCE(
//           json_agg(
//             json_build_object(
//               'detalle_id', d.id,
//               'producto_id', d.producto_id,
//               'cantidad', d.cantidad,
//               'precio_unitario', d.precio_unitario,
//               'subtotal', d.subtotal
//             )
//           ) FILTER (WHERE d.id IS NOT NULL),
//           '[]'
//         ) AS detalles
//       FROM venta v
//       INNER JOIN cliente c ON v.cliente_id = c.id
//       LEFT JOIN detalle_venta d ON v.id = d.venta_id
//       GROUP BY v.id, c.nombre, c.apellido
//       ORDER BY v.fecha DESC;
//     `);

//     res.status(200).json({ success: true, data: rows });
//   } catch (error) {
//     console.error("Error en getVentas:", error.message);
//     res.status(500).json({ success: false, error: "Error al obtener ventas" });
//   }
// };

// // ✅ Obtener una venta con sus detalles
// export const getVentaById = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const { rows: ventaRows } = await pool.query(`
//       SELECT v.id AS venta_id, v.fecha, v.total, v.monto_abonado, v.saldo, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
//       FROM venta v
//       INNER JOIN cliente c ON v.cliente_id = c.id
//       WHERE v.id = $1;
//     `, [id]);

//     if (ventaRows.length === 0) {
//       return res.status(404).json({ success: false, error: "Venta no encontrada" });
//     }

//     const { rows: detalleRows } = await pool.query(`
//       SELECT dv.id AS detalle_id, dv.cantidad, dv.precio_unitario, dv.subtotal,
//              p.nombre AS producto_nombre
//       FROM detalle_venta dv
//       INNER JOIN producto p ON dv.producto_id = p.id
//       WHERE dv.venta_id = $1;
//     `, [id]);

//     res.status(200).json({
//       success: true,
//       data: {
//         ...ventaRows[0],
//         detalles: detalleRows
//       }
//     });
//   } catch (error) {
//     console.error("Error en getVentaById:", error.message);
//     res.status(500).json({ success: false, error: "Error al obtener la venta" });
//   }
// };

// // ✅ Actualizar una venta



// export const updateVenta = async (req, res) => {
//   const { id } = req.params;
//   const { fecha, cliente_id, detalles, monto_abonado } = req.body;

//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     // 1. Obtener venta existente
//     const { rows: ventaRows } = await client.query(
//       "SELECT * FROM venta WHERE id = $1",
//       [id]
//     );
//     if (ventaRows.length === 0) {
//       await client.query("ROLLBACK");
//       return res
//         .status(404)
//         .json({ success: false, error: "Venta no encontrada" });
//     }
//     const ventaExistente = ventaRows[0];
//     const nuevoMontoAbonado =
//       monto_abonado !== undefined
//         ? Number(monto_abonado)
//         : ventaExistente.monto_abonado;

//     // 2. Obtener ids actuales de los detalles en DB
//     const { rows: detallesDb } = await client.query(
//       "SELECT id FROM detalle_venta WHERE venta_id = $1",
//       [id]
//     );
//     const idsEnDb = detallesDb.map((d) => d.id);

//     // 3. Obtener ids enviados en la request
//     const idsEnRequest = (detalles || [])
//       .filter((d) => d.id) // solo los que tienen id
//       .map((d) => d.id);

//     // 4. Identificar cuáles eliminar (estaban en DB pero no vinieron en la request)
//     const idsAEliminar = idsEnDb.filter((dbId) => !idsEnRequest.includes(dbId));
//     if (idsAEliminar.length > 0) {
//       await client.query(
//         `DELETE FROM detalle_venta WHERE venta_id = $1 AND id = ANY($2::int[])`,
//         [id, idsAEliminar]
//       );
//     }

//     // 5. Insertar o actualizar los detalles que llegan
//     if (Array.isArray(detalles) && detalles.length > 0) {
//       for (const det of detalles) {
//         const { id: detalleId, producto_id, cantidad, precio_unitario } = det;

//         const subtotalCalculado = Number(cantidad) * Number(precio_unitario);

//         if (detalleId) {
//           // actualización
//           await client.query(
//             `
//             UPDATE detalle_venta
//             SET
//               producto_id = COALESCE($1, producto_id),
//               cantidad = COALESCE($2, cantidad),
//               precio_unitario = COALESCE($3, precio_unitario),
//               subtotal = $4
//             WHERE id = $5 AND venta_id = $6
//           `,
//             [
//               producto_id,
//               cantidad,
//               precio_unitario,
//               subtotalCalculado,
//               detalleId,
//               id,
//             ]
//           );
//         } else {
//           // inserción
//           await client.query(
//             `
//             INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal)
//             VALUES ($1, $2, $3, $4, $5)
//           `,
//             [id, producto_id, cantidad, precio_unitario, subtotalCalculado]
//           );
//         }
//       }
//     }

//     // 6. Recalcular total y saldo
//     const { rows: detallesActualizados } = await client.query(
//       "SELECT SUM(subtotal) AS total_calculado FROM detalle_venta WHERE venta_id = $1",
//       [id]
//     );

//     const totalVenta = detallesActualizados[0].total_calculado || 0;
//     const saldoVenta = totalVenta - nuevoMontoAbonado;

//     // 7. Actualizar la venta principal
//     const updateVentaQuery = `
//       UPDATE venta
//       SET
//         fecha = COALESCE($1, fecha),
//         cliente_id = COALESCE($2, cliente_id),
//         total = $3,
//         monto_abonado = $4,
//         saldo = $5
//       WHERE id = $6
//       RETURNING *;
//     `;
//     const { rows: updatedRows } = await client.query(updateVentaQuery, [
//       fecha,
//       cliente_id,
//       totalVenta,
//       nuevoMontoAbonado,
//       saldoVenta,
//       id,
//     ]);

//     await client.query("COMMIT");
//     res.status(200).json({ success: true, data: updatedRows[0] });
//   } catch (error) {
//     await client.query("ROLLBACK");
//     console.error("Error actualizando venta:", error.message);
//     res.status(500).json({ success: false, error: "Error actualizando la venta" });
//   } finally {
//     client.release();
//   }
// };


// // ✅ Eliminar una venta y sus detalles
// export const deleteVenta = async (req, res) => {
//     const { id } = req.params;
//     const client = await pool.connect();

//     try {
//         await client.query('BEGIN');

//         // 1️⃣ Obtener los detalles de la venta para revertir el stock
//         const { rows: detallesRows } = await client.query(
//             'SELECT producto_id, cantidad FROM detalle_venta WHERE venta_id = $1',
//             [id]
//         );

//         // 2️⃣ Eliminar todos los detalles asociados a la venta
//         await client.query('DELETE FROM detalle_venta WHERE venta_id = $1', [id]);

//         // 3️⃣ Eliminar la venta principal
//         const { rowCount: ventaRowCount } = await client.query('DELETE FROM venta WHERE id = $1', [id]);

//         if (ventaRowCount === 0) {
//             await client.query('ROLLBACK');
//             return res.status(404).json({ success: false, error: "Venta no encontrada" });
//         }

//         // 4️⃣ Revertir el stock de los productos
//         if (detallesRows.length > 0) {
//             for (const detalle of detallesRows) {
//                 await client.query(
//                     'UPDATE producto SET stock = stock + $1 WHERE id = $2',
//                     [detalle.cantidad, detalle.producto_id]
//                 );
//             }
//         }

//         await client.query('COMMIT');
//         res.status(204).send();

//     } catch (error) {
//         await client.query('ROLLBACK');
//         console.error("Error eliminando venta:", error.message);
//         res.status(500).json({ success: false, error: "Error al eliminar la venta" });
//     } finally {
//         client.release();
//     }
// };

import { supabase } from "../config/supabase.js";
import { updateProducto } from "./producto/producto.controller.js";
import { pool } from '../config/supabaseAuthModule.js'; //sirve para hacer queries SQL crudas si es necesario


// ✅ Crear una nueva venta
// export const createVenta = async (req, res) => {
//   const { cliente_id, detalle_venta, monto_abonado } = req.body;

//   console.log('createVenta body:', req.body);
//   try {
//     // 1️⃣ Calcular total y saldo
//     let totalVenta = 0;
//     for (const detalle of detalle_venta) {
//       const { cantidad, precio_unitario } = detalle;
//       totalVenta += Number(cantidad) * Number(precio_unitario);
//     }
//     const saldoVenta = totalVenta - (Number(monto_abonado) || 0);

//     // 2️⃣ Insertar venta principal
//     const { data: venta, error: ventaError } = await supabase
//       .from("venta")
//       .insert([
//         {
//           fecha: new Date(),
//           total: totalVenta,
//           monto_abonado: Number(monto_abonado) || 0,
//           saldo: saldoVenta,
//           cliente_id,
//         },
//       ])
//       .select()
//       .single();

//     if (ventaError) throw ventaError;

//     // 3️⃣ Insertar detalles de la venta
//     const detallesInsert = detalle_venta.map((d) => ({
//       venta_id: venta.id,
//       producto_id: d.producto_id,
//       cantidad: d.cantidad,
//       precio_unitario: d.precio_unitario,
//       subtotal: Number(d.cantidad) * Number(d.precio_unitario),
//     }));

//     const { error: detalleError } = await supabase
//       .from("detalle_venta")
//       .insert(detallesInsert);

//     if (detalleError) throw detalleError;

//     res.status(201).json({ success: true, data: venta });
//   } catch (error) {
//     console.error("Error en createVenta:", error.message);
//     res.status(500).json({ success: false, error: "Error al crear la venta" });
//   }
// };
export const createVenta = async (req, res) => {
  try {
    console.log("createVenta body:", req.body);
    const { cliente_id, detalles = [], monto_abonado = 0, fecha, saldo, total } = req.body;

    // 1️⃣ Validar cliente si viene
    if (cliente_id != null) {
      const { data: cliente, error: clienteErr } = await supabase
        .from("cliente")
        .select("id")
        .eq("id", cliente_id)
        .maybeSingle();

      if (clienteErr && clienteErr.code !== "PGRST116") {
        console.error("Error comprobando cliente:", clienteErr);
        return res.status(500).json({ success: false, error: clienteErr.message });
      }

      if (!cliente) {
        return res.status(400).json({ success: false, error: "Cliente no existe" });
      }
    }

    // 2️⃣ Llamar al RPC que hace todo atómicamente
    const { data, error } = await supabase.rpc("create_venta_rpc", {
      p_cliente_id: cliente_id,
      p_detalles: detalles,
      p_monto_abonado: monto_abonado ?? 0
    });



    if (error) {
      console.error("Error en create_venta_rpc:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(201).json({
      success: true,
      message: "Venta creada correctamente",
      data
    });
  } catch (err) {
    console.error("Error en createVenta:", err);
    return res.status(500).json({ success: false, error: "Error al crear venta" });
  }
};


// ✅ Obtener todas las ventas con detalles where estado_id = 19
// ✅ Obtener todas las ventas con detalles where estado_id = 19, incluyendo costo del producto
export const getVentas = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("venta")
      .select(`
        id,
        fecha,
        total,
        monto_abonado,
        saldo,
        cliente:cliente_id (
          id,
          nombre,
          apellido
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
      `)
      .eq("estado_id", 19) // solo activas
      .order("fecha", { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en getVentas:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener ventas" });
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
// export const deleteVenta = async (req, res) => {
//   const { id } = req.params;

//   try {
//     // 1️⃣ Marcar los detalles de la venta como inactivos
//     const { error: detalleError } = await supabase
//       .from("detalle_venta")
//       .update({ estado_id: 20 }) // Estado "inactivo"
//       .eq("venta_id", id);

//     if (detalleError) throw detalleError;

//     // 2️⃣ Marcar la venta como inactiva
//     const { error: ventaError } = await supabase
//       .from("venta")
//       .update({ estado_id: 20 }) // Estado "inactivo"
//       .eq("id", id);

//     if (ventaError) throw ventaError;

//     res.json({ success: true, message: "Venta dada de baja correctamente" });
//   } catch (error) {
//     console.error("Error en deleteVenta:", error.message);
//     res.status(500).json({ success: false, error: "Error al dar de baja la venta" });
//   }
// };

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
      return res.status(404).json({ error: "No se encontraron detalles de la venta." });
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

    // 3️⃣ Marcar los detalles como inactivos
    const { error: detalleError } = await supabase
      .from("detalle_venta")
      .update({ estado_id: 20 }) // Estado "inactivo"
      .eq("venta_id", id);

    if (detalleError) throw detalleError;

    // 4️⃣ Marcar la venta como inactiva
    const { error: ventaError } = await supabase
      .from("venta")
      .update({ estado_id: 20 }) // Estado "inactivo"
      .eq("id", id);

    if (ventaError) throw ventaError;

    res.json({ success: true, message: "Venta dada de baja correctamente y stock restaurado" });
  } catch (error) {
    console.error("Error en deleteVenta:", error.message);
    res.status(500).json({ success: false, error: "Error al dar de baja la venta" });
  }
};


// controllers/venta.controller.js






export const updateVenta = async (req, res) => {
  const ventaId = Number(req.params.id);
  const { cliente_id, detalles = [], monto_abonado } = req.body || {};

  if (!Number.isInteger(ventaId)) {
    return res.status(400).json({ success: false, error: 'ID de venta inválido' });
  }

  const nextDetails = Array.isArray(detalles) ? detalles : [];

  const client = await pool.connect();
  try {
    // ====== INICIO TRANSACCIÓN ======
    await client.query('BEGIN');

    // 1) Verificar/bloquear cabecera
    const lockVenta = await client.query(
      `SELECT id FROM venta WHERE id = $1::int FOR UPDATE`,
      [ventaId]
    );
    if (lockVenta.rowCount === 0) {
      throw new Error(`La venta ${ventaId} no existe`);
    }

    // 2) Traer detalles actuales
    const curr = await client.query(
      `SELECT id, producto_id, cantidad, precio_unitario, subtotal
         FROM detalle_venta
        WHERE venta_id = $1::int
        ORDER BY id`,
      [ventaId]
    );
    const currentDetails = curr.rows;

    const currentById = new Map(currentDetails.map(d => [String(d.id), d]));
    const nextById = new Map(nextDetails.filter(d => d.id != null).map(d => [String(d.id), d]));

    // 3) Calcular diffs
    const toInsert = [];
    const toUpdate = [];
    const toDelete = [];

    // INSERTS: items sin id
    for (const d of nextDetails) {
      if (d.id == null) {
        if (!Number.isInteger(d.producto_id)) throw new Error('producto_id (int) requerido en item nuevo');
        const c = Number(d.cantidad);
        if (!Number.isFinite(c) || c <= 0) throw new Error('cantidad inválida en item nuevo');

        toInsert.push({
          producto_id: Number(d.producto_id),
          cantidad: c,
          precio_unitario: d.precio_unitario ?? null, // si es null, tomamos producto.precio
        });
      }
    }

    // UPDATES: items con id donde cambió algo
    for (const [detId, oldRow] of currentById.entries()) {
      if (nextById.has(detId)) {
        const newRow = nextById.get(detId);

        const oldCantidad = Number(oldRow.cantidad) || 0;
        const newCantidad = Number(newRow.cantidad) || 0;
        const qty_delta = newCantidad - oldCantidad;

        const oldProd = Number(oldRow.producto_id);
        const newProd = Number(newRow.producto_id ?? oldProd);

        const precio_unitario =
          newRow.precio_unitario != null ? Number(newRow.precio_unitario) : (oldRow.precio_unitario ?? null);

        const productChanged = newProd !== oldProd;
        const anyFieldChanged =
          productChanged || qty_delta !== 0 ||
          (precio_unitario ?? null) !== (oldRow.precio_unitario ?? null);

        if (anyFieldChanged) {
          toUpdate.push({
            id: Number(detId),
            old_producto_id: oldProd,
            new_producto_id: newProd,
            old_cantidad: oldCantidad,
            new_cantidad: newCantidad,
            qty_delta,
            precio_unitario,
          });
        }
      }
    }

    // DELETES: detalles que estaban y ya no
    for (const [detId, oldRow] of currentById.entries()) {
      if (!nextById.has(detId)) {
        toDelete.push({
          id: Number(detId),
          producto_id: Number(oldRow.producto_id),
          cantidad: Number(oldRow.cantidad) || 0,
        });
      }
    }

    // 4) Actualizar cabecera si vino algo
    if (cliente_id != null || monto_abonado != null) {
      await client.query(
        `UPDATE venta
            SET cliente_id    = COALESCE($2::int, cliente_id),
                monto_abonado = COALESCE($3::numeric, monto_abonado)
          WHERE id = $1::int`,
        [ventaId, cliente_id, monto_abonado]
      );
    }

    // 5) Aplicar diffs (orden seguro)

    // 5.a) DELETES → devolver stock y borrar detalle
    for (const item of toDelete) {
      const { id: detId, producto_id, cantidad } = item;

      if (cantidad > 0) {
        await client.query(
          `UPDATE producto
              SET stock = stock + $2::int
            WHERE id = $1::int`,
          [producto_id, cantidad]
        );
      }

      await client.query(
        `DELETE FROM detalle_venta
          WHERE id = $1::int AND venta_id = $2::int`,
        [detId, ventaId]
      );
    }

    // 5.b) UPDATES → mover o ajustar delta y actualizar fila
    for (const u of toUpdate) {
      const {
        id: detId,
        old_producto_id,
        new_producto_id,
        old_cantidad,
        new_cantidad,
        qty_delta,
        precio_unitario,
      } = u;

      if (new_producto_id !== old_producto_id) {
        // Mover: devolver todo al viejo, descontar todo del nuevo (con validación)
        if (old_cantidad > 0) {
          await client.query(
            `UPDATE producto SET stock = stock + $2::int WHERE id = $1::int`,
            [old_producto_id, old_cantidad]
          );
        }

        if (new_cantidad > 0) {
          const updNew = await client.query(
            `UPDATE producto
                SET stock = stock - $2::int
              WHERE id = $1::int
                AND stock >= $2::int`,
            [new_producto_id, new_cantidad]
          );
          if (updNew.rowCount === 0) {
            throw new Error(`Stock insuficiente para producto ${new_producto_id} (requiere ${new_cantidad})`);
          }
        }
      } else if (qty_delta !== 0) {
        // Mismo producto: ajustar solo delta
        if (qty_delta > 0) {
          const upd = await client.query(
            `UPDATE producto
                SET stock = stock - $2::int
              WHERE id = $1::int
                AND stock >= $2::int`,
            [new_producto_id, qty_delta]
          );
          if (upd.rowCount === 0) {
            throw new Error(`Stock insuficiente para producto ${new_producto_id} (delta ${qty_delta})`);
          }
        } else {
          await client.query(
            `UPDATE producto
                SET stock = stock + $2::int
              WHERE id = $1::int`,
            [new_producto_id, Math.abs(qty_delta)]
          );
        }
      }

      // Actualizar detalle (casteos explícitos para evitar 42P08)
      await client.query(
        `UPDATE detalle_venta
            SET producto_id     = $2::int,
                cantidad        = $3::int,
                precio_unitario = $4::numeric,
                subtotal        = ($3::numeric * COALESCE($4::numeric, 0::numeric))
          WHERE id = $1::int
            AND venta_id = $5::int`,
        [detId, new_producto_id, new_cantidad, precio_unitario, ventaId]
      );
    }

    // 5.c) INSERTS → descontar stock y crear detalle
    for (const ins of toInsert) {
      const { producto_id, cantidad } = ins;

      // Descontar stock con validación
      const upd = await client.query(
        `UPDATE producto
            SET stock = stock - $2::int
          WHERE id = $1::int
            AND stock >= $2::int`,
        [producto_id, cantidad]
      );
      if (upd.rowCount === 0) {
        throw new Error(`Stock insuficiente para producto ${producto_id} (requiere ${cantidad})`);
      }

      // Tomar precio por defecto si no vino
      let precio_unit = ins.precio_unitario;
      if (precio_unit == null) {
        const pr = await client.query(`SELECT precio FROM producto WHERE id = $1::int`, [producto_id]);
        if (pr.rowCount === 0) throw new Error(`Producto ${producto_id} inexistente`);
        // producto.precio es DECIMAL -> usar como NUMERIC
        precio_unit = Number(pr.rows[0].precio) || 0;
      }

      await client.query(
        `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1::int, $2::int, $3::int, $4::numeric, ($3::numeric * COALESCE($4::numeric, 0::numeric)))`,
        [ventaId, producto_id, cantidad, precio_unit]
      );
    }

    // 6) Recalcular total y saldo (ambos NUMERIC)
    const recalc = await client.query(
      `WITH t AS (
         SELECT COALESCE(SUM(subtotal), 0::numeric) AS total
           FROM detalle_venta
          WHERE venta_id = $1::int
       )
       UPDATE venta v
          SET total = t.total,
              saldo = t.total - COALESCE(v.monto_abonado::numeric, 0::numeric)
         FROM t
        WHERE v.id = $1::int
        RETURNING v.id, v.cliente_id, v.monto_abonado, v.total, v.saldo`,
      [ventaId]
    );

    // Detalles finales para respuesta
    const detFinal = await client.query(
      `SELECT id, producto_id, cantidad, precio_unitario, subtotal
         FROM detalle_venta
        WHERE venta_id = $1::int
        ORDER BY id`,
      [ventaId]
    );

    // ====== COMMIT ======
    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      data: {
        venta: recalc.rows[0],
        detalles: detFinal.rows,
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Error en updateVenta (SQL):', err);
    return res.status(500).json({ success: false, error: err.message || 'Error al actualizar venta' });
  } finally {
    client.release();
  }
};
