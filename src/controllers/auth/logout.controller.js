// 
import { supabase } from '../../config/supabase.js';
import { registrarHistorial } from '../../utils/historial/registrarHistorial.js';

export const logout = async (req, res) => {
  const { email } = req.body;
  const estadoInactivoId = 2;

  if (!email) {
    return res.status(400).json({ error: 'Falta el email' });
  }

  try {
    // 1. Buscar el usuario por email usando el cliente de Supabase
    const { data: usuario, error: userError } = await supabase
      .from('usuario')
      .select('id')
      .eq('email', email)
      .single();

    // 2. Si no existe, registramos historial (opcional) y respondemos 404
    if (userError || !usuario) {
      // Registrar historial de forma asíncrona (sin bloquear la respuesta)
      registrarHistorial({
        username: email,
        accion: 'logout',
        estado: 'error',
        mensaje: 'Intento de logout: Usuario no encontrado',
      }).catch(console.error);

      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userId = usuario.id;

    // 3. Marcar sesiones como inactivas (estado_id = 2)
    // Equivalente al UPDATE sesion WHERE usuario_id = $2 AND estado_id = 1
    const { error: updateError } = await supabase
      .from('sesion')
      .update({ 
        estado_id: estadoInactivoId,
        actualizado_en: new Date().toISOString() 
      })
      .eq('usuario_id', userId)
      .eq('estado_id', 1);

    if (updateError) throw updateError;

    // 4. Registro de historial exitoso
    registrarHistorial({
      username: email,
      accion: 'logout',
      estado: 'exitoso',
      mensaje: 'Logout exitoso',
    }).catch(console.error);

    return res.status(200).json({ message: 'Sesión finalizada correctamente' });

  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export default { logout };