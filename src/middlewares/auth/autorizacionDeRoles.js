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

/**
 * Autenticación OPCIONAL: si viene un token válido deja req.user;
 * si no viene (o es inválido) sigue igual, como visitante anónimo.
 * Se usa en endpoints que comparten el shop público y la app del local
 * (ej. GET /producto): el controller decide qué datos devolver.
 */
export const optionalAuth = (req, _res, next) => {
  const token = extraerToken(req);
  if (!token) return next();
  try {
    req.user = verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    // token inválido/vencido: lo tratamos como anónimo
  }
  next();
};

export default {
  requireAuth,
  autorizacionDeRoles,
  optionalAuth,
};