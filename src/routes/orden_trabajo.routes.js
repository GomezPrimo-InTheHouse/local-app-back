// src/routes/orden_trabajo.route.js
import { Router } from 'express';
const router = Router();

import {
  createOrdenTrabajo,
  getOrdenesTrabajo,
  getOrdenesByEquipo,
  getOrdenesByCliente,
  getOrdenTrabajoById,
  updateOrdenTrabajo,
  deleteOrdenTrabajo
} from '../controllers/orden_trabajo.controllers.js';

router.get('/',                        getOrdenesTrabajo);     // todas las órdenes
router.get('/equipo/:equipoId',        getOrdenesByEquipo);    // historial de un equipo
router.get('/cliente/:clienteId',      getOrdenesByCliente);   // todas las OTs de un cliente
router.get('/:id',                     getOrdenTrabajoById);   // detalle de una OT
router.post('/',                       createOrdenTrabajo);    // crear nueva OT
router.put('/:id',                     updateOrdenTrabajo);    // actualizar OT
router.delete('/:id',                  deleteOrdenTrabajo);    // eliminar OT

export default router;