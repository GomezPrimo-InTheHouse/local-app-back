// import  { pool }  from '../config/db.js';

import { supabase } from '../config/supabase.js';

// Obtener todos los clientes
// export const getClientes = async (req, res) => {
//   try {
//     const { rows } = await pool.query('SELECT * FROM cliente ORDER BY id DESC');
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// Obtener cliente por ID
// export const getClienteById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { rows } = await pool.query('SELECT * FROM cliente WHERE id = $1', [id]);
//     if (rows.length === 0) return res.status(404).json({ msg: 'Cliente no encontrado' });
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// Crear nuevo cliente
// export const createCliente = async (req, res) => {
//   try {
//     const { nombre, apellido, dni, direccion, celular, celular_contacto } = req.body;

//     //validar si el cliente exsite en la db por dni
//     const dni_cliente = dni.trim();
//     const result= await pool.query('SELECT * FROM cliente WHERE dni = $1', [dni_cliente]);
//     if (result.rows.length > 0) return res.status(400).json({ msg: 'El cliente ya existe' });

//     const query = `
//       INSERT INTO cliente (nombre, apellido, dni, direccion, celular, celular_contacto)
//       VALUES ($1,$2,$3,$4,$5,$6)
//       RETURNING *`;
//     const values = [nombre, apellido, dni, direccion, celular, celular_contacto];
//     const { rows } = await pool.query(query, values);
//     res.status(200).json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// Actualizar cliente
// export const updateCliente = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { nombre, apellido, dni, direccion, celular, celular_contacto } = req.body;
//     const query = `
//       UPDATE cliente
//       SET nombre=$1, apellido=$2, dni=$3, direccion=$4, celular=$5, celular_contacto=$6
//       WHERE id=$7
//       RETURNING *`;
//     const values = [nombre, apellido, dni, direccion, celular, celular_contacto, id];
//     const { rows } = await pool.query(query, values);
//     if (rows.length === 0) return res.status(404).json({ msg: 'Cliente no encontrado' });
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// Eliminar cliente
// export const deleteCliente = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { rowCount } = await pool.query('DELETE FROM cliente WHERE id = $1', [id]);
//     if (rowCount === 0) return res.status(404).json({ msg: 'Cliente no encontrado' });
//     res.json({ msg: 'Cliente eliminado correctamente' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };




// Exportar las funciones
// export default {
//     getClientes,
//     getClienteById,
//     createCliente,
//     updateCliente,
//     deleteCliente
// };

// controllers/clienteController.js


/* Obtener todos los clientes */
export const getClientes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cliente')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
};



/* Crear nuevo cliente -> usa RPC atómica crear_cliente_si_no_existe */

// export const createCliente = async (req, res) => {
//   try {
//     const { nombre, apellido, dni, direccion, celular, celular_contacto } = req.body;
//     if (!dni) return res.status(400).json({ msg: 'DNI requerido' });

//     const dni_trim = dni.trim();

//     // Llamamos a la RPC creada arriba (es atómica y evita race conditions)
//     const { data, error } = await supabase.rpc('crear_cliente_if_not_exists', {
//       _nombre: nombre ?? null,
//       _apellido: apellido ?? null,
//       _dni: dni_trim,
//       _direccion: direccion ?? null,
//       _celular: celular ?? null,
//       _celular_contacto: celular_contacto ?? null,
//     });

//     if (error) {
//       const msg = (error.message || '').toUpperCase();
//       if (msg.includes('CLIENTE_EXISTE')) {
//         return res.status(400).json({ msg: 'El cliente ya existe' });
//       }
//       return res.status(500).json({ error: error.message || error });
//     }

//     // rpc devuelve rows (TABLE) -> puede venir como array
//     const cliente = Array.isArray(data) ? data[0] : data;
//     res.status(200).json(cliente);

//   } catch (err) {

//     res.status(500).json({ error: err.message || err });
    
//   }
// };

//iniico test create cliente con foto


/* Crear nuevo cliente -> usa RPC atómica crear_cliente_if_not_exists */
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
      foto_url: fotoUrlBody, // por si te mandan un URL directo
      tipo_cliente
    } = req.body;

    if (!dni) {
      return res.status(400).json({ msg: "DNI requerido" });
    }

    const dni_trim = dni.trim();
    let fotoUrlFinal = fotoUrlBody || null;

    // 🔹 Si viene archivo, lo subimos a Supabase Storage
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
        .from("clientes-fotos") // 👈 nombre del bucket
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("Error al subir imagen a Supabase Storage:", uploadError);
        // Podés elegir seguir sin foto o cortar acá
        // return res.status(500).json({ error: "No se pudo subir la imagen" });
      } else {
        const { data: publicData } = supabase.storage
          .from("clientes-fotos")
          .getPublicUrl(filePath);

        fotoUrlFinal = publicData?.publicUrl || null;
      }
    }

    // 🔹 Llamamos al RPC (ahora incluye _foto_url)
    const { data, error } = await supabase.rpc(
      "crear_cliente_if_not_exists",
      {
        _nombre: nombre ?? null,
        _apellido: apellido ?? null,
        _dni: dni_trim,
        _direccion: direccion ?? null,
        _celular: celular ?? null,
        _celular_contacto: celular_contacto ?? null,
        _foto_url: fotoUrlFinal,
        _tipo_cliente: tipo_cliente ?? null
      }
    );

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

//fin test create cliente con foto

/* Actualizar cliente -> usa RPC actualizar_cliente para validar dni único */
// export const updateCliente = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { nombre, apellido, dni, direccion, celular, celular_contacto } = req.body;

//     const { data, error } = await supabase
//       .rpc('actualizar_cliente', {
//         _id: id,
//         _nombre: nombre,
//         _apellido: apellido,
//         _dni: dni,
//         _direccion: direccion,
//         _celular: celular,
//         _celular_contacto: celular_contacto
//       });

//     if (error) throw error;
//     if (data.length === 0) return res.status(404).json({ msg: 'Cliente no encontrado' });

//     res.json(data[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

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


/* Eliminar cliente */
export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('cliente')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // si no existe -> single() devuelve error con texto "Results contain 0 rows"
      if (/No rows|Results contain 0 rows/i.test(error.message || '')) {
        return res.status(404).json({ msg: 'Cliente no encontrado' });
      }
      return res.status(500).json({ error: error.message || error });
    }

    res.json({ msg: 'Cliente eliminado correctamente', cliente: data });
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
};
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

