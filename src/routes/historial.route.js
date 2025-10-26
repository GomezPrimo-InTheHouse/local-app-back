import { Router } from 'express';
import { 
    getHistorialCliente,
    getHistorialClienteByClienteId
 } from '../controllers/historial.controller.js';

const router = Router();

router.get('/equipo/:equipoId', getHistorialCliente);
router.get('/cliente/:clienteId', getHistorialClienteByClienteId);

export default router;
