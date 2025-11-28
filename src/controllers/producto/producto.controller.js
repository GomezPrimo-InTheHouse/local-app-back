// import { pool } from '../config/db.js';
import { supabase } from '../../config/supabase.js';



// ✅ Crear producto con categoria_id
export const createProducto = async (req, res) => {
  try {
    const {
      nombre,
      stock,
      precio,
      estado_id,
      descripcion,
      categoria_id, // 👈 viene del front
      costo,
    } = req.body;

    // 🔹 Validaciones mínimas
    if (!nombre) {
      return res
        .status(400)
        .json({ success: false, error: "El nombre es obligatorio" });
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

    // 🔹 Normalizar valores numéricos
    const stockNum =
      stock === "" || stock == null || isNaN(Number(stock))
        ? 0
        : parseInt(stock, 10);
    const precioNum = parseFloat(precio);
    const costoNum = parseFloat(costo);
    const estadoIdNum =
      estado_id == null || estado_id === "" ? null : Number(estado_id);
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

    // Usamos la descripción de la categoría como texto legacy
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
          categoria: categoriaTexto, // 👈 mantenés compatibilidad con el campo viejo
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Error en createProducto:", error.message || error);
    return res
      .status(500)
      .json({ success: false, error: "Error al crear producto" });
  }
};

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


// ✅ Actualizar producto
// export const updateProducto = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { nombre, stock, precio, descripcion, estado_id, categoria, costo } = req.body;

//     // 🔎 Validar existencia de producto
//     const { data: existing, error: existingError } = await supabase
//       .from("producto")
//       .select("id")
//       .eq("id", id)
//       .single();

//     if (existingError && existingError.code === "PGRST116") {
//       return res.status(404).json({ success: false, error: "Producto no encontrado" });
//     }
//     if (existingError) throw existingError;

//     // 🔎 Validar estado_id si viene
//     if (estado_id) {
//       const { data: estadoRows, error: estadoError } = await supabase
//         .from("estado")
//         .select("id")
//         .eq("id", estado_id);

//       if (estadoError) throw estadoError;
//       if (!estadoRows || estadoRows.length === 0) {
//         return res.status(400).json({ success: false, error: `El estado_id ${estado_id} no existe` });
//       }
//     }

//     // ✅ Actualizar
//     const { data, error } = await supabase
//       .from("producto")
//       .update({ nombre, stock, precio, descripcion, estado_id, categoria, costo })
//       .eq("id", id)
//       .select()
//       .single();

//     if (error) throw error;

//     res.status(200).json({ success: true, data });
//   } catch (error) {
//     console.error("Error en updateProducto:", error.message);
//     res.status(500).json({ success: false, error: "Error al actualizar producto" });
//   }
// };

// controllers/producto.controller.js

// ✅ Actualizar producto con categoria_id
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
    } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: "Falta el ID del producto" });
    }

    if (!nombre) {
      return res
        .status(400)
        .json({ success: false, error: "El nombre es obligatorio" });
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

    const productoIdNum = Number(id);
    const stockNum =
      stock === "" || stock == null || isNaN(Number(stock))
        ? 0
        : parseInt(stock, 10);
    const precioNum = parseFloat(precio);
    const costoNum = parseFloat(costo);
    const estadoIdNum =
      estado_id == null || estado_id === "" ? null : Number(estado_id);
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

    // ✅ Actualizar producto
    const { data, error } = await supabase
      .from("producto")
      .update({
        nombre: nombre.trim(),
        stock: stockNum,
        precio: precioNum,
        costo: costoNum,
        estado_id: estadoIdNum,
        descripcion: (descripcion || "").trim(),
        categoria_id: categoriaIdNum,
        categoria: categoriaTexto,
      })
      .eq("id", productoIdNum)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res
        .status(404)
        .json({ success: false, error: "Producto no encontrado" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en updateProducto:", error.message || error);
    return res
      .status(500)
      .json({ success: false, error: "Error al actualizar producto" });
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
export const getRepuestosProducto = async (req, res) => {
  try {
    const { tipo_equipo } = req.query; // ej: 'celular', 'notebook', 'pc'

    let query = supabase
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
      .not("categoria_id", "is", null) // sólo productos con categoría asignada
      .ilike("categoria_producto.descripcion", "repuesto-%"); // 👈 sólo categorías de repuestos

    // Filtro opcional por tipo_equipo
    if (tipo_equipo) {
      query = query.eq("categoria_producto.tipo_equipo", tipo_equipo);
    }

    const { data, error } = await query.order("nombre", { ascending: true });

    if (error) throw error;

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
