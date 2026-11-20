// routes/twilioRoutes.js
import { Router } from 'express';

import { enviarMensaje } from '../../controllers/twilio/twilio.controller.js';
import { requireAuth } from '../../middlewares/auth/autorizacionDeRoles.js';
const router = Router();

// 🔒 Antes cualquiera podía mandar mensajes con tu cuenta de Twilio
router.post('/enviar-mensaje', requireAuth, enviarMensaje);

export default router;