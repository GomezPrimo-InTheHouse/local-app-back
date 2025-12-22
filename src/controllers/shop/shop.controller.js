import { supabase } from "../../config/supabase.js";
import mailer from "../../config/mailer.js";
import { getClienteById } from "../cliente.controller.js";
// =========================================================
// CONSTANTES: Tipos/Descripción de cupones (evitar typos)
// =========================================================
const CUPON_INVITADO_DESC = "CUPON_INVITADO_24H";
const CUPON_SEMANAL_DESC = "Cupón semanal 5%";
// =========================================================
// HELPER: Cupón INVITADO (única vez) - 5% por 24hs
// =========================================================
const getOrCreateGuest24hCoupon = async (clienteId, emailDestino) => {
    // 1) estado ACTIVO (ambito cupon)
    const { data: estadoActivo, error: estadoError } = await supabase
        .from("estado")
        .select("id")
        .eq("nombre", "ACTIVO")
        .eq("ambito", "cupon")
        .maybeSingle();

    if (estadoError) throw estadoError;
    if (!estadoActivo) throw new Error("No existe estado ACTIVO para cupon.");

    const estadoId = estadoActivo.id;

    // 2) Si alguna vez se creó este cupón para el cliente → NO volver a darlo
    //    (única vez, aunque esté vencido o usado)
    const { data: cuponHistorico, error: histErr } = await supabase
        .from("cupon_cliente")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("descripcion", CUPON_INVITADO_DESC)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (histErr) throw histErr;

    if (cuponHistorico) {
        // Si todavía está vigente y activo, lo devolvemos para que el front lo muestre
        const ahoraISO = new Date().toISOString();
        const vigente =
            cuponHistorico.estado_id === estadoId &&
            (!cuponHistorico.valido_desde || cuponHistorico.valido_desde <= ahoraISO) &&
            (!cuponHistorico.valido_hasta || cuponHistorico.valido_hasta >= ahoraISO) &&
            (cuponHistorico.usos_realizados ?? 0) < (cuponHistorico.uso_maximo ?? 1);

        return {
            cupon: vigente ? cuponHistorico : null,
            created: false,
            blocked: true,
            reason: "CUPON_INVITADO_YA_OTORGADO",
        };
    }

    // 3) Crear nuevo cupón 24hs
    const ahora = new Date();
    const hasta = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const codigo = `JG-${randomPart}`;

    const nuevoCupon = {
        codigo,
        descripcion: CUPON_INVITADO_DESC,
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

    return { cupon: insert, created: true, blocked: false, reason: null };
};

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
        .eq("descripcion", CUPON_SEMANAL_DESC)
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
    // 3) Regla "1 por semana": buscar el ÚLTIMO CUPÓN SEMANAL creado
    //    y si fue creado hace menos de 7 días, NO creamos otro.
    const { data: ultimoCupon, error: ultimoErr } = await supabase
        .from("cupon_cliente")
        .select("id, valido_desde, valido_hasta, creado_en, estado_id")
        .eq("cliente_id", clienteId)
        .eq("descripcion", CUPON_SEMANAL_DESC) // ✅ FILTRO CLAVE
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
        descripcion: CUPON_SEMANAL_DESC,
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
// LOGIN CLIENTE (SHOP)
// - Si no existe por DNI → crear INVITADO (canal_alta = web_shop)
// - Si existe canal_alta = local → cupón semanal 5%
// - Si existe canal_alta = web_shop → cupón invitado única vez 24hs (5%)
// Devuelve siempre cliente.id
// =========================================================
export const loginCliente = async (req, res) => {
    try {
        const { nombre, apellido, dni, celular, email } = req.body;

        if (!nombre || !apellido || !dni || !celular) {
            return res.status(400).json({
                error: "nombre, apellido, celular y dni son requeridos",
            });
        }

        const dniNorm = String(dni).trim();
        const nombreNorm = String(nombre).trim();
        const apellidoNorm = String(apellido).trim();
        const celularNorm = celular ? String(celular).trim() : null;
        const emailNorm = email ? String(email).trim() : null;

        // 1) Buscar cliente SOLO por DNI (clave única)
        const { data: clienteExistente, error: findErr } = await supabase
            .from("cliente")
            .select("*")
            .eq("dni", dniNorm)
            .maybeSingle();

        if (findErr) throw findErr;

        let clienteFinal = clienteExistente;

        // 2) Si no existe → crear INVITADO WEB
        if (!clienteFinal) {
            const { data: creado, error: insErr } = await supabase
                .from("cliente")
                .insert([
                    {
                        nombre: nombreNorm,
                        apellido: apellidoNorm,
                        dni: dniNorm,
                        email: emailNorm,
                        celular: celularNorm,
                        canal_alta: "web_shop", // requiere columna
                    },
                ])
                .select("*")
                .single();

            if (insErr) throw insErr;
            clienteFinal = creado;
        } else {
            // 3) Si existe → actualizar email (con criterio para no pisar datos del local)
            const patch = {};
            const canalAlta = clienteFinal.canal_alta || "local";
            const esLocal = canalAlta === "local";

            // Web: permitimos ajustar nombre/apellido
            if (!esLocal) {
                if (nombreNorm && nombreNorm !== clienteFinal.nombre) patch.nombre = nombreNorm;
                if (apellidoNorm && apellidoNorm !== clienteFinal.apellido) patch.apellido = apellidoNorm;
            }

            // Email:
            // - local: solo si estaba vacío
            // - web: actualizar si cambia
            if (emailNorm && emailNorm !== clienteFinal.email) {
                if (!esLocal || !clienteFinal.email) {
                    patch.email = emailNorm;
                }
            }

            if (Object.keys(patch).length > 0) {
                const { data: updated, error: updErr } = await supabase
                    .from("cliente")
                    .update(patch)
                    .eq("id", clienteFinal.id)
                    .select("*")
                    .single();

                if (updErr) throw updErr;
                clienteFinal = updated;
            }
        }

        // 4) Cupón según canal_alta usando tus helpers
        const canalAlta = clienteFinal.canal_alta || "local";

        let cuponResult;
        if (canalAlta === "local") {
            cuponResult = await getOrCreateWeeklyCoupon(clienteFinal.id, clienteFinal.email);
        } else {
            cuponResult = await getOrCreateGuest24hCoupon(clienteFinal.id, clienteFinal.email);
        }

        return res.status(200).json({
            message: "Identificación exitosa",
            cliente: clienteFinal, // SIEMPRE con id
            canal_cliente: canalAlta,
            cupon_activo: cuponResult.cupon || null,


            // Flags (si el helper no trae blocked, lo dejamos en false)
            cupon_creado: !!cuponResult.created,
            cupon_bloqueado: !!cuponResult.blocked,
            cupon_next_available_at: cuponResult.next_available_at || null,
            cupon_block_reason: cuponResult.reason || null,
        });
    } catch (err) {
        console.error("Error en loginCliente:", err);
        return res.status(500).json({
            error: "Error interno en login",
            detail: err.message,
        });
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




// crear venta web
// controllers/shopVenta.controller.js
// =========================================================
// VENTAS WEB - Controller basado en RPC Supabase (transaccional)
// RPC: crear_venta_web(_cliente_id, _items, _monto_abonado, _estado_nombre, _codigo_cupon)
// =========================================================



const normalizeItems = (items) => {
    if (!Array.isArray(items)) return [];

    // Normalizamos y validamos shape mínimo
    const norm = items
        .map((it) => ({
            producto_id: Number(it?.producto_id),
            cantidad: Number(it?.cantidad),
        }))
        .filter(
            (it) =>
                Number.isFinite(it.producto_id) &&
                it.producto_id > 0 &&
                Number.isFinite(it.cantidad) &&
                it.cantidad > 0
        )
        // Evitar duplicados: sumamos cantidades por producto_id
        .reduce((acc, it) => {
            const found = acc.find((x) => x.producto_id === it.producto_id);
            if (found) found.cantidad += it.cantidad;
            else acc.push(it);
            return acc;
        }, []);

    return norm;
};

const parseNullableNumber = (val) => {
    if (val === undefined || val === null || val === "") return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
};

// Convierte errores comunes de Supabase/Postgres a mensajes útiles
const mapDbError = (err) => {
    const message = err?.message || "Error desconocido";
    const code = err?.code || err?.details?.code;

    // Errores lanzados por RAISE EXCEPTION en la RPC suelen venir como message directo
    // Ej: "Seña insuficiente. Mínimo requerido: 12345"
    if (message.toLowerCase().includes("seña insuficiente")) {
        return { status: 400, error: message };
    }
    if (message.toLowerCase().includes("cupón inválido")) {
        return { status: 400, error: message };
    }
    if (message.toLowerCase().includes("producto") && message.toLowerCase().includes("no disponible")) {
        return { status: 400, error: message };
    }
    if (message.toLowerCase().includes("items vacío")) {
        return { status: 400, error: message };
    }
    if (message.toLowerCase().includes("estado de venta inválido")) {
        return { status: 500, error: "Configuración inválida: estado de venta no existe" };
    }

    // Código PostgreSQL genérico: 22P02 invalid_text_representation, etc.
    if (code === "22P02") return { status: 400, error: "Datos inválidos en la solicitud" };

    return { status: 500, error: "Error interno al crear venta web", detail: message };
};

// =========================================================
// POST /shop/ventas
// =========================================================
export const crearVentaWeb = async (req, res) => {
  try {
    const {
      cliente_id,
      items,
      monto_abonado = 0,
      estado_nombre = "PENDIENTE_PAGO",
      codigo_cupon = null,
    } = req.body;

    // Validaciones mínimas de request
    const clienteIdNum = Number(cliente_id);
    if (!Number.isFinite(clienteIdNum) || clienteIdNum <= 0) {
      return res
        .status(400)
        .json({ error: "cliente_id es requerido y debe ser numérico" });
    }

    const itemsNorm = normalizeItems(items);
    if (!itemsNorm.length) {
      return res.status(400).json({
        error:
          "items debe ser un array con al menos un producto (producto_id, cantidad > 0)",
      });
    }

    const montoAbonadoNum = parseNullableNumber(monto_abonado) ?? 0;
    if (!Number.isFinite(montoAbonadoNum) || montoAbonadoNum < 0) {
      return res.status(400).json({ error: "monto_abonado inválido" });
    }

    const estadoNombreFinal =
      typeof estado_nombre === "string" && estado_nombre.trim()
        ? estado_nombre.trim().toUpperCase()
        : "PENDIENTE_PAGO";

    const codigoCuponFinal =
      typeof codigo_cupon === "string" && codigo_cupon.trim()
        ? codigo_cupon.trim()
        : null;

    // ✅ Llamada transaccional a RPC
    const { data, error } = await supabase.rpc("crear_venta_web", {
      _cliente_id: clienteIdNum,
      _items: itemsNorm,
      _monto_abonado: montoAbonadoNum,
      _estado_nombre: estadoNombreFinal,
      _codigo_cupon: codigoCuponFinal,
    });

    if (error) {
      console.error("Error RPC crear_venta_web:", error);
      const mapped = mapDbError(error);
      return res.status(mapped.status).json(mapped);
    }

    // ✅ Intentar enviar mail (no debe romper la venta si falla)
    try {
      const ventaId = data?.venta?.id ?? null;

      // ✅ Traer cliente real (NO usar controllers dentro de controllers)
      const { data: clienteRow, error: clienteErr } = await supabase
        .from("cliente")
        .select("id,nombre,apellido,dni,email,celular,direccion")
        .eq("id", clienteIdNum)
        .maybeSingle();

      if (clienteErr) {
        console.error("⚠️ No se pudo obtener cliente para email:", clienteErr);
      }

      const result = await mailer({
        venta: data?.venta ?? null,          // ✅ venta completa
        detalles: data?.detalles ?? [],      // ✅ detalles completos
        resumen: {                           // ✅ totales y cupón
          total_bruto: data?.total_bruto ?? 0,
          descuento: data?.descuento ?? 0,
          total_final: data?.total_final ?? 0,
          codigo_cupon: data?.codigo_cupon ?? null,
        },
        cliente: clienteRow ?? null,         // ✅ cliente real
        meta: {                              // ✅ extras útiles
          venta_id: ventaId,
          cantidad_items: itemsNorm.length,
          canal: data?.venta?.canal ?? "web_shop",
        },
      });

      console.log("✅ Resend result:", result);

      if (result?.error) {
        console.error("❌ Resend error:", result.error);
      } else {
        console.log("✅ Email enviado. ID:", result?.data?.id, "venta_id:", ventaId);
      }
    } catch (mailErr) {
      console.error(
        "⚠️ Venta creada pero falló envío de email:",
        mailErr?.message || mailErr
      );
    }

    return res.status(201).json({
      message: "Venta web creada correctamente",
      ...data,
    });
  } catch (err) {
    console.error("Error en crearVentaWeb controller:", err);
    return res.status(500).json({
      error: "Error interno al crear venta web",
      detail: err?.message || String(err),
    });
  }
};



//fin crear venta web



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


// =========================================================
// GET /shop/ventas/:id
// Obtener venta web por ID (detalles + totales + cupón)
// =========================================================

// =========================================================
// GET /shop/ventas/:id
// Devuelve:
// {
//   venta: { ...incluye estado_nombre, cliente embebido, cupon embebido },
//   detalles: [{ producto_id, producto_nombre, cantidad, precio_unitario, subtotal }],
//   total_bruto,
//   descuento,
//   total_final,
//   codigo_cupon
// }
// =========================================================
// export const getVentaShopById = async (req, res) => {
//   try {
//     const ventaId = Number(req.params.id);

//     if (!Number.isFinite(ventaId) || ventaId <= 0) {
//       return res.status(400).json({ error: "id de venta inválido" });
//     }

//     // 1) Traer venta + estado + cliente + cupón (por cupon_id)
//     const { data: ventaRow, error: ventaErr } = await supabase
//       .from("venta")
//       .select(
//         `
//         id,
//         fecha,
//         canal,
//         total,
//         cliente_id,
//         monto_abonado,
//         saldo,
//         cupon_id,

//         estado:estado_id (
//           id,
//           nombre,
//           ambito
//         ),

//         cliente:cliente_id (
//           id,
//           nombre,
//           apellido,
//           dni,
//           email,
//           direccion,
//           celular,
//           celular_contacto,
//           canal_alta
//         ),

//         cupon:cupon_id (
//           id,
//           codigo,
//           descripcion,
//           descuento_porcentaje,
//           descuento_monto,
//           valido_desde,
//           valido_hasta,
//           uso_maximo,
//           usos_realizados,
//           estado:estado_id (
//             id,
//             nombre,
//             ambito
//           )
//         )
//       `
//       )
//       .eq("id", ventaId)
//       .maybeSingle();

//     if (ventaErr) throw ventaErr;

//     if (!ventaRow) {
//       return res.status(404).json({ error: "Venta no encontrada" });
//     }

//     // 2) Traer detalles + nombre de producto
//     const { data: detallesRows, error: detErr } = await supabase
//       .from("detalle_venta")
//       .select(
//         `
//         id,
//         venta_id,
//         producto_id,
//         cantidad,
//         precio_unitario,
//         subtotal,
//         producto:producto_id (
//           id,
//           nombre
//         )
//       `
//       )
//       .eq("venta_id", ventaId)
//       .order("id", { ascending: true });

//     if (detErr) throw detErr;

//     const detalles = (detallesRows || []).map((d) => {
//       const prod = Array.isArray(d.producto) ? d.producto[0] : d.producto;
//       return {
//         producto_id: d.producto_id,
//         producto_nombre: prod?.nombre ?? null,
//         cantidad: d.cantidad,
//         precio_unitario: Number(d.precio_unitario ?? 0),
//         subtotal: Number(d.subtotal ?? 0),
//       };
//     });

//     // 3) Totales
//     const total_bruto = detalles.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);
//     const total_final = Number(ventaRow.total ?? 0);
//     const descuento = Math.max(0, total_bruto - total_final);

//     // 4) Respuesta final
//     return res.status(200).json({
//   venta: {
//     id: ventaRow.id,
//     fecha: ventaRow.fecha,
//     canal: ventaRow.canal,

//     // importes (venta)
//     total_final,
//     monto_abonado: Number(ventaRow.monto_abonado ?? 0),
//     saldo: Number(ventaRow.saldo ?? 0),

//     // ✅ DUPLICADOS PARA FRONT ULTRA-FRIENDLY
//     total_bruto,
//     descuento,
//     total_final,

//     // estado
//     estado_id: ventaRow.estado?.id ?? null,
//     estado_nombre: ventaRow.estado?.nombre ?? null,

//     // cliente embebido
//     cliente: ventaRow.cliente
//       ? {
//           id: ventaRow.cliente.id,
//           nombre: ventaRow.cliente.nombre ?? null,
//           apellido: ventaRow.cliente.apellido ?? null,
//           dni: ventaRow.cliente.dni ?? null,
//           email: ventaRow.cliente.email ?? null,
//           direccion: ventaRow.cliente.direccion ?? null,
//           celular: ventaRow.cliente.celular ?? null,
//           celular_contacto: ventaRow.cliente.celular_contacto ?? null,
//           canal_alta: ventaRow.cliente.canal_alta ?? null,
//         }
//       : null,

//     // cupón embebido (si existe)
//     cupon: ventaRow.cupon
//       ? {
//           id: ventaRow.cupon.id,
//           codigo: ventaRow.cupon.codigo ?? null,
//           descripcion: ventaRow.cupon.descripcion ?? null,
//           descuento_porcentaje: ventaRow.cupon.descuento_porcentaje ?? null,
//           descuento_monto: ventaRow.cupon.descuento_monto ?? null,
//           valido_desde: ventaRow.cupon.valido_desde ?? null,
//           valido_hasta: ventaRow.cupon.valido_hasta ?? null,
//           uso_maximo: ventaRow.cupon.uso_maximo ?? null,
//           usos_realizados: ventaRow.cupon.usos_realizados ?? null,
//           estado_id: ventaRow.cupon.estado?.id ?? null,
//           estado_nombre: ventaRow.cupon.estado?.nombre ?? null,
//         }
//       : null,
//   },

//   detalles,

//   // Se mantienen también arriba por compatibilidad/claridad
//   total_bruto,
//   descuento,
//   total_final,

//   codigo_cupon: ventaRow.cupon?.codigo ?? null,
// });

//   } catch (err) {
//     console.error("Error en getVentaShopById:", err);
//     return res.status(500).json({
//       error: "Error interno al obtener venta",
//       detail: err.message,
//     });
//   }
// };


export const getVentaShopById = async (req, res) => {
    try {
        const ventaId = Number(req.params.id);

        if (!Number.isFinite(ventaId) || ventaId <= 0) {
            return res.status(400).json({ error: "id de venta inválido" });
        }

        // 1) Traer venta + estado + cliente + cupón
        const { data: ventaRow, error: ventaErr } = await supabase
            .from("venta")
            .select(`
        id, fecha, canal, total, cliente_id, monto_abonado, saldo, cupon_id,
        estado:estado_id (id, nombre, ambito),
        cliente:cliente_id (id, nombre, apellido, dni, email, direccion, celular, celular_contacto, canal_alta),
        cupon:cupon_id (
          id, codigo, descripcion, descuento_porcentaje, descuento_monto,
          valido_desde, valido_hasta, uso_maximo, usos_realizados,
          estado:estado_id (id, nombre, ambito)
        )
      `)
            .eq("id", ventaId)
            .maybeSingle();

        if (ventaErr) throw ventaErr;
        if (!ventaRow) return res.status(404).json({ error: "Venta no encontrada" });

        // 2) Traer detalles + nombre e IMAGEN del producto
        // 2) Traer detalles + nombre e IMAGEN del producto
        const { data: detallesRows, error: detErr } = await supabase
            .from("detalle_venta")
            .select(`
        id,
        venta_id,
        producto_id,
        cantidad,
        precio_unitario,
        subtotal,
        producto:producto_id (
          id,
          nombre,
          foto_url
        )
      `)
            .eq("venta_id", ventaId)
            .order("id", { ascending: true });

        if (detErr) throw detErr;

        // Normalización de los detalles para el frontend
        const detalles = (detallesRows || []).map((d) => {
            const prod = Array.isArray(d.producto) ? d.producto[0] : d.producto;
            return {
                producto_id: d.producto_id,
                producto_nombre: prod?.nombre ?? null,
                imagen_url: prod?.foto_url ?? null, // 👈 AGREGADO: Ahora el front recibe la URL
                cantidad: d.cantidad,
                precio_unitario: Number(d.precio_unitario ?? 0),
                subtotal: Number(d.subtotal ?? 0),
            };
        });

        // 3) Totales
        const total_bruto = detalles.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);
        const total_final = Number(ventaRow.total ?? 0);
        const descuento = Math.max(0, total_bruto - total_final);

        // 4) Respuesta final
        return res.status(200).json({
            venta: {
                id: ventaRow.id,
                fecha: ventaRow.fecha,
                canal: ventaRow.canal,
                total_final,
                monto_abonado: Number(ventaRow.monto_abonado ?? 0),
                saldo: Number(ventaRow.saldo ?? 0),
                total_bruto,
                descuento,
                estado_id: ventaRow.estado?.id ?? null,
                estado_nombre: ventaRow.estado?.nombre ?? null,
                cliente: ventaRow.cliente || null,
                cupon: ventaRow.cupon || null,
            },
            detalles, // 👈 Aquí los productos ya incluyen su imagen_url
            total_bruto,
            descuento,
            total_final,
            codigo_cupon: ventaRow.cupon?.codigo ?? null,
        });

    } catch (err) {
        console.error("Error en getVentaShopById:", err);
        return res.status(500).json({
            error: "Error interno al obtener venta",
            detail: err.message,
        });
    }
};