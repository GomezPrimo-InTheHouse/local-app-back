

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

