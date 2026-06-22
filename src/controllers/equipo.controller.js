

// import { supabase } from '../config/supabase.js';
// import axios from 'axios';
// import { pool } from '../config/supabaseAuthModule.js';



// //TEST
// /**
//  * POST /equipo
//  * Crea equipo + ingreso (mismo controller y transacción), y luego intenta enviar WhatsApp.
//  */
// // export const createEquipo = async (req, res) => {
// //   const {
// //     tipo,
// //     marca,
// //     modelo,
// //     imei = null,          // 🔹 NUEVO: IMEI opcional
// //     password = null,
// //     problema = null,
// //     fecha_ingreso = null, // date (YYYY-MM-DD) para equipo.fecha_ingreso
// //     patron = null,
// //     cliente_id,
// //     estado_id,
// //   } = req.body || {};

// //   // Validación mínima
// //   if (
// //     !tipo || !marca || !modelo ||
// //     !Number.isInteger(Number(cliente_id)) ||
// //     !Number.isInteger(Number(estado_id))
// //   ) {
// //     return res.status(400).json({
// //       success: false,
// //       error:
// //         "Campos requeridos: tipo, marca, modelo, cliente_id (int) y estado_id (int).",
// //     });
// //   }

// //   // Normalización
// //   const v_tipo = String(tipo).trim();
// //   const v_marca = String(marca).trim();
// //   const v_modelo = String(modelo).trim();
// //   const v_imei = imei == null ? null : String(imei).trim(); // 🔹 IMEI opcional normalizado
// //   const v_password = password == null ? null : String(password).trim();
// //   const v_problema = problema == null ? null : String(problema).trim();
// //   const v_patron = patron == null ? null : String(patron).trim();
// //   const v_clienteId = Number(cliente_id);
// //   const v_estadoId = Number(estado_id);
// //   const v_fechaIngreso = fecha_ingreso ? String(fecha_ingreso) : null;

// //   const client = await pool.connect();
// //   try {
// //     // ================== TRANSACCIÓN ==================
// //     await client.query("BEGIN");

// //     // 1) INSERT equipo (agregamos imei en las columnas y parámetros)
// //     const insertEquipoSQL = `
// //       INSERT INTO equipo
// //         (tipo, marca, modelo, imei, problema, password, patron, cliente_id, estado_id, fecha_ingreso, created_at, updated_at)
// //       VALUES
// //         (
// //           $1::varchar,
// //           $2::varchar,
// //           $3::varchar,
// //           $4::varchar,
// //           $5::text,
// //           $6::varchar,
// //           $7::varchar,
// //           $8::int,
// //           $9::int,
// //           COALESCE($10::date, CURRENT_DATE),
// //           CURRENT_DATE,
// //           CURRENT_DATE
// //         )
// //       RETURNING
// //         id,
// //         tipo,
// //         marca,
// //         modelo,
// //         imei,
// //         problema,
// //         password,
// //         patron,
// //         cliente_id,
// //         estado_id,
// //         fecha_ingreso,
// //         created_at,
// //         updated_at
// //     `;

// //     const equipoParams = [
// //       v_tipo,         // $1
// //       v_marca,        // $2
// //       v_modelo,       // $3
// //       v_imei,         // $4 🔹
// //       v_problema,     // $5
// //       v_password,     // $6
// //       v_patron,       // $7
// //       v_clienteId,    // $8
// //       v_estadoId,     // $9
// //       v_fechaIngreso, // $10
// //     ];

// //     const eqRes = await client.query(insertEquipoSQL, equipoParams);
// //     const equipo = eqRes.rows[0];

// //     // 2) INSERT ingreso asociado (usa now() en zona horaria de Argentina)
// //     const insertIngresoSQL = `
// //       INSERT INTO ingreso (equipo_id, fecha_ingreso, fecha_egreso, estado_id)
// //       VALUES (
// //         $1::int,
// //         (now() at time zone 'America/Argentina/Buenos_Aires')::timestamp,
// //         NULL,
// //         $2::int
// //       )
// //       RETURNING id, equipo_id, fecha_ingreso, fecha_egreso, estado_id
// //     `;
// //     const ingParams = [equipo.id, v_estadoId];
// //     const ingRes = await client.query(insertIngresoSQL, ingParams);
// //     const ingreso = ingRes.rows[0];

// //     // 3) COMMIT (equipo+ingreso listos)
// //     await client.query("COMMIT");

// //     // ================== ENVÍO DE MENSAJE (fuera de la transacción) ==================
// //     // Obtener datos del cliente
// //     const clienteRes = await pool.query(
// //       `SELECT nombre, apellido, celular FROM cliente WHERE id = $1::int`,
// //       [v_clienteId]
// //     );
// //     const cliente = clienteRes.rows[0];

// //     if (!cliente) {
// //       // Si no hay cliente, devolvemos igual equipo & ingreso
// //       return res.status(201).json({
// //         success: true,
// //         data: { equipo, ingreso },
// //         message:
// //           "Equipo e ingreso registrados. Cliente no encontrado para enviar mensaje.",
// //       });
// //     }

// //     // Armar mensaje (número fijo, como pediste)
// //     const numeroDestino = "+5493534275476";
// //     const equipoDescripcion = `${v_tipo} ${v_marca} ${v_modelo}`;
// //     const fechaEquipoAR = new Date(
// //       equipo.fecha_ingreso
// //     ).toLocaleDateString("es-AR", {
// //       year: "numeric",
// //       month: "2-digit",
// //       day: "2-digit",
// //     });

// //     const payloadMs = {
// //       numero: numeroDestino,
// //       cliente,
// //       equipo: equipoDescripcion,
// //       // Podés agregar aquí imei si después querés que Twilio lo reciba:
// //       // imei: v_imei,
// //       // textoPersonalizado: `Hola ${cliente.nombre} ${cliente.apellido} ...`
// //     };

// //     try {
// //       // const twilioResponse = await axios.post(
// //       //   "http://localhost:7002/twilio/enviar-mensaje",
// //       //   payloadMs
// //       // );

// //       return res.status(201).json({
// //         success: true,
// //         data: { equipo, ingreso, mensaje: twilioResponse.data },
// //         message:
// //           "Equipo e ingreso registrados; mensaje enviado correctamente.",
// //       });
// //     } catch (twilioErr) {
// //       console.error(
// //         "⚠️ Error al enviar mensaje (Twilio):",
// //         twilioErr?.message || twilioErr
// //       );
// //       return res.status(201).json({
// //         success: true,
// //         data: { equipo, ingreso },
// //         warning:
// //           "Equipo e ingreso registrados, pero no se pudo enviar el mensaje al cliente.",
// //       });
// //     }
// //   } catch (err) {
// //     try {
// //       await client.query("ROLLBACK");
// //     } catch {}
// //     console.error("❌ Error en createEquipo (SQL txn):", err);
// //     return res.status(500).json({
// //       success: false,
// //       error: err.message || "Error al registrar equipo e ingreso",
// //     });
// //   } finally {
// //     client.release();
// //   }
// // };



// export const createEquipo = async (req, res) => {
//   const {
//     tipo,
//     marca,
//     modelo,
//     imei = null,
//     password = null,
//     problema = null,
//     fecha_ingreso = null,
//     patron = null,
//     cliente_id,
//     estado_id,
//   } = req.body || {};

//   // 1. Validación mínima (Idéntica)
//   if (
//     !tipo || !marca || !modelo ||
//     !Number.isInteger(Number(cliente_id)) ||
//     !Number.isInteger(Number(estado_id))
//   ) {
//     return res.status(400).json({
//       success: false,
//       error: "Campos requeridos: tipo, marca, modelo, cliente_id (int) y estado_id (int).",
//     });
//   }

//   // 2. Normalización
//   const v_tipo = String(tipo).trim();
//   const v_marca = String(marca).trim();
//   const v_modelo = String(modelo).trim();
//   const v_imei = imei == null ? null : String(imei).trim();
//   const v_password = password == null ? null : String(password).trim();
//   const v_problema = problema == null ? null : String(problema).trim();
//   const v_patron = patron == null ? null : String(patron).trim();
//   const v_clienteId = Number(cliente_id);
//   const v_estadoId = Number(estado_id);
//   const v_fechaIngreso = fecha_ingreso ? String(fecha_ingreso) : new Date().toISOString().split('T')[0];

//   try {
//     // ================== PASO 1: INSERT EQUIPO ==================
//     const { data: equipo, error: errorEquipo } = await supabase
//       .from('equipo')
//       .insert([{
//         tipo: v_tipo,
//         marca: v_marca,
//         modelo: v_modelo,
//         imei: v_imei,
//         problema: v_problema,
//         password: v_password,
//         patron: v_patron,
//         cliente_id: v_clienteId,
//         estado_id: v_estadoId,
//         fecha_ingreso: v_fechaIngreso,
//         created_at: new Date(),
//         updated_at: new Date()
//       }])
//       .select()
//       .single();

//     if (errorEquipo) throw errorEquipo;

//     // ================== PASO 2: INSERT INGRESO ==================
//     // Para emular (now() at time zone 'America/Argentina/Buenos_Aires')
//     const fechaArg = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" });
    
//     const { data: ingreso, error: errorIngreso } = await supabase
//       .from('ingreso')
//       .insert([{
//         equipo_id: equipo.id,
//         fecha_ingreso: new Date(fechaArg),
//         fecha_egreso: null,
//         estado_id: v_estadoId
//       }])
//       .select()
//       .single();

//     if (errorIngreso) {
//       // "Rollback" manual: Si falla el ingreso, borramos el equipo creado
//       await supabase.from('equipo').delete().eq('id', equipo.id);
//       throw errorIngreso;
//     }

//     // ================== PASO 3: OBTENER DATOS DEL CLIENTE ==================
//     const { data: cliente, error: errorCliente } = await supabase
//       .from('cliente')
//       .select('nombre, apellido, celular')
//       .eq('id', v_clienteId)
//       .single();

//     if (!cliente) {
//       return res.status(201).json({
//         success: true,
//         data: { equipo, ingreso },
//         message: "Equipo e ingreso registrados. Cliente no encontrado para enviar mensaje.",
//       });
//     }

//     // ================== PASO 4: ENVÍO DE MENSAJE ==================
//     const numeroDestino = "+5493534275476";
//     const equipoDescripcion = `${v_tipo} ${v_marca} ${v_modelo}`;
    
//     // Formateo de fecha para el mensaje
//     const fechaEquipoAR = new Date(equipo.fecha_ingreso).toLocaleDateString("es-AR", {
//       year: "numeric", month: "2-digit", day: "2-digit",
//     });

//     const payloadMs = {
//       numero: numeroDestino,
//       cliente,
//       equipo: equipoDescripcion,
//     };

//     try {
//       // Aquí iría tu axios.post si lo habilitas
//       // const twilioRes = await axios.post("...", payloadMs);

//       return res.status(201).json({
//         success: true,
//         data: { equipo, ingreso }, // Puedes agregar mensaje: twilioRes.data si lo usas
//         message: "Equipo e ingreso registrados; mensaje enviado correctamente.",
//       });
//     } catch (twilioErr) {
//       console.error("⚠️ Error al enviar mensaje (Twilio):", twilioErr?.message);
//       return res.status(201).json({
//         success: true,
//         data: { equipo, ingreso },
//         warning: "Equipo e ingreso registrados, pero no se pudo enviar el mensaje al cliente.",
//       });
//     }

//   } catch (err) {
//     console.error("❌ Error en createEquipo:", err);
//     return res.status(500).json({
//       success: false,
//       error: err.message || "Error al registrar equipo e ingreso",
//     });
//   }
// };


// export const getEquipos = async (req, res) => {
//   try {
//     const { data, error } = await supabase
//       .from('equipo')
//       .select(`
//         id,
//         tipo,
//         marca,
//         modelo,
//         problema,
//         password,
//         patron,
//         fecha_ingreso,
//         estado_id,
//         cliente_id,
//         cliente:cliente_id ( nombre, apellido, celular, direccion )
//       `)
//       //solo los equipos que no tengan estado_id = 18 (dado de baja)
//       .neq('estado_id', 18)
//       .order('fecha_ingreso', { ascending: false });

//     if (error) throw error;

//     // Aplanar la estructura para devolver exactamente las mismas keys
//     const rows = (data || []).map(item => {
//       // cliente puede venir como objeto o como array (por seguridad lo manejamos)
//       const clienteRec = Array.isArray(item.cliente)
//         ? item.cliente[0]
//         : item.cliente;

//       return {
//         id: item.id,
//         tipo: item.tipo,
//         marca: item.marca,
//         modelo: item.modelo,
//         problema: item.problema,
//         password: item.password,
//         patron: item.patron,
//         fecha_ingreso: item.fecha_ingreso,
//         estado_id: item.estado_id,
//         cliente_id: item.cliente_id,
//         cliente_nombre: clienteRec?.nombre ?? null,
//         cliente_apellido: clienteRec?.apellido ?? null,
//         cliente_celular: clienteRec?.celular ?? null,
//         cliente_direccion: clienteRec?.direccion ?? null,
//       };
//     });

//     res.status(200).json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };




// export const getEquipoById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // 1. Obtener equipo + cliente
//     const { data: equipoData, error: equipoError } = await supabase
//       .from('equipo')
//       .select(`
//         id,
//         tipo,
//         marca,
//         modelo,
//         password,
//         problema,
//         fecha_ingreso,
//         patron,
//         cliente:cliente_id (
//           id,
//           nombre,
//           apellido,
//           direccion,
//           celular,
//           celular_contacto
//         )
//       `)
//       .eq('id', id)
//       .single();

//     if (equipoError) throw equipoError;
//     if (!equipoData) return res.status(404).json({ msg: 'Equipo no encontrado' });

//     // 2. Último ingreso de este equipo
//     const { data: ingresoData, error: ingresoError } = await supabase
//       .from('ingreso')
//       .select('*')
//       .eq('equipo_id', id)
//       .order('fecha_ingreso', { ascending: false })
//       .limit(1)
//       .single();

//     if (ingresoError && ingresoError.code !== 'PGRST116') throw ingresoError; // PGRST116 = no rows found
//     let presupuestoData = null;

//     // 3. Si existe ingreso, buscar último presupuesto
//     if (ingresoData) {
//       const { data: presupuesto, error: presupuestoError } = await supabase
//         .from('presupuesto')
//         .select('*')
//         .eq('ingreso_id', ingresoData.id)
//         .order('fecha', { ascending: false })
//         .limit(1)
//         .single();

//       if (presupuestoError && presupuestoError.code !== 'PGRST116') throw presupuestoError;
//       presupuestoData = presupuesto || null;
//     }

//     // 4. Construir respuesta idéntica a la original
//     const response = {
//       equipo: {
//         id: equipoData.id,
//         tipo: equipoData.tipo,
//         marca: equipoData.marca,
//         modelo: equipoData.modelo,
//         password: equipoData.password,
//         problema: equipoData.problema,
//         fecha_ingreso: equipoData.fecha_ingreso,
//         patron: equipoData.patron,
//         presupuesto: equipoData.presupuesto // si en tu tabla equipo existe este campo
//       },
//       cliente: {
//         id: equipoData.cliente.id,
//         nombre: equipoData.cliente.nombre,
//         apellido: equipoData.cliente.apellido,
//         direccion: equipoData.cliente.direccion,
//         celular: equipoData.cliente.celular,
//         celular_contacto: equipoData.cliente.celular_contacto
//       },
//       detalles: {
//         ingreso: ingresoData
//           ? {
//             id: ingresoData.id,
//             fecha_ingreso: ingresoData.fecha_ingreso,
//             fecha_egreso: ingresoData.fecha_egreso,
//             estado: ingresoData.estado_id
//           }
//           : null,
//         presupuesto: presupuestoData
//           ? {
//             id: presupuestoData.id,
//             fecha: presupuestoData.fecha,
//             costo: presupuestoData.costo,
//             total: presupuestoData.total,
//             observaciones: presupuestoData.observaciones
//           }
//           : null
//       }
//     };

//     res.json(response);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// //obtener todos los equipos pertenecientes a un cliente por su cliente_id

// export const obtenerEquiposbyClientId = async (req, res) => {
//   const { cliente_id } = req.params;

//   try {
//     const { data, error } = await supabase
//       .from('equipo')
//       .select('*')
//       .eq('cliente_id', cliente_id)   // cliente_id = X
//       .neq('estado_id', 18)           // excluir los dados de baja
//       .order('fecha_ingreso', { ascending: false });

//     if (error) throw error;

//     if (!data || data.length === 0) {
//       return res.status(404).json({ msg: 'No se encontraron equipos para este cliente' });
//     }

//     res.status(200).json(data);

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Actualizar equipo



// /**
//  * Actualiza equipo y su/los ingreso(s) asociados usando RPC transaccional en la DB.
//  * Responde exactamente: { equipo: {...}, ingreso: {...} }  (ingreso puede ser null)
//  */
// export const updateEquipo = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const equipoId = Number.parseInt(id, 10);
//     if (Number.isNaN(equipoId)) {
//       return res.status(400).json({ error: 'ID inválido' });
//     }

//     const {
//       tipo,
//       marca,
//       modelo,
//       problema,
//       password,
//       patron,
//       cliente_id,
//       estado_id,
//       fecha_ingreso
//     } = req.body;

//     // Pasar NULL explícito si no se envía el campo (para que la función use COALESCE)
//     const params = {
//       _id: equipoId,
//       _tipo: tipo ?? null,
//       _marca: marca ?? null,
//       _modelo: modelo ?? null,
//       _problema: problema ?? null,
//       _password: password ?? null,
//       _patron: patron ?? null,
//       _cliente_id: cliente_id ?? null,
//       _estado_id: estado_id ?? null,
//       _fecha_ingreso: fecha_ingreso ?? null
//     };

//     const { data, error } = await supabase.rpc('actualizar_equipo_y_ingreso', params);

//     if (error) {
//       // Detectar si la excepción lanzada por la función indica "Equipo no encontrado"
//       if (error.message && error.message.toLowerCase().includes('equipo no encontrado')) {
//         return res.status(404).json({ error: 'Equipo no encontrado' });
//       }
//       // Otros errores de Supabase/Postgres
//       throw error;
//     }

//     // La función RETURNS TABLE(...) -> supabase devuelve un array con un objeto (fila).
//     const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

//     // Aseguramos devolver exactamente la misma estructura que tenías:
//     // { equipo: {...}, ingreso: {...} }
//     return res.json(result);

//   } catch (err) {
//     console.error('Error en updateEquipo:', err);
//     // En caso de que err sea un objeto Supabase error, intentar enviar su mensaje
//     const msg = err?.message || String(err);
//     return res.status(500).json({ error: msg });
//   }
// };




// export const deleteEquipo = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // 1. Actualizar el equipo
//     const { error: equipoError } = await supabase
//       .from('equipo')
//       .update({ estado_id: 18 })
//       .eq('id', id);

//     if (equipoError) throw equipoError;

//     // 2. Actualizar ingresos relacionados
//     const { error: ingresoError, data: ingresos } = await supabase
//       .from('ingreso')
//       .update({ estado_id: 18 })
//       .eq('equipo_id', id)
//       .select('id');

//     if (ingresoError) throw ingresoError;

//     // 3. Actualizar presupuestos relacionados a esos ingresos
//     if (ingresos.length > 0) {
//       const ingresoIds = ingresos.map(i => i.id);
//       const { error: presupuestoError } = await supabase
//         .from('presupuesto')
//         .update({ estado_id: 18 })
//         .in('ingreso_id', ingresoIds);

//       if (presupuestoError) throw presupuestoError;
//     }

//     res.json({ msg: 'Equipo dado de baja correctamente (estado actualizado a 18)' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // obtener un equipo por la marca, el modelo y el dni del cliente asociado con SQL PURO

// export const getEquipoByMarcaModeloDni = async (req, res) => {

//   // return res.status(501).json({ msg: 'getEquipoByMarcaModeloDni no implementado aún con Supabase' });
//   try {
//     const { marca, modelo, dni } = req.body;
//     // quisiera obtener el estado del ingreso vinculado al equipo y el nombre del estado del equipo tambien
// const query = `
//     SELECT 
//         e.*,
//         c.nombre AS cliente_nombre,
//         c.apellido AS cliente_apellido,
//         c.dni AS cliente_dni,
//         es.nombre AS estado_nombre  -- 👈 Nombre del estado obtenido directamente del equipo
//     FROM 
//         equipo e
//     INNER JOIN 
//         cliente c ON e.cliente_id = c.id
//     LEFT JOIN 
//         estado es ON e.estado_id = es.id  -- 👈 Conexión directa a la tabla de estados
//     WHERE 
//         LOWER(e.marca) = LOWER($1)
//         AND LOWER(e.modelo) = LOWER($2)
//         AND c.dni = $3
//     ORDER BY 
//         e.fecha_ingreso DESC
//     LIMIT 1;
// `;

//     const { rows } = await pool.query(query, [marca, modelo, dni]);

//     if (rows.length === 0) {
//       return res.status(404).json({ msg: 'Equipo no encontrado' });
//     }

//     res.json(rows[0]);

//   } catch (error) {
//     res.status(500).json({ error: error.message });

//   }
// }


// export const checkEquipoRoute = async (id) => {
//   return res.status(501).json({ msg: 'checkEquipoRoute no implementado aún con Supabase' });
// }


// //FILTROS SIN SUPABASE (FALTA MIGRAR A SUPABASE)


// // // 1) Filtrar por tipo exacto, devuelve tmb el nombre del cliemte
// // export const getEquiposByTipo = async (req, res) => {
// //   const { tipo } = req.params;

// //   try {
// //     const query = `
// //       SELECT
// //         e.*,
// //         c.nombre AS cliente_nombre,
// //         c.apellido AS cliente_apellido
// //       FROM
// //         equipo e
// //       INNER JOIN
// //         cliente c ON e.cliente_id = c.id
// //       WHERE
// //         LOWER(e.tipo) = LOWER($1)
// //       ORDER BY
// //         e.fecha_ingreso DESC;
// //     `;
// //     const { rows } = await pool.query(query, [tipo]);

// //     res.json({
// //       status: 'success',
// //       count: rows.length,
// //       data: rows,
// //     });
// //   } catch (error) {
// //     console.error('Error al filtrar equipos por tipo:', error);
// //     res.status(500).json({ error: 'Error interno del servidor' });
// //   }
// // };

// // // 2) Filtrar múltiples tipos (ej: /equipo/filtrar?tipos=celular,notebook)
// // export const getEquiposFiltrados = async (req, res) => {
// //   const { tipos } = req.query;

// //   if (!tipos) {
// //     return res.status(400).json({ error: 'Debes enviar el parámetro ?tipos=...' });
// //   }

// //   // Convertimos a array y normalizamos
// //   const tiposArray = tipos.split(',').map(t => t.trim().toLowerCase());

// //   try {
// //     const query = `
// //       SELECT * FROM equipo
// //       WHERE LOWER(tipo) = ANY($1::text[])
// //       ORDER BY fecha_ingreso DESC
// //     `;
// //     const { rows } = await pool.query(query, [tiposArray]);

// //     res.json({
// //       status: 'success',
// //       count: rows.length,
// //       data: rows
// //     });
// //   } catch (error) {
// //     console.error('Error al filtrar múltiples tipos de equipos:', error);
// //     res.status(500).json({ error: 'Error interno del servidor' });
// //   }
// // };


// // export const getEquiposByCliente = async (req, res) => {
// //   const { cliente_id } = req.params;

// //   try {
// //     const query = `
// //       SELECT e.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
// //       FROM equipo e
// //       INNER JOIN cliente c ON e.cliente_id = c.id
// //       WHERE e.cliente_id = $1
// //       ORDER BY e.fecha_ingreso DESC
// //     `;
// //     const { rows } = await pool.query(query, [cliente_id]);

// //     if (rows.length === 0) {
// //       return res.status(201).json({ 
// //         success: true,
// //         message: 'No se encontraron equipos para este cliente.' 
// //       });
// //     }

// //     res.json({
// //       status: 'success',
// //       count: rows.length,
// //       data: rows
// //     });
// //   } catch (error) {
// //     console.error('Error al buscar equipos por cliente:', error);
// //     res.status(500).json({ error: 'Error interno del servidor' });
// //   }
// // };


// // // Obtener todos los equipos con último ingreso y presupuesto


// // export const getEquiposConDetalle = async (_req, res) => {
// //   try {
// //     const query = `
// //       SELECT 
// //           e.id AS equipo_id,
// //           e.tipo,
// //           e.marca,
// //           e.modelo,
// //           e.problema,
// //           e.patron,
// //           e.cliente_id,
// //           es_eq.id AS estado_equipo_id,
// //           es_eq.nombre AS estado_equipo_nombre,

// //           i.id AS ingreso_id,
// //           i.fecha_ingreso,
// //           i.fecha_egreso,
// //           es_in.id AS estado_ingreso_id,
// //           es_in.nombre AS estado_ingreso_nombre,

// //           p.id AS presupuesto_id,
// //           p.costo AS costo_presupuesto,
// //           p.total AS total_presupuesto,
// //           p.fecha AS fecha_presupuesto,
// //           p.observaciones AS observaciones_presupuesto,
// //           es_pr.id AS estado_presupuesto_id,
// //           es_pr.nombre AS estado_presupuesto_nombre

// //       FROM equipo e
// //       JOIN estado es_eq ON es_eq.id = e.estado_id

// //       LEFT JOIN LATERAL (
// //           SELECT *
// //           FROM ingreso i
// //           WHERE i.equipo_id = e.id
// //           ORDER BY i.fecha_ingreso DESC
// //           LIMIT 1
// //       ) i ON true
// //       LEFT JOIN estado es_in ON es_in.id = i.estado_id

// //       LEFT JOIN LATERAL (
// //           SELECT *
// //           FROM presupuesto p
// //           WHERE p.ingreso_id = i.id
// //           ORDER BY p.fecha DESC
// //           LIMIT 1
// //       ) p ON true
// //       LEFT JOIN estado es_pr ON es_pr.id = p.estado_id

// //       ORDER BY e.id;
// //     `;

// //     const { rows } = await pool.query(query);
// //     res.json(rows);
// //   } catch (err) {
// //     res.status(500).json({ error: err.message });
// //   }
// // };


// export const getEquiposByTipo = async (req, res) => {
//   try {
//     const { tipo } = req.params;
//     if (!tipo) return res.status(400).json({ error: 'Parámetro tipo requerido' });

//     const { data, error } = await supabase
//       .rpc('obtener_equipos_por_tipo', { _tipo: tipo });

//     if (error) {
//       console.error('Error RPC obtener_equipos_por_tipo:', error);
//       return res.status(500).json({ error: 'Error interno del servidor' });
//     }

//     const rows = data ?? [];

//     return res.json({
//       status: 'success',
//       count: rows.length,
//       data: rows
//     });
//   } catch (err) {
//     console.error('Error al filtrar equipos por tipo:', err);
//     return res.status(500).json({ error: 'Error interno del servidor' });
//   }
// };

// /**
//  * 2) Filtrar múltiples tipos (ej: /equipo/filtrar?tipos=celular,notebook)
//  * Respuesta: { status: 'success', count, data }
//  */
// export const getEquiposFiltrados = async (req, res) => {
//   try {
//     const { tipos } = req.query;
//     if (!tipos) {
//       return res.status(400).json({ error: 'Debes enviar el parámetro ?tipos=...' });
//     }

//     // Convertimos a array y eliminamos vacíos
//     const tiposArray = tipos.split(',').map(t => t.trim()).filter(Boolean);
//     if (tiposArray.length === 0) {
//       return res.status(400).json({ error: 'Parametro tipos inválido' });
//     }

//     // Llamamos al RPC que normaliza a lower internamente
//     const { data, error } = await supabase
//       .rpc('obtener_equipos_filtrados', { _tipos: tiposArray });

//     if (error) {
//       console.error('Error RPC obtener_equipos_filtrados:', error);
//       return res.status(500).json({ error: 'Error interno del servidor' });
//     }

//     const rows = data ?? [];

//     return res.json({
//       status: 'success',
//       count: rows.length,
//       data: rows
//     });
//   } catch (err) {
//     console.error('Error al filtrar múltiples tipos de equipos:', err);
//     return res.status(500).json({ error: 'Error interno del servidor' });
//   }
// };

// /**
//  * 3) Obtener equipos por cliente
//  * Si no hay resultados -> responde 201 con { success: true, message: 'No se encontraron equipos para este cliente.' }
//  * Si hay -> { status: 'success', count, data }
//  */
// export const getEquiposByCliente = async (req, res) => {
//   try {
//     const { cliente_id } = req.params;
//     if (!cliente_id) return res.status(400).json({ error: 'cliente_id requerido' });

//     const { data, error } = await supabase
//       .rpc('obtener_equipos_por_cliente', { _cliente_id: Number(cliente_id) });

//     if (error) {
//       console.error('Error RPC obtener_equipos_por_cliente:', error);
//       return res.status(500).json({ error: 'Error interno del servidor' });
//     }

//     const rows = data ?? [];

//     if (rows.length === 0) {
//       return res.status(201).json({
//         success: true,
//         message: 'No se encontraron equipos para este cliente.'
//       });
//     }

//     return res.json({
//       status: 'success',
//       count: rows.length,
//       data: rows
//     });
//   } catch (err) {
//     console.error('Error al buscar equipos por cliente:', err);
//     return res.status(500).json({ error: 'Error interno del servidor' });
//   }
// };

// /**
//  * 4) Obtener todos los equipos con último ingreso y presupuesto (exactamente igual que tu SQL original)
//  * Responde con un array plano de filas (igual que tu versión con pool.query)
//  */
// export const getEquiposConDetalle = async (_req, res) => {
//   try {
//     const { data, error } = await supabase.rpc('obtener_equipos_con_detalle');

//     if (error) {
//       console.error('Error RPC obtener_equipos_con_detalle:', error);
//       return res.status(500).json({ error: error.message || 'Error interno del servidor' });
//     }

//     return res.json(data ?? []);
//   } catch (err) {
//     console.error('Error getEquiposConDetalle:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };


// // Exportar las funciones para ser utilizadas en las rutas
// export default {
//   getEquipos,
//   getEquipoById,
//   createEquipo,
//   updateEquipo,
//   deleteEquipo,
//   getEquiposByTipo,
//   getEquiposFiltrados,
//   getEquiposByCliente,
//   getEquiposConDetalle,
//   obtenerEquiposbyClientId,
//   checkEquipoRoute
// };



// src/controllers/equipo.controller.js
import { supabase } from '../config/supabase.js';
import { pool } from '../config/supabaseAuthModule.js';

/**
 * CREATE EQUIPO
 * Ahora solo crea el equipo. La OT se crea por separado desde createOrdenTrabajo.
 */
export const createEquipo = async (req, res) => {
  const {
    tipo,
    marca,
    modelo,
    imei      = null,
    cliente_id,
    estado_id,
  } = req.body || {};

  if (
    !tipo || !marca || !modelo ||
    !Number.isInteger(Number(cliente_id)) ||
    !Number.isInteger(Number(estado_id))
  ) {
    return res.status(400).json({
      success: false,
      error: "Campos requeridos: tipo, marca, modelo, cliente_id (int) y estado_id (int).",
    });
  }

  const v_tipo      = String(tipo).trim();
  const v_marca     = String(marca).trim();
  const v_modelo    = String(modelo).trim();
  const v_imei      = imei == null ? null : String(imei).trim();
  const v_clienteId = Number(cliente_id);
  const v_estadoId  = Number(estado_id);

  try {
    const { data: equipo, error: errorEquipo } = await supabase
      .from('equipo')
      .insert([{
        tipo:       v_tipo,
        marca:      v_marca,
        modelo:     v_modelo,
        imei:       v_imei,
        cliente_id: v_clienteId,
        estado_id:  v_estadoId,
        created_at: new Date(),
        updated_at: new Date(),
      }])
      .select()
      .single();

    if (errorEquipo) throw errorEquipo;

    return res.status(201).json({ success: true, data: equipo });
  } catch (err) {
    console.error("❌ Error en createEquipo:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Error al registrar el equipo",
    });
  }
};

/**
 * GET ALL EQUIPOS
 * Incluye la última falla reportada de la última orden_trabajo del equipo.
 */
// export const getEquipos = async (req, res) => {
//   try {
//     const { data, error } = await supabase
//       .from('equipo')
//       .select(`
//         id,
//         tipo,
//         marca,
//         modelo,
//         imei,
//         estado_id,
//         cliente_id,
//         created_at,
//         cliente:cliente_id ( nombre, apellido, celular, direccion )
//       `)
//       .neq('estado_id', 18)
//       .order('created_at', { ascending: false });

//     if (error) throw error;

//     const equipoIds = (data || []).map(e => e.id);
//     let ultimasOTs = {};

//     if (equipoIds.length > 0) {
//       const { data: ots } = await supabase
//         .from('orden_trabajo')
//         .select('equipo_id, falla_reportada, fecha_ingreso, password, patron')
//         .in('equipo_id', equipoIds)
//         .order('fecha_ingreso', { ascending: false });

//       for (const ot of (ots || [])) {
//         if (!ultimasOTs[ot.equipo_id]) {
//           ultimasOTs[ot.equipo_id] = ot;
//         }
//       }
//     }

//     const rows = (data || []).map(item => {
//       const clienteRec = Array.isArray(item.cliente) ? item.cliente[0] : item.cliente;
//       const ultimaOT   = ultimasOTs[item.id];
//       return {
//         id:                item.id,
//         tipo:              item.tipo,
//         marca:             item.marca,
//         modelo:            item.modelo,
//         imei:              item.imei,
//         // fecha_ingreso viene de la última OT, con fallback a created_at del equipo
//         fecha_ingreso:     ultimaOT?.fecha_ingreso ?? item.created_at,
//         estado_id:         item.estado_id,
//         cliente_id:        item.cliente_id,
//         cliente_nombre:    clienteRec?.nombre    ?? null,
//         cliente_apellido:  clienteRec?.apellido  ?? null,
//         cliente_celular:   clienteRec?.celular   ?? null,
//         cliente_direccion: clienteRec?.direccion ?? null,
//         ultima_falla:      ultimaOT?.falla_reportada ?? null,
//         ultima_password:   ultimaOT?.password        ?? null,
//         ultimo_patron:     ultimaOT?.patron           ?? null,
//       };
//     });

//     res.status(200).json(rows);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


export const getEquipos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('equipo')
      .select(`
        id,
        tipo,
        marca,
        modelo,
        imei,
        estado_id,
        cliente_id,
        created_at,
        cliente:cliente_id ( nombre, apellido, celular, direccion )
      `)
      .neq('estado_id', 18);
      // ⚠️ Sacamos el .order() de acá - vamos a ordenar después de mergear con la última OT

    if (error) throw error;

    const equipoIds = (data || []).map(e => e.id);
    let ultimasOTs = {};

    if (equipoIds.length > 0) {
      const { data: ots } = await supabase
        .from('orden_trabajo')
        .select('equipo_id, falla_reportada, fecha_ingreso, password, patron, created_at')
        .in('equipo_id', equipoIds)
        .order('fecha_ingreso', { ascending: false });


        // AGREGAR ESTO TEMPORALMENTE
  console.log('OTs error:', otsError);
  console.log('OTs count:', ots?.length);
  console.log('OT equipo 360:', ots?.filter(o => o.equipo_id === 360));

      for (const ot of (ots || [])) {
        // Nos quedamos con la primera (más reciente) de cada equipo
        if (!ultimasOTs[ot.equipo_id]) {
          ultimasOTs[ot.equipo_id] = ot;
        }
      }
    }

    const rows = (data || []).map(item => {
      const clienteRec = Array.isArray(item.cliente) ? item.cliente[0] : item.cliente;
      const ultimaOT   = ultimasOTs[item.id];

      // ⬇️ CLAVE: la fecha que se usa para ordenar/agrupar es la de la última OT,
      // con fallback a created_at del equipo si nunca tuvo una OT
      const fechaOrden = ultimaOT?.fecha_ingreso ?? item.created_at;

      return {
        id:                item.id,
        tipo:              item.tipo,
        marca:             item.marca,
        modelo:            item.modelo,
        imei:              item.imei,
        fecha_ingreso:     fechaOrden,
        estado_id:         item.estado_id,
        cliente_id:        item.cliente_id,
        cliente_nombre:    clienteRec?.nombre    ?? null,
        cliente_apellido:  clienteRec?.apellido  ?? null,
        cliente_celular:   clienteRec?.celular   ?? null,
        cliente_direccion: clienteRec?.direccion ?? null,
        // datos de la última OT
        ultima_falla:      ultimaOT?.falla_reportada ?? null,
        ultima_password:   ultimaOT?.password        ?? null,
        ultimo_patron:     ultimaOT?.patron           ?? null,
        // flag útil para saber si nunca tuvo OT
        tiene_orden:       !!ultimaOT,
      };
    });

    // ⬇️ Ordenamos acá, por fecha_ingreso (que ya es la de la última OT)
    rows.sort((a, b) => new Date(b.fecha_ingreso) - new Date(a.fecha_ingreso));

    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/**
 * GET EQUIPO BY ID
 * Devuelve equipo + cliente + última orden_trabajo + último presupuesto.
 */
export const getEquipoById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Equipo + cliente
    const { data: equipoData, error: equipoError } = await supabase
      .from('equipo')
      .select(`
        id, tipo, marca, modelo, imei, fecha_ingreso,
        cliente:cliente_id (
          id, nombre, apellido, direccion, celular, celular_contacto
        )
      `)
      .eq('id', id)
      .single();

    if (equipoError) throw equipoError;
    if (!equipoData) return res.status(404).json({ msg: 'Equipo no encontrado' });

    // 2. Última orden_trabajo del equipo
    const { data: otData, error: otError } = await supabase
      .from('orden_trabajo')
      .select('*')
      .eq('equipo_id', id)
      .order('fecha_ingreso', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otError && otError.code !== 'PGRST116') throw otError;

    // 3. Último presupuesto vinculado a esa OT
    let presupuestoData = null;
    if (otData) {
      const { data: presupuesto, error: presupuestoError } = await supabase
        .from('presupuesto')
        .select('*')
        .eq('orden_trabajo_id', otData.id)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (presupuestoError && presupuestoError.code !== 'PGRST116') throw presupuestoError;
      presupuestoData = presupuesto || null;
    }

    const response = {
      equipo: {
        id:            equipoData.id,
        tipo:          equipoData.tipo,
        marca:         equipoData.marca,
        modelo:        equipoData.modelo,
        imei:          equipoData.imei,
        fecha_ingreso: equipoData.fecha_ingreso,
      },
      cliente: {
        id:               equipoData.cliente.id,
        nombre:           equipoData.cliente.nombre,
        apellido:         equipoData.cliente.apellido,
        direccion:        equipoData.cliente.direccion,
        celular:          equipoData.cliente.celular,
        celular_contacto: equipoData.cliente.celular_contacto,
      },
      detalles: {
        // Mantenemos la key 'ingreso' por compatibilidad con el frontend
        ingreso: otData ? {
          id:              otData.id,
          fecha_ingreso:   otData.fecha_ingreso,
          fecha_egreso:    otData.fecha_egreso,
          estado_id:       otData.estado_id,  // ← corregido: antes era 'estado'
          falla_reportada: otData.falla_reportada,
          diagnostico:     otData.diagnostico,
          password:        otData.password,
          patron:          otData.patron,
        } : null,
        presupuesto: presupuestoData ? {
          id:            presupuestoData.id,
          fecha:         presupuestoData.fecha,
          costo:         presupuestoData.costo,
          total:         presupuestoData.total,
          observaciones: presupuestoData.observaciones,
        } : null,
      },
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET EQUIPOS BY CLIENTE ID
 */
export const obtenerEquiposbyClientId = async (req, res) => {
  const { cliente_id } = req.params;
  try {
    const { data, error } = await supabase
      .from('equipo')
      .select('*')
      .eq('cliente_id', cliente_id)
      .neq('estado_id', 18)
      .order('fecha_ingreso', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ msg: 'No se encontraron equipos para este cliente' });
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * UPDATE EQUIPO
 * Solo actualiza datos del equipo (tipo, marca, modelo, imei, cliente_id, estado_id).
 * Los datos de la visita (falla, password, patron) van en la OT.
 */
export const updateEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const equipoId = Number.parseInt(id, 10);
    if (Number.isNaN(equipoId)) return res.status(400).json({ error: 'ID inválido' });

    const { tipo, marca, modelo, imei, cliente_id, estado_id } = req.body;

    const updatePayload = {};
    if (tipo       != null) updatePayload.tipo       = String(tipo).trim();
    if (marca      != null) updatePayload.marca      = String(marca).trim();
    if (modelo     != null) updatePayload.modelo     = String(modelo).trim();
    if (imei       != null) updatePayload.imei       = String(imei).trim();
    if (cliente_id != null) updatePayload.cliente_id = Number(cliente_id);
    if (estado_id  != null) updatePayload.estado_id  = Number(estado_id);
    updatePayload.updated_at = new Date();

    const { data, error } = await supabase
      .from('equipo')
      .update(updatePayload)
      .eq('id', equipoId)
      .select()
      .single();

    if (error) throw error;
    if (!data)  return res.status(404).json({ error: 'Equipo no encontrado' });

    return res.json({ equipo: data });
  } catch (err) {
    console.error('Error en updateEquipo:', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
};

/**
 * DELETE EQUIPO (baja lógica: estado_id = 18)
 */
export const deleteEquipo = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Dar de baja el equipo
    const { error: equipoError } = await supabase
      .from('equipo')
      .update({ estado_id: 18 })
      .eq('id', id);
    if (equipoError) throw equipoError;

    // 2. Dar de baja sus órdenes de trabajo
    const { error: otError, data: ots } = await supabase
      .from('orden_trabajo')
      .update({ estado_id: 18 })
      .eq('equipo_id', id)
      .select('id');
    if (otError) throw otError;

    // 3. Dar de baja presupuestos vinculados a esas OTs
    if (ots && ots.length > 0) {
      const otIds = ots.map(o => o.id);
      const { error: presupuestoError } = await supabase
        .from('presupuesto')
        .update({ estado_id: 18 })
        .in('orden_trabajo_id', otIds);
      if (presupuestoError) throw presupuestoError;
    }

    res.json({ msg: 'Equipo dado de baja correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET EQUIPOS BY TIPO (via RPC)
 */
export const getEquiposByTipo = async (req, res) => {
  try {
    const { tipo } = req.params;
    if (!tipo) return res.status(400).json({ error: 'Parámetro tipo requerido' });

    const { data, error } = await supabase
      .rpc('obtener_equipos_por_tipo', { _tipo: tipo });

    if (error) { console.error('Error RPC obtener_equipos_por_tipo:', error); return res.status(500).json({ error: 'Error interno del servidor' }); }

    const rows = data ?? [];
    return res.json({ status: 'success', count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET EQUIPOS FILTRADOS (via RPC)
 */
export const getEquiposFiltrados = async (req, res) => {
  try {
    const { tipos } = req.query;
    if (!tipos) return res.status(400).json({ error: 'Debes enviar el parámetro ?tipos=...' });

    const tiposArray = tipos.split(',').map(t => t.trim()).filter(Boolean);
    if (tiposArray.length === 0) return res.status(400).json({ error: 'Parametro tipos inválido' });

    const { data, error } = await supabase
      .rpc('obtener_equipos_filtrados', { _tipos: tiposArray });

    if (error) { console.error('Error RPC obtener_equipos_filtrados:', error); return res.status(500).json({ error: 'Error interno del servidor' }); }

    const rows = data ?? [];
    return res.json({ status: 'success', count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET EQUIPOS BY CLIENTE (via RPC)
 */
export const getEquiposByCliente = async (req, res) => {
  try {
    const { cliente_id } = req.params;
    if (!cliente_id) return res.status(400).json({ error: 'cliente_id requerido' });

    const { data, error } = await supabase
      .rpc('obtener_equipos_por_cliente', { _cliente_id: Number(cliente_id) });

    if (error) { console.error('Error RPC obtener_equipos_por_cliente:', error); return res.status(500).json({ error: 'Error interno del servidor' }); }

    const rows = data ?? [];
    if (rows.length === 0) {
      return res.status(201).json({ success: true, message: 'No se encontraron equipos para este cliente.' });
    }
    return res.json({ status: 'success', count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET EQUIPOS CON DETALLE (via RPC)
 */
export const getEquiposConDetalle = async (_req, res) => {
  try {
    const { data, error } = await supabase.rpc('obtener_equipos_con_detalle');
    if (error) { console.error('Error RPC obtener_equipos_con_detalle:', error); return res.status(500).json({ error: error.message || 'Error interno' }); }
    return res.json(data ?? []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET EQUIPO BY MARCA, MODELO Y DNI
 */
export const getEquipoByMarcaModeloDni = async (req, res) => {
  try {
    const { marca, modelo, dni } = req.body;
    const query = `
      SELECT e.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
             c.dni AS cliente_dni, es.nombre AS estado_nombre
      FROM equipo e
      INNER JOIN cliente c ON e.cliente_id = c.id
      LEFT JOIN estado es ON e.estado_id = es.id
      WHERE LOWER(e.marca) = LOWER($1) AND LOWER(e.modelo) = LOWER($2) AND c.dni = $3
      ORDER BY e.fecha_ingreso DESC LIMIT 1;
    `;
    const { rows } = await pool.query(query, [marca, modelo, dni]);
    if (rows.length === 0) return res.status(404).json({ msg: 'Equipo no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const checkEquipoRoute = async (req, res) => {
  return res.status(501).json({ msg: 'checkEquipoRoute no implementado' });
};

export default {
  getEquipos,
  getEquipoById,
  createEquipo,
  updateEquipo,
  deleteEquipo,
  getEquiposByTipo,
  getEquiposFiltrados,
  getEquiposByCliente,
  getEquiposConDetalle,
  obtenerEquiposbyClientId,
  getEquipoByMarcaModeloDni,
  checkEquipoRoute,
};