

// controllers/auth/login.controller.js
import { supabase } from '../../config/supabase.js'; // Importa tu cliente que ya funciona
import jwt from 'jsonwebtoken';
const { sign } = jwt;
import { totp as _totp } from 'speakeasy';
import { registrarHistorial } from '../../utils/historial/registrarHistorial.js';

import dotenv from 'dotenv';
dotenv.config();

export const login = async (req, res) => {
  console.log('Login request received:', req.user);
  const { user } = req; // Viene del middleware basicAuth
  const { totp } = req.body;

  try {
    // 1. Buscar usuario con Supabase Client
    const { data: usuario, error: userError } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', user.email)
      .eq('estado_id', 1)
      .single(); // Trae un objeto en lugar de un array

    if (userError || !usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    // 2. Verificar TOTP
    const esValidoTOTP = _totp.verify({
      secret: usuario.totp_seed,
      encoding: 'base32',
      token: totp,
      window: 1 
    });

    if (!esValidoTOTP) {
      // Nota: No esperamos al historial para responder, evitamos bloqueos
      registrarHistorial({
        username: usuario.email,
        accion: 'login',
        estado: 'error',
        mensaje: 'Código TOTP inválido',
      }).catch(console.error);
      
      return res.status(401).json({ error: 'Código TOTP inválido' });
    }

    // 3. Generar tokens JWT
    const accessToken = sign(
      { userId: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = sign(
      { userId: usuario.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Guardar sesión y registrar historial con Supabase
    const estadoSesionActivaId = 1;
    
    // Ejecutamos en paralelo para ganar velocidad
    await Promise.all([
      supabase.from('sesion').insert([{
        usuario_id: usuario.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        estado_id: estadoSesionActivaId
      }]),
      registrarHistorial({
        username: usuario.email,
        accion: 'login',
        estado: 'éxito',
        mensaje: 'Acceso concedido',
      })
    ]);

    res.json({ accessToken, refreshToken });

  } catch (err) {
    console.error('❌ Error en login:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export default { login };