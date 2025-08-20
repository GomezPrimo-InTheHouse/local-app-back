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
router.post('/register', register);
//Explicacion de la ruta /login en README.md
router.post('/login', basicAuth, login)

router.post('/refresh-token', refreshAccessToken)

router.post('/logout', logout) 

router.post('/darDeBaja/:id', autorizacionDeRoles('admin'), darDeBajaUsuario)




router.get('/obtenerUsuarios', obtenerUsuarios)


export default router;