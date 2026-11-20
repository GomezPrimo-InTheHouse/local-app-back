// src/controllers/shop/mercadopago.controller.js
// Integración con Mercado Pago Checkout Pro vía **Orders API**
// (la API de Preferences está marcada por MP como "será descontinuada").
// Docs: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/create-order
//
// Variables de entorno (en el .env del backend y en el hosting):
//   MP_ACCESS_TOKEN    → Access Token (prueba o producción; ambos empiezan con APP_USR-)
//   MP_WEBHOOK_SECRET  → "Firma secreta" de Webhooks (Tus integraciones → tu app → Webhooks)
//   SHOP_PUBLIC_URL    → URL pública del shop, ej. https://app-shop-jg.vercel.app
//
// La URL del webhook se configura SOLO en el panel de MP (evento "Order (Mercado Pago)"):
//   https://<tu-backend>/shop/pagos/mercadopago/webhook
//
// Importante: los montos SIEMPRE salen de la venta en la base, nunca del navegador.
import crypto from "crypto";
import { supabase } from "../../config/supabase.js";

const MP_API = "https://api.mercadopago.com";
const ESTADO_PENDIENTE_PAGO = 26;

const trimSlash = (u) => String(u || "").replace(/\/+$/, "");
const monto2 = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2); // Orders API usa strings "1234.00"

const mpFetch = async (path, options = {}) => {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN no configurado");

  const resp = await fetch(`${MP_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await resp.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!resp.ok) {
    const err = new Error(data?.message || `Mercado Pago respondió ${resp.status}`);
    err.status = resp.status;
    err.mp = data;
    throw err;
  }
  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /shop/pagos/mercadopago   body: { venta_id }
// Crea la order de Checkout Pro y devuelve el link de pago (checkout_url).
// ─────────────────────────────────────────────────────────────────────────────
export const crearPreferenciaMercadoPago = async (req, res) => {
  try {
    const ventaId = Number(req.body?.venta_id);
    if (!Number.isInteger(ventaId) || ventaId <= 0) {
      return res.status(400).json({ error: "venta_id inválido" });
    }

    const { data: venta, error: ventaErr } = await supabase
      .from("venta")
      .select("id, total, monto_abonado, saldo, estado_id, canal, cliente:cliente_id (nombre, apellido, email)")
      .eq("id", ventaId)
      .eq("canal", "web_shop")
      .maybeSingle();

    if (ventaErr) throw ventaErr;
    if (!venta) return res.status(404).json({ error: "Pedido no encontrado" });

    if (venta.estado_id !== ESTADO_PENDIENTE_PAGO) {
      return res.status(409).json({ error: "Este pedido ya no está pendiente de pago" });
    }

    const saldo = Number(venta.total ?? 0) - Number(venta.monto_abonado ?? 0);
    if (!(saldo > 0)) {
      return res.status(409).json({ error: "Este pedido no tiene saldo pendiente" });
    }

    const { data: detalles, error: detErr } = await supabase
      .from("detalle_venta")
      .select("cantidad, producto:producto_id (nombre)")
      .eq("venta_id", ventaId);
    if (detErr) throw detErr;

    const descripcion = (detalles || [])
      .map((d) => {
        const p = Array.isArray(d.producto) ? d.producto[0] : d.producto;
        return `${p?.nombre ?? "Producto"} x${d.cantidad}`;
      })
      .join(", ")
      .slice(0, 250);

    const shopUrl = trimSlash(process.env.SHOP_PUBLIC_URL);
    const volverA = `${shopUrl}/shop/confirmacion?venta_id=${ventaId}`;
    const total = monto2(saldo);

    // Un solo ítem por el SALDO del pedido: ya incluye cupón y pagos previos,
    // así lo que cobra MP coincide exacto con la venta registrada.
    // (total_amount debe ser igual a la suma de unit_price × quantity)
    const order = {
      type: "online",
      processing_mode: "manual",
      total_amount: total,
      external_reference: String(ventaId),
      items: [
        {
          title: `Pedido #${ventaId} - JG Informática`,
          description: descripcion || `Pedido #${ventaId}`,
          unit_price: total,
          quantity: 1,
        },
      ],
      // payer es opcional, pero si se manda el email es obligatorio
      ...(venta.cliente?.email && {
        payer: {
          email: venta.cliente.email,
          first_name: venta.cliente.nombre || undefined,
          last_name: venta.cliente.apellido || undefined,
        },
      }),
      ...(shopUrl && {
        config: {
          online: {
            success_url: volverA,
            pending_url: volverA,
            failure_url: volverA,
            auto_return: "approved",
          },
        },
      }),
    };

    const created = await mpFetch("/v1/orders", {
      method: "POST",
      body: JSON.stringify(order),
      headers: { "X-Idempotency-Key": crypto.randomUUID() },
    });

    return res.status(201).json({
      order_id: created.id,
      init_point: created.checkout_url, // el shop redirige a esta URL
    });
  } catch (err) {
    console.error("Error creando order MP:", err?.message, JSON.stringify(err?.mp ?? ""));
    return res.status(502).json({
      error: "No pudimos iniciar el pago con Mercado Pago. Probá de nuevo o pagá por transferencia.",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Firma x-signature de los webhooks de MP (capa extra de seguridad).
// La seguridad real es que después consultamos la order a MP con nuestro token:
// nadie puede inventar un pago aprobado. Por eso una firma que no coincide se
// registra en el log pero no bloquea (evita perder pagos por un detalle de formato).
// ─────────────────────────────────────────────────────────────────────────────
const verificarFirma = (req, dataId) => {
  const secret = process.env.MP_WEBHOOK_SECRET;
  const xSignature = req.headers["x-signature"];
  const xRequestId = req.headers["x-request-id"];
  if (!secret || !xSignature) return "sin_firma";

  const partes = Object.fromEntries(
    String(xSignature)
      .split(",")
      .map((p) => p.split("=").map((s) => s.trim()))
      .filter((p) => p.length === 2)
  );
  const { ts, v1 } = partes;
  if (!ts || !v1) return "invalida";

  const id = /^[a-z0-9]+$/i.test(String(dataId)) ? String(dataId).toLowerCase() : String(dataId);
  let manifest = `id:${id};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const esperado = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(String(v1));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? "ok" : "invalida";
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /shop/pagos/mercadopago/webhook
// MP avisa cambios en la order (evento "Order (Mercado Pago)"). Consultamos la
// order a MP (fuente de verdad) y, si está acreditada, la registramos (idempotente).
// ─────────────────────────────────────────────────────────────────────────────
export const webhookMercadoPago = async (req, res) => {
  const tipo = req.body?.type || req.query?.type;
  const orderId = req.body?.data?.id || req.query?.["data.id"];

  // Solo nos interesan las orders; al resto respondemos 200 para que no reintente
  if (tipo !== "order" || !orderId) return res.sendStatus(200);

  const firma = verificarFirma(req, orderId);
  if (firma === "invalida") {
    console.warn(`Webhook MP: firma no coincide (order ${orderId}). Se verifica igual consultando a MP.`);
  }

  try {
    const order = await mpFetch(`/v1/orders/${encodeURIComponent(orderId)}`);
    const ventaId = Number(order?.external_reference);

    if (!Number.isInteger(ventaId) || ventaId <= 0) {
      console.warn("Order MP sin external_reference válido:", orderId);
      return res.sendStatus(200);
    }

    // Pagada = status "processed" + status_detail "accredited"
    if (order.status !== "processed" || order.status_detail !== "accredited") {
      return res.sendStatus(200); // created / processing / failed / canceled / refunded...
    }

    const pagos = order?.transactions?.payments || [];
    const pagoOk = pagos.find((p) => p?.status === "processed") || pagos[0] || {};
    const monto = Number(order.total_paid_amount ?? pagoOk.paid_amount ?? order.total_amount);

    const detalle = [
      `cobrado $${monto}`,
      pagoOk?.payment_method?.id,
      Number(pagoOk?.payment_method?.installments) > 1
        ? `${pagoOk.payment_method.installments} cuotas`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const { data, error } = await supabase.rpc("registrar_pago_mercadopago", {
      _venta_id: ventaId,
      _payment_id: String(order.id), // id de la order: evita registrar dos veces
      _monto: monto,
      _detalle: detalle,
    });

    if (error) {
      // Ej.: venta cancelada en el local antes de que llegue el pago → revisar a mano
      console.error(`⚠️ Order MP ${order.id} acreditada pero no se pudo registrar en la venta ${ventaId}:`, error.message);
      return res.sendStatus(500); // MP reintenta más tarde
    }

    if (!data?.duplicado) {
      console.log(`✅ Order MP ${order.id} registrada en venta ${ventaId} ($${monto})`);
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error("Error procesando webhook MP:", err?.message, JSON.stringify(err?.mp ?? ""));
    return res.sendStatus(500); // MP reintenta
  }
};