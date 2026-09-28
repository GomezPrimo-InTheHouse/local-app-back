// import jwt from 'jsonwebtoken';
// const { sign, verify } = jwt;



// // recibi por parametro a los roles permitidos, dependiendo de la ruta que se quiera proteger

// // ## Roles y Permisos

// // - **Organizadores**: Acceso completo a gestión de eventos y programación
// // - **Administradores**: Acceso total al sistema

// export const autorizacionDeRoles = (...rolesPermitidos) => {
  
//   return (req, res, next) => {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({ error: 'Token no proporcionado' });
//     }

//     const token = authHeader.split(' ')[1];

//     try {
//       const decoded = verify(token, process.env.JWT_SECRET);
//       const userRole = decoded.rol;

//       if (!rolesPermitidos.includes(userRole)) {
//         return res.status(403).json({ error: 'No tienes permisos para acceder a este recurso' });
//       }

//       // Guardamos los datos del usuario en la request para usarlos después
//       req.user = decoded;
//       next();
//     } catch (error) {
//       console.error('Error al verificar token:', error);
//       return res.status(403).json({ error: 'Token inválido o expirado' });
//     }
//   };
// };





// // const verificarEventoExistente = async (req, res, next) => {
// //   const { nombre } = req.body;

// //   try {
// //     const result = await pool.query('SELECT * FROM eventos WHERE nombre = $1', [nombre]);

// //     if (result.rows.length > 0) {
// //       return res.status(409).json({ error: 'El evento ya existe.' });
// //     }

// //     next();
// //   } catch (error) {
// //     console.error('Error al verificar evento existente:', error);
// //     return res.status(500).json({ error: 'Error interno del servidor' });
// //   }
// // };


// export default {
//   autorizacionDeRoles
// };

import jwt from 'jsonwebtoken';
const { verify } = jwt;

/**
 * Middlewares de autenticación / autorización.
 *
 * Contrato de códigos (el interceptor de Axios del front depende de esto):
 *   401 → no hay token, es inválido o está vencido  → el front intenta refresh
 *   403 → el token es válido pero el rol no alcanza   → el front NO reintenta
 *
 * Roles válidos (CHECK en la tabla usuario): 'admin' | 'tecnico'
 */

const extraerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1] || null;
};

const verificarToken = (req, res) => {
  const token = extraerToken(req);

  if (!token) {
    res.status(401).json({ error: 'Token no proporcionado', code: 'TOKEN_MISSING' });
    return null;
  }

  try {
    return verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    } else {
      res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID' });
    }
    return null;
  }
};

/**
 * Exige un usuario autenticado (cualquier rol).
 * Deja en req.user: { userId, email, rol, iat, exp }
 */
export const requireAuth = (req, res, next) => {
  const decoded = verificarToken(req, res);
  if (!decoded) return;

  req.user = decoded;
  next();
};

/**
 * Exige un usuario autenticado con alguno de los roles indicados.
 * Uso: router.get('/ruta', autorizacionDeRoles('admin'), controller)
 */
export const autorizacionDeRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    const decoded = verificarToken(req, res);
    if (!decoded) return;

    if (!rolesPermitidos.includes(decoded.rol)) {
      return res.status(403).json({
        error: 'No tenés permisos para acceder a este recurso',
        code: 'FORBIDDEN',
      });
    }

    req.user = decoded;
    next();
  };
};

export default {
  requireAuth,
  autorizacionDeRoles,
};