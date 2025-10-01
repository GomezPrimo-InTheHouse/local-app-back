// import { pool } from '../config/db.js';
// import { supabase } from '../config/supabase.js';

// // ✅ Crear producto
// export const createProducto = async (req, res) => {
//   try {
//     const { nombre, stock, precio, estado_id, descripcion, categoria, costo } = req.body;

//     if (!nombre || stock == null || precio == null || costo == null) {
//       return res.status(400).json({ success: false, error: "Faltan campos obligatorios (nombre, stock, precio, costo)" });
//     }
//     // Si se pasa estado_id, validar que exista en la tabla estadox
//     if (estado_id) {
//         const { rows: estadoRows } = await pool.query("SELECT id FROM estado WHERE id = $1;", [estado_id]);
//         if (estadoRows.length === 0) {
//             return res.status(400).json({ success: false, error: `El estado_id ${estado_id} no existe` });
//             }
//     }
    
//     // ✅ Insertar nuevo producto

//     const query = `
//       INSERT INTO producto (nombre, stock, precio, estado_id, descripcion, categoria, costo)
//       VALUES ($1, $2, $3, $4, $5, $6, $7)
//       RETURNING *;
//     `;
//     const values = [nombre, stock, precio, estado_id, descripcion, categoria, costo];
//     const { rows } = await pool.query(query, values);

//     res.status(200).json({ success: true, data: rows[0] });
//   } catch (error) {
//     console.error("Error en createProducto:", error.message);
//     res.status(500).json({ success: false, error: "Error al crear producto" });
//   }
// };

// // ✅ Obtener todos los productos
// export const getProductos = async (req, res) => {
//   try {
//     const { rows } = await pool.query("SELECT * FROM producto ORDER BY id DESC;");
//     res.status(200).json({ success: true, data: rows });
//   } catch (error) {
//     console.error("Error en getProductos:", error.message);
//     res.status(500).json({ success: false, error: "Error al obtener productos" });
//   }
// };

// // ✅ Obtener producto por ID
// export const getProductoById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { rows } = await pool.query("SELECT * FROM producto WHERE id = $1;", [id]);

//     if (rows.length === 0) {
//       return res.status(404).json({ success: false, error: "Producto no encontrado" });
//     }

//     res.status(200).json({ success: true, data: rows[0] });
//   } catch (error) {
//     console.error("Error en getProductoById:", error.message);
//     res.status(500).json({ success: false, error: "Error al obtener producto" });
//   }
// };


// // Actualizar producto con COALESCE y validación de estado_id
// export const updateProducto = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { nombre, stock, precio, descripcion, estado_id, categoria, costo } = req.body;

//     // 🔎 Verificar si existe el producto
//     const { rows: existing } = await pool.query("SELECT * FROM producto WHERE id = $1;", [id]);
//     if (existing.length === 0) {
//       return res.status(404).json({ success: false, error: "Producto no encontrado" });
//     }

//     // 🔎 Si se pasa estado_id, validar que exista en la tabla estado
//     if (estado_id) {
//       const { rows: estadoRows } = await pool.query("SELECT id FROM estado WHERE id = $1;", [estado_id]);
//       if (estadoRows.length === 0) {
//         return res.status(400).json({ success: false, error: `El estado_id ${estado_id} no existe` });
//       }
//     }

//     // ✅ Actualizar con COALESCE para mantener valores existentes si no se envían
//     const query = `
//       UPDATE producto
//       SET 
//         nombre = COALESCE($1, nombre),
//         stock = COALESCE($2, stock),
//         precio = COALESCE($3, precio),
//         descripcion = COALESCE($4, descripcion),
//         estado_id = COALESCE($5, estado_id),
//         categoria = COALESCE($6, categoria),
//         costo = COALESCE($7, costo)
//       WHERE id = $8
//       RETURNING *;
//     `;

//     const values = [
//       nombre || null,
//       stock || null,
//       precio || null,
//       descripcion || null,
//       estado_id || null,
//       categoria || null,
//       id,
//       costo || null
//     ];

//     const { rows } = await pool.query(query, values);

//     res.status(200).json({ success: true, data: rows[0] });

//   } catch (error) {
//     console.error("Error en updateProducto:", error.message);
//     res.status(500).json({ success: false, error: "Error al actualizar producto" });
//   }
// };


// // ✅ Eliminar producto
// export const deleteProducto = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { rowCount } = await pool.query("DELETE FROM producto WHERE id = $1;", [id]);

//     if (rowCount === 0) {
//       return res.status(404).json({ success: false, error: "Producto no encontrado" });
//     }

//     res.status(200).json({ success: true, data: `Producto ${id} eliminado correctamente` });
//   } catch (error) {
//     console.error("Error en deleteProducto:", error.message);
//     res.status(500).json({ success: false, error: "Error al eliminar producto" });
//   }
// };

import { supabase } from '../config/supabase.js';

// ✅ Crear producto
export const createProducto = async (req, res) => {
  try {
    const { nombre, stock, precio, estado_id, descripcion, categoria, costo } = req.body;

    if (!nombre || stock == null || precio == null || costo == null) {
      return res.status(400).json({ success: false, error: "Faltan campos obligatorios (nombre, stock, precio, costo)" });
    }

    // 🔎 Validar estado_id si viene
    if (estado_id) {
      const { data: estadoRows, error: estadoError } = await supabase
        .from("estado")
        .select("id")
        .eq("id", estado_id);

      if (estadoError) throw estadoError;
      if (!estadoRows || estadoRows.length === 0) {
        return res.status(400).json({ success: false, error: `El estado_id ${estado_id} no existe` });
      }
    }

    // ✅ Insertar producto
    const { data, error } = await supabase
      .from("producto")
      .insert([{ nombre, stock, precio, estado_id, descripcion, categoria, costo }])
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en createProducto:", error.message);
    res.status(500).json({ success: false, error: "Error al crear producto" });
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

    const { data, error } = await supabase
      .from("producto")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ success: false, error: "Producto no encontrado" });
    }
    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en getProductoById:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener producto" });
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

export const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, stock, precio, descripcion, estado_id, categoria, costo, cantidad, operacion } = req.body;

    // 🔎 Validar existencia de producto
    const { data: existing, error: existingError } = await supabase
      .from("producto")
      .select("id, stock")
      .eq("id", id)
      .single();

    if (existingError && existingError.code === "PGRST116") {
      return res.status(404).json({ success: false, error: "Producto no encontrado" });
    }
    if (existingError) throw existingError;

    let newStock = stock;

    // ✅ Si viene operacion + cantidad => modificar stock actual
    if (operacion && cantidad !== undefined) {
      if (operacion === "incrementar") {
        newStock = existing.stock + cantidad;
      } else if (operacion === "decrementar") {
        newStock = existing.stock - cantidad;
        if (newStock < 0) {
          return res.status(400).json({ success: false, error: "Stock insuficiente" });
        }
      } else {
        return res.status(400).json({ success: false, error: "Operación inválida, use 'incrementar' o 'decrementar'" });
      }
    }

    // ✅ Validar estado_id si viene
    if (estado_id) {
      const { data: estadoRows, error: estadoError } = await supabase
        .from("estado")
        .select("id")
        .eq("id", estado_id);

      if (estadoError) throw estadoError;
      if (!estadoRows || estadoRows.length === 0) {
        return res.status(400).json({ success: false, error: `El estado_id ${estado_id} no existe` });
      }
    }

    // Construir payload dinámicamente (no pisar campos no enviados)
    const updatePayload = {};
    if (nombre !== undefined) updatePayload.nombre = nombre;
    if (precio !== undefined) updatePayload.precio = precio;
    if (descripcion !== undefined) updatePayload.descripcion = descripcion;
    if (estado_id !== undefined) updatePayload.estado_id = estado_id;
    if (categoria !== undefined) updatePayload.categoria = categoria;
    if (costo !== undefined) updatePayload.costo = costo;
    if (newStock !== undefined) updatePayload.stock = newStock;

    // ✅ Actualizar en Supabase
    const { data, error } = await supabase
      .from("producto")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error en updateProducto:", error.message);
    res.status(500).json({ success: false, error: "Error al actualizar producto" });
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
