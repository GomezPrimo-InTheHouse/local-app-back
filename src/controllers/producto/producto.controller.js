// import { pool } from '../config/db.js';
import { supabase } from '../../config/supabase.js';
import path from "path";

// =========================================================
// CONSTANTES: Tipo de entrega (Catálogo)
// =========================================================
const TIPO_ENTREGA = {
  EN_STOCK_LOCAL: "EN_STOCK_LOCAL",
  A_PEDIDO_24H: "A_PEDIDO_24H",
  SIN_STOCK_CONSULTAR: "SIN_STOCK_CONSULTAR",
};

const TIPOS_ENTREGA_VALIDOS = new Set(Object.values(TIPO_ENTREGA));

const normalizeTipoEntrega = (val) => {
  if (val == null) return null;
  return String(val).trim().toUpperCase();
};

const BUCKET_PRODUCTOS_FOTOS =
  process.env.SUPABASE_PRODUCTOS_BUCKET || "productos-fotos";

const parseBoolean = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    return ["true", "1", "si", "sí", "on"].includes(v);
  }
  return false;
};

const parseNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

// ✅ Crear producto con categoria_id
// export const createProducto = async (req, res) => {
//   try {
//     const {
//       nombre,
//       stock,
//       precio,
//       estado_id,
//       descripcion,
//       categoria_id, // 👈 viene del front
//       costo,
//     } = req.body;

//     // 🔹 Validaciones mínimas
//     if (!nombre) {
//       return res
//         .status(400)
//         .json({ success: false, error: "El nombre es obligatorio" });
//     }
//     if (precio == null || isNaN(Number(precio))) {
//       return res.status(400).json({
//         success: false,
//         error: "El precio es obligatorio y debe ser numérico",
//       });
//     }
//     if (costo == null || isNaN(Number(costo))) {
//       return res.status(400).json({
//         success: false,
//         error: "El costo es obligatorio y debe ser numérico",
//       });
//     }
//     if (!categoria_id) {
//       return res.status(400).json({
//         success: false,
//         error: "La categoría (categoria_id) es obligatoria",
//       });
//     }

//     // 🔹 Normalizar valores numéricos
//     const stockNum =
//       stock === "" || stock == null || isNaN(Number(stock))
//         ? 0
//         : parseInt(stock, 10);
//     const precioNum = parseFloat(precio);
//     const costoNum = parseFloat(costo);
//     const estadoIdNum =
//       estado_id == null || estado_id === "" ? null : Number(estado_id);
//     const categoriaIdNum = Number(categoria_id);

//     // 🔹 Validar categoría
//     const { data: catRows, error: catError } = await supabase
//       .from("categoria_producto")
//       .select("id, descripcion")
//       .eq("id", categoriaIdNum)
//       .maybeSingle();

//     if (catError) throw catError;
//     if (!catRows) {
//       return res.status(400).json({
//         success: false,
//         error: `La categoria_id ${categoriaIdNum} no existe`,
//       });
//     }

//     // Usamos la descripción de la categoría como texto legacy
//     const categoriaTexto = catRows.descripcion;

//     // 🔹 Validar estado_id si viene
//     if (estadoIdNum) {
//       const { data: estadoRows, error: estadoError } = await supabase
//         .from("estado")
//         .select("id")
//         .eq("id", estadoIdNum);

//       if (estadoError) throw estadoError;
//       if (!estadoRows || estadoRows.length === 0) {
//         return res.status(400).json({
//           success: false,
//           error: `El estado_id ${estadoIdNum} no existe`,
//         });
//       }
//     }

//     // ✅ Insertar producto
//     const { data, error } = await supabase
//       .from("producto")
//       .insert([
//         {
//           nombre: nombre.trim(),
//           stock: stockNum,
//           precio: precioNum,
//           costo: costoNum,
//           estado_id: estadoIdNum,
//           descripcion: (descripcion || "").trim(),
//           categoria_id: categoriaIdNum,
//           categoria: categoriaTexto, // 👈 mantenés compatibilidad con el campo viejo
//         },
//       ])
//       .select()
//       .single();

//     if (error) throw error;

//     return res.status(201).json({ success: true, data });
//   } catch (error) {
//     console.error("Error en createProducto:", error.message || error);
//     return res
//       .status(500)
//       .json({ success: false, error: "Error al crear producto" });
//   }
// };

// // ✅ Crear producto con categoria_id + foto + subir_web + oferta
// export const createProducto = async (req, res) => {
//   try {
//     const {
//       nombre,
//       stock,
//       precio,
//       estado_id,
//       descripcion,
//       categoria_id, // 👈 viene del front
//       costo,
//       subir_web,    // 👈 nuevo campo
//       oferta,       // 👈 nuevo campo
//       descripcion_web, // 👈 nuevo campo
//     } = req.body;

//     // 🔹 Validaciones mínimas
//     if (!nombre) {
//       return res
//         .status(400)
//         .json({ success: false, error: "El nombre es obligatorio" });
//     }
//     if (precio == null || isNaN(Number(precio))) {
//       return res.status(400).json({
//         success: false,
//         error: "El precio es obligatorio y debe ser numérico",
//       });
//     }
//     if (costo == null || isNaN(Number(costo))) {
//       return res.status(400).json({
//         success: false,
//         error: "El costo es obligatorio y debe ser numérico",
//       });
//     }
//     if (!categoria_id) {
//       return res.status(400).json({
//         success: false,
//         error: "La categoría (categoria_id) es obligatoria",
//       });
//     }

//     // 🔹 Validar oferta si viene
//     if (oferta !== undefined && oferta !== null && oferta !== "") {
//       if (isNaN(Number(oferta))) {
//         return res.status(400).json({
//           success: false,
//           error: "La oferta debe ser numérica (porcentaje de descuento)",
//         });
//       }
//     }

//     // 🔹 Normalizar valores
//     const stockNum =
//       stock === "" || stock == null || isNaN(Number(stock))
//         ? 0
//         : parseInt(stock, 10);
//     const precioNum = parseFloat(precio);
//     const costoNum = parseFloat(costo);
//     const estadoIdNum =
//       estado_id == null || estado_id === "" ? null : Number(estado_id);
//     const categoriaIdNum = Number(categoria_id);

//     const subirWebBool = parseBoolean(subir_web);
//     const ofertaNum = parseNullableNumber(oferta); // puede quedar null

//     // 🔹 Validar categoría
//     const { data: catRows, error: catError } = await supabase
//       .from("categoria_producto")
//       .select("id, descripcion")
//       .eq("id", categoriaIdNum)
//       .maybeSingle();

//     if (catError) throw catError;
//     if (!catRows) {
//       return res.status(400).json({
//         success: false,
//         error: `La categoria_id ${categoriaIdNum} no existe`,
//       });
//     }

//     // Usamos la descripción de la categoría como texto legacy
//     const categoriaTexto = catRows.descripcion;
//     // 🔹 Validar estado_id si viene
//     if (estadoIdNum) {
//       const { data: estadoRows, error: estadoError } = await supabase
//         .from("estado")
//         .select("id")
//         .eq("id", estadoIdNum);

//       if (estadoError) throw estadoError;
//       if (!estadoRows || estadoRows.length === 0) {
//         return res.status(400).json({
//           success: false,
//           error: `El estado_id ${estadoIdNum} no existe`,
//         });
//       }
//     }

//     // 🔹 Subir imagen si viene archivo
//     let fotoUrl = null;

//     if (req.file) {
//       const ext = path.extname(req.file.originalname) || ".jpg";
//       const fileName = `producto_${Date.now()}_${Math.round(
//         Math.random() * 1e9
//       )}${ext}`;

//       const { data: uploadData, error: uploadError } = await supabase.storage
//         .from(BUCKET_PRODUCTOS_FOTOS)
//         .upload(fileName, req.file.buffer, {
//           cacheControl: "3600",
//           upsert: false,
//           contentType: req.file.mimetype,
//         });

//       if (uploadError) {
//         console.error("Error subiendo imagen a Supabase:", uploadError);
//         return res.status(500).json({
//           success: false,
//           error: "Error al subir la imagen del producto",
//         });
//       }

//       const { data: publicUrlData } = supabase.storage
//         .from(BUCKET_PRODUCTOS_FOTOS)
//         .getPublicUrl(uploadData.path);

//       fotoUrl = publicUrlData.publicUrl;
//     }

//     // ✅ Insertar producto
//     const { data, error } = await supabase
//       .from("producto")
//       .insert([
//         {
//           nombre: nombre.trim(),
//           stock: stockNum,
//           precio: precioNum,
//           costo: costoNum,
//           estado_id: estadoIdNum,
//           descripcion: (descripcion || "").trim(),
//           categoria_id: categoriaIdNum,
//           categoria: categoriaTexto,
//           foto_url: fotoUrl,      // 👈 NUEVO
//           subir_web: subirWebBool, // 👈 NUEVO
//           oferta: ofertaNum,       // 👈 NUEVO (puede ser null)
//           descripcion_web: descripcion_web || null, // 👈 NUEV O
//         },
//       ])
//       .select()
//       .single();

//     if (error) throw error;

//     return res.status(201).json({ success: true, data });
//   } catch (error) {
//     console.error("Error en createProducto:", error.message || error);
//     return res
//       .status(500)
//       .json({ success: false, error: "Error al crear producto" });
//   }
// };

// ✅ Crear producto con categoria_id + foto + subir_web + oferta + tipo_entrega - ultima version
export const createProducto = async (req, res) => {
  try {
    const {
      nombre,
      stock,
      precio,
      estado_id,
      descripcion,
      categoria_id,
      costo,
      subir_web,
      oferta,
      descripcion_web,
      tipo_entrega, // 👈 NUEVO
    } = req.body;

    // 🔹 Validaciones mínimas
    if (!nombre) {
      return res.status(400).json({ success: false, error: "El nombre es obligatorio" });
    }
    if (precio == null || isNaN(Number(precio))) {
      return res.status(400).json({
        success: false,
        error: "El precio es obligatorio y debe ser numérico",
      });
    }
    if (costo == null || isNaN(Number(costo))) {
      return res.status(400).json({
        success: false,
        error: "El costo es obligatorio y debe ser numérico",
      });
    }
    if (!categoria_id) {
      return res.status(400).json({
        success: false,
        error: "La categoría (categoria_id) es obligatoria",
      });
    }

    // 🔹 Validar oferta si viene
    if (oferta !== undefined && oferta !== null && oferta !== "") {
      if (isNaN(Number(oferta))) {
        return res.status(400).json({
          success: false,
          error: "La oferta debe ser numérica (porcentaje de descuento)",
        });
      }
    }

    // 🔹 Validar tipo_entrega si viene (si no viene, usamos default)
    const tipoEntregaNorm = normalizeTipoEntrega(tipo_entrega) || TIPO_ENTREGA.EN_STOCK_LOCAL;
    if (!TIPOS_ENTREGA_VALIDOS.has(tipoEntregaNorm)) {
      return res.status(400).json({
        success: false,
        error: `tipo_entrega inválido. Valores permitidos: ${Array.from(TIPOS_ENTREGA_VALIDOS).join(", ")}`,
      });
    }

    // 🔹 Normalizar valores
    const stockNum =
      stock === "" || stock == null || isNaN(Number(stock)) ? 0 : parseInt(stock, 10);
    const precioNum = parseFloat(precio);
    const costoNum = parseFloat(costo);
    const estadoIdNum = estado_id == null || estado_id === "" ? null : Number(estado_id);
    const categoriaIdNum = Number(categoria_id);

    const subirWebBool = parseBoolean(subir_web);
    const ofertaNum = parseNullableNumber(oferta);

    // 🔹 Validar categoría
    const { data: catRows, error: catError } = await supabase
      .from("categoria_producto")
      .select("id, descripcion")
      .eq("id", categoriaIdNum)
      .maybeSingle();

    if (catError) throw catError;
    if (!catRows) {
      return res.status(400).json({
        success: false,
        error: `La categoria_id ${categoriaIdNum} no existe`,
      });
    }

    const categoriaTexto = catRows.descripcion;

    // 🔹 Validar estado_id si viene
    if (estadoIdNum) {
      const { data: estadoRows, error: estadoError } = await supabase
        .from("estado")
        .select("id")
        .eq("id", estadoIdNum);

      if (estadoError) throw estadoError;
      if (!estadoRows || estadoRows.length === 0) {
        return res.status(400).json({
          success: false,
          error: `El estado_id ${estadoIdNum} no existe`,
        });
      }
    }

    // 🔹 Subir imagen si viene archivo
    let fotoUrl = null;

    if (req.file) {
      const ext = path.extname(req.file.originalname) || ".jpg";
      const fileName = `producto_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_PRODUCTOS_FOTOS)
        .upload(fileName, req.file.buffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        console.error("Error subiendo imagen a Supabase:", uploadError);
        return res.status(500).json({
          success: false,
          error: "Error al subir la imagen del producto",
        });
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_PRODUCTOS_FOTOS)
        .getPublicUrl(uploadData.path);

      fotoUrl = publicUrlData.publicUrl;
    }

    // ✅ Insertar producto
    const { data, error } = await supabase
      .from("producto")
      .insert([
        {
          nombre: nombre.trim(),
          stock: stockNum,
          precio: precioNum,
          costo: costoNum,
          estado_id: estadoIdNum,
          descripcion: (descripcion || "").trim(),
          categoria_id: categoriaIdNum,
          categoria: categoriaTexto,
          foto_url: fotoUrl,
          subir_web: subirWebBool,
          oferta: ofertaNum,
          descripcion_web: descripcion_web || null,
          tipo_entrega: tipoEntregaNorm, // ✅ NUEVO
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Error en createProducto:", error.message || error);
    return res.status(500).json({ success: false, error: "Error al crear producto" });
  }
};
// ✅ Actualizar producto con categoria_id + foto + subir_web + oferta + tipo_entrega - ultima version
export const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nombre,
      stock,
      precio,
      estado_id,
      descripcion,
      categoria_id,
      costo,
      subir_web,
      oferta,
      descripcion_web,
      tipo_entrega, // 👈 NUEVO
    } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: "Falta el ID del producto" });
    }

    if (!nombre) {
      return res.status(400).json({ success: false, error: "El nombre es obligatorio" });
    }
    if (precio == null || isNaN(Number(precio))) {
      return res.status(400).json({
        success: false,
        error: "El precio es obligatorio y debe ser numérico",
      });
    }
    if (costo == null || isNaN(Number(costo))) {
      return res.status(400).json({
        success: false,
        error: "El costo es obligatorio y debe ser numérico",
      });
    }
    if (!categoria_id) {
      return res.status(400).json({
        success: false,
        error: "La categoría (categoria_id) es obligatoria",
      });
    }

    // 🔹 Validar oferta si viene
    if (oferta !== undefined && oferta !== null && oferta !== "") {
      if (isNaN(Number(oferta))) {
        return res.status(400).json({
          success: false,
          error: "La oferta debe ser numérica (porcentaje de descuento)",
        });
      }
    }

    const productoIdNum = Number(id);
    const stockNum =
      stock === "" || stock == null || isNaN(Number(stock)) ? 0 : parseInt(stock, 10);
    const precioNum = parseFloat(precio);
    const costoNum = parseFloat(costo);
    const estadoIdNum = estado_id == null || estado_id === "" ? null : Number(estado_id);
    const categoriaIdNum = Number(categoria_id);

    // 🔹 Validar categoría
    const { data: catRows, error: catError } = await supabase
      .from("categoria_producto")
      .select("id, descripcion")
      .eq("id", categoriaIdNum)
      .maybeSingle();

    if (catError) throw catError;
    if (!catRows) {
      return res.status(400).json({
        success: false,
        error: `La categoria_id ${categoriaIdNum} no existe`,
      });
    }

    const categoriaTexto = catRows.descripcion;

    // 🔹 Validar estado_id si viene
    if (estadoIdNum) {
      const { data: estadoRows, error: estadoError } = await supabase
        .from("estado")
        .select("id")
        .eq("id", estadoIdNum);

      if (estadoError) throw estadoError;
      if (!estadoRows || estadoRows.length === 0) {
        return res.status(400).json({
          success: false,
          error: `El estado_id ${estadoIdNum} no existe`,
        });
      }
    }

    // 🔹 Subir nueva imagen si viene archivo
    let nuevaFotoUrl = null;

    if (req.file) {
      const ext = path.extname(req.file.originalname) || ".jpg";
      const fileName = `producto_${productoIdNum}_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_PRODUCTOS_FOTOS)
        .upload(fileName, req.file.buffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        console.error("Error subiendo imagen a Supabase:", uploadError);
        return res.status(500).json({
          success: false,
          error: "Error al subir la imagen del producto",
        });
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_PRODUCTOS_FOTOS)
        .getPublicUrl(uploadData.path);

      nuevaFotoUrl = publicUrlData.publicUrl;
    }

    const subirWebBool = subir_web !== undefined ? parseBoolean(subir_web) : undefined;
    const ofertaNum = oferta !== undefined ? parseNullableNumber(oferta) : undefined;

    // 🔹 Validar tipo_entrega si viene
    let tipoEntregaNorm = null;
    if (tipo_entrega !== undefined) {
      tipoEntregaNorm = normalizeTipoEntrega(tipo_entrega);
      if (!tipoEntregaNorm) tipoEntregaNorm = TIPO_ENTREGA.EN_STOCK_LOCAL;

      if (!TIPOS_ENTREGA_VALIDOS.has(tipoEntregaNorm)) {
        return res.status(400).json({
          success: false,
          error: `tipo_entrega inválido. Valores permitidos: ${Array.from(TIPOS_ENTREGA_VALIDOS).join(", ")}`,
        });
      }
    }

    // 🔹 Construimos el payload de update
    const updatePayload = {
      nombre: nombre.trim(),
      stock: stockNum,
      precio: precioNum,
      costo: costoNum,
      estado_id: estadoIdNum,
      descripcion: (descripcion || "").trim(),
      categoria_id: categoriaIdNum,
      categoria: categoriaTexto,
      descripcion_web: descripcion_web || null,
    };

    if (nuevaFotoUrl !== null) updatePayload.foto_url = nuevaFotoUrl;
    if (subirWebBool !== undefined) updatePayload.subir_web = subirWebBool;
    if (ofertaNum !== undefined) updatePayload.oferta = ofertaNum;

    // ✅ NUEVO: actualizar tipo_entrega si vino en el request
    if (tipoEntregaNorm !== null) {
      updatePayload.tipo_entrega = tipoEntregaNorm;
    }

    // ✅ Actualizar producto
    const { data, error } = await supabase
      .from("producto")
      .update(updatePayload)
      .eq("id", productoIdNum)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, error: "Producto no encontrado" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en updateProducto:", error.message || error);
    return res.status(500).json({ success: false, error: "Error al actualizar producto" });
  }
};


// // ✅ Actualizar producto con categoria_id + foto + subir_web + oferta
// export const updateProducto = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const {
//       nombre,
//       stock,
//       precio,
//       estado_id,
//       descripcion,
//       categoria_id,
//       costo,
//       subir_web, // 👈 nuevo campo
//       oferta,    // 👈 nuevo campo
//       descripcion_web, // 👈 nuevo campo
//     } = req.body;

//     if (!id) {
//       return res
//         .status(400)
//         .json({ success: false, error: "Falta el ID del producto" });
//     }

//     if (!nombre) {
//       return res
//         .status(400)
//         .json({ success: false, error: "El nombre es obligatorio" });
//     }
//     if (precio == null || isNaN(Number(precio))) {
//       return res.status(400).json({
//         success: false,
//         error: "El precio es obligatorio y debe ser numérico",
//       });
//     }
//     if (costo == null || isNaN(Number(costo))) {
//       return res.status(400).json({
//         success: false,
//         error: "El costo es obligatorio y debe ser numérico",
//       });
//     }
//     if (!categoria_id) {
//       return res.status(400).json({
//         success: false,
//         error: "La categoría (categoria_id) es obligatoria",
//       });
//     }

//     // 🔹 Validar oferta si viene
//     if (oferta !== undefined && oferta !== null && oferta !== "") {
//       if (isNaN(Number(oferta))) {
//         return res.status(400).json({
//           success: false,
//           error: "La oferta debe ser numérica (porcentaje de descuento)",
//         });
//       }
//     }

//     const productoIdNum = Number(id);
//     const stockNum =
//       stock === "" || stock == null || isNaN(Number(stock))
//         ? 0
//         : parseInt(stock, 10);
//     const precioNum = parseFloat(precio);
//     const costoNum = parseFloat(costo);
//     const estadoIdNum =
//       estado_id == null || estado_id === "" ? null : Number(estado_id);
//     const categoriaIdNum = Number(categoria_id);

//     // 🔹 Validar categoría
//     const { data: catRows, error: catError } = await supabase
//       .from("categoria_producto")
//       .select("id, descripcion")
//       .eq("id", categoriaIdNum)
//       .maybeSingle();

//     if (catError) throw catError;
//     if (!catRows) {
//       return res.status(400).json({
//         success: false,
//         error: `La categoria_id ${categoriaIdNum} no existe`,
//       });
//     }

//     const categoriaTexto = catRows.descripcion;

//     // 🔹 Validar estado_id si viene
//     if (estadoIdNum) {
//       const { data: estadoRows, error: estadoError } = await supabase
//         .from("estado")
//         .select("id")
//         .eq("id", estadoIdNum);

//       if (estadoError) throw estadoError;
//       if (!estadoRows || estadoRows.length === 0) {
//         return res.status(400).json({
//           success: false,
//           error: `El estado_id ${estadoIdNum} no existe`,
//         });
//       }
//     }

//     // 🔹 Subir nueva imagen si viene archivo
//     let nuevaFotoUrl = null;

//     if (req.file) {
//       const ext = path.extname(req.file.originalname) || ".jpg";
//       const fileName = `producto_${productoIdNum}_${Date.now()}_${Math.round(
//         Math.random() * 1e9
//       )}${ext}`;

//       const { data: uploadData, error: uploadError } = await supabase.storage
//         .from(BUCKET_PRODUCTOS_FOTOS)
//         .upload(fileName, req.file.buffer, {
//           cacheControl: "3600",
//           upsert: false,
//           contentType: req.file.mimetype,
//         });

//       if (uploadError) {
//         console.error("Error subiendo imagen a Supabase:", uploadError);
//         return res.status(500).json({
//           success: false,
//           error: "Error al subir la imagen del producto",
//         });
//       }

//       const { data: publicUrlData } = supabase.storage
//         .from(BUCKET_PRODUCTOS_FOTOS)
//         .getPublicUrl(uploadData.path);

//       nuevaFotoUrl = publicUrlData.publicUrl;
//     }

//     const subirWebBool =
//       subir_web !== undefined ? parseBoolean(subir_web) : undefined;
//     const ofertaNum =
//       oferta !== undefined ? parseNullableNumber(oferta) : undefined;

//     // 🔹 Construimos el payload de update
//     const updatePayload = {
//       nombre: nombre.trim(),
//       stock: stockNum,
//       precio: precioNum,
//       costo: costoNum,
//       estado_id: estadoIdNum,
//       descripcion: (descripcion || "").trim(),
//       categoria_id: categoriaIdNum,
//       categoria: categoriaTexto,
//       descripcion_web: descripcion_web || null, // 👈 NUEVO
//     };

//     if (nuevaFotoUrl !== null) {
//       updatePayload.foto_url = nuevaFotoUrl; // 👈 solo si se subió nueva foto
//     }

//     if (subirWebBool !== undefined) {
//       updatePayload.subir_web = subirWebBool;
//     }

//     if (ofertaNum !== undefined) {
//       updatePayload.oferta = ofertaNum; // puede ser null si borrás la oferta
//     }

//     // ✅ Actualizar producto
//     const { data, error } = await supabase
//       .from("producto")
//       .update(updatePayload)
//       .eq("id", productoIdNum)
//       .select()
//       .single();

//     if (error) throw error;
//     if (!data) {
//       return res
//         .status(404)
//         .json({ success: false, error: "Producto no encontrado" });
//     }

//     return res.status(200).json({ success: true, data });
//   } catch (error) {
//     console.error("Error en updateProducto:", error.message || error);
//     return res
//       .status(500)
//       .json({ success: false, error: "Error al actualizar producto" });
//   }
// };

// ✅ Actualizar producto con categoria_id
// export const updateProducto = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const {
//       nombre,
//       stock,
//       precio,
//       estado_id,
//       descripcion,
//       categoria_id,
//       costo,
//     } = req.body;

//     if (!id) {
//       return res
//         .status(400)
//         .json({ success: false, error: "Falta el ID del producto" });
//     }

//     if (!nombre) {
//       return res
//         .status(400)
//         .json({ success: false, error: "El nombre es obligatorio" });
//     }
//     if (precio == null || isNaN(Number(precio))) {
//       return res.status(400).json({
//         success: false,
//         error: "El precio es obligatorio y debe ser numérico",
//       });
//     }
//     if (costo == null || isNaN(Number(costo))) {
//       return res.status(400).json({
//         success: false,
//         error: "El costo es obligatorio y debe ser numérico",
//       });
//     }
//     if (!categoria_id) {
//       return res.status(400).json({
//         success: false,
//         error: "La categoría (categoria_id) es obligatoria",
//       });
//     }

//     const productoIdNum = Number(id);
//     const stockNum =
//       stock === "" || stock == null || isNaN(Number(stock))
//         ? 0
//         : parseInt(stock, 10);
//     const precioNum = parseFloat(precio);
//     const costoNum = parseFloat(costo);
//     const estadoIdNum =
//       estado_id == null || estado_id === "" ? null : Number(estado_id);
//     const categoriaIdNum = Number(categoria_id);

//     // 🔹 Validar categoría
//     const { data: catRows, error: catError } = await supabase
//       .from("categoria_producto")
//       .select("id, descripcion")
//       .eq("id", categoriaIdNum)
//       .maybeSingle();

//     if (catError) throw catError;
//     if (!catRows) {
//       return res.status(400).json({
//         success: false,
//         error: `La categoria_id ${categoriaIdNum} no existe`,
//       });
//     }

//     const categoriaTexto = catRows.descripcion;

//     // 🔹 Validar estado_id si viene
//     if (estadoIdNum) {
//       const { data: estadoRows, error: estadoError } = await supabase
//         .from("estado")
//         .select("id")
//         .eq("id", estadoIdNum);

//       if (estadoError) throw estadoError;
//       if (!estadoRows || estadoRows.length === 0) {
//         return res.status(400).json({
//           success: false,
//           error: `El estado_id ${estadoIdNum} no existe`,
//         });
//       }
//     }

//     // ✅ Actualizar producto
//     const { data, error } = await supabase
//       .from("producto")
//       .update({
//         nombre: nombre.trim(),
//         stock: stockNum,
//         precio: precioNum,
//         costo: costoNum,
//         estado_id: estadoIdNum,
//         descripcion: (descripcion || "").trim(),
//         categoria_id: categoriaIdNum,
//         categoria: categoriaTexto,
//       })
//       .eq("id", productoIdNum)
//       .select()
//       .single();

//     if (error) throw error;
//     if (!data) {
//       return res
//         .status(404)
//         .json({ success: false, error: "Producto no encontrado" });
//     }

//     return res.status(200).json({ success: true, data });
//   } catch (error) {
//     console.error("Error en updateProducto:", error.message || error);
//     return res
//       .status(500)
//       .json({ success: false, error: "Error al actualizar producto" });
//   }
// };





// ✅ Obtener todos los productos
export const getProductos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("producto")
      .select("*")
      .order("id", { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en getProductos:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener productos" });
  }
};

// ✅ Obtener producto por ID
export const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);

    if (Number.isNaN(idNum)) {
      return res.status(400).json({
        success: false,
        error: `ID de producto inválido: ${id}`,
      });
    }

    const { data, error } = await supabase
      .from('producto')
      .select('*')
      .eq('id', idNum)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado',
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error en getProductoById:', err);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener producto',
    });
  }
};





// ✅ Eliminar producto
export const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("producto")
      .delete()
      .eq("id", id);

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ success: false, error: "Producto no encontrado" });
    }
    if (error) throw error;

    res.status(200).json({ success: true, data: `Producto ${id} eliminado correctamente` });
  } catch (error) {
    console.error("Error en deleteProducto:", error.message);
    res.status(500).json({ success: false, error: "Error al eliminar producto" });
  }
};

export const buscarProductos = async (req, res) => {
  const { nombre } = req.query; // Ej: /productos/buscar?nombre=mouse

  try {
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Debe proporcionar un nombre para buscar",
      });
    }

    // 🔹 Opción 1: usar RPC
    // const { data, error } = await supabase.rpc("buscar_productos_v2", {
    //   p_nombre: nombre,
    // });

    // 🔹 Opción 2: si no querés RPC, usar .ilike()
    const { data, error } = await supabase
      .from("producto")
      .select("*")
      .ilike("nombre", `%${nombre}%`);

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en buscarProductos:", error.message);
    res.status(500).json({
      success: false,
      error: "Error al buscar productos",
    });
  }
};



/**
 * GET /producto/repuestos
 * Opcional: ?tipo_equipo=celular|notebook|pc
 *
 * Devuelve sólo productos cuya categoría tenga descripcion que comience con 'repuesto-'
 * (ej: 'repuesto-taller-celular', 'repuesto-taller-notebook', 'repuesto-taller-pc')
 */
// ✅ Obtener productos de tipo "repuesto-..." (opcionalmente filtrados por tipo_equipo)
export const getRepuestosProducto = async (req, res) => {
  try {
    const { tipo_equipo } = req.query; // ej: 'celular', 'notebook', 'pc'

    // 1) Buscar categorías que sean de repuestos
    let catQuery = supabase
      .from("categoria_producto")
      .select("id, nombre, descripcion, tipo_equipo")
      .ilike("descripcion", "repuesto-%"); // ej: 'repuesto-taller-celular'

    if (tipo_equipo) {
      catQuery = catQuery.eq("tipo_equipo", tipo_equipo);
    }

    const { data: categorias, error: catError } = await catQuery;

    if (catError) {
      console.error("Error buscando categorías de repuestos:", catError);
      return res.status(500).json({
        success: false,
        error: "Error al obtener categorías de repuestos",
      });
    }

    if (!categorias || categorias.length === 0) {
      // No hay categorías de repuesto para ese tipo_equipo → devolvemos lista vacía
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const categoriaIds = categorias.map((c) => c.id);

    // 2) Buscar productos que pertenezcan a esas categorías
    const { data, error } = await supabase
      .from("producto")
      .select(
        `
        id,
        nombre,
        stock,
        precio,
        costo,
        descripcion,
        categoria_id,
        categoria_producto:categoria_id (
          id,
          nombre,
          descripcion,
          tipo_equipo
        )
      `
      )
      .in("categoria_id", categoriaIds)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error en query de productos de repuestos:", error);
      throw error;
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error en getRepuestosProducto:", error.message || error);
    return res.status(500).json({
      success: false,
      error: "Error al obtener productos de repuestos",
    });
  }
};

