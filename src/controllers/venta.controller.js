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
import { updateProducto } from "./producto.controller.js";

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
export const getVentas = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("venta")
      .select(`
        id, fecha, total, monto_abonado, saldo,
        cliente:cliente_id (id, nombre, apellido),
        detalle_venta(
          id, producto_id, cantidad, precio_unitario, subtotal
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


export const updateVenta = async (req, res) => {
  const { id } = req.params;
  const { cliente_id, detalles, monto_abonado } = req.body;
  console.log(detalles);

  try {
    const rpcPayload = {
      p_venta_id: Number(id),
      p_cliente_id: cliente_id ?? null,
      p_monto_abonado: monto_abonado ?? null,
      // solo si querés reemplazar la lista de detalles:
      p_detalles: detalles // array JS (incluir ids para detalles existentes)
    };

    const { data, error } = await supabase.rpc('update_venta_rpc_v4', rpcPayload);


    if (error) {
      console.error('Error al actualizar venta:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.status(200).json({ success: true, data });

  } catch (err) {
    console.error('Error en updateVenta:', err.message);
    res.status(500).json({ success: false, error: 'Error al actualizar venta' });
  }
};