


// // // controllers/auth/refresh.controller.js

// import jwt from 'jsonwebtoken';
// const { sign, verify } = jwt;
// import { supabase } from '../../config/supabase.js'; // Usando el cliente centralizado
// import dotenv from 'dotenv';
// dotenv.config();

// export const refreshAccessToken = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({ error: 'Falta el email' });
//   }

//   try {
//     // 1. Verificar si el usuario existe (Usando Supabase)
//     const { data: user, error: userError } = await supabase
//       .from('usuario')
//       .select('*')
//       .eq('email', email)
//       .single();

//     if (userError || !user) {
//       return res.status(404).json({ error: 'Usuario no encontrado' });
//     }

//     // 2. Buscar la sesión activa más reciente
//     const { data: session, error: sessionError } = await supabase
//       .from('sesion')
//       .select('*')
//       .eq('usuario_id', user.id)
//       .order('creado_en', { ascending: false })
//       .limit(1)
//       .single();

//     if (sessionError || !session) {
//       return res.status(403).json({ error: 'Sesión no encontrada para el usuario' });
//     }

//     const { refresh_token } = session;

//     // 3. Verificar el refresh_token
//     // No usamos Promesa manual, verify tiene una versión síncrona o podemos usar try/catch directo
//     let decoded;
//     try {
//       decoded = verify(refresh_token, process.env.JWT_REFRESH_SECRET);
//     } catch (err) {
//       if (err.name === 'TokenExpiredError') {
//         // Si expiró, limpiamos la sesión de la DB
//         await supabase.from('sesion').delete().eq('refresh_token', refresh_token);
//         return res.status(403).json({ error: 'Refresh token expirado' });
//       }
//       throw err; // Otros errores de validación de token
//     }

//     // 4. Crear nuevo accessToken
//     const newAccessToken = sign(
//       {
//         userId: user.id,
//         email: user.email,
//         rol: user.rol_id // Asegúrate si es 'rol' o 'rol_id' según tu DB
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: '1h' }
//     );

//     // 5. Actualizar la sesión con el nuevo accessToken
//     const { error: updateError } = await supabase
//       .from('sesion')
//       .update({ 
//         access_token: newAccessToken, 
//         actualizado_en: new Date().toISOString() 
//       })
//       .eq('refresh_token', refresh_token);

//     if (updateError) throw updateError;

//     // 6. Responder
//     return res.status(200).json({ accessToken: newAccessToken });

//   } catch (error) {
//     console.error('❌ Error al renovar accessToken:', error.message);
//     return res.status(500).json({ error: 'Error interno al renovar sesión' });
//   }
// };

// export default { refreshAccessToken };

// controllers/auth/authWithRefresh.controller.js
import jwt from 'jsonwebtoken';
const { sign, verify } = jwt;
import { supabase } from '../../config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

const ESTADO_ACTIVO = 1;
const ESTADO_INACTIVO = 2;

/**
 * POST /auth/refresh-token
 * Body: { refreshToken }
 *
 * 1. Verifica la firma y vigencia del refresh token (JWT_REFRESH_SECRET).
 * 2. Busca la sesión ACTIVA que tenga exactamente ese refresh token
 *    y pertenezca al userId del token.
 * 3. Lee el usuario fresco de la base (rol y estado actuales).
 * 4. Firma un accessToken nuevo con { userId, email, rol }.
 *
 * Todas las fallas de autenticación responden 401 para que el front
 * limpie la sesión y mande a /login.
 */
export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'Falta el refreshToken' });
  }

  // 1. Verificar el refresh token recibido del cliente
  let decoded;
  try {
    decoded = verify(refreshToken, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Marcamos la sesión como inactiva (no se borra, queda el historial)
      await supabase
        .from('sesion')
        .update({ estado_id: ESTADO_INACTIVO, actualizado_en: new Date().toISOString() })
        .eq('refresh_token', refreshToken)
        .eq('estado_id', ESTADO_ACTIVO);

      return res.status(401).json({ error: 'Refresh token expirado', code: 'REFRESH_EXPIRED' });
    }
    return res.status(401).json({ error: 'Refresh token inválido', code: 'REFRESH_INVALID' });
  }

  const userId = decoded?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Refresh token inválido', code: 'REFRESH_INVALID' });
  }

  try {
    // 2. La sesión debe existir, estar activa y corresponder a este token exacto
    const { data: session, error: sessionError } = await supabase
      .from('sesion')
      .select('id, usuario_id')
      .eq('refresh_token', refreshToken)
      .eq('usuario_id', userId)
      .eq('estado_id', ESTADO_ACTIVO)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      return res.status(401).json({ error: 'Sesión no encontrada o cerrada', code: 'SESSION_NOT_FOUND' });
    }

    // 3. Usuario fresco: si lo dieron de baja o le cambiaron el rol, se refleja acá
    const { data: user, error: userError } = await supabase
      .from('usuario')
      .select('id, email, rol, estado_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw userError;
    if (!user || user.estado_id !== ESTADO_ACTIVO) {
      await supabase
        .from('sesion')
        .update({ estado_id: ESTADO_INACTIVO, actualizado_en: new Date().toISOString() })
        .eq('id', session.id);

      return res.status(401).json({ error: 'Usuario inactivo o inexistente', code: 'USER_INACTIVE' });
    }

    // 4. Nuevo accessToken con el rol real de la base
    const newAccessToken = sign(
      { userId: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const { error: updateError } = await supabase
      .from('sesion')
      .update({ access_token: newAccessToken, actualizado_en: new Date().toISOString() })
      .eq('id', session.id);

    if (updateError) throw updateError;

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('❌ Error al renovar accessToken:', error.message);
    return res.status(500).json({ error: 'Error interno al renovar sesión' });
  }
};

export default { refreshAccessToken };