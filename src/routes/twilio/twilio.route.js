// routes/twilioRoutes.js
import { Router } from 'express';

import { enviarMensaje } from '../../controllers/twilio/twilio.controller.js';
const router = Router();

router.post('/enviar-mensaje', enviarMensaje);

export default router;
