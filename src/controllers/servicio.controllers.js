// src/controllers/servicio.controller.js
// Módulo de SERVICIOS: catálogo, configuración de precios y líneas de servicio en presupuestos.
import { supabase } from "../config/supabase.js";

const CLAVES_CONFIG = ["multiplicador_repuesto_default", "redondeo_multiplo", "redondeo_modo"];
const MODOS_REDONDEO = ["arriba", "cercano", "abajo"];
const TIPOS = ["fijo", "repuesto"];

const toNumberOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Errores de negocio de las funciones SQL (RAISE EXCEPTION) llegan con code P0001
const rpcError = (res, error, fallback) => {
  const negocio = error?.code === "P0001";
  console.error(fallback, error?.message || error);
  return res.status(negocio ? 400 : 500).json({ success: false, error: negocio ? error.message : fallback });
};

// =========================================================
// CATEGORÍAS
// =========================================================
export const getCategoriasServicio = async (_req, res) => {
  const { data, error } = await supabase
    .from("categoria_servicio")
    .select("id, nombre, orden, activo")
    .eq("activo", true)
    .order("orden", { ascending: true });
  if (error) return rpcError(res, error, "Error al obtener categorías");
  return res.json({ success: true, data });
};

export const createCategoriaServicio = async (req, res) => {
  const nombre = String(req.body?.nombre ?? "").trim();
  if (!nombre) return res.status(400).json({ success: false, error: "El nombre es obligatorio" });

  const { data: ult } = await supabase
    .from("categoria_servicio").select("orden").order("orden", { ascending: false }).limit(1);
  const orden = (ult?.[0]?.orden ?? 0) + 1;

  const { data, error } = await supabase
    .from("categoria_servicio").insert({ nombre, orden }).select().single();
  if (error) {
    if (error.code === "23505") return res.status(400).json({ success: false, error: "Ya existe una categoría con ese nombre" });
    return rpcError(res, error, "Error al crear la categoría");
  }
  return res.status(201).json({ success: true, data });
};

// =========================================================
// SERVICIOS
// GET /servicio?incluirInactivos=true
// =========================================================
export const getServicios = async (req, res) => {
  const incluirInactivos = String(req.query.incluirInactivos ?? "") === "true";

  let query = supabase
    .from("servicio")
    .select(`
      id, nombre, descripcion, tipo_calculo, precio_base, multiplicador, activo, updated_at,
      categoria:categoria_id ( id, nombre, orden )
    `)
    .order("nombre", { ascending: true });
  if (!incluirInactivos) query = query.eq("activo", true);

  const { data, error } = await query;
  if (error) return rpcError(res, error, "Error al obtener servicios");

  const ordenados = (data || []).sort(
    (a, b) =>
      (a.categoria?.orden ?? 99) - (b.categoria?.orden ?? 99) ||
      String(a.nombre).localeCompare(String(b.nombre), "es")
  );
  return res.json({ success: true, data: ordenados });
};

const validarServicio = (body, parcial = false) => {
  const out = {};
  if (!parcial || body.nombre !== undefined) {
    const nombre = String(body.nombre ?? "").trim();
    if (!nombre) return { error: "El nombre es obligatorio" };
    out.nombre = nombre;
  }
  if (!parcial || body.categoria_id !== undefined) {
    const cat = toNumberOrNull(body.categoria_id);
    if (!cat) return { error: "La categoría es obligatoria" };
    out.categoria_id = cat;
  }
  if (!parcial || body.tipo_calculo !== undefined) {
    const tipo = body.tipo_calculo ?? "fijo";
    if (!TIPOS.includes(tipo)) return { error: "Tipo inválido (fijo o repuesto)" };
    out.tipo_calculo = tipo;
  }
  if (body.descripcion !== undefined) out.descripcion = String(body.descripcion ?? "").trim() || null;
  if (body.precio_base !== undefined) {
    const p = toNumberOrNull(body.precio_base);
    if (p == null || p < 0) return { error: "Precio base inválido" };
    out.precio_base = p;
  }
  if (body.multiplicador !== undefined) {
    const m = toNumberOrNull(body.multiplicador);
    if (m == null || m <= 0) return { error: "El multiplicador debe ser mayor a 0" };
    out.multiplicador = m;
  }
  if (body.activo !== undefined) out.activo = Boolean(body.activo);
  return { data: out };
};

export const createServicio = async (req, res) => {
  const { data: campos, error: errVal } = validarServicio(req.body || {});
  if (errVal) return res.status(400).json({ success: false, error: errVal });

  if (campos.multiplicador === undefined) {
    const { data: cfg } = await supabase
      .from("configuracion").select("valor").eq("clave", "multiplicador_repuesto_default").maybeSingle();
    campos.multiplicador = toNumberOrNull(cfg?.valor) ?? 3;
  }
  if (campos.precio_base === undefined) campos.precio_base = 0;

  const { data, error } = await supabase.from("servicio").insert(campos).select().single();
  if (error) {
    if (error.code === "23505") return res.status(400).json({ success: false, error: "Ya existe un servicio con ese nombre en la categoría" });
    return rpcError(res, error, "Error al crear el servicio");
  }
  return res.status(201).json({ success: true, data });
};

// PUT /servicio/:id  (también sirve para activar/desactivar con { activo })
export const updateServicio = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, error: "ID inválido" });

  const { data: campos, error: errVal } = validarServicio(req.body || {}, true);
  if (errVal) return res.status(400).json({ success: false, error: errVal });
  if (Object.keys(campos).length === 0) return res.status(400).json({ success: false, error: "Nada para actualizar" });

  const { data, error } = await supabase
    .from("servicio").update({ ...campos, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) {
    if (error.code === "23505") return res.status(400).json({ success: false, error: "Ya existe un servicio con ese nombre en la categoría" });
    return rpcError(res, error, "Error al actualizar el servicio");
  }
  return res.json({ success: true, data });
};

// POST /servicio/aumento-masivo  { porcentaje, categoria_id? }
export const aumentarPreciosServicios = async (req, res) => {
  const porcentaje = toNumberOrNull(req.body?.porcentaje);
  const categoriaId = toNumberOrNull(req.body?.categoria_id);
  if (porcentaje == null || porcentaje === 0) {
    return res.status(400).json({ success: false, error: "Indicá un porcentaje distinto de 0" });
  }
  const { data, error } = await supabase.rpc("aumentar_precios_servicios", {
    _porcentaje: porcentaje,
    _categoria_id: categoriaId,
  });
  if (error) return rpcError(res, error, "Error al aplicar el aumento");
  return res.json({ success: true, data });
};

// =========================================================
// CONFIGURACIÓN
// =========================================================
export const getConfiguracionServicios = async (_req, res) => {
  const { data, error } = await supabase
    .from("configuracion").select("clave, valor, descripcion").in("clave", CLAVES_CONFIG);
  if (error) return rpcError(res, error, "Error al obtener la configuración");

  const cfg = Object.fromEntries((data || []).map((r) => [r.clave, r.valor]));
  return res.json({
    success: true,
    data: {
      multiplicador_repuesto_default: toNumberOrNull(cfg.multiplicador_repuesto_default) ?? 3,
      redondeo_multiplo: toNumberOrNull(cfg.redondeo_multiplo) ?? 5000,
      redondeo_modo: MODOS_REDONDEO.includes(cfg.redondeo_modo) ? cfg.redondeo_modo : "arriba",
    },
  });
};

export const updateConfiguracionServicios = async (req, res) => {
  const body = req.body || {};
  const filas = [];

  if (body.multiplicador_repuesto_default !== undefined) {
    const m = toNumberOrNull(body.multiplicador_repuesto_default);
    if (m == null || m <= 0) return res.status(400).json({ success: false, error: "Multiplicador inválido" });
    filas.push({ clave: "multiplicador_repuesto_default", valor: String(m) });
  }
  if (body.redondeo_multiplo !== undefined) {
    const r = toNumberOrNull(body.redondeo_multiplo);
    if (r == null || r < 0) return res.status(400).json({ success: false, error: "Múltiplo de redondeo inválido" });
    filas.push({ clave: "redondeo_multiplo", valor: String(r) });
  }
  if (body.redondeo_modo !== undefined) {
    if (!MODOS_REDONDEO.includes(body.redondeo_modo)) {
      return res.status(400).json({ success: false, error: "Modo de redondeo inválido" });
    }
    filas.push({ clave: "redondeo_modo", valor: body.redondeo_modo });
  }
  if (filas.length === 0) return res.status(400).json({ success: false, error: "Nada para actualizar" });

  const ahora = new Date().toISOString();
  for (const f of filas) {
    const { error } = await supabase
      .from("configuracion").update({ valor: f.valor, updated_at: ahora }).eq("clave", f.clave);
    if (error) return rpcError(res, error, "Error al guardar la configuración");
  }
  return getConfiguracionServicios(req, res);
};

// =========================================================
// LÍNEAS DE SERVICIO EN PRESUPUESTOS
// =========================================================
// GET /presupuesto/:id/servicios
export const getPresupuestoServicios = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, error: "ID inválido" });

  const { data, error } = await supabase
    .from("presupuesto_servicio")
    .select(`
      id, servicio_id, descripcion, tipo_calculo, cantidad, costo_repuesto, multiplicador,
      recargo_pct, precio_lista, precio_final, subtotal, costo_subtotal, orden,
      servicio:servicio_id ( id, nombre, tipo_calculo, precio_base, multiplicador, categoria:categoria_id ( nombre ) )
    `)
    .eq("presupuesto_id", id)
    .eq("activo", true)
    .order("orden", { ascending: true });
  if (error) return rpcError(res, error, "Error al obtener los servicios del presupuesto");
  return res.json({ success: true, data });
};

// POST /presupuesto/:id/servicios  { lineas: [...] }
// Reemplaza las líneas (las anteriores quedan desactivadas, no se borran) y,
// si hay líneas, actualiza total y costo del presupuesto con su suma.
export const savePresupuestoServicios = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, error: "ID inválido" });

  const lineas = Array.isArray(req.body?.lineas) ? req.body.lineas : null;
  if (!lineas) return res.status(400).json({ success: false, error: "Faltan las líneas" });

  const payload = lineas.map((l) => ({
    servicio_id: toNumberOrNull(l.servicio_id),
    descripcion: l.descripcion ?? null,
    tipo_calculo: l.tipo_calculo ?? "fijo",
    cantidad: toNumberOrNull(l.cantidad) ?? 1,
    costo_repuesto: toNumberOrNull(l.costo_repuesto) ?? 0,
    multiplicador: toNumberOrNull(l.multiplicador),
    recargo_pct: toNumberOrNull(l.recargo_pct) ?? 0,
    precio_lista: toNumberOrNull(l.precio_lista) ?? 0,
    precio_final: toNumberOrNull(l.precio_final),
  }));

  const { data, error } = await supabase.rpc("guardar_presupuesto_servicios", {
    _presupuesto_id: id,
    _lineas: payload,
  });
  if (error) return rpcError(res, error, "Error al guardar los servicios del presupuesto");
  return res.json({ success: true, data });
};