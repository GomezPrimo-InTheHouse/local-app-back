import { supabase } from "../../config/supabase.js";
import resend from "../../config/mailer.js";


// =========================================================
// HELPER: Crear o recuperar cupón de bienvenida
// =========================================================
// =========================================================
// HELPER: Crear o recuperar cupón semanal (1 por semana) - 5%
// =========================================================
const getOrCreateWeeklyCoupon = async (clienteId, emailDestino) => {
    const ahora = new Date();
    const ahoraISO = ahora.toISOString();

    // 1) Estado ACTIVO (ambito cupon)
    const { data: estadoCupon, error: estadoError } = await supabase
        .from("estado")
        .select("id")
        .eq("nombre", "ACTIVO")
        .eq("ambito", "cupon")
        .maybeSingle();

    if (estadoError) throw estadoError;
    if (!estadoCupon) throw new Error("No existe estado ACTIVO para cupon.");

    const estadoId = estadoCupon.id;

    // 2) Buscar cupón ACTIVO vigente (hoy) → si existe, devolverlo
    const { data: cuponVigente, error: vigenteErr } = await supabase
        .from("cupon_cliente")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("estado_id", estadoId)
        .lte("valido_desde", ahoraISO)
        .gte("valido_hasta", ahoraISO)
        .order("valido_desde", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (vigenteErr) throw vigenteErr;
    if (cuponVigente) return { cupon: cuponVigente, created: false };

    // 3) Regla "1 por semana": buscar el ÚLTIMO cupón creado (cualquier estado)
    //    y si fue creado hace menos de 7 días, NO creamos otro.
    const { data: ultimoCupon, error: ultimoErr } = await supabase
        .from("cupon_cliente")
        .select("id, valido_desde, valido_hasta, creado_en, estado_id")
        .eq("cliente_id", clienteId)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (ultimoErr) throw ultimoErr;

    if (ultimoCupon?.creado_en) {
        const creadoEn = new Date(ultimoCupon.creado_en);
        const dias = (ahora.getTime() - creadoEn.getTime()) / (1000 * 60 * 60 * 24);

        // Si todavía no pasaron 7 días desde el último cupón generado → NO crear
        if (dias < 7) {
            return {
                cupon: null,
                created: false,
                blocked: true,
                next_available_at: new Date(creadoEn.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                reason: "YA_SE_GENERO_UN_CUPON_EN_LA_ULTIMA_SEMANA",
            };
        }
    }

    // 4) Crear nuevo cupón semanal (5% por 7 días)
    const hasta = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const codigo = `JG-${randomPart}`;

    const nuevoCupon = {
        codigo,
        descripcion: "Cupón semanal 5%",
        cliente_id: clienteId,
        email_destino: emailDestino || null,
        descuento_porcentaje: 5,
        descuento_monto: null,
        valido_desde: ahora.toISOString(),
        valido_hasta: hasta.toISOString(),
        uso_maximo: 1,
        usos_realizados: 0,
        enviado_email: false,
        fecha_envio_email: null,
        estado_id: estadoId,
    };

    const { data: insert, error: insErr } = await supabase
        .from("cupon_cliente")
        .insert([nuevoCupon])
        .select("*")
        .single();

    if (insErr) throw insErr;

    return { cupon: insert, created: true };
};


// =========================================================
// HELPER: Enviar email con nodemailer
// =========================================================
export const obtenerCuponesCliente = async (req, res) => {
    try {
        const { cliente_id } = req.query;

        if (!cliente_id) {
            return res.status(400).json({ error: "cliente_id es requerido" });
        }

        const { data, error } = await supabase
            .from("cupon_cliente")
            .select(
                `
        id,
        codigo,
        descripcion,
        cliente_id,
        email_destino,
        descuento_porcentaje,
        descuento_monto,
        valido_desde,
        valido_hasta,
        uso_maximo,
        usos_realizados,
        enviado_email,
        fecha_envio_email,
        estado:estado_id (
          id,
          nombre,
          ambito
        )
      `
            )
            .eq("cliente_id", cliente_id)
            .order("valido_hasta", { ascending: false });

        if (error) throw error;

        // Aplanar estado
        const rows = (data || []).map((c) => ({
            id: c.id,
            codigo: c.codigo,
            descripcion: c.descripcion,
            cliente_id: c.cliente_id,
            email_destino: c.email_destino,
            descuento_porcentaje: c.descuento_porcentaje,
            descuento_monto: c.descuento_monto,
            valido_desde: c.valido_desde,
            valido_hasta: c.valido_hasta,
            uso_maximo: c.uso_maximo,
            usos_realizados: c.usos_realizados,
            enviado_email: c.enviado_email,
            fecha_envio_email: c.fecha_envio_email,
            estado_id: c.estado?.id ?? null,
            estado_nombre: c.estado?.nombre ?? null,
            estado_ambito: c.estado?.ambito ?? null,
        }));

        return res.status(200).json(rows);
    } catch (err) {
        console.error("Error en obtenerCuponesCliente:", err);
        return res.status(500).json({
            error: "Error interno al obtener cupones del cliente",
            detail: err.message,
        });
    }
};


// =========================================================
// LOGIN CLIENTE + CUPÓN + EMAIL
// =========================================================
export const loginCliente = async (req, res) => {
    try {
        const { nombre, apellido, dni, email } = req.body;

        if (!nombre || !apellido || !dni) {
            return res.status(400).json({ error: "Faltan datos" });
        }

        const { data: cliente, error } = await supabase
            .from("cliente")
            .select("*")
            .eq("dni", dni)
            .ilike("nombre", nombre)
            .ilike("apellido", apellido)
            .maybeSingle();

        if (error) throw error;
        if (!cliente) return res.status(401).json({ error: "Cliente no encontrado" });

        let clienteActualizado = cliente;

        // Si viene email, actualizar
        if (email && email.trim() !== cliente.email) {
            const { data: updated, error: updError } = await supabase
                .from("cliente")
                .update({ email })
                .eq("id", cliente.id)
                .select("*")
                .single();

            if (updError) throw updError;
            clienteActualizado = updated;
        }

        // Cupón de bienvenida
        let cupon = await getOrCreateWeeklyCoupon(
            clienteActualizado.id,
            clienteActualizado.email
        );

        // // Enviar email si hay dirección
        // let emailSent = false;
        // if (clienteActualizado.email) {
        //   try {
        //     const sendResult = await sendCouponEmail(cupon, clienteActualizado);
        //     emailSent = sendResult.sent;
        //   } catch (e) {
        //     console.error("Error enviando email:", e);
        //   }
        // }

        return res.status(200).json({
            message: "Login exitoso",
            cliente: clienteActualizado,
            cupon_activo: cuponResult.cupon,              // puede ser null si está bloqueado por la regla semanal
            cupon_creado: !!cuponResult.created,
            cupon_bloqueado: !!cuponResult.blocked,
            cupon_next_available_at: cuponResult.next_available_at || null,
            cupon_block_reason: cuponResult.reason || null,
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// =========================================================
// VALIDAR CUPÓN
// =========================================================
export const validarCupon = async (req, res) => {
  try {
    const { cliente_id, codigo, total_bruto } = req.body;

    // Validaciones básicas
    if (!cliente_id) {
      return res.status(400).json({ valido: false, error: "cliente_id es requerido" });
    }
    if (!codigo || !String(codigo).trim()) {
      return res.status(400).json({ valido: false, error: "codigo es requerido" });
    }

    const bruto = Number(total_bruto);
    if (!Number.isFinite(bruto) || bruto < 0) {
      return res.status(400).json({
        valido: false,
        error: "total_bruto inválido",
      });
    }

    // 1) Buscar cupón del cliente
    const { data: cupon, error: cuponErr } = await supabase
      .from("cupon_cliente")
      .select(
        `
        id,
        codigo,
        cliente_id,
        descripcion,
        email_destino,
        descuento_porcentaje,
        descuento_monto,
        valido_desde,
        valido_hasta,
        uso_maximo,
        usos_realizados,
        estado_id,
        creado_en
      `
      )
      .eq("cliente_id", cliente_id)
      .eq("codigo", codigo)
      .maybeSingle();

    if (cuponErr) throw cuponErr;

    // No existe para ese cliente (cupón inventado o mal tipeado)
    if (!cupon) {
      return res.status(404).json({
        valido: false,
        error: "Cupón no encontrado para este cliente",
      });
    }

    // 2) Verificar estado ACTIVO (ambito cupon)
    const { data: estadoCupon, error: estadoErr } = await supabase
      .from("estado")
      .select("id, nombre, ambito")
      .eq("id", cupon.estado_id)
      .maybeSingle();

    if (estadoErr) throw estadoErr;

    if (!estadoCupon || estadoCupon.ambito !== "cupon") {
      return res.status(400).json({
        valido: false,
        error: "Estado de cupón inválido (revisar tabla estado)",
      });
    }

    if (estadoCupon.nombre !== "ACTIVO") {
      return res.status(400).json({
        valido: false,
        error: "Cupón no activo",
        motivo: `Estado actual: ${estadoCupon.nombre}`,
      });
    }

    // 3) Verificar vigencia
    const ahoraISO = new Date().toISOString();

    if (cupon.valido_desde && cupon.valido_desde > ahoraISO) {
      return res.status(400).json({
        valido: false,
        error: "El cupón aún no está vigente",
      });
    }

    if (cupon.valido_hasta && cupon.valido_hasta < ahoraISO) {
      return res.status(400).json({
        valido: false,
        error: "El cupón está vencido",
      });
    }

    // 4) Verificar usos
    const usoMaximo = cupon.uso_maximo == null ? 1 : Number(cupon.uso_maximo);
    const usosRealizados = cupon.usos_realizados == null ? 0 : Number(cupon.usos_realizados);

    if (Number.isFinite(usoMaximo) && Number.isFinite(usosRealizados)) {
      if (usosRealizados >= usoMaximo) {
        return res.status(400).json({
          valido: false,
          error: "Uso agotado",
        });
      }
    }

    // 5) Calcular descuento
    let descuento = 0;

    if (cupon.descuento_monto != null) {
      descuento = Number(cupon.descuento_monto) || 0;
    } else if (cupon.descuento_porcentaje != null) {
      const porcentaje = Number(cupon.descuento_porcentaje) || 0;
      descuento = bruto * (porcentaje / 100);
    }

    // Normalizar descuento
    if (!Number.isFinite(descuento) || descuento < 0) descuento = 0;
    if (descuento > bruto) descuento = bruto;

    const totalConDescuento = bruto - descuento;

    return res.status(200).json({
      valido: true,
      descuento,
      total_con_descuento: totalConDescuento,
      cupon: {
        ...cupon,
        estado: estadoCupon, // útil para el front/admin
      },
    });
  } catch (err) {
    console.error("Error en validarCupon:", err);
    return res.status(500).json({
      valido: false,
      error: "Error interno al validar cupón",
      detail: err.message,
    });
  }
};



// export const crearVentaWeb = async (req, res) => {
//   try {
//     const {
//       cliente_id,
//       items,
//       monto_abonado,
//       estado_nombre,
//       codigo_cupon,          // opcional
//     } = req.body;

//     if (!cliente_id) {
//       return res.status(400).json({ error: "cliente_id es requerido" });
//     }

//     if (!Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({
//         error: "items debe ser un array con al menos un producto",
//       });
//     }

//     // 1) Traer info de productos (precio)
//     const productoIds = items.map((it) => it.producto_id);

//     const { data: productos, error: prodError } = await supabase
//       .from("producto")
//       .select("id, precio")
//       .in("id", productoIds);

//     if (prodError) throw prodError;

//     if (!productos || productos.length !== productoIds.length) {
//       return res.status(400).json({
//         error:
//           "No se pudieron encontrar todos los productos indicados. Verificar IDs.",
//       });
//     }

//     const mapPrecio = new Map();
//     for (const p of productos) {
//       mapPrecio.set(p.id, Number(p.precio));
//     }

//     // 2) Calcular subtotales y total bruto (antes de cupones)
//     const detalles = items.map((it) => {
//       const precio_unitario = mapPrecio.get(it.producto_id);
//       const cantidad = Number(it.cantidad || 0);
//       const subtotal = precio_unitario * cantidad;
//       return {
//         producto_id: it.producto_id,
//         cantidad,
//         precio_unitario,
//         subtotal,
//       };
//     });

//     const totalBruto = detalles.reduce((acc, d) => acc + d.subtotal, 0);

//     // 3) Aplicar cupón si viene código
//     let descuentoMonto = 0;
//     let totalFinal = totalBruto;
//     let cuponAplicado = null;

//     if (codigo_cupon) {
//       const ahoraISO = new Date().toISOString();

//       const { data: cupon, error: cuponError } = await supabase
//         .from("cupon_cliente")
//         .select(
//           `
//           id,
//           codigo,
//           cliente_id,
//           descuento_porcentaje,
//           descuento_monto,
//           valido_desde,
//           valido_hasta,
//           uso_maximo,
//           usos_realizados,
//           estado_id
//         `
//         )
//         .eq("cliente_id", cliente_id)
//         .eq("codigo", codigo_cupon)
//         .maybeSingle();

//       if (cuponError) throw cuponError;

//       if (!cupon) {
//         return res.status(400).json({
//           error: "Cupón no válido para este cliente",
//         });
//       }

//       // Verificar estado ACTIVO
//       const { data: estadoCupon, error: estError } = await supabase
//         .from("estado")
//         .select("id, nombre")
//         .eq("id", cupon.estado_id)
//         .eq("ambito", "cupon")
//         .maybeSingle();

//       if (estError) throw estError;

//       if (!estadoCupon || estadoCupon.nombre !== "ACTIVO") {
//         return res.status(400).json({
//           error: "El cupón no está activo",
//         });
//       }

//       // Verificar fechas y usos
//       if (cupon.valido_desde && cupon.valido_desde > ahoraISO) {
//         return res.status(400).json({ error: "El cupón aún no está vigente" });
//       }

//       if (cupon.valido_hasta && cupon.valido_hasta < ahoraISO) {
//         return res.status(400).json({ error: "El cupón está vencido" });
//       }

//       if (
//         cupon.uso_maximo != null &&
//         cupon.usos_realizados != null &&
//         cupon.usos_realizados >= cupon.uso_maximo
//       ) {
//         return res.status(400).json({
//           error: "El cupón ya fue utilizado el máximo de veces",
//         });
//       }

//       // Calcular descuento
//       if (cupon.descuento_monto != null) {
//         descuentoMonto = Number(cupon.descuento_monto);
//       } else if (cupon.descuento_porcentaje != null) {
//         descuentoMonto = totalBruto * (cupon.descuento_porcentaje / 100);
//       }

//       if (descuentoMonto < 0) descuentoMonto = 0;
//       if (descuentoMonto > totalBruto) descuentoMonto = totalBruto;

//       totalFinal = totalBruto - descuentoMonto;
//       cuponAplicado = cupon;
//     }

//     // 4) Determinar estado venta
//     const estadoNombreFinal = estado_nombre || "PENDIENTE_PAGO";

//     const { data: estadoVenta, error: estadoError } = await supabase
//       .from("estado")
//       .select("id")
//       .eq("nombre", estadoNombreFinal)
//       .eq("ambito", "venta")
//       .maybeSingle();

//     if (estadoError) throw estadoError;

//     if (!estadoVenta) {
//       return res.status(500).json({
//         error: `No se encontró estado '${estadoNombreFinal}' para ambito 'venta'.`,
//       });
//     }

//     const montoAbonadoNum =
//       monto_abonado != null ? Number(monto_abonado) : 0;
//     const saldo = totalFinal - montoAbonadoNum;

//     // 5) Insertar venta
//     const { data: ventaInsert, error: ventaError } = await supabase
//       .from("venta")
//       .insert([
//         {
//           fecha: new Date().toISOString(),
//           total: totalFinal,
//           cliente_id,
//           monto_abonado: montoAbonadoNum,
//           saldo,
//           canal: "web_shop",
//           estado_id: estadoVenta.id,
//         },
//       ])
//       .select(
//         `
//         id,
//         fecha,
//         total,
//         cliente_id,
//         monto_abonado,
//         saldo,
//         canal,
//         estado_id
//       `
//       )
//       .single();

//     if (ventaError) throw ventaError;

//     const ventaId = ventaInsert.id;

//     // 6) Insertar detalle_venta
//     const detallesConVenta = detalles.map((d) => ({
//       venta_id: ventaId,
//       producto_id: d.producto_id,
//       cantidad: d.cantidad,
//       precio_unitario: d.precio_unitario,
//       subtotal: d.subtotal,
//     }));

//     const { data: detallesInsert, error: detalleError } = await supabase
//       .from("detalle_venta")
//       .insert(detallesConVenta)
//       .select(
//         `
//         id,
//         venta_id,
//         producto_id,
//         cantidad,
//         precio_unitario,
//         subtotal
//       `
//       );

//     if (detalleError) throw detalleError;

//     // 7) Si hubo cupón, marcarlo como usado (incrementar usos, y si llegó al max → USADO)
//     if (cuponAplicado) {
//       const usosNuevos = (cuponAplicado.usos_realizados || 0) + 1;
//       let nuevoEstadoId = cuponAplicado.estado_id;

//       if (
//         cuponAplicado.uso_maximo != null &&
//         usosNuevos >= cuponAplicado.uso_maximo
//       ) {
//         // buscar estado USADO
//         const { data: estadoUsado, error: estUsadoErr } = await supabase
//           .from("estado")
//           .select("id")
//           .eq("nombre", "USADO")
//           .eq("ambito", "cupon")
//           .maybeSingle();

//         if (!estUsadoErr && estadoUsado) {
//           nuevoEstadoId = estadoUsado.id;
//         }
//       }

//       const { error: updCuponErr } = await supabase
//         .from("cupon_cliente")
//         .update({
//           usos_realizados: usosNuevos,
//           estado_id: nuevoEstadoId,
//         })
//         .eq("id", cuponAplicado.id);

//       if (updCuponErr) {
//         console.error("Error actualizando cupón tras la venta:", updCuponErr);
//       }
//     }

//     return res.status(201).json({
//       message: "Venta web creada correctamente",
//       venta: ventaInsert,
//       detalles: detallesInsert,
//       total_bruto: totalBruto,
//       descuento: descuentoMonto,
//       total_final: totalFinal,
//       codigo_cupon: codigo_cupon || null,
//     });
//   } catch (err) {
//     console.error("Error en crearVentaWeb:", err);
//     return res.status(500).json({
//       error: "Error interno al crear venta web",
//       detail: err.message,
//     });
//   }
// };

export const crearVentaWeb = async (req, res) => {
    try {
        const {
            cliente_id,
            items,
            monto_abonado,
            estado_nombre,
            codigo_cupon, // opcional
        } = req.body;

        if (!cliente_id) {
            return res.status(400).json({ error: "cliente_id es requerido" });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                error: "items debe ser un array con al menos un producto",
            });
        }

        // 1) Traer info de productos (precio)
        const productoIds = items.map((it) => it.producto_id);

        const { data: productos, error: prodError } = await supabase
            .from("producto")
            .select("id, precio")
            .in("id", productoIds);

        if (prodError) throw prodError;

        if (!productos || productos.length !== productoIds.length) {
            return res.status(400).json({
                error:
                    "No se pudieron encontrar todos los productos indicados. Verificar IDs.",
            });
        }

        const mapPrecio = new Map();
        for (const p of productos) {
            mapPrecio.set(p.id, Number(p.precio));
        }

        // 2) Calcular subtotales y total bruto (antes de cupones)
        const detalles = items.map((it) => {
            const precio_unitario = mapPrecio.get(it.producto_id);
            const cantidad = Number(it.cantidad || 0);
            const subtotal = precio_unitario * cantidad;
            return {
                producto_id: it.producto_id,
                cantidad,
                precio_unitario,
                subtotal,
            };
        });

        const totalBruto = detalles.reduce((acc, d) => acc + d.subtotal, 0);

        // 3) Aplicar cupón si viene código
        let descuentoMonto = 0;
        let totalFinal = totalBruto;
        let cuponAplicado = null;
        let cuponMotivoNoAplicado = null;

        if (codigo_cupon) {
            const ahoraISO = new Date().toISOString();

            const { data: cupon, error: cuponError } = await supabase
                .from("cupon_cliente")
                .select(
                    `
          id,
          codigo,
          cliente_id,
          descuento_porcentaje,
          descuento_monto,
          valido_desde,
          valido_hasta,
          uso_maximo,
          usos_realizados,
          estado_id
        `
                )
                .eq("cliente_id", cliente_id)
                .eq("codigo", codigo_cupon)
                .maybeSingle();

            if (cuponError) throw cuponError;

            // Si el cupón no existe para ese cliente → error (código inventado / mal tipeado)
            if (!cupon) {
                return res.status(400).json({
                    error: "Cupón no válido para este cliente",
                });
            }

            // Verificar estado (ACTIVO) para ambito 'cupon'
            const { data: estadoCupon, error: estError } = await supabase
                .from("estado")
                .select("id, nombre")
                .eq("id", cupon.estado_id)
                .eq("ambito", "cupon")
                .maybeSingle();

            if (estError) throw estError;

            // Si NO está activo → NO frenamos la compra, solo no aplicamos el cupón
            if (!estadoCupon || estadoCupon.nombre !== "ACTIVO") {
                cuponMotivoNoAplicado = "El cupón no está activo (ya usado o deshabilitado)";
            } else if (cupon.valido_desde && cupon.valido_desde > ahoraISO) {
                cuponMotivoNoAplicado = "El cupón aún no está vigente";
            } else if (cupon.valido_hasta && cupon.valido_hasta < ahoraISO) {
                cuponMotivoNoAplicado = "El cupón está vencido";
            } else if (
                cupon.uso_maximo != null &&
                cupon.usos_realizados != null &&
                cupon.usos_realizados >= cupon.uso_maximo
            ) {
                cuponMotivoNoAplicado = "El cupón ya fue utilizado el máximo de veces";
            } else {
                // ✅ Todas las validaciones OK → aplicamos el cupón
                if (cupon.descuento_monto != null) {
                    descuentoMonto = Number(cupon.descuento_monto);
                } else if (cupon.descuento_porcentaje != null) {
                    descuentoMonto = totalBruto * (cupon.descuento_porcentaje / 100);
                }

                if (descuentoMonto < 0) descuentoMonto = 0;
                if (descuentoMonto > totalBruto) descuentoMonto = totalBruto;

                totalFinal = totalBruto - descuentoMonto;
                cuponAplicado = cupon;
            }
        }

        // 4) Determinar estado venta
        const estadoNombreFinal = estado_nombre || "PENDIENTE_PAGO";

        const { data: estadoVenta, error: estadoError } = await supabase
            .from("estado")
            .select("id")
            .eq("nombre", estadoNombreFinal)
            .eq("ambito", "venta")
            .maybeSingle();

        if (estadoError) throw estadoError;

        if (!estadoVenta) {
            return res.status(500).json({
                error: `No se encontró estado '${estadoNombreFinal}' para ambito 'venta'.`,
            });
        }

        const montoAbonadoNum =
            monto_abonado != null ? Number(monto_abonado) : 0;
        const saldo = totalFinal - montoAbonadoNum;

        // 5) Insertar venta
        const { data: ventaInsert, error: ventaError } = await supabase
            .from("venta")
            .insert([
                {
                    fecha: new Date().toISOString(),
                    total: totalFinal,
                    cliente_id,
                    monto_abonado: montoAbonadoNum,
                    saldo,
                    canal: "web_shop",
                    estado_id: estadoVenta.id,
                },
            ])
            .select(
                `
        id,
        fecha,
        total,
        cliente_id,
        monto_abonado,
        saldo,
        canal,
        estado_id
      `
            )
            .single();

        if (ventaError) throw ventaError;

        const ventaId = ventaInsert.id;

        // 6) Insertar detalle_venta
        const detallesConVenta = detalles.map((d) => ({
            venta_id: ventaId,
            producto_id: d.producto_id,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            subtotal: d.subtotal,
        }));

        const { data: detallesInsert, error: detalleError } = await supabase
            .from("detalle_venta")
            .insert(detallesConVenta)
            .select(
                `
        id,
        venta_id,
        producto_id,
        cantidad,
        precio_unitario,
        subtotal
      `
            );

        if (detalleError) throw detalleError;

        // 7) Si hubo cupón aplicado, marcarlo como usado (incrementar usos, y si llegó al max → USADO)
        if (cuponAplicado) {
            const usosNuevos = (cuponAplicado.usos_realizados || 0) + 1;
            let nuevoEstadoId = cuponAplicado.estado_id;

            if (
                cuponAplicado.uso_maximo != null &&
                usosNuevos >= cuponAplicado.uso_maximo
            ) {
                // buscar estado USADO
                const { data: estadoUsado, error: estUsadoErr } = await supabase
                    .from("estado")
                    .select("id")
                    .eq("nombre", "USADO")
                    .eq("ambito", "cupon")
                    .maybeSingle();

                if (!estUsadoErr && estadoUsado) {
                    nuevoEstadoId = estadoUsado.id;
                }
            }

            const { error: updCuponErr } = await supabase
                .from("cupon_cliente")
                .update({
                    usos_realizados: usosNuevos,
                    estado_id: nuevoEstadoId,
                })
                .eq("id", cuponAplicado.id);

            if (updCuponErr) {
                console.error("Error actualizando cupón tras la venta:", updCuponErr);
            }
        }

        return res.status(201).json({
            message: "Venta web creada correctamente",
            venta: ventaInsert,
            detalles: detallesInsert,
            total_bruto: totalBruto,
            descuento: descuentoMonto,
            total_final: totalFinal,
            codigo_cupon: cuponAplicado ? codigo_cupon : null,
            cupon_aplicado: !!cuponAplicado,
            cupon_motivo_no_aplicado: cuponMotivoNoAplicado,
        });
    } catch (err) {
        console.error("Error en crearVentaWeb:", err);
        return res.status(500).json({
            error: "Error interno al crear venta web",
            detail: err.message,
        });
    }
};


// const sendCouponEmail = async (cupon, cliente) => {
//   const email = cliente.email || cupon.email_destino;
//   if (!email) return { sent: false, reason: "NO_EMAIL" };

//   const descuentoTexto =
//     cupon.descuento_porcentaje != null
//       ? `${cupon.descuento_porcentaje}% de descuento`
//       : cupon.descuento_monto != null
//       ? `$${cupon.descuento_monto} de descuento`
//       : "un descuento especial";

//   const from = process.env.EMAIL_FROM || "JG Informática <no-reply@resend.dev>";

//   const html = `
//   <!DOCTYPE html>
//   <html lang="es">
//   <head>
//     <meta charset="UTF-8" />
//     <title>Tu cupón de bienvenida - JG Informática</title>
//   </head>
//   <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
//     <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:20px 0;">
//       <tr>
//         <td align="center">
//           <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 20px rgba(15,23,42,0.15);">
//             <tr>
//               <td style="background:linear-gradient(135deg,#111827,#1f2937);padding:20px 24px;color:#f9fafb;">
//                 <h1 style="margin:0;font-size:22px;font-weight:700;">🎁 ¡Bienvenido al Shop de JG Informática!</h1>
//                 <p style="margin:8px 0 0;font-size:14px;color:#e5e7eb;">
//                   Hola <strong>${cliente.nombre}</strong>, tenemos un regalo para tu próxima compra.
//                 </p>
//               </td>
//             </tr>

//             <tr>
//               <td style="padding:24px;">
//                 <p style="margin:0 0 12px;font-size:15px;color:#111827;">
//                   Te creamos un cupón exclusivo para usar en nuestro shop online:
//                 </p>

//                 <div style="margin:16px 0;padding:16px;border-radius:10px;background-color:#f9fafb;border:1px solid #e5e7eb;">
//                   <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">
//                     Código de tu cupón
//                   </p>
//                   <p style="margin:0 0 12px;">
//                     <span style="display:inline-block;font-size:20px;font-weight:700;background-color:#111827;color:#f9fafb;padding:8px 14px;border-radius:8px;letter-spacing:0.08em;">
//                       ${cupon.codigo}
//                     </span>
//                   </p>

//                   <p style="margin:0 0 4px;font-size:14px;color:#111827;">
//                     Beneficio: <strong>${descuentoTexto}</strong>
//                   </p>
//                   <p style="margin:0;font-size:13px;color:#4b5563;">
//                     Válido desde <strong>${cupon.valido_desde}</strong> hasta <strong>${cupon.valido_hasta}</strong><br/>
//                     Uso máximo: <strong>${cupon.uso_maximo || 1}</strong> vez/veces.
//                   </p>
//                 </div>

//                 <p style="margin:0 0 16px;font-size:14px;color:#374151;">
//                   Cuando ingreses a nuestro shop y avances al paso de
//                   <strong>Finalizar compra</strong>, vas a poder aplicar este cupón.
//                 </p>

//                 <div style="margin:24px 0 0;" align="center">
//                   <a href="#" style="display:inline-block;background-color:#111827;color:#f9fafb;font-size:14px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:999px;">
//                     Ir al Shop de JG Informática
//                   </a>
//                 </div>
//               </td>
//             </tr>

//             <tr>
//               <td style="padding:16px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
//                 <p style="margin:0;font-size:11px;color:#6b7280;line-height:1.5;">
//                   Estás recibiendo este correo porque iniciaste sesión en el Shop de JG Informática
//                   y generaste un cupón de bienvenida asociado a este email.
//                 </p>
//               </td>
//             </tr>
//           </table>
//         </td>
//       </tr>
//     </table>
//   </body>
//   </html>
//   `;

//   const { data, error } = await resend.emails.send({
//     from,
//     to: email,
//     subject: "🎁 Tu cupón de bienvenida – JG Informática",
//     html,
//   });

//   if (error) {
//     console.error("Error enviando email con Resend:", error);
//     return { sent: false, reason: "RESEND_ERROR" };
//   }

//   const ahoraISO = new Date().toISOString();

//   const { error: updateError } = await supabase
//     .from("cupon_cliente")
//     .update({
//       enviado_email: true,
//       fecha_envio_email: ahoraISO,
//       email_destino: email,
//     })
//     .eq("id", cupon.id);

//   if (updateError) {
//     console.error(
//       "Error actualizando cupon_cliente tras envío de email:",
//       updateError
//     );
//   }

//   return { sent: true, data };
// };


// =========================================================
// REGISTRAR SESIÓN DE CLIENTE (SHOP)
// =========================================================


export const registrarSesionCliente = async (req, res) => {
    try {
        const { cliente_id, origen } = req.body;

        if (!cliente_id) {
            return res.status(400).json({
                error: "cliente_id es requerido",
            });
        }

        const origenFinal = origen || "web_shop";

        // buscar estado ACTIVA para ambito 'sesion_cliente'
        const { data: estadoActiva, error: estadoError } = await supabase
            .from("estado")
            .select("id")
            .eq("nombre", "ACTIVA")
            .eq("ambito", "sesion_cliente")
            .maybeSingle();

        if (estadoError) throw estadoError;

        if (!estadoActiva) {
            return res.status(500).json({
                error:
                    "No se encontró estado ACTIVA para ambito 'sesion_cliente'. Revisar tabla estado.",
            });
        }

        const { data, error } = await supabase
            .from("sesion_cliente")
            .insert([
                {
                    cliente_id,
                    origen: origenFinal,
                    estado_id: estadoActiva.id,
                    // fecha_inicio usa default now() en la tabla
                },
            ])
            .select(
                `
        id,
        cliente_id,
        fecha_inicio,
        fecha_fin,
        origen,
        estado_id
      `
            )
            .single();

        if (error) throw error;

        return res.status(201).json({
            message: "Sesión de cliente registrada",
            sesion: data,
        });
    } catch (err) {
        console.error("Error en registrarSesionCliente:", err);
        return res.status(500).json({
            error: "Error interno al registrar sesión de cliente",
            detail: err.message,
        });
    }
};

// =========================================================
// REGISTRAR VISUALIZACIÓN DE PRODUCTO
// =========================================================
export const registrarVisualizacionProducto = async (req, res) => {
    try {
        const { producto_id, cliente_id, sesion_cliente_id, origen } = req.body;

        if (!producto_id) {
            return res.status(400).json({
                error: "producto_id es requerido",
            });
        }

        const origenFinal = origen || "web_shop";

        const { data, error } = await supabase
            .from("producto_visualizacion")
            .insert([
                {
                    producto_id,
                    cliente_id: cliente_id || null,
                    sesion_cliente_id: sesion_cliente_id || null,
                    origen: origenFinal,
                    // fecha usa default now() en la tabla
                },
            ])
            .select(
                `
        id,
        producto_id,
        cliente_id,
        sesion_cliente_id,
        fecha,
        origen
      `
            )
            .single();

        if (error) throw error;

        return res.status(201).json({
            message: "Visualización de producto registrada",
            visualizacion: data,
        });
    } catch (err) {
        console.error("Error en registrarVisualizacionProducto:", err);
        return res.status(500).json({
            error: "Error interno al registrar visualización de producto",
            detail: err.message,
        });
    }
};

// =========================================================
// TOP PRODUCTOS MÁS VISTOS (ESTADÍSTICAS SHOP)
// =========================================================
export const obtenerTopVistos = async (req, res) => {
    try {
        const { desde, hasta, limit } = req.query;

        let fechaDesde = desde;
        let fechaHasta = hasta;

        if (!fechaDesde || !fechaHasta) {
            // por defecto últimos 30 días
            const ahora = new Date();
            const hace30 = new Date();
            hace30.setDate(ahora.getDate() - 30);
            fechaDesde = hace30.toISOString();
            fechaHasta = ahora.toISOString();
        }

        const limitNum = limit ? Number(limit) : 10;

        // 1) traer visualizaciones en el rango
        const { data: visualizaciones, error: visError } = await supabase
            .from("producto_visualizacion")
            .select("producto_id, fecha")
            .gte("fecha", fechaDesde)
            .lte("fecha", fechaHasta);

        if (visError) throw visError;

        if (!visualizaciones || visualizaciones.length === 0) {
            return res.status(200).json({
                desde: fechaDesde,
                hasta: fechaHasta,
                productos: [],
            });
        }

        // 2) agrupar en memoria
        const contador = new Map();
        for (const v of visualizaciones) {
            const pid = v.producto_id;
            contador.set(pid, (contador.get(pid) || 0) + 1);
        }

        const ordenado = [...contador.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limitNum);

        const topIds = ordenado.map(([pid]) => pid);

        // 3) traer datos de producto
        const { data: productos, error: prodError } = await supabase
            .from("producto")
            .select("id, nombre, descripcion_web, precio")
            .in("id", topIds);

        if (prodError) throw prodError;

        const mapProd = new Map();
        for (const p of productos || []) {
            mapProd.set(p.id, p);
        }

        // 4) armar respuesta
        const resultado = ordenado.map(([pid, vistas]) => {
            const prod = mapProd.get(pid);
            return {
                producto_id: pid,
                vistas,
                nombre: prod?.nombre || null,
                descripcion_web: prod?.descripcion_web || null,
                precio: prod?.precio ?? null,
            };
        });

        return res.status(200).json({
            desde: fechaDesde,
            hasta: fechaHasta,
            productos: resultado,
        });
    } catch (err) {
        console.error("Error en obtenerTopVistos:", err);
        return res.status(500).json({
            error: "Error interno al obtener top productos vistos",
            detail: err.message,
        });
    }
};


// SOLO PARA TEST – ELIMINAR DESPUÉS
export const testResend = async (req, res) => {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM,
            to: "julian1995ag@gmail.com",
            subject: "Test Resend",
            html: "<p>Si ves esto, Resend funciona.</p>",
        });

        if (error) {
            console.error("Resend test error:", error);
            return res.status(500).json({ error });
        }

        return res.status(200).json({ data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
