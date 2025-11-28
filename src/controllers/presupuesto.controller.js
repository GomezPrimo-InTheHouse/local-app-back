// src/controllers/presupuesto.controller.js
// import  {pool}  from '../config/db.js';

import { supabase} from '../config/supabase.js';

// export const createPresupuesto = async (req, res) => {
//   const { ingreso_id, fecha, costo, total, observaciones, estado_id } = req.body;
//   console.log(req.body)
//   try {
//     const result = await pool.query(
//       `INSERT INTO presupuesto (ingreso_id, fecha, costo, total, observaciones, estado_id)
//        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
//       [ingreso_id, fecha, costo, total, observaciones, estado_id]
//     );

//     res.json(result.rows[0]);
//   } catch (error) {
//     console.error("Error creando presupuesto:", error);
//     res.status(500).json({ error: "Error creando presupuesto" });
//   }
// };



// export const getPresupuestos = async (req, res) => {
//   try {
//     const {rows} = await pool.query(
//       `SELECT p.*, e.nombre AS estado_nombre
//        FROM presupuesto p
//        JOIN estado e ON p.estado_id = e.id
//        ORDER BY p.fecha DESC`
//     );

//     if(rows.length === 0) {
//       return res.status(404).json({ message: "No se encontraron presupuestos" });
//     }

//     if (rows.length > 0) {
//       res.status(200).json(rows);
//     }
//   } catch (error) {
//     console.error("Error obteniendo presupuestos:", error);
//     res.status(500).json({ error: "Error obteniendo presupuestos" });
//   }
// };


// export const getPresupuestosByIngreso = async (req, res) => {
//   try {
//     const { ingresoId } = req.params;
   

//     const { rows } = await pool.query(
//       'SELECT * FROM presupuesto WHERE ingreso_id = $1 ORDER BY fecha::timestamp DESC',
//       [ingresoId]
//     );
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };



// export const updatePresupuesto = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { fecha, costo, total, observaciones, estado_id } = req.body;

//     const { rows } = await pool.query(
//       `UPDATE presupuesto
//        SET fecha = COALESCE($1, fecha),
//            costo = COALESCE($2, costo),
//            total = COALESCE($3, total),
//            observaciones = COALESCE($4, observaciones),
//            estado_id = COALESCE($5, estado_id)
//        WHERE id = $6
//        RETURNING *`,
//       [fecha, costo, total, observaciones, estado_id, id]
//     );

//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'Presupuesto no encontrado' });
//     }

//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };



// export const createPresupuesto = async (req, res) => {
//   const { ingreso_id, fecha, costo, total, observaciones, estado_id } = req.body;

//   try {
//     const { data, error } = await supabase
//       .from('presupuesto')
//       .insert([
//         { ingreso_id, fecha, costo, total, observaciones, estado_id }
//       ])
//       .select()
//       .single();

//     if (error) {
//       console.error('Error creando presupuesto (Supabase):', error);
//       return res.status(500).json({ error: 'Error creando presupuesto' });
//     }

//     return res.status(200).json(data); // misma salida que tu original
//   } catch (err) {
//     console.error('Excepción creando presupuesto:', err);
//     return res.status(500).json({ error: 'Error creando presupuesto' });
//   }
// };

//inicio test nuevo
// controllers/presupuesto.controller.js


export const createPresupuesto = async (req, res) => {
  // ahora también aceptamos productos opcionales
  const {
    ingreso_id,
    fecha,
    costo,
    total,
    observaciones,
    estado_id,
    productos = [], // 👈 array opcional: [{ producto_id, cantidad, precio_unitario }]
  } = req.body;

  try {
    // ✅ validaciones mínimas (muy suaves para no romper lo actual)
    if (!ingreso_id) {
      return res
        .status(400)
        .json({ error: "ingreso_id es obligatorio para crear un presupuesto" });
    }

    // 1) Insert original del presupuesto (sin romper nada)
    const { data, error } = await supabase
      .from("presupuesto")
      .insert([
        {
          ingreso_id,
          fecha,
          costo,
          total,
          observaciones,
          estado_id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creando presupuesto (Supabase):", error);
      return res
        .status(500)
        .json({ error: "Error creando presupuesto" });
    }

    const presupuesto = data;
    let detallesInsertados = [];

    // 2) Si vienen productos, los insertamos en presupuesto_detalle
    if (Array.isArray(productos) && productos.length > 0) {
      const detallesPayload = productos
        .filter(
          (p) =>
            p &&
            p.producto_id &&
            p.cantidad &&
            !isNaN(Number(p.cantidad)) &&
            p.precio_unitario != null &&
            !isNaN(Number(p.precio_unitario))
        )
        .map((p) => {
          const cantidadNum = Number(p.cantidad);
          const precioNum = Number(p.precio_unitario);
          return {
            presupuesto_id: presupuesto.id,
            producto_id: Number(p.producto_id),
            cantidad: cantidadNum,
            precio_unitario: precioNum,
            subtotal: cantidadNum * precioNum,
          };
        });

      if (detallesPayload.length > 0) {
        const { data: detallesData, error: detError } = await supabase
          .from("presupuesto_detalle")
          .insert(detallesPayload)
          .select();

        if (detError) {
          console.error(
            "Error insertando detalles de presupuesto:",
            detError
          );
        } else {
          detallesInsertados = detallesData;
        }
      }
    }

    // 🔙 Para no romper el front actual:
    // - devolvemos el mismo "data" que antes...
    // - ...pero ahora con un campo extra "detalles"
    return res.status(200).json({
      ...presupuesto,
      detalles: detallesInsertados,
    });
  } catch (err) {
    console.error("Excepción creando presupuesto:", err);
    return res
      .status(500)
      .json({ error: "Error creando presupuesto" });
  }
};

//fin test nuevo

/**
 * Obtener todos los presupuestos
 * Debe devolver p.* y un campo adicional estado_nombre (como tu SELECT original)
 * Devuelve 404 si no encuentra ninguno (igual que tu versión original).
 */
export const getPresupuestos = async (req, res) => {
  try {
    // Seleccionamos la relación estado a través de estado_id
    const { data, error } = await supabase
      .from('presupuesto')
      .select(`
        id,
        ingreso_id,
        fecha,
        costo,
        total,
        observaciones,
        estado_id,
        estado:estado_id ( nombre )
      `)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error obteniendo presupuestos (Supabase):', error);
      return res.status(500).json({ error: 'Error obteniendo presupuestos' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No se encontraron presupuestos' });
    }

    // Normalizar para devolver exactamente p.* + estado_nombre
    const rows = data.map((r) => {
      const estadoObj = Array.isArray(r.estado) ? r.estado[0] : r.estado;
      return {
        id: r.id,
        ingreso_id: r.ingreso_id,
        fecha: r.fecha,
        costo: r.costo,
        total: r.total,
        observaciones: r.observaciones,
        estado_id: r.estado_id,
        estado_nombre: estadoObj ? estadoObj.nombre : null
      };
    });

    return res.status(200).json(rows);
  } catch (err) {
    console.error('Excepción obteniendo presupuestos:', err);
    return res.status(500).json({ error: 'Error obteniendo presupuestos' });
  }
};

/**
 * Obtener presupuestos por ingreso
 * Ordena por fecha desc — devuelve array (puede ser vacío).
 */
// export const getPresupuestosByIngreso = async (req, res) => {
//   try {
//     const { ingresoId } = req.params;

//     const { data, error } = await supabase
//       .from('presupuesto')
//       .select('*')
//       .eq('ingreso_id', ingresoId)
//       .order('fecha', { ascending: false });

//     if (error) {
//       console.error('Error obteniendo presupuestos por ingreso (Supabase):', error);
//       return res.status(500).json({ error: error.message || 'Error obteniendo presupuestos' });
//     }

//     return res.status(200).json(data || []);
//   } catch (err) {
//     console.error('Excepción obteniendo presupuestos por ingreso:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

//inicio test nuevo


export const getPresupuestosByIngreso = async (req, res) => {
  try {
    const { ingresoId } = req.params;

    const { data, error } = await supabase
      .from('presupuesto')
      .select(`
        *,
        presupuesto_detalle (
          id,
          producto_id,
          cantidad,
          precio_unitario,
          subtotal,
          producto:producto_id (
            id,
            nombre,
            precio,
            costo
          )
        )
      `)
      .eq('ingreso_id', ingresoId)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error obteniendo presupuestos por ingreso (Supabase):', error);
      return res.status(500).json({
        error: error.message || 'Error obteniendo presupuestos'
      });
    }

    return res.status(200).json(data ?? []);
  } catch (err) {
    console.error('Excepción obteniendo presupuestos por ingreso:', err);
    return res.status(500).json({ error: err.message });
  }
};



//fin test nuevo


/**
 * Actualizar presupuesto
 * Usa RPC 'actualizar_presupuesto' (transaccional en DB, mantiene valores si no se envía campo)
 * Devuelve exactamente la fila actualizada, o 404 si no existe.
 */
export const updatePresupuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, costo, total, observaciones, estado_id } = req.body;

    const params = {
      _id: Number(id),
      _fecha: fecha ?? null,
      _costo: (typeof costo !== 'undefined') ? costo : null,
      _total: (typeof total !== 'undefined') ? total : null,
      _observaciones: observaciones ?? null,
      _estado_id: (typeof estado_id !== 'undefined') ? estado_id : null
    };

    const { data, error } = await supabase.rpc('actualizar_presupuesto', params);

    if (error) {
      console.error('Error RPC actualizar_presupuesto:', error);
      return res.status(500).json({ error: error.message || 'Error actualizando presupuesto' });
    }

    const updated = Array.isArray(data) && data.length > 0 ? data[0] : data;

    if (!updated || (Array.isArray(updated) && updated.length === 0)) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error('Excepción updatePresupuesto:', err);
    return res.status(500).json({ error: err.message });
  }
};


export const deletePresupuesto = async (req, res) => {
  try {
    const { id } = req.params;

    // Intentamos eliminar y pedir que devuelva la fila borrada
    const { data, error } = await supabase
      .from('presupuesto')
      .delete()
      .eq('id', id)
      .select() // pedimos la representación borrada
      .single();

    if (error) {
      // Si el error indica que no hay filas, respondemos 404
      // Nota: Supabase puede devolver error si no existe; aquí lo manejamos de forma general.
      // Si el error no es por "no encontrado", lo lanzamos más abajo.
      if (error.code === 'PGRST116' || String(error.message).toLowerCase().includes('no rows')) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
      console.error('Error eliminando presupuesto (Supabase):', error);
      return res.status(500).json({ error: error.message || 'Error eliminando presupuesto' });
    }

    // Si data es null -> 404
    if (!data) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    return res.json({ message: 'Presupuesto eliminado correctamente' });
  } catch (err) {
    console.error('Excepción deletePresupuesto:', err);
    return res.status(500).json({ error: err.message });
  }
};

//obtener presupuestos por equipo supabase

// export const getPresupuestosByEquipo = async (req, res) => {
//   try {
//     const { equipoId } = req.params;

//     const query = `
//       SELECT
//         e.id AS equipo_id,
//         e.tipo,
//         e.marca,
//         e.modelo,
//         e.problema,
//         es_eq.id AS estado_equipo_id,
//         es_eq.nombre AS estado_equipo_nombre,

//         i.id AS ingreso_id,
//         i.fecha_ingreso,
//         i.fecha_egreso,
//         es_in.id AS estado_ingreso_id,
//         es_in.nombre AS estado_ingreso_nombre,

//         p.id AS presupuesto_id,
//         p.fecha AS fecha_presupuesto,
//         p.costo AS costo_presupuesto,
//         p.total AS total_presupuesto,
//         p.observaciones AS observaciones_presupuesto,
//         es_pr.id AS estado_presupuesto_id,
//         es_pr.nombre AS estado_presupuesto_nombre

//       FROM equipo e
//       JOIN estado es_eq ON es_eq.id = e.estado_id

//       LEFT JOIN LATERAL (
//           SELECT *
//           FROM ingreso i
//           WHERE i.equipo_id = e.id
//           ORDER BY i.fecha_ingreso DESC
//       ) i ON true
//       LEFT JOIN estado es_in ON es_in.id = i.estado_id

//       LEFT JOIN LATERAL (
//           SELECT *
//           FROM presupuesto p
//           WHERE p.ingreso_id = i.id
//           ORDER BY p.fecha DESC
//       ) p ON true
//       LEFT JOIN estado es_pr ON es_pr.id = p.estado_id

//       WHERE e.id = $1;
//     `;

//     const { rows } = await pool.query(query, [equipoId]);
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


//postgress
export const getPresupuestosByEquipo = async (req, res) => {
  try {
    const { equipoId } = req.params;
    const equipoIdNum = Number(equipoId);

    if (Number.isNaN(equipoIdNum)) {
      return res.status(400).json({ error: 'equipoId inválido' });
    }

    const { data, error } = await supabase
      .rpc('obtener_presupuestos_por_equipo', { _equipo_id: equipoIdNum });

    if (error) {
      console.error('Error RPC obtener_presupuestos_por_equipo:', error);
      return res.status(500).json({ error: error.message || error });
    }

    // data es un array (puede ser [], o null si no hay nada)
    return res.status(200).json(data ?? []);
  } catch (err) {
    console.error('Excepción getPresupuestosByEquipo:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
};


//supabase rpc obtener_balance_presupuestos



export const getBalancePresupuestos = async (req, res) => {
  try {
    const { equipo_id } = req.query;
    let rpcResult;
    let error;

    if (typeof equipo_id !== 'undefined' && equipo_id !== null && equipo_id !== '') {
      const equipoIdNum = Number(equipo_id);
      if (Number.isNaN(equipoIdNum)) {
        return res.status(400).json({ success: false, error: 'equipo_id inválido' });
      }
      ({ data: rpcResult, error } = await supabase
        .rpc('obtener_balance_presupuestos', { _equipo_id: equipoIdNum }));
    } else {
      ({ data: rpcResult, error } = await supabase.rpc('obtener_balance_presupuestos'));
    }

    if (error) {
      console.error('Error RPC obtener_balance_presupuestos:', error);
      return res.status(500).json({ success: false, error: error.message || 'Error al obtener balances' });
    }

    const rows = rpcResult || [];

    // Normalizar y tipar igual que en tu código original
    const data = (rows).map((r) => {
      // r.presupuestos puede venir como string (JSON) o como objeto. Normalizamos a array.
      let presupuestosArr = [];
      if (r.presupuestos) {
        if (typeof r.presupuestos === 'string') {
          try {
            presupuestosArr = JSON.parse(r.presupuestos);
          } catch (e) {
            // en caso de parse fallido, dejar array vacío y loggear
            console.warn('No se pudo parsear r.presupuestos:', e);
            presupuestosArr = [];
          }
        } else if (Array.isArray(r.presupuestos)) {
          presupuestosArr = r.presupuestos;
        } else {
          // si es objeto único o null
          presupuestosArr = [];
        }
      }

      return {
        equipo_id: Number(r.equipo_id),
        tipo: r.tipo ?? null,
        marca: r.marca ?? null,
        modelo: r.modelo ?? null,
        mes: r.mes ?? null, // "MM/YYYY"
        presupuestos: (presupuestosArr || []).map((p) => ({
          presupuesto_id: Number(p.presupuesto_id ?? 0),
          ingreso_id: Number(p.ingreso_id ?? 0),
          fecha_presupuesto: p.fecha_presupuesto ?? null,
          costo_presupuesto: Number(p.costo_presupuesto ?? 0),
          total_presupuesto: Number(p.total_presupuesto ?? 0),
          balance: Number(p.balance ?? 0),
        })),
        costo_total: Number(r.costo_total ?? 0),
        total_total: Number(r.total_total ?? 0),
        balance_final: Number(r.balance_final ?? 0),
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error en getBalancePresupuestos:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener balances por equipo y mes' });
  }
};

// ✅ Aprobar presupuesto: genera venta + detalle_venta y vincula venta_id
export const aprobarPresupuesto = async (req, res) => {
  try {
    const { id } = req.params; // id del presupuesto
    const { nuevo_estado_id } = req.body || {}; // estado "aprobado" opcional

    const presupuestoIdNum = Number(id);
    const estadoAprobadoId =
      nuevo_estado_id == null || nuevo_estado_id === ""
        ? null
        : Number(nuevo_estado_id);

    if (!presupuestoIdNum) {
      return res.status(400).json({
        error: "ID de presupuesto inválido",
      });
    }

    // 1) Traer presupuesto + ingreso + equipo + cliente + detalles
    const { data: presupuesto, error: presError } = await supabase
      .from("presupuesto")
      .select(
        `
        id,
        ingreso_id,
        costo,
        total,
        estado_id,
        venta_id,
        ingreso:ingreso_id (
          id,
          equipo_id,
          equipo:equipo_id (
            id,
            cliente_id
          )
        ),
        presupuesto_detalle (
          id,
          producto_id,
          cantidad,
          precio_unitario,
          subtotal
        )
      `
      )
      .eq("id", presupuestoIdNum)
      .maybeSingle();

    if (presError) {
      console.error("Error leyendo presupuesto:", presError);
      return res.status(500).json({ error: "Error leyendo presupuesto" });
    }

    if (!presupuesto) {
      return res.status(404).json({ error: "Presupuesto no encontrado" });
    }

    if (presupuesto.venta_id) {
      return res.status(400).json({
        error: "Este presupuesto ya tiene una venta asociada",
      });
    }

    const clienteId = presupuesto.ingreso?.equipo?.cliente_id;
    if (!clienteId) {
      return res.status(400).json({
        error:
          "No se pudo determinar el cliente asociado al equipo de este presupuesto",
      });
    }

    const detalles = presupuesto.presupuesto_detalle || [];
    if (detalles.length === 0) {
      return res.status(400).json({
        error:
          "El presupuesto no tiene productos asociados. No se generó la venta.",
      });
    }

    const totalProductos = detalles.reduce(
      (acc, d) => acc + (Number(d.subtotal) || 0),
      0
    );

    // 2) Crear venta (sólo por los productos)
    const fechaVenta = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const { data: venta, error: ventaError } = await supabase
      .from("venta")
      .insert([
        {
          fecha: fechaVenta,
          total: totalProductos,
          cliente_id: clienteId,
          monto_abonado: totalProductos, // por ahora asumimos pago completo
          saldo: 0,
          estado_id: 19, // ⚠ usa el ID de tu "venta activa"
        },
      ])
      .select()
      .single();

    if (ventaError) {
      console.error("Error creando venta desde presupuesto:", ventaError);
      return res.status(500).json({ error: "Error creando venta" });
    }

    // 3) Crear detalle_venta desde presupuesto_detalle
    const detallesVentaPayload = detalles.map((d) => ({
      venta_id: venta.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      subtotal: d.subtotal,
    }));

    const { error: dvError } = await supabase
      .from("detalle_venta")
      .insert(detallesVentaPayload);

    if (dvError) {
      console.error("Error creando detalle_venta:", dvError);
      return res
        .status(500)
        .json({ error: "Error creando detalle de la venta" });
    }

    // 4) Actualizar presupuesto con venta_id y, si querés, nuevo estado
    const updatePayload = {
      venta_id: venta.id,
    };
    if (estadoAprobadoId) {
      updatePayload.estado_id = estadoAprobadoId;
    }

    const { data: presUpd, error: presUpdError } = await supabase
      .from("presupuesto")
      .update(updatePayload)
      .eq("id", presupuestoIdNum)
      .select()
      .single();

    if (presUpdError) {
      console.error("Error actualizando presupuesto:", presUpdError);
      return res
        .status(500)
        .json({ error: "Error actualizando presupuesto" });
    }

    return res.status(200).json({
      presupuesto: presUpd,
      venta,
    });
  } catch (error) {
    console.error("Excepción en aprobarPresupuesto:", error);
    return res.status(500).json({
      error: "Error al aprobar presupuesto y generar venta",
    });
  }
};




// Body esperado:
// {
//   detalles: [
//     { producto_id: 11, cantidad: 2, precio_unitario: 5000 },
//     { producto_id: 15, cantidad: 1, precio_unitario: 8000 },
//     ...
//   ]
// }
export const savePresupuestoDetalles = async (req, res) => {
  try {
    const { id } = req.params;
    const presupuestoId = Number(id);

    if (!presupuestoId || Number.isNaN(presupuestoId)) {
      return res
        .status(400)
        .json({ success: false, error: "ID de presupuesto inválido" });
    }

    const { detalles } = req.body || {};

    if (!Array.isArray(detalles)) {
      return res.status(400).json({
        success: false,
        error: "El campo 'detalles' debe ser un array",
      });
    }

    // 🔹 1) Borrar detalles existentes del presupuesto
    const { error: delError } = await supabase
      .from("presupuesto_detalle")
      .delete()
      .eq("presupuesto_id", presupuestoId);

    if (delError) {
      console.error("Error borrando detalles previos:", delError);
      return res.status(500).json({
        success: false,
        error: delError.message || "Error borrando detalles previos",
      });
    }

    // Si no hay nuevos detalles, terminamos acá
    if (detalles.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "Detalles borrados; no se insertaron nuevos registros",
      });
    }

    // 🔹 2) Normalizar y validar los nuevos detalles
    const rowsToInsert = detalles
      .map((d) => {
        const producto_id = Number(d.producto_id);
        const cantidad = Number(d.cantidad);
        const precio_unitario = Number(d.precio_unitario);

        if (
          !producto_id ||
          Number.isNaN(producto_id) ||
          !cantidad ||
          Number.isNaN(cantidad) ||
          !precio_unitario ||
          Number.isNaN(precio_unitario)
        ) {
          return null;
        }

        const subtotal = cantidad * precio_unitario;

        return {
          presupuesto_id: presupuestoId,
          producto_id,
          cantidad,
          precio_unitario,
          subtotal,
        };
      })
      .filter(Boolean);

    if (rowsToInsert.length === 0) {
      return res.status(400).json({
        success: false,
        error:
          "Ninguna línea de detalle es válida. Verificá producto_id, cantidad y precio_unitario.",
      });
    }

    // 🔹 3) Insertar nuevos detalles
    const { data: inserted, error: insError } = await supabase
      .from("presupuesto_detalle")
      .insert(rowsToInsert)
      .select();

    if (insError) {
      console.error("Error insertando nuevos detalles:", insError);
      return res.status(500).json({
        success: false,
        error: insError.message || "Error insertando detalles de presupuesto",
      });
    }

    return res.status(200).json({
      success: true,
      data: inserted || [],
    });
  } catch (err) {
    console.error("Excepción en savePresupuestoDetalles:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Error guardando detalles de presupuesto",
    });
  }
};

export const getPresupuestoWithDetalles = async (req, res) => {
  try {
    const { id } = req.params;
    const presupuestoId = Number(id);

    if (!presupuestoId || Number.isNaN(presupuestoId)) {
      return res
        .status(400)
        .json({ success: false, error: "ID de presupuesto inválido" });
    }

    // 🔹 Traemos el presupuesto + sus detalles + producto
    const { data, error } = await supabase
      .from("presupuesto")
      .select(
        `
        id,
        ingreso_id,
        fecha,
        costo,
        total,
        observaciones,
        estado_id,
        presupuesto_detalle (
          id,
          producto_id,
          cantidad,
          precio_unitario,
          subtotal,
          producto (
            id,
            nombre,
            descripcion,
            precio,
            costo
          )
        )
      `
      )
      .eq("id", presupuestoId)
      .single();

    if (error) {
      console.error("Error obteniendo presupuesto con detalles:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error obteniendo presupuesto",
      });
    }

    if (!data) {
      return res
        .status(404)
        .json({ success: false, error: "Presupuesto no encontrado" });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Excepción en getPresupuestoWithDetalles:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Error obteniendo presupuesto con detalles",
    });
  }
};




export default  {
  createPresupuesto,
  getPresupuestos,
  getPresupuestosByIngreso,
  updatePresupuesto,
  deletePresupuesto,
  getPresupuestosByEquipo,
  getBalancePresupuestos,
  aprobarPresupuesto,
  savePresupuestoDetalles,
  getPresupuestoWithDetalles
};

