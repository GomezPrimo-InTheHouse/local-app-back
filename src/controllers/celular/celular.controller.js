// controllers/celular/celular.controller.js
import { supabase } from "../../config/supabase.js";
import path from "path";
import { obtenerCotizacionHoy } from "../../services/dolar.service.js";

// =========================================================
// CONSTANTES
// =========================================================
const CATEGORIA_ID_CELULAR = 25; // "Celular" en categoria_producto (tipo_equipo = 'movil')

const TIPO_ENTREGA = {
  EN_STOCK_LOCAL: "EN_STOCK_LOCAL",
  A_PEDIDO_24H: "A_PEDIDO_24H",
  SIN_STOCK_CONSULTAR: "SIN_STOCK_CONSULTAR",
};
const TIPOS_ENTREGA_VALIDOS = new Set(Object.values(TIPO_ENTREGA));

const ESTADO_EN_STOCK = 9;
const ESTADO_SIN_STOCK = 10;

const GAMAS_VALIDAS = new Set(["baja", "media", "alta"]);

const BUCKET_PRODUCTOS_FOTOS = process.env.SUPABASE_PRODUCTOS_BUCKET || "productos-fotos";

// =========================================================
// HELPERS
// =========================================================
const normalizeTipoEntrega = (val) => {
  if (val == null) return null;
  return String(val).trim().toUpperCase();
};

const parseBoolean = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["true", "1", "si", "sí", "on"].includes(value.toLowerCase());
  }
  return false;
};

const parseNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

/**
 * Calcula estado_id y tipo_entrega en base al stock cargado.
 * - stock > 0  -> En Stock, entrega local (no se puede pedir "a pedido" si ya hay stock)
 * - stock = 0  -> Sin Stock, y el usuario elige si es "a pedido" o "sin stock a consultar"
 */
function calcularDisponibilidad(stock, tipoEntregaSolicitado) {
  const stockNum = Number(stock) || 0;

  if (stockNum > 0) {
    return { estado_id: ESTADO_EN_STOCK, tipo_entrega: TIPO_ENTREGA.EN_STOCK_LOCAL };
  }

  const solicitado = normalizeTipoEntrega(tipoEntregaSolicitado);
  const tipoFinal =
    solicitado === TIPO_ENTREGA.SIN_STOCK_CONSULTAR
      ? TIPO_ENTREGA.SIN_STOCK_CONSULTAR
      : TIPO_ENTREGA.A_PEDIDO_24H; // default cuando no hay stock y no se especifica

  return { estado_id: ESTADO_SIN_STOCK, tipo_entrega: tipoFinal };
}

/**
 * Calcula costo (pesos) y precio final (recomendado, salvo que venga un precio manual)
 * usando la cotización del dólar de hoy.
 */
async function calcularCostoYPrecio({ costo_usd, margen_porcentaje, precioManual }) {
  const dolar = await obtenerCotizacionHoy();

  const costoPesos = Number(costo_usd) * Number(dolar.valor);
  const precioRecomendado = costoPesos * (1 + Number(margen_porcentaje) / 100);

  const tieneManual = precioManual !== undefined && precioManual !== null && precioManual !== "";
  const precioFinal = tieneManual ? Number(precioManual) : precioRecomendado;

  return {
    costo: Number(costoPesos.toFixed(2)),
    precio: Number(precioFinal.toFixed(2)),
    precio_recomendado: Number(precioRecomendado.toFixed(2)),
    dolar,
  };
}

/**
 * Sube un archivo al bucket de productos y devuelve la URL pública.
 */
async function subirFotoProducto(file, prefijo) {
  const ext = path.extname(file.originalname) || ".jpg";
  const fileName = `${prefijo}_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_PRODUCTOS_FOTOS)
    .upload(fileName, file.buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.mimetype,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_PRODUCTOS_FOTOS)
    .getPublicUrl(uploadData.path);

  return publicUrlData.publicUrl;
}

// =========================================================
// GET /celular  — listado con filtros
// Query params: marca, ram_gb, almacenamiento_gb, gama, tipo_entrega
// =========================================================
export const listarCelulares = async (req, res) => {
  try {
    const { marca, ram_gb, almacenamiento_gb, gama, tipo_entrega } = req.query;

    let query = supabase
      .from("producto")
      .select("*")
      .eq("categoria_id", CATEGORIA_ID_CELULAR)
      .order("id", { ascending: false });

    if (marca) query = query.ilike("marca", `%${marca}%`);
    if (gama) query = query.eq("gama", gama);
    if (ram_gb) query = query.eq("ram_gb", Number(ram_gb));
    if (almacenamiento_gb) query = query.eq("almacenamiento_gb", Number(almacenamiento_gb));
    if (tipo_entrega) {
      const tipoNorm = normalizeTipoEntrega(tipo_entrega);
      if (!TIPOS_ENTREGA_VALIDOS.has(tipoNorm)) {
        return res.status(400).json({
          success: false,
          error: `tipo_entrega inválido. Valores permitidos: ${Array.from(TIPOS_ENTREGA_VALIDOS).join(", ")}`,
        });
      }
      query = query.eq("tipo_entrega", tipoNorm);
    }

    const { data, error } = await query;
    if (error) throw error;

    const dolar = await obtenerCotizacionHoy();

    res.status(200).json({ success: true, data, dolar });
  } catch (error) {
    console.error("Error en listarCelulares:", error.message || error);
    res.status(500).json({ success: false, error: "Error al obtener el catálogo de celulares" });
  }
};

// =========================================================
// GET /celular/opciones-filtro
// Devuelve marcas, RAM, almacenamientos y gamas actualmente cargados
// =========================================================
export const obtenerOpcionesFiltro = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("producto")
      .select("marca, ram_gb, almacenamiento_gb, gama")
      .eq("categoria_id", CATEGORIA_ID_CELULAR);

    if (error) throw error;

    const marcas = [...new Set(data.map((d) => d.marca).filter(Boolean))].sort();
    const rams = [...new Set(data.map((d) => d.ram_gb).filter(Boolean))].sort((a, b) => a - b);
    const almacenamientos = [...new Set(data.map((d) => d.almacenamiento_gb).filter(Boolean))].sort((a, b) => a - b);

    res.status(200).json({
      success: true,
      data: {
        marcas,
        rams,
        almacenamientos,
        gamas: ["baja", "media", "alta"],
        tipos_entrega: Array.from(TIPOS_ENTREGA_VALIDOS),
      },
    });
  } catch (error) {
    console.error("Error en obtenerOpcionesFiltro:", error.message || error);
    res.status(500).json({ success: false, error: "Error al obtener opciones de filtro" });
  }
};

// =========================================================
// GET /celular/:id
// =========================================================
export const obtenerCelularPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);
    if (Number.isNaN(idNum)) {
      return res.status(400).json({ success: false, error: `ID inválido: ${id}` });
    }

    const { data, error } = await supabase
      .from("producto")
      .select("*")
      .eq("id", idNum)
      .eq("categoria_id", CATEGORIA_ID_CELULAR)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: "Equipo no encontrado" });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en obtenerCelularPorId:", error.message || error);
    res.status(500).json({ success: false, error: "Error al obtener el equipo" });
  }
};

// =========================================================
// POST /celular — crear
// =========================================================
export const crearCelular = async (req, res) => {
  try {
    const {
      nombre,
      marca,
      color,
      stock,
      descripcion,
      costo_usd,
      margen_porcentaje,
      ram_gb,
      almacenamiento_gb,
      gama,
      tipo_entrega,
      precio, // opcional: precio manual, pisa al recomendado
      subir_web,
      oferta,
      descripcion_web,
    } = req.body;

    // Validaciones obligatorias
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, error: "El nombre es obligatorio" });
    }
    if (!marca || !marca.trim()) {
      return res.status(400).json({ success: false, error: "La marca es obligatoria" });
    }
    if (costo_usd == null || isNaN(Number(costo_usd))) {
      return res.status(400).json({ success: false, error: "El costo en USD es obligatorio y debe ser numérico" });
    }
    if (margen_porcentaje == null || isNaN(Number(margen_porcentaje))) {
      return res.status(400).json({ success: false, error: "El margen (%) es obligatorio y debe ser numérico" });
    }
    if (!ram_gb || isNaN(Number(ram_gb))) {
      return res.status(400).json({ success: false, error: "La RAM (GB) es obligatoria y debe ser numérica" });
    }
    if (!almacenamiento_gb || isNaN(Number(almacenamiento_gb))) {
      return res.status(400).json({ success: false, error: "El almacenamiento (GB) es obligatorio y debe ser numérico" });
    }
    if (!gama || !GAMAS_VALIDAS.has(gama)) {
      return res.status(400).json({ success: false, error: "La gama debe ser 'baja', 'media' o 'alta'" });
    }

    // Categoría fija "Celular"
    const { data: catRow, error: catError } = await supabase
      .from("categoria_producto")
      .select("id, descripcion")
      .eq("id", CATEGORIA_ID_CELULAR)
      .maybeSingle();
    if (catError) throw catError;
    if (!catRow) {
      return res.status(500).json({ success: false, error: "La categoría 'Celular' (id 25) no existe en categoria_producto" });
    }

    const stockNum = stock === "" || stock == null || isNaN(Number(stock)) ? 0 : parseInt(stock, 10);
    const { estado_id, tipo_entrega: tipoEntregaFinal } = calcularDisponibilidad(stockNum, tipo_entrega);

    const { costo, precio: precioFinal } = await calcularCostoYPrecio({
      costo_usd,
      margen_porcentaje,
      precioManual: precio,
    });

    // Subida de imágenes (0, 1 o 2 archivos, campos 'foto' y 'foto2')
    let fotoUrl = null;
    let fotoUrl2 = null;
    if (req.files?.foto?.[0]) {
      fotoUrl = await subirFotoProducto(req.files.foto[0], "producto");
    }
    if (req.files?.foto2?.[0]) {
      fotoUrl2 = await subirFotoProducto(req.files.foto2[0], "producto2");
    }

    const { data, error } = await supabase
      .from("producto")
      .insert([
        {
          nombre: nombre.trim(),
          marca: marca.trim(),
          color: color ? color.trim() : null,
          stock: stockNum,
          descripcion: (descripcion || "").trim(),
          categoria_id: CATEGORIA_ID_CELULAR,
          categoria: catRow.descripcion,
          costo_usd: Number(costo_usd),
          margen_porcentaje: Number(margen_porcentaje),
          ram_gb: Number(ram_gb),
          almacenamiento_gb: Number(almacenamiento_gb),
          gama,
          costo,
          precio: precioFinal,
          estado_id,
          tipo_entrega: tipoEntregaFinal,
          foto_url: fotoUrl,
          foto_url_2: fotoUrl2,
          subir_web: parseBoolean(subir_web),
          oferta: parseNullableNumber(oferta),
          descripcion_web: descripcion_web || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Error en crearCelular:", error.message || error);
    res.status(500).json({ success: false, error: "Error al crear el equipo" });
  }
};

// =========================================================
// PUT /celular/:id — actualizar
// =========================================================
export const actualizarCelular = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);
    if (Number.isNaN(idNum)) {
      return res.status(400).json({ success: false, error: `ID inválido: ${id}` });
    }

    // Verificar que el producto exista y sea un celular (evita editar otras categorías por este endpoint)
    const { data: existente, error: errorExistente } = await supabase
      .from("producto")
      .select("*")
      .eq("id", idNum)
      .eq("categoria_id", CATEGORIA_ID_CELULAR)
      .maybeSingle();
    if (errorExistente) throw errorExistente;
    if (!existente) {
      return res.status(404).json({ success: false, error: "Equipo no encontrado" });
    }

    const {
      nombre,
      marca,
      color,
      stock,
      descripcion,
      costo_usd,
      margen_porcentaje,
      ram_gb,
      almacenamiento_gb,
      gama,
      tipo_entrega,
      precio,
      subir_web,
      oferta,
      descripcion_web,
    } = req.body;

    if (gama !== undefined && gama !== "" && !GAMAS_VALIDAS.has(gama)) {
      return res.status(400).json({ success: false, error: "La gama debe ser 'baja', 'media' o 'alta'" });
    }

    // Tomamos el valor nuevo si vino, si no el que ya tenía guardado
    const stockNum = stock !== undefined && stock !== "" ? parseInt(stock, 10) : existente.stock;
    const costoUsdFinal = costo_usd !== undefined && costo_usd !== "" ? Number(costo_usd) : existente.costo_usd;
    const margenFinal = margen_porcentaje !== undefined && margen_porcentaje !== "" ? Number(margen_porcentaje) : existente.margen_porcentaje;

    const { estado_id, tipo_entrega: tipoEntregaFinal } = calcularDisponibilidad(stockNum, tipo_entrega);

    const { costo, precio: precioFinal } = await calcularCostoYPrecio({
      costo_usd: costoUsdFinal,
      margen_porcentaje: margenFinal,
      precioManual: precio,
    });

    // Imágenes: solo se reemplazan si viene un archivo nuevo
    let fotoUrl = existente.foto_url;
    let fotoUrl2 = existente.foto_url_2;
    if (req.files?.foto?.[0]) {
      fotoUrl = await subirFotoProducto(req.files.foto[0], "producto");
    }
    if (req.files?.foto2?.[0]) {
      fotoUrl2 = await subirFotoProducto(req.files.foto2[0], "producto2");
    }

    const updatePayload = {
      nombre: nombre !== undefined ? nombre.trim() : existente.nombre,
      marca: marca !== undefined ? marca.trim() : existente.marca,
      color: color !== undefined ? (color ? color.trim() : null) : existente.color,
      stock: stockNum,
      descripcion: descripcion !== undefined ? descripcion.trim() : existente.descripcion,
      costo_usd: costoUsdFinal,
      margen_porcentaje: margenFinal,
      ram_gb: ram_gb !== undefined && ram_gb !== "" ? Number(ram_gb) : existente.ram_gb,
      almacenamiento_gb: almacenamiento_gb !== undefined && almacenamiento_gb !== "" ? Number(almacenamiento_gb) : existente.almacenamiento_gb,
      gama: gama !== undefined && gama !== "" ? gama : existente.gama,
      costo,
      precio: precioFinal,
      estado_id,
      tipo_entrega: tipoEntregaFinal,
      foto_url: fotoUrl,
      foto_url_2: fotoUrl2,
      subir_web: subir_web !== undefined ? parseBoolean(subir_web) : existente.subir_web,
      oferta: oferta !== undefined ? parseNullableNumber(oferta) : existente.oferta,
      descripcion_web: descripcion_web !== undefined ? descripcion_web : existente.descripcion_web,
    };

    const { data, error } = await supabase
      .from("producto")
      .update(updatePayload)
      .eq("id", idNum)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en actualizarCelular:", error.message || error);
    res.status(500).json({ success: false, error: "Error al actualizar el equipo" });
  }
};

// =========================================================
// DELETE /celular/:id
// =========================================================
export const eliminarCelular = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);

    // Verificar que sea un celular antes de borrar (mismo motivo que en actualizar)
    const { data: existente, error: errorExistente } = await supabase
      .from("producto")
      .select("id")
      .eq("id", idNum)
      .eq("categoria_id", CATEGORIA_ID_CELULAR)
      .maybeSingle();
    if (errorExistente) throw errorExistente;
    if (!existente) {
      return res.status(404).json({ success: false, error: "Equipo no encontrado" });
    }

    const { error } = await supabase.from("producto").delete().eq("id", idNum);
    if (error) throw error;

    res.status(200).json({ success: true, data: `Equipo ${idNum} eliminado correctamente` });
  } catch (error) {
    console.error("Error en eliminarCelular:", error.message || error);
    res.status(500).json({ success: false, error: "Error al eliminar el equipo" });
  }
};