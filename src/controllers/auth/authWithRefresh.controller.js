// import jwt from 'jsonwebtoken';
// const { sign, verify } = jwt;

// // import {pool} from '../../config/db.js';
// import { pool } from '../../config/supabaseAuthModule.js';


// import dotenv from 'dotenv';
// dotenv.config();


// export const refreshAccessToken = async (req, res) => {
//   console.log('Iniciando renovación de accessToken...');
//   console.log('Datos recibidos:', req.body);
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({ error: 'Falta el email' });
//   }

//   try {
//     // 1. Verificar si el usuario existe
//     const userResult = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Usuario no encontrado' });
//     }
//     const user = userResult.rows[0];

//     // 2. Buscar la sesión activa
//     const sessionResult = await pool.query(
//       'SELECT * FROM sesion WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 1',
//       [user.id]
//     );

//     if (sessionResult.rows.length === 0) {
//       return res.status(403).json({ error: 'Sesión no encontrada para el usuario' });
//     }

//     const session = sessionResult.rows[0];

//     const { refresh_token } = session;

//     // 3. Verificar el refresh_token (promisificado)
//     const decoded = await new Promise((resolve, reject) => {
//       verify(refresh_token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
//         if (err) return reject(err);
//         resolve(decoded);
//       });
//     });

//     // 4. Crear nuevo accessToken
//     const newAccessToken = sign(
//       {
//         userId: user.id,
//         email: user.email,
//         rol: user.rol
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: '1h' }
//     );

//     // 5. Actualizar la sesión con nuevo accessToken
//     await pool.query(
//       `UPDATE sesion SET access_token = $1, actualizado_en = NOW() WHERE refresh_token = $2`,
//       [newAccessToken, refresh_token]
//     );

//     // 6. Responder
//     return res.status(200).json({ accessToken: newAccessToken });

//   } catch (error) {
//     console.error('Error al renovar accessToken:', error);

//     // Si el error es de expiración del refresh_token:
//     if (error.name === 'TokenExpiredError') {
//       await pool.query('DELETE FROM sesion WHERE refresh_token = $1', [refresh_token]);
//       return res.status(403).json({ error: 'Refresh token expirado' });
//     }

//     return res.status(500).json({ error: 'Error interno del servidor' });
//   }
// };

// export default { refreshAccessToken };



// // controllers/auth/refresh.controller.js

import jwt from 'jsonwebtoken';
const { sign, verify } = jwt;
import { supabase } from '../../config/supabase.js'; // Usando el cliente centralizado
import dotenv from 'dotenv';
dotenv.config();

export const refreshAccessToken = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Falta el email' });
  }

  try {
    // 1. Verificar si el usuario existe (Usando Supabase)
    const { data: user, error: userError } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // 2. Buscar la sesión activa más reciente
    const { data: session, error: sessionError } = await supabase
      .from('sesion')
      .select('*')
      .eq('usuario_id', user.id)
      .order('creado_en', { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !session) {
      return res.status(403).json({ error: 'Sesión no encontrada para el usuario' });
    }

    const { refresh_token } = session;

    // 3. Verificar el refresh_token
    // No usamos Promesa manual, verify tiene una versión síncrona o podemos usar try/catch directo
    let decoded;
    try {
      decoded = verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        // Si expiró, limpiamos la sesión de la DB
        await supabase.from('sesion').delete().eq('refresh_token', refresh_token);
        return res.status(403).json({ error: 'Refresh token expirado' });
      }
      throw err; // Otros errores de validación de token
    }

    // 4. Crear nuevo accessToken
    const newAccessToken = sign(
      {
        userId: user.id,
        email: user.email,
        rol: user.rol_id // Asegúrate si es 'rol' o 'rol_id' según tu DB
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5. Actualizar la sesión con el nuevo accessToken
    const { error: updateError } = await supabase
      .from('sesion')
      .update({ 
        access_token: newAccessToken, 
        actualizado_en: new Date().toISOString() 
      })
      .eq('refresh_token', refresh_token);

    if (updateError) throw updateError;

    // 6. Responder
    return res.status(200).json({ accessToken: newAccessToken });

  } catch (error) {
    console.error('❌ Error al renovar accessToken:', error.message);
    return res.status(500).json({ error: 'Error interno al renovar sesión' });
  }
};

export default { refreshAccessToken };