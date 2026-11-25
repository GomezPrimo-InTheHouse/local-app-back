// src/controllers/auth/empleado.controller.js
// Gestión de empleados (rol 'tecnico'). Todas las rutas son solo admin.
import { hash } from 'bcrypt';
import { supabase } from '../../config/supabase.js';
import { generarTotp, generarQRCodeDataURL } from '../../utils/auth/totp-util.js';
import { MODULOS, invalidarPermisos } from '../../middlewares/auth/permisos.js';

const ESTADO_ACTIVO = 1;
const ESTADO_BAJA = 18;            // "Registro dado de baja"
const ESTADO_SESION_INACTIVA = 2;  // mismo valor que usan logout y refresh
const ROL_EMPLEADO = 'tecnico';
const MIN_PASSWORD = 8;

// Nunca se devuelven password_hash ni totp_seed
const CAMPOS_PUBLICOS = 'id, nombre, email, rol, estado_id, modulos, creado_en';

const limpiarModulos = (modulos) => {
  if (!Array.isArray(modulos)) return null;
  const unicos = [...new Set(modulos.map((m) => String(m).trim().toLowerCase()))];
  return unicos.every((m) => MODULOS.includes(m)) ? unicos : null;
};

const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));

const cerrarSesiones = async (usuarioId) => {
  await supabase
    .from('sesion')
    .update({ estado_id: ESTADO_SESION_INACTIVA, actualizado_en: new Date().toISOString() })
    .eq('usuario_id', usuarioId)
    .eq('estado_id', ESTADO_ACTIVO);
};

// Trae un empleado (rol tecnico). Los admins no se gestionan desde acá.
const buscarEmpleado = async (id) => {
  const { data, error } = await supabase
    .from('usuario')
    .select('id, email, rol, estado_id')
    .eq('id', Number(id))
    .maybeSingle();
  if (error) throw error;
  if (!data) return { status: 404, error: 'Empleado no encontrado' };
  if (data.rol !== ROL_EMPLEADO) {
    return { status: 403, error: 'Los administradores no se gestionan desde este módulo' };
  }
  return { empleado: data };
};

const qrParaEmail = async (email) => {
  const totp = generarTotp(email);
  const qrCodeDataURL = await generarQRCodeDataURL(totp.otpauth_url);
  return { seed: totp.base32, qrCodeDataURL };
};

/** GET /empleado — lista de usuarios (admins y empleados), sin secretos */
export const listarEmpleados = async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuario')
      .select(CAMPOS_PUBLICOS)
      .order('rol', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;
    return res.json({ success: true, data, modulosDisponibles: MODULOS });
  } catch (err) {
    console.error('Error listando empleados:', err);
    return res.status(500).json({ error: 'Error al listar empleados' });
  }
};

/** POST /empleado — { nombre, email, password, modulos[] } → devuelve QR del TOTP */
export const crearEmpleado = async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const modulos = limpiarModulos(req.body?.modulos ?? []);

    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
    if (!emailValido(email)) return res.status(400).json({ error: 'Email inválido' });
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }
    if (!modulos) return res.status(400).json({ error: 'Hay módulos inválidos' });

    const { data: existente, error: errExiste } = await supabase
      .from('usuario').select('id').eq('email', email).maybeSingle();
    if (errExiste) throw errExiste;
    if (existente) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });

    const password_hash = await hash(password, 10);
    const { seed, qrCodeDataURL } = await qrParaEmail(email);

    const { data, error } = await supabase
      .from('usuario')
      .insert([{
        nombre, email, password_hash, totp_seed: seed,
        rol: ROL_EMPLEADO, modulos, estado_id: ESTADO_ACTIVO,
        creado_en: new Date().toISOString(),
      }])
      .select(CAMPOS_PUBLICOS)
      .single();
    if (error) throw error;

    return res.status(201).json({ success: true, data, qrCodeDataURL });
  } catch (err) {
    console.error('Error creando empleado:', err);
    return res.status(500).json({ error: 'Error al crear el empleado' });
  }
};

/** PUT /empleado/:id — { nombre?, email?, modulos? } */
export const actualizarEmpleado = async (req, res) => {
  try {
    const r = await buscarEmpleado(req.params.id);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const cambios = {};
    if (req.body?.nombre !== undefined) {
      const nombre = String(req.body.nombre).trim();
      if (!nombre) return res.status(400).json({ error: 'El nombre no puede quedar vacío' });
      cambios.nombre = nombre;
    }
    if (req.body?.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!emailValido(email)) return res.status(400).json({ error: 'Email inválido' });
      const { data: otro } = await supabase
        .from('usuario').select('id').eq('email', email).neq('id', r.empleado.id).maybeSingle();
      if (otro) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
      cambios.email = email;
    }
    if (req.body?.modulos !== undefined) {
      const modulos = limpiarModulos(req.body.modulos);
      if (!modulos) return res.status(400).json({ error: 'Hay módulos inválidos' });
      cambios.modulos = modulos;
    }
    if (Object.keys(cambios).length === 0) {
      return res.status(400).json({ error: 'No hay cambios para guardar' });
    }

    const { data, error } = await supabase
      .from('usuario').update(cambios).eq('id', r.empleado.id).select(CAMPOS_PUBLICOS).single();
    if (error) throw error;

    invalidarPermisos(r.empleado.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error actualizando empleado:', err);
    return res.status(500).json({ error: 'Error al actualizar el empleado' });
  }
};

/** POST /empleado/:id/reset-password — { password } · cierra sus sesiones */
export const resetPasswordEmpleado = async (req, res) => {
  try {
    const r = await buscarEmpleado(req.params.id);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const password = String(req.body?.password || '');
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }

    const password_hash = await hash(password, 10);
    const { error } = await supabase.from('usuario').update({ password_hash }).eq('id', r.empleado.id);
    if (error) throw error;

    await cerrarSesiones(r.empleado.id);
    return res.json({ success: true, message: 'Contraseña restablecida. El empleado debe volver a iniciar sesión.' });
  } catch (err) {
    console.error('Error restableciendo contraseña:', err);
    return res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
};

/** POST /empleado/:id/reset-totp — genera semilla nueva y devuelve el QR · cierra sus sesiones */
export const resetTotpEmpleado = async (req, res) => {
  try {
    const r = await buscarEmpleado(req.params.id);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const { seed, qrCodeDataURL } = await qrParaEmail(r.empleado.email);
    const { error } = await supabase.from('usuario').update({ totp_seed: seed }).eq('id', r.empleado.id);
    if (error) throw error;

    await cerrarSesiones(r.empleado.id);
    return res.json({ success: true, qrCodeDataURL });
  } catch (err) {
    console.error('Error restableciendo TOTP:', err);
    return res.status(500).json({ error: 'Error al restablecer el código TOTP' });
  }
};

/** POST /empleado/:id/baja — desactiva y cierra sesiones */
export const bajaEmpleado = async (req, res) => {
  try {
    const r = await buscarEmpleado(req.params.id);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const { data, error } = await supabase
      .from('usuario').update({ estado_id: ESTADO_BAJA }).eq('id', r.empleado.id).select(CAMPOS_PUBLICOS).single();
    if (error) throw error;

    await cerrarSesiones(r.empleado.id);
    invalidarPermisos(r.empleado.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error dando de baja empleado:', err);
    return res.status(500).json({ error: 'Error al dar de baja el empleado' });
  }
};

/** POST /empleado/:id/reactivar */
export const reactivarEmpleado = async (req, res) => {
  try {
    const r = await buscarEmpleado(req.params.id);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const { data, error } = await supabase
      .from('usuario').update({ estado_id: ESTADO_ACTIVO }).eq('id', r.empleado.id).select(CAMPOS_PUBLICOS).single();
    if (error) throw error;

    invalidarPermisos(r.empleado.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error reactivando empleado:', err);
    return res.status(500).json({ error: 'Error al reactivar el empleado' });
  }
};

export default {
  listarEmpleados, crearEmpleado, actualizarEmpleado,
  resetPasswordEmpleado, resetTotpEmpleado, bajaEmpleado, reactivarEmpleado,
};
