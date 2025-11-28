// src/controllers/categoriaProducto.controller.js
import { supabase } from "../../config/supabase.js";

/* ============================
   GET: Obtener todas las categorías
   ============================ */
export const getCategoriasProducto = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categoria_producto")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Error en getCategoriasProducto:", err.message);
    return res.status(500).json({
      success: false,
      error: "Error al obtener categorías",
    });
  }
};


/* ============================
   POST: Crear una nueva categoría
   ============================ */
export const createCategoriaProducto = async (req, res) => {
  try {
    const { nombre, descripcion, tipo_equipo } = req.body;

    // Validaciones básicas
    if (!nombre?.trim()) {
      return res.status(400).json({
        success: false,
        error: "El nombre es obligatorio",
      });
    }

    if (!descripcion?.trim()) {
      return res.status(400).json({
        success: false,
        error: "La descripción es obligatoria",
      });
    }

    if (!tipo_equipo?.trim()) {
      return res.status(400).json({
        success: false,
        error: "El tipo_equipo es obligatorio",
      });
    }

    // Validar que la descripción sea única
    const { data: existDesc, error: descError } = await supabase
      .from("categoria_producto")
      .select("id")
      .eq("descripcion", descripcion.trim());

    if (descError) throw descError;

    if (existDesc && existDesc.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Ya existe una categoría con esa descripción",
      });
    }

    // Insertar categoría
    const { data, error } = await supabase
      .from("categoria_producto")
      .insert([
        {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          tipo_equipo: tipo_equipo.trim(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Error en createCategoriaProducto:", err.message);
    return res.status(500).json({
      success: false,
      error: "Error al crear categoría",
    });
  }
};
