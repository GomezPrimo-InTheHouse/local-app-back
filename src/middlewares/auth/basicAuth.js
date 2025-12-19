// // import  {pool}  from '../../config/db.js';
// // import bcrypt from 'bcrypt';

// // export const basicAuth = async (req, res, next) => {
// //   const authHeader = req.headers['authorization'];

// //   if (!authHeader || !authHeader.startsWith('Basic ')) {
// //     return res.status(401).json({ error: 'Cabecera Authorization básica requerida' });
// //   }

// //   const base64 = authHeader.split(' ')[1];
// //   const credentials = Buffer.from(base64, 'base64').toString('ascii');
// //   const [email, password] = credentials.split(':');
  

// //   try {
// //     const result = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
   
// //     if (result.rows.length === 0) {
// //       return res.status(401).json({ error: 'Usuario no encontrado' });
// //     }

// //     const usuario = result.rows[0];
// //     const match = await bcrypt.compare(password, usuario.password_hash);

// //     if (!match) {
// //       return res.status(401).json({ error: 'Contraseña incorrecta' });
// //     }

// //     req.user = { id: usuario.id, email: usuario.email };
   
// //     next();
// //   } catch (error) {
// //     console.error('Error en basicAuth:', error);
// //     res.status(500).json({ error: 'Error en autenticación básica' });
// //   }
// // };

// // export default  {basicAuth};

// import { pool } from '../../config/db.js';
// import bcrypt from 'bcrypt';
// import { registrarHistorial } from '../../utils/historial/registrarHistorial.js';

// export const basicAuth = async (req, res, next) => {
//   const authHeader = req.headers['authorization'];

//   if (!authHeader || !authHeader.startsWith('Basic ')) {
//     await registrarHistorial({
//       username: 'no proporcionado',
//       accion: 'login',
//       estado: 'error',
//       mensaje: 'Cabecera Authorization básica requerida',
//     });
//     return res.status(401).json({ error: 'Cabecera Authorization básica requerida' });
//   }

//   const base64 = authHeader.split(' ')[1];
//   const credentials = Buffer.from(base64, 'base64').toString('ascii');
//   const [email, password] = credentials.split(':');

//   if (!email || !password) {
//     await registrarHistorial({
//       username: email || 'no proporcionado',
//       accion: 'login',
//       estado: 'error',
//       mensaje: 'Faltan credenciales',
//     });
//     return res.status(400).json({ error: 'Email y contraseña son requeridos' });
//   }

//   try {
//     const result = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);

//     if (result.rows.length === 0) {
//       await registrarHistorial({
//         username: email,
//         accion: 'login',
//         estado: 'error',
//         mensaje: 'Usuario no encontrado',
//       });
//       return res.status(401).json({ error: 'Usuario no encontrado' });
//     }

//     const usuario = result.rows[0];
//     const match = await bcrypt.compare(password, usuario.password_hash);

//     if (!match) {
//       await registrarHistorial({
//         username: email,
//         accion: 'login',
//         estado: 'error',
//         mensaje: 'Contraseña incorrecta',
//       });
//       return res.status(401).json({ error: 'Contraseña incorrecta' });
//     }

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
//     console.error('Error en basicAuth:', error);
//     await registrarHistorial({
//       username: email || 'no definido',
//       accion: 'login',
//       estado: 'error',
//       mensaje: 'Error interno de servidor',
//     });
//     res.status(500).json({ error: 'Error en autenticación básica' });
//   }
// };

// export default { basicAuth };

import { pool } from '../../config/supabaseAuthModule.js';
import bcrypt from 'bcrypt';
// import { registrarHistorial } from '../../utils/historial/registrarHistorial.js';

export const basicAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const { totp } = req.body; // capturamos el TOTP del body

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    // await registrarHistorial({
    //   username: 'no proporcionado',
    //   accion: 'login',
    //   estado: 'error',
    //   mensaje: 'Cabecera Authorization básica requerida',
    // });
    return res.status(401).json({ error: 'Cabecera Authorization básica requerida' });
  }

  const base64 = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64, 'base64').toString('ascii');
  const [email, password] = credentials.split(':');

  if (!email || !password) {
    // await registrarHistorial({
    //   username: email || 'no proporcionado',
    //   accion: 'login',
    //   estado: 'error',
    //   mensaje: 'Faltan credenciales',
    // });
    return res.status(400).json({ error: 'Email y/o contraseña son requeridos' });
  }

  try {
    const result = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      // await registrarHistorial({
      //   username: email,
      //   accion: 'login',
      //   estado: 'error',
      //   mensaje: 'Usuario no encontrado',
      // });
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const usuario = result.rows[0];
    const match = await bcrypt.compare(password, usuario.password_hash);

    if (!match) {
      // await registrarHistorial({
      //   username: email,
      //   accion: 'login',
      //   estado: 'error',
      //   mensaje: 'Contraseña incorrecta',
      // });
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Verificar que el TOTP fue proporcionado
    if (!totp) {
      // await registrarHistorial({
      //   username: email,
      //   accion: 'login',
      //   estado: 'error',
      //   mensaje: 'TOTP no proporcionado',
      // });
      return res.status(400).json({ error: 'Código TOTP requerido' });
    }

    // Login exitoso
    req.user = { id: usuario.id, email: usuario.email };

  

    next();
  } catch (error) {
    console.error('Error en basicAuth:', error);
    // await registrarHistorial({
    //   username: email || 'no definido',
    //   accion: 'login',
    //   estado: 'error',
    //   mensaje: 'Error desde basic auth',
    // });
    res.status(500).json({ error: 'Error en autenticación básica' });
  }
};

export default { basicAuth };

