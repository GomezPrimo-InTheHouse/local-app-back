import { Router } from 'express';
import { getHistorialEquipo } from '../controllers/historial.controller.js';

const router = Router();

router.get('/equipo/:equipoId', getHistorialEquipo);

export default router;
