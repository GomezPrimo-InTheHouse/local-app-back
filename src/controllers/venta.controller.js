import { supabase } from "../config/supabase.js";

// =========================================================
// Estados de venta (tabla estado, ambito = 'venta')
// =========================================================
export const ESTADO_VENTA = {
  ACTIVA: 19,          // saldada
  INACTIVA: 20,
  PENDIENTE_PAGO: 26,
  PAGADA: 27,          // web: pagada (ej. Mercado Pago)
  CANCELADA: 28,
  EN_PREPARACION: 29,  // web
  ENVIADA: 30,         // web
  ENTREGADA: 31,       // web
};

// Ventas vigentes = todo menos INACTIVA (20) y CANCELADA (28).
// Incluye los estados del circuito web; si no, una venta web pagada
// desaparece del listado del local.
export const ESTADOS_VENTA_VIGENTES = [
  ESTADO_VENTA.ACTIVA,
  ESTADO_VENTA.PENDIENTE_PAGO,
  ESTADO_VENTA.PAGADA,
  ESTADO_VENTA.EN_PREPARACION,
  ESTADO_VENTA.ENVIADA,
  ESTADO_VENTA.ENTREGADA,
];

const DETALLE_CANCELADO = ESTADO_VENTA.CANCELADA;

// Errores de negocio lanzados con RAISE EXCEPTION en las RPCs llegan con code P0001
const rpcErrorResponse = (res, error, fallback) => {
  const isBusiness = error?.code === "P0001";
  console.error(fallback, error?.message || error);
  return res.status(isBusiness ? 400 : 500).json({
    success: false,
    error: isBusiness ? error.message : fallback,
  });
};

const toNumberOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Acepta detalle_venta o detalles (compatibilidad con el front)
const readDetalles = (body) =>
  Array.isArray(body?.detalle_venta)
    ? body.detalle_venta
    : Array.isArray(body?.detalles)
      ? body.detalles
      : [];

const activos = (detalles) =>
  (Array.isArray(detalles) ? detalles : []).filter(
    (d) => Number(d?.estado_id ?? ESTADO_VENTA.ACTIVA) !== DETALLE_CANCELADO
  );

const formatVentaDate = (dateString) => {
  try {
    const fechaUTC = new Date(dateString);
    if (isNaN(fechaUTC.getTime())) return dateString;

    const formatter = new Intl.DateTimeFormat("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "America/Argentina/Buenos_Aires",
    });

    const partes = formatter.formatToParts(fechaUTC);
    const get = (t) => partes.find((p) => p.type === t)?.value;
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
  } catch (e) {
    console.error("Error en formato de fecha con Intl:", e);
    return dateString;
  }
};

// =========================================================
// POST /venta  → crea venta local, descuenta stock y aplica descuento
// (todo en una transacción: RPC crear_venta_local)
// =========================================================
export const createVenta = async (req, res) => {
  const { cliente_id, monto_abonado, descuento, metodo_pago, observaciones_pago } = req.body || {};
  const detalles = readDetalles(req.body);

  const clienteIdNum = Number(cliente_id);
  if (!Number.isFinite(clienteIdNum) || clienteIdNum <= 0) {
    return res.status(400).json({ success: false, error: "cliente_id inválido" });
  }
  if (detalles.length === 0) {
    return res.status(400).json({ success: false, error: "La venta debe tener al menos un producto" });
  }

  const items = detalles.map((d) => ({
    producto_id: Number(d.producto_id),
    cantidad: Number(d.cantidad),
    precio_unitario: toNumberOrNull(d.precio_unitario),
  }));

  // El monto abonado al crear queda como PRIMER pago del historial (con su método)
  const { data, error } = await supabase.rpc("crear_venta_local_con_pago", {
    _cliente_id: clienteIdNum,
    _items: items,
    _descuento: toNumberOrNull(descuento) ?? 0,
    _pago_inicial: toNumberOrNull(monto_abonado) ?? 0,
    _metodo_pago: metodo_pago || "Efectivo",
    _observaciones: observaciones_pago ?? null,
  });

  if (error) return rpcErrorResponse(res, error, "Error al crear la venta");

  return res.status(201).json({ success: true, data });
};

// =========================================================
// GET /venta?canal=local|web_shop|todos
// =========================================================
export const getVentas = async (req, res) => {
  const canalQuery = req.query.canal;

  const canalesValidos = ["local", "web_shop", "todos", undefined];
  if (canalQuery && !canalesValidos.includes(canalQuery)) {
    return res.status(400).json({
      success: false,
      error: `Valor de 'canal' inválido. Debe ser 'local', 'web_shop' o 'todos'.`,
    });
  }

  const canal = canalQuery === "todos" ? undefined : canalQuery;

  try {
    const includeCupon = !canal || canal === "web_shop";

    const baseSelect = `
      id,
      fecha,
      total,
      descuento,
      monto_abonado,
      saldo,
      canal,
      estado_id,
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
        estado_id,
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
      .in("estado_id", ESTADOS_VENTA_VIGENTES)
      .order("saldo", { ascending: false })
      .order("fecha", { ascending: false });

    if (canal) query = query.eq("canal", canal);

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error getVentas:", error);
      return res
        .status(500)
        .json({ success: false, error: "Error de infraestructura al obtener ventas" });
    }

    const enriched = (data || []).map((v) => {
      const detalles = activos(v.detalle_venta);
      const total = Number(v.total) || 0;

      const subtotal_items = detalles.reduce((acc, d) => {
        const st = Number(d.subtotal) || (Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0);
        return acc + st;
      }, 0);

      // Local: descuento explícito guardado. Web: diferencia por cupón.
      const descuento_real =
        v.canal === "web_shop"
          ? Math.max(0, subtotal_items - total)
          : Number(v.descuento) || 0;

      return {
        ...v,
        detalle_venta: detalles,
        fecha: formatVentaDate(v.fecha),
        subtotal_items,
        descuento_real,
        cupon: v.canal === "web_shop" ? (v.cupon ?? null) : null,
      };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error crítico en getVentas:", error?.message || error);
    return res
      .status(500)
      .json({ success: false, error: "Error interno del servidor al procesar la solicitud" });
  }
};

// =========================================================
// GET /venta/:id
// =========================================================
export const getVentaById = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("venta")
      .select(`
        id, fecha, total, descuento, monto_abonado, saldo, canal, estado_id,
        cliente:cliente_id (id, nombre, apellido),
        detalle_venta (
          id, cantidad, precio_unitario, subtotal, estado_id,
          producto:producto_id (id, nombre)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: { ...data, detalle_venta: activos(data?.detalle_venta) },
    });
  } catch (error) {
    console.error("Error en getVentaById:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener venta" });
  }
};

// =========================================================
// DELETE /venta/:id  → anula (estado 28) y devuelve SOLO el stock
// que esa venta descontó. No borra filas. (RPC anular_venta)
// =========================================================
export const deleteVenta = async (req, res) => {
  const ventaId = Number(req.params.id);
  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ success: false, error: "ID de venta inválido" });
  }

  const { data, error } = await supabase.rpc("anular_venta", { _venta_id: ventaId });
  if (error) return rpcErrorResponse(res, error, "Error al dar de baja la venta");

  return res.json({
    success: true,
    message: data?.ya_anulada
      ? "La venta ya estaba anulada"
      : "Venta anulada correctamente",
    data,
  });
};

// =========================================================
// PUT /venta/:id  → edita una venta LOCAL (ítems, cliente, abonado, descuento)
// Para ventas web usar PATCH /venta/:id/pago
// =========================================================
export const updateVenta = async (req, res) => {
  const ventaId = Number(req.params.id);
  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ success: false, error: "ID de venta inválido" });
  }

  const body = req.body || {};
  const ventaBody = body.venta && typeof body.venta === "object" ? body.venta : {};

  const cliente_id = toNumberOrNull(body.cliente_id ?? ventaBody.cliente_id);
  // monto_abonado NO se edita acá: los pagos se cargan desde el historial de pagos
  const descuento = toNumberOrNull(body.descuento ?? ventaBody.descuento);
  const detalles = readDetalles(body);

  const items = detalles.map((d) => ({
    id: toNumberOrNull(d.id),
    producto_id: toNumberOrNull(d.producto_id),
    cantidad: Number(d.cantidad),
    precio_unitario: toNumberOrNull(d.precio_unitario),
  }));

  const { data, error } = await supabase.rpc("actualizar_venta_local", {
    _venta_id: ventaId,
    _items: items,
    _monto_abonado: null,
    _descuento: descuento,
    _cliente_id: cliente_id,
  });

  if (error) return rpcErrorResponse(res, error, "Error al actualizar venta");

  return res.status(200).json({ success: true, data });
};

// =========================================================
// PATCH /venta/:id/pago  → suma un pago a UNA venta y lo deja en el historial.
// Body: { monto, metodo_pago?, observaciones? }
// =========================================================
export const registrarPagoVenta = async (req, res) => {
  const ventaId = Number(req.params.id);
  const monto = toNumberOrNull(req.body?.monto);
  const { metodo_pago, observaciones } = req.body || {};

  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ success: false, error: "ID de venta inválido" });
  }
  if (monto == null || monto <= 0) {
    return res.status(400).json({ success: false, error: "El pago debe ser mayor a 0" });
  }

  const { data, error } = await supabase.rpc("cargar_pago_venta", {
    _venta_id: ventaId,
    _monto: monto,
    _metodo_pago: metodo_pago || "Efectivo",
    _observaciones: observaciones ?? null,
    _grupo_pago: null,
  });

  if (error) return rpcErrorResponse(res, error, "Error al registrar el pago");

  return res.status(200).json({ success: true, data });
};

// =========================================================
// GET /venta/pagos/cliente/:clienteId  → historial de pagos de ventas del cliente
// =========================================================
export const getPagosVentasCliente = async (req, res) => {
  const clienteId = Number(req.params.clienteId);
  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    return res.status(400).json({ success: false, error: "ID de cliente inválido" });
  }

  const { data, error } = await supabase.rpc("historial_pagos_ventas_cliente", {
    _cliente_id: clienteId,
  });
  if (error) return rpcErrorResponse(res, error, "Error al obtener el historial de pagos");

  return res.status(200).json({ success: true, data });
};

// =========================================================
// POST /venta/pagos/cliente/:clienteId  → pago del cliente repartido entre
// sus ventas con saldo, de la más vieja a la más nueva (atómico).
// Body: { monto, metodo_pago?, observaciones? }
// =========================================================
export const pagarVentasCliente = async (req, res) => {
  const clienteId = Number(req.params.clienteId);
  const monto = toNumberOrNull(req.body?.monto);
  const { metodo_pago, observaciones } = req.body || {};

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    return res.status(400).json({ success: false, error: "ID de cliente inválido" });
  }
  if (monto == null || monto <= 0) {
    return res.status(400).json({ success: false, error: "El pago debe ser mayor a 0" });
  }

  const { data, error } = await supabase.rpc("pagar_ventas_cliente", {
    _cliente_id: clienteId,
    _monto: monto,
    _metodo_pago: metodo_pago || "Efectivo",
    _observaciones: observaciones ?? null,
  });
  if (error) return rpcErrorResponse(res, error, "Error al registrar el pago del cliente");

  return res.status(200).json({ success: true, data });
};

// =========================================================
// PATCH /venta/pagos/:pagoId/anular  → anula un pago (no se borra)
// Body: { motivo? }
// =========================================================
export const anularPagoVenta = async (req, res) => {
  const pagoId = Number(req.params.pagoId);
  if (!Number.isInteger(pagoId) || pagoId <= 0) {
    return res.status(400).json({ success: false, error: "ID de pago inválido" });
  }

  const { data, error } = await supabase.rpc("anular_pago_venta", {
    _pago_id: pagoId,
    _motivo: req.body?.motivo ?? null,
  });
  if (error) return rpcErrorResponse(res, error, "Error al anular el pago");

  return res.status(200).json({ success: true, data });
};