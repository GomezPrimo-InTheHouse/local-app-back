import supabase from "../../config/supabase.js";

// LISTAR TODOS LOS CUPONES
export const listarCupones = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("cupon_cliente")
      .select("*")
      .order("id", { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// CREAR CUPÓN MANUAL
export const crearCuponManual = async (req, res) => {
  try {
    const cup = req.body;

    const { data, error } = await supabase
      .from("cupon_cliente")
      .insert([cup])
      .select("*")
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
