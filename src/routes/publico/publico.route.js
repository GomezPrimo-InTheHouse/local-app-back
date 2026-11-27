// src/routes/publico/publico.route.js
// Rutas públicas para la web jginformatica.com (sin login).
import { Router } from 'express';
import { consultarEstadoEquipo } from '../../controllers/publico/estadoEquipo.controller.js';
import { limiteConsultas } from '../../middlewares/limiteConsultas.js';

const router = Router();

// POST /publico/estado-equipo  { dni, marca, modelo? }
router.post('/estado-equipo', limiteConsultas({ max: 20, ventanaMs: 10 * 60 * 1000 }), consultarEstadoEquipo);

export default router;
