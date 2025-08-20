// // authenticateUser.js
// import {pool} from '../../config/db.js';
// import bcrypt from 'bcrypt';

// const authenticateUser = async (req, res, next) => {
//   const { username, password } = req.body;

//   if (!username || !password) {
//     await registrarHistorial({
//       username: username || 'no proporcionado',
//       accion: 'login',
//       estado: 'error',
//       mensaje: 'Faltan credenciales',
//     });

//     return res.status(400).json({ error: 'El nombre de usuario y la contraseña son requeridos' });
//   }

//   const data = await pool.query('SELECT * FROM usuario WHERE username = $1', [username]);

//   const validUsername = data.rows[0]?.username;
//   const validPassword = data.rows[0]?.password;

//   // const validUsername = process.env.AUTH_USERNAME;
//   // const validPassword = process.env.AUTH_PASSWORD;

//   let mensajeError = '';

//   if (username !== validUsername) {
//     mensajeError = 'Usuario incorrecto';
//   } else if (password !== validPassword) {
//     mensajeError = 'Contraseña incorrecta';
//   }

//   if (mensajeError) {
//     await registrarHistorial({
//       username,
//       accion: 'login',
//       estado: 'error',
//       mensaje: mensajeError,
//     });

//     return res.status(401).json({ error: mensajeError });
//   }

//   // Si todo está OK
//   req.user = { username };
//   await registrarHistorial({
//     username,
//     accion: 'login',
//     estado: 'éxito',
//     mensaje: 'Acceso concedido',
//   });

//   next();
// };

// export default authenticateUser;

import bcrypt from 'bcrypt';
import {pool} from '../../config/db.js';
import { registrarHistorial } from '../../utils/historial/registrarHistorial.js';

const authenticateUser = async (req, res, next) => {
  const { email } = req.user;

  if (!email ) {
    await registrarHistorial({
      username: email || 'no proporcionado',
      accion: 'login',
      estado: 'error',
      mensaje: 'Faltan credenciales',
    });
    return res.status(400).json({ error: 'El nombre de usuario ' });
  }

  try {
    // Buscar usuario en DB
    const { rows } = await pool.query(
      'SELECT * FROM usuario WHERE email = $1',
      [email]
    );

    if (rows.length === 0 ) {
      await registrarHistorial({
        username:  email || 'no definido',
        accion: 'login',
        estado: 'error',
        mensaje: 'Usuario incorrecto',
      });
      return res.status(401).json({ error: 'Usuario incorrecto' });
    }

    const usuario = rows[0];

    

    // Login exitoso
    req.user = { id: usuario.id, email: usuario.email };

    await registrarHistorial({
      username: email,
      accion: 'login',
      estado: 'éxito',
      mensaje: 'Acceso concedido',
    });

    next();
  } catch (error) {
    console.error('Error en autenticación:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export default authenticateUser;

