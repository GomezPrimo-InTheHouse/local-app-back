// src/middlewares/auth/permisos.js
import { supabase } from '../../config/supabase.js';
import { requireAuth } from './autorizacionDeRoles.js';

/**
 * Permisos por módulo para empleados (rol 'tecnico').
 *
 * - El admin accede a todo.
 * - El empleado accede solo a los módulos de usuario.modulos.
 * - Los permisos se leen de la base (con caché corta) y no del token, así un
 *   cambio de módulos o una baja se aplican en segundos, sin esperar al refresh.
 *
 * Códigos: 401 sin token / token inválido · 403 sin permiso (el front no reintenta).
 */

export const MODULOS = ['clientes', 'equipos', 'ventas', 'productos', 'servicios', 'celulares'];

const CACHE_MS = 30 * 1000;
const cache = new Map(); // userId -> { rol, estado_id, modulos, t }

export const invalidarPermisos = (userId) => cache.delete(Number(userId));

export const obtenerPermisos = async (userId) => {
  const id = Number(userId);
  const hit = cache.get(id);
  if (hit && Date.now() - hit.t < CACHE_MS) return hit;

  const { data, error } = await supabase
    .from('usuario')
    .select('rol, estado_id, modulos')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  const permisos = data
    ? { rol: data.rol, estado_id: data.estado_id, modulos: data.modulos || [], t: Date.now() }
    : null;
  if (permisos) cache.set(id, permisos);
  return permisos;
};

const prohibido = (res, error = 'No tenés permisos para acceder a este módulo') =>
  res.status(403).json({ error, code: 'FORBIDDEN' });

/**
 * Exige login y acceso al módulo.
 * - `principal`: módulo dueño de la ruta (requerido para escribir).
 * - `lectura`: otros módulos que también pueden LEER (GET) esta ruta.
 *   Ej: los clientes se leen desde Equipos y Ventas para elegir el cliente.
 *
 * Uso: app.use('/cliente', requireModulo('clientes', 'equipos', 'ventas'), ClienteRoute)
 */
export const requireModulo = (principal, ...lectura) => (req, res, next) => {
  requireAuth(req, res, async () => {
    try {
      if (req.user?.rol === 'admin') return next();

      const permisos = await obtenerPermisos(req.user?.userId);
      if (!permisos || permisos.estado_id !== 1) {
        return res.status(401).json({ error: 'Usuario inactivo', code: 'USER_INACTIVE' });
      }
      if (permisos.rol === 'admin') return next();

      const habilitados = permisos.modulos;
      const esLectura = req.method === 'GET';
      const permitidos = esLectura ? [principal, ...lectura] : [principal];

      if (permitidos.some((m) => habilitados.includes(m))) return next();
      return prohibido(res);
    } catch (err) {
      console.error('Error verificando permisos:', err);
      return res.status(500).json({ error: 'Error verificando permisos' });
    }
  });
};

/**
 * Exige login y que el usuario siga activo (cualquier rol).
 * Para rutas comunes como /estado.
 */
export const requireActivo = (req, res, next) => {
  requireAuth(req, res, async () => {
    try {
      if (req.user?.rol === 'admin') return next();
      const permisos = await obtenerPermisos(req.user?.userId);
      if (!permisos || permisos.estado_id !== 1) {
        return res.status(401).json({ error: 'Usuario inactivo', code: 'USER_INACTIVE' });
      }
      return next();
    } catch (err) {
      console.error('Error verificando usuario:', err);
      return res.status(500).json({ error: 'Error verificando usuario' });
    }
  });
};

/**
 * Solo admin (estadísticas, balances, gestión de empleados).
 * Verifica el rol contra la base, no solo contra el token.
 */
export const soloAdmin = (req, res, next) => {
  requireAuth(req, res, async () => {
    try {
      if (req.user?.rol !== 'admin') return prohibido(res, 'Solo un administrador puede acceder');
      const permisos = await obtenerPermisos(req.user.userId);
      if (!permisos || permisos.estado_id !== 1 || permisos.rol !== 'admin') {
        return prohibido(res, 'Solo un administrador puede acceder');
      }
      return next();
    } catch (err) {
      console.error('Error verificando admin:', err);
      return res.status(500).json({ error: 'Error verificando permisos' });
    }
  });
};

export default { MODULOS, requireModulo, requireActivo, soloAdmin, obtenerPermisos, invalidarPermisos };
