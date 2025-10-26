// controllers/auth.controller.js
import { pool } from '../../config/supabaseAuthModule.js';
import { hash } from 'bcrypt';
import { generarTotp, generarQRCodeTerminal, generarQRCodeDataURL } from '../../utils/auth/totp-util.js';

export const register = async (req, res) => {
  console.log('ejecutando register')
  try {
    const { nombre, email, password, rol} = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Faltan nombre, email o password' });
    }
    // Validar rol desde .env o base de datos
    const rolesPermitidos = ['usuario', 'admin'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ error: `Rol inválido. Roles permitidos: ${rolesPermitidos.join(',')}` });
    }
   
    

    // Verificar si ya existe un usuario con ese email
    const existente = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
    if (existente.rows.length > 0) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Hashear la contraseña
    const password_hash = await hash(password, 10);

    // Generar TOTP y QR
    const totp = generarTotp(email);
    const totp_seed = totp.base32;
    const otpauth_url = totp.otpauth_url;

    // Mostrar en terminal el QR para escanear (opcional)
    await generarQRCodeTerminal(otpauth_url);

    // Generar QR en formato Data URL por si se quiere mostrar en frontend
    const qrCodeDataURL = await generarQRCodeDataURL(otpauth_url);

    // Crear usuario
    const estadoActivoId = 1; // El estado activo es 1

    const result = await pool.query(`
      INSERT INTO usuario (rol, nombre, email, password_hash, totp_seed, creado_en, estado_id)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING id, nombre, email, rol, creado_en, estado_id
    `, [rol, nombre, email, password_hash, totp_seed, estadoActivoId]);

    return res.status(201).json({
      user: result.rows[0],
      message: 'Usuario registrado correctamente',
      qrCodeDataURL // esto lo podés mostrar en frontend si querés
    });

  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};


//obtener todos los usuarios
export const obtenerUsuarios = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuario');
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};


export default { register, obtenerUsuarios };
