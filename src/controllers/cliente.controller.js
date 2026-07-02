// import  { pool }  from '../config/db.js';

import { supabase } from '../config/supabase.js';



/* Obtener todos los clientes */
export const getClientes = async (req, res) => {
  try {
    // En tu archivo de controladores de cliente, busca el GET principal y añade:
const { data, error } = await supabase
  .from('cliente')
  .select('*')
  .neq('estado_id', 18) // Excluir los que están dados de baja
  // .order('nombre', { ascending: true });
  .order('id', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
};



/* Crear nuevo cliente -> usa RPC atómica crear_cliente_si_no_existe */

export const createCliente = async (req, res) => {
  try {
    console.log("BODY createCliente:", req.body);
    console.log("FILE createCliente:", req.file);
    const {
      nombre,
      apellido,
      dni,
      direccion,
      celular,
      celular_contacto,
      foto_url: fotoUrlBody,
    } = req.body;

    // ✅ CAMBIO: DNI ya no es obligatorio — puede ser null/vacío
    // ❌ ELIMINAR: if (!dni) { return res.status(400).json({ msg: "DNI requerido" }); }

    const dni_trim = dni ? dni.trim() : null; // ✅ null si no viene
    let fotoUrlFinal = fotoUrlBody || null;

    if (req.file) {
      const file = req.file;
      const ext = (file.originalname && file.originalname.split(".").pop()) || "jpg";
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const fileName = `${uniqueId}.${ext}`;
      const filePath = `clientes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("clientes-fotos")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (!uploadError) {
        const { data: publicData } = supabase.storage
          .from("clientes-fotos")
          .getPublicUrl(filePath);
        fotoUrlFinal = publicData?.publicUrl || null;
      } else {
        console.error("Error al subir imagen a Supabase Storage:", uploadError);
      }
    }

    // ✅ CAMBIO: agregamos _canal_alta que requiere la RPC actualizada
    const { data, error } = await supabase.rpc("crear_cliente_if_not_exists", {
      _nombre: nombre ?? null,
      _apellido: apellido ?? null,
      _dni: dni_trim,           // ✅ puede ser null
      _direccion: direccion ?? null,
      _celular: celular ?? null,
      _celular_contacto: celular_contacto ?? null,
      _foto_url: fotoUrlFinal,
      _canal_alta: "local",     // ✅ nuevo parámetro requerido por la RPC
    });

    if (error) {
      const msg = (error.message || "").toUpperCase();
      if (msg.includes("CLIENTE_EXISTE")) {
        return res.status(400).json({ msg: "El cliente ya existe" });
      }
      return res.status(500).json({ error: error.message || error });
    }

    const cliente = Array.isArray(data) ? data[0] : data;
    return res.status(200).json(cliente);
  } catch (err) {
    console.error("Error en createCliente:", err);
    return res.status(500).json({ error: err.message || err });
  }
};
/* Actualizar cliente -> usa RPC actualizar_cliente para validar dni único */
export const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      apellido,
      dni,
      direccion,
      celular,
      celular_contacto,
      foto_url: fotoUrlBody, // puede venir desde el front
    } = req.body;

    let fotoUrlFinal = fotoUrlBody ?? null;

    // 🔹 Si viene archivo nuevo, reemplazamos la foto en Storage
    if (req.file) {
      const file = req.file;
      const ext =
        (file.originalname && file.originalname.split(".").pop()) || "jpg";
      const uniqueId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const fileName = `${uniqueId}.${ext}`;
      const filePath = `clientes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("clientes-fotos")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error(
          "Error al subir nueva imagen de cliente a Supabase Storage:",
          uploadError
        );
        // Podés decidir si cortás acá o seguís manteniendo la foto anterior
      } else {
        const { data: publicData } = supabase.storage
          .from("clientes-fotos")
          .getPublicUrl(filePath);

        fotoUrlFinal = publicData?.publicUrl || null;
      }
    }

    const { data, error } = await supabase.rpc("actualizar_cliente", {
      _id: Number(id),
      _nombre: nombre ?? null,
      _apellido: apellido ?? null,
      _dni: dni ?? null,
      _direccion: direccion ?? null,
      _celular: celular ?? null,
      _celular_contacto: celular_contacto ?? null,
      _foto_url: fotoUrlFinal,
    });

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ msg: "Cliente no encontrado" });
    }

    return res.json(data[0]);
  } catch (err) {
    console.error("Error en updateCliente:", err);
    return res.status(500).json({ error: err.message || err });
  }
};



/* Eliminar cliente (Borrado Lógico usando ID 18) */
export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ msg: 'ID de cliente requerido' });
    }

    // Actualizamos al ID 18 que es "Registro dado de baja" en ámbito "general"
    const { data, error } = await supabase
      .from('cliente')
      .update({ 
        estado_id: 18, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ msg: 'Cliente no encontrado' });
      }
      throw error;
    }

    return res.json({ 
      msg: 'Cliente eliminado correctamente (Registro dado de baja)', 
      cliente: data 
    });

  } catch (err) {
    console.error('❌ Error en deleteCliente:', err.message);
    return res.status(500).json({ 
      msg: 'Error al procesar la baja del cliente', 
      error: err.message 
    });
  }
};;

/* Obtener cliente por ID */
export const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('cliente')
      .select('*')
      .eq('id', id)
      .single();

    // Si no hay fila .single() devuelve error; por seguridad comprobamos data
    if (error && (data === null || /No rows|Results contain 0 rows/i.test(error.message || ''))) {
      return res.status(404).json({ msg: 'Cliente no encontrado' });
    }
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
};

