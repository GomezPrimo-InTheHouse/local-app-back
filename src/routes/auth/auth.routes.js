//Dependencias
import { Router } from 'express';
const router = Router();
//controllers
import { login } from '../../controllers/auth/login.controller.js';
import { logout } from '../../controllers/auth/logout.controller.js';
import { darDeBajaUsuario } from '../../controllers/auth/deleteUser.controller.js';
import { register, obtenerUsuarios } from '../../controllers/auth/register.controller.js';
import { refreshAccessToken } from '../../controllers/auth/authWithRefresh.controller.js';
//middlewares
import { basicAuth } from '../../middlewares/auth/basicAuth.js';
import { autorizacionDeRoles } from '../../middlewares/auth/autorizacionDeRoles.js';
// import authenticateUser from '../../middlewares/auth/autenticateUser.js';



//Explicacion de la ruta /register en README.md
// Solo un admin logueado puede crear usuarios
router.post('/register', autorizacionDeRoles('admin'), register);
//Explicacion de la ruta /login en README.md
router.post('/login', basicAuth, login)

router.post('/refresh-token', refreshAccessToken)

router.post('/logout', logout) 

router.post('/darDeBaja/:id', autorizacionDeRoles('admin'), darDeBajaUsuario)




// Solo admin; no devuelve password_hash ni totp_seed
router.get('/obtenerUsuarios', autorizacionDeRoles('admin'), obtenerUsuarios)


export default router;