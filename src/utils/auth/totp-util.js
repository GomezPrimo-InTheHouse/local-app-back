// // utils/totp.util.js
// import speakeasy from 'speakeasy';


// import { generateSecret, totp } from 'speakeasy';
// import { toDataURL } from 'qrcode';
// // Importar el módulo completo
// import qrcodeTerminal from 'qrcode-terminal';

// // Desestructurar lo que necesitas
// const { generate } = qrcodeTerminal;

// /**
//  * Genera un secret TOTP y un QR code para escanear.
//  * @param {string} userEmail
//  * @returns {Promise<{ otpauth_url: string, base32: string, qrImage: string }>}
//  */


// export const generarTotp = (email) => {
//   const secret = speakeasy.generateSecret({
//     name: `MiApp (${email})`,
//     length: 20
//   });

//   return {
//     base32: secret.base32,
//     otpauth_url: secret.otpauth_url
//   };
// };

// export async function generarQRCodeTerminal(otpauth_url) {
//   generate(otpauth_url, { small: true });
// }

// export async function generarQRCodeDataURL(otpauth_url) {
//   return await toDataURL(otpauth_url);
// }

// /**
//  * Verifica un código TOTP contra el secret base32
//  */
// export const verificarTotp = (token, base32Secret) => {
//   return totp.verify({
//     secret: base32Secret,
//     encoding: 'base32',
//     token,
//     window: 1, // tolerancia de 1 intervalo (30s)
//   });
// };

// export default { 
//   generarTotp, 
//   verificarTotp, 
//   generarQRCodeTerminal,
//   generarQRCodeDataURL 
// };

// utils/totp.util.js
import speakeasy from 'speakeasy';
import { toDataURL } from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

/**
 * Genera un secret TOTP y la URL otpauth.
 * @param {string} email - Email del usuario
 * @returns {{ base32: string, otpauth_url: string }}
 */
export const generarTotp = (email) => {
  if (!email) throw new Error("El email es obligatorio para generar el TOTP");

  const secret = speakeasy.generateSecret({
    name: `JGP-Informatica-app (${email})`,
    length: 20
  });

  return {
    base32: secret.base32,
    otpauth_url: secret.otpauth_url
  };
};

/**
 * Genera un código QR en la terminal a partir de la URL otpauth.
 * @param {string} otpauth_url
 */
export const generarQRCodeTerminal = (otpauth_url) => {
  if (!otpauth_url) {
    console.error("No se pudo generar el QR: otpauth_url no válido");
    return;
  }
  qrcodeTerminal.generate(otpauth_url, { small: true });
};

/**
 * Genera un código QR como Data URL para usar en frontend.
 * @param {string} otpauth_url
 * @returns {Promise<string>} Data URL de la imagen QR
 */
export const generarQRCodeDataURL = async (otpauth_url) => {
  if (!otpauth_url) throw new Error("otpauth_url es requerido para generar el QR");
  return await toDataURL(otpauth_url);
};

/**
 * Verifica un token TOTP contra un secreto base32.
 * @param {string} token
 * @param {string} base32Secret
 * @returns {boolean}
 */
export const verificarTotp = (token, base32Secret) => {
  return speakeasy.totp.verify({
    secret: base32Secret,
    encoding: 'base32',
    token,
    window: 1 // tolerancia de 1 intervalo (30s)
  });
};

export default {
  generarTotp,
  generarQRCodeTerminal,
  generarQRCodeDataURL,
  verificarTotp
};
