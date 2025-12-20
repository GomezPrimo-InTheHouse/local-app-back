

// import bcrypt from 'bcrypt';
// import { pool } from '../../config/supabaseAuthModule.js';
// import { registrarHistorial } from '../../utils/historial/registrarHistorial.js';

// const authenticateUser = async (req, res, next) => {
//   const { email } = req.user;

//   if (!email ) {
//     await registrarHistorial({
//       username: email || 'no proporcionado',
//       accion: 'login',
//       estado: 'error',
//       mensaje: 'Faltan credenciales',
//     });
//     return res.status(400).json({ error: 'El nombre de usuario ' });
//   }

//   try {
//     // Buscar usuario en DB
//     const { rows } = await pool.query(
//       'SELECT * FROM usuario WHERE email = $1',
//       [email]
//     );

//     if (rows.length === 0 ) {
//       await registrarHistorial({
//         username:  email || 'no definido',
//         accion: 'login',
//         estado: 'error',
//         mensaje: 'Usuario incorrecto',
//       });
//       return res.status(401).json({ error: 'Usuario incorrecto' });
//     }

//     const usuario = rows[0];

    

//     // Login exitoso
//     req.user = { id: usuario.id, email: usuario.email };

//     await registrarHistorial({
//       username: email,
//       accion: 'login',
//       estado: 'éxito',
//       mensaje: 'Acceso concedido',
//     });

//     next();
//   } catch (error) {
//     console.error('Error en autenticación:', error.message);
//     res.status(500).json({ error: 'Error en el servidor' });
//   }
// };

// export default authenticateUser;


import { supabase } from '../../config/supabase.js';
import { registrarHistorial } from '../../utils/historial/registrarHistorial.js';

const authenticateUser = async (req, res, next) => {
  // Asumimos que req.user ya viene poblado por un middleware previo (como la validación de un JWT)
  const { email } = req.user || {};

  if (!email) {
    // Registro de historial asíncrono para no bloquear la respuesta
    registrarHistorial({
      username: 'no proporcionado',
      accion: 'login',
      estado: 'error',
      mensaje: 'Faltan credenciales',
    }).catch(console.error);

    return res.status(400).json({ error: 'El nombre de usuario o email es requerido' });
  }

  try {
    // 1. Buscar usuario en Supabase
    const { data: usuario, error: dbError } = await supabase
      .from('usuario')
      .select('id, email')
      .eq('email', email)
      .single();

    // 2. Si no existe o hay error en la consulta
    if (dbError || !usuario) {
      registrarHistorial({
        username: email || 'no definido',
        accion: 'login',
        estado: 'error',
        mensaje: 'Usuario incorrecto o no encontrado',
      }).catch(console.error);

      return res.status(401).json({ error: 'Usuario incorrecto' });
    }

    // 3. Login exitoso en este paso del middleware
    req.user = { id: usuario.id, email: usuario.email };

    registrarHistorial({
      username: email,
      accion: 'login',
      estado: 'éxito',
      mensaje: 'Acceso concedido',
    }).catch(console.error);

    next();
  } catch (error) {
    console.error('❌ Error en middleware authenticateUser:', error.message);
    res.status(500).json({ error: 'Error interno en el servidor de autenticación' });
  }
};

export default authenticateUser;